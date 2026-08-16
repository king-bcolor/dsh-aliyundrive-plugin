/**
 * Thin compatibility layer around @deepseek-ai/dsh-tools.
 *
 * Inside a real DSH profile the package is available as a peer dependency and
 * this module uses its defineTool, so every tool gets the full schema
 * validation and registry normalization. In this standalone workspace (and
 * in unit tests) we fall back to a minimal local defineTool that compiles the
 * same supported parameter-schema subset into registry-ready JSON Schema.
 */

let factory

try {
  const dshTools = await import('@deepseek-ai/dsh-tools')
  factory = dshTools.defineTool
} catch {
  factory = fallbackDefineTool
}

const ANNOTATION_KEYS = new Set(['description', 'title', 'default', 'examples'])

function compileValueSchema(spec, path) {
  if (!spec || typeof spec !== 'object') {
    throw new Error(`${path} must be a value schema object`)
  }
  const node = {}
  for (const [key, value] of Object.entries(spec)) {
    if (ANNOTATION_KEYS.has(key)) node[key] = value
  }
  switch (spec.type) {
    case 'json':
      return node
    case 'object':
      if (typeof spec.additionalProperties !== 'boolean') {
        throw new Error(`${path}.additionalProperties must be explicitly true or false`)
      }
      node.type = 'object'
      node.additionalProperties = spec.additionalProperties
      node.properties = Object.fromEntries(
        Object.entries(spec.properties ?? {}).map(([key, property]) => [key, compileProperty(property, `${path}.properties.${key}`)]),
      )
      return node
    case 'array':
      node.type = 'array'
      if (spec.items !== undefined) node.items = compileValueSchema(spec.items, `${path}.items`)
      return node
    case 'string':
    case 'number':
    case 'integer':
    case 'boolean':
    case 'null':
      node.type = spec.type
      if (spec.enum !== undefined) node.enum = spec.enum
      if (spec.const !== undefined) node.const = spec.const
      return node
    default:
      throw new Error(`${path}.type is not supported by the fallback defineTool`)
  }
}

function compileProperty(spec, path) {
  if (!spec || typeof spec !== 'object') throw new Error(`${path} must be a value schema object`)
  // `required` belongs on the enclosing object schema in raw JSON Schema;
  // per-property `required: true` is author-DSL syntax only and must not leak
  // into the registry-ready projection.
  return compileValueSchema(spec, path)
}

/**
 * Compile the author-facing output value schema. `{ type: 'json' }` becomes
 * an annotation-only schema (no `type` key), exactly like dsh-tools does;
 * ToolRuntime.register rejects the author-only `type: 'json'`.
 */
function compileOutputSchema(spec) {
  if (!spec || typeof spec !== 'object') return {}
  if (spec.type === 'json') {
    const node = {}
    for (const [key, value] of Object.entries(spec)) {
      if (ANNOTATION_KEYS.has(key)) node[key] = value
    }
    return node
  }
  return compileValueSchema(spec, 'output.schema')
}

/**
 * Compile the author-facing parameter map into the raw object JSON Schema
 * consumed by ToolRuntime.register/schema projection.
 */
function compileParameters(parameters) {
  const properties = {}
  const required = []
  for (const [key, spec] of Object.entries(parameters ?? {})) {
    properties[key] = compileProperty(spec, `parameters.${key}`)
    if (spec.required === true) required.push(key)
  }
  const schema = { type: 'object', properties }
  if (required.length > 0) schema.required = required
  return schema
}

function fallbackDefineTool(options) {
  const parameters = compileParameters(options.parameters)
  const required = options.parameters
    ? Object.entries(options.parameters)
      .filter(([, spec]) => spec && spec.required === true)
      .map(([key]) => key)
    : []

  const render = options.output?.render ?? ((_args, value) => [{
    type: 'text',
    text: JSON.stringify(value, null, 2),
  }])

  return {
    name: options.name,
    description: options.description,
    parameters,
    output: {
      schema: compileOutputSchema(options.output?.schema ?? { type: 'json' }),
      render,
    },
    ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
    async execute(args, exec) {
      for (const key of required) {
        if (args === undefined || args === null || args[key] === undefined) {
          const error = new Error(`invalid arguments: missing required parameter ${key}`)
          error.name = 'ToolArgsError'
          throw error
        }
      }
      return options.execute(args, exec)
    },
    ...(options.presentCall ? { presentCall: options.presentCall } : {}),
    ...(options.presentResult ? { presentResult: options.presentResult } : {}),
  }
}

export const defineTool = factory
