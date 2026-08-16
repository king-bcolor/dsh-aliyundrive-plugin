/**
 * HTTP bridge for the aliyundrive web UI.
 *
 * DSH's web app owns the `/api` prefix; this plugin claims the longer
 * `/api/aliyundrive` prefix so browser UI can execute tools and poll tasks
 * without going through the model loop.
 */

const API_PREFIX = '/api/aliyundrive'
const MAX_BODY_BYTES = 1024 * 1024

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(body)
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('request body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

/**
 * @param {{ tools: any[], taskManager: any }} deps
 */
export function createAliyundriveApi({ tools, taskManager }) {
  const byName = new Map(tools.map((tool) => [tool.name, tool]))
  const taskList = byName.get('aliyunpan_task_list')
  const taskStop = byName.get('aliyunpan_task_stop')

  return async function aliyundriveApi(req, res) {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const path = url.pathname

    if (req.method === 'GET' && path === `${API_PREFIX}/tools`) {
      sendJson(res, 200, {
        ok: true,
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        })),
      })
      return
    }

    if (req.method === 'GET' && path === `${API_PREFIX}/tasks`) {
      const result = await taskList.execute({}, { signal: undefined })
      sendJson(res, 200, result)
      return
    }

    if (req.method === 'POST' && path === `${API_PREFIX}/tasks/stop`) {
      let body
      try {
        body = await readJsonBody(req)
      } catch {
        sendJson(res, 400, { ok: false, error: 'BAD_JSON', message: 'invalid JSON body' })
        return
      }
      const result = await taskStop.execute(body ?? {}, { signal: undefined })
      sendJson(res, 200, result)
      return
    }

    if (req.method === 'POST' && path === `${API_PREFIX}/execute`) {
      let body
      try {
        body = await readJsonBody(req)
      } catch {
        sendJson(res, 400, { ok: false, error: 'BAD_JSON', message: 'invalid JSON body' })
        return
      }
      const tool = typeof body?.tool === 'string' ? byName.get(body.tool) : undefined
      if (tool === undefined) {
        sendJson(res, 404, { ok: false, error: 'TOOL_NOT_FOUND', message: `unknown tool: ${String(body?.tool)}` })
        return
      }
      try {
        const result = await tool.execute(body.args ?? {}, { signal: undefined })
        sendJson(res, 200, result)
      } catch (error) {
        sendJson(res, 500, { ok: false, error: 'TOOL_ERROR', message: error.message })
      }
      return
    }

    sendJson(res, 404, { ok: false, error: 'NOT_FOUND', message: `no aliyundrive api route for ${req.method} ${path}` })
  }
}

export function registerAliyundriveApi(ctx, deps) {
  const handler = createAliyundriveApi(deps)
  const route = { kind: 'prefix', path: API_PREFIX, handler }

  // Cordis service activation is dependency-ordered: our host plugin injects
  // only `tools`, so webServer may not be active yet at apply time. An
  // injected child fiber waits for the service and stays inert in headless
  // profiles that never provide it.
  if (typeof ctx.inject === 'function') {
    const fiber = ctx.inject(['webServer'], (webCtx) => {
      webCtx.effect(() => webCtx.webServer.register(route), 'aliyundrive: http api')
    })
    if (typeof ctx.effect === 'function') {
      ctx.effect(() => () => fiber.dispose(), 'aliyundrive: http api fiber')
    }
    return () => fiber.dispose()
  }

  // Non-Cordis embedding (tests, plain objects).
  const webServer = typeof ctx.get === 'function' ? ctx.get('webServer') : undefined
  if (webServer === undefined || typeof webServer.register !== 'function') return () => {}
  webServer.register(route)
  return () => {}
}
