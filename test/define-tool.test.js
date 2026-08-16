import test from 'node:test'
import assert from 'node:assert/strict'
import { defineTool } from '../src/define-tool.js'

test('defineTool projects output.schema { type: "json" } into registry-ready annotation-only JSON schema', () => {
  const tool = defineTool({
    name: 'sample_tool',
    description: 'sample',
    parameters: { path: { type: 'string', required: true } },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    execute: async (args) => ({ path: args.path }),
  })
  assert.equal(Object.hasOwn(tool.output.schema, 'type'), false)
  assert.equal(typeof tool.output.render, 'function')
  assert.deepEqual(tool.parameters.type, 'object')
  assert.deepEqual(tool.parameters.required, ['path'])
  assert.equal(Object.hasOwn(tool.parameters.properties.path, 'required'), false)
})
