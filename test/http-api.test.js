import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { once } from 'node:events'
import { normalizeConfig } from '../src/config.js'
import { createAliyundriveTools } from '../src/tools.js'
import { createTaskManager } from '../src/task-manager.js'
import { createAliyundriveApi, registerAliyundriveApi } from '../src/http-api.js'

function createFixtures() {
  const runCalls = []
  const run = async (_config, args) => {
    runCalls.push(args)
    return { ok: true, code: 0, stdout: 'MOCK OK', stderr: '', command: args.join(' '), durationMs: 1, timedOut: false }
  }
  const startCalls = []
  const deferreds = []
  const start = async (_config, args) => {
    startCalls.push(args)
    let resolveDone
    const done = new Promise((resolve) => { resolveDone = resolve })
    deferreds.push({ resolve: resolveDone })
    return {
      command: args.join(' '),
      status: 'running',
      done,
      snapshot: () => ({ status: 'running', progress: { percent: 12, line: '12%' }, stdoutTail: 'progress', stderrTail: '' }),
      kill() { deferreds.at(-1).killed = true },
    }
  }
  const config = normalizeConfig()
  const taskManager = createTaskManager()
  const tools = createAliyundriveTools(config, { run, start, taskManager })
  const handler = createAliyundriveApi({ tools, taskManager })
  return { handler, runCalls, startCalls, deferreds, taskManager }
}

async function listen(handler) {
  const server = http.createServer((req, res) => {
    handler(req, res).catch(() => {
      res.writeHead(500).end('internal error')
    })
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const { port } = server.address()
  return { server, base: `http://127.0.0.1:${port}` }
}

async function request(base, path, { method = 'GET', body } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  return { status: response.status, json }
}

test('http api lists every aliyundrive tool', async () => {
  const { handler } = createFixtures()
  const { server, base } = await listen(handler)
  try {
    const { status, json } = await request(base, '/api/aliyundrive/tools')
    assert.equal(status, 200)
    assert.equal(json.ok, true)
    assert.equal(json.tools.length, 25)
    assert.ok(json.tools.some((tool) => tool.name === 'aliyunpan_upload'))
    assert.ok(json.tools.every((tool) => tool.name && tool.description && tool.parameters))
  } finally {
    server.close()
  }
})

test('http api executes short tools and passes args through', async () => {
  const { handler, runCalls } = createFixtures()
  const { server, base } = await listen(handler)
  try {
    const { status, json } = await request(base, '/api/aliyundrive/execute', {
      method: 'POST',
      body: { tool: 'aliyunpan_who', args: {} },
    })
    assert.equal(status, 200)
    assert.equal(json.ok, true)
    assert.deepEqual(runCalls[0], ['who'])
  } finally {
    server.close()
  }
})

test('http api enforces dangerous confirmation', async () => {
  const { handler, runCalls } = createFixtures()
  const { server, base } = await listen(handler)
  try {
    const { status, json } = await request(base, '/api/aliyundrive/execute', {
      method: 'POST',
      body: { tool: 'aliyunpan_rm', args: { paths: ['/a'] } },
    })
    assert.equal(status, 200)
    assert.equal(json.ok, false)
    assert.equal(json.error, 'CONFIRM_REQUIRED')
    assert.equal(runCalls.length, 0)
  } finally {
    server.close()
  }
})

test('http api starts and lists long tasks', async () => {
  const { handler, startCalls, deferreds } = createFixtures()
  const { server, base } = await listen(handler)
  try {
    const started = await request(base, '/api/aliyundrive/execute', {
      method: 'POST',
      body: { tool: 'aliyunpan_upload', args: { localPaths: ['/local/a'], remotePath: '/remote' } },
    })
    assert.equal(started.status, 200)
    assert.equal(started.json.ok, true)
    assert.equal(started.json.status, 'running')
    assert.deepEqual(startCalls[0], ['upload', '/local/a', '/remote'])

    const listed = await request(base, '/api/aliyundrive/tasks')
    assert.equal(listed.status, 200)
    assert.equal(listed.json.tasks.length, 1)
    assert.equal(listed.json.tasks[0].status, 'running')
    assert.equal(listed.json.tasks[0].progress.percent, 12)

    const stopped = await request(base, '/api/aliyundrive/tasks/stop', {
      method: 'POST',
      body: { taskId: started.json.taskId },
    })
    assert.equal(stopped.status, 200)
    assert.equal(stopped.json.ok, true)
    assert.equal(stopped.json.status, 'stopping')
    assert.equal(deferreds[0].killed, true)
  } finally {
    server.close()
  }
})

test('http api serves a standalone aliyundrive acceptance page', async () => {
  const { handler } = createFixtures()
  const { server, base } = await listen(handler)
  try {
    const response = await fetch(base + '/aliyundrive')
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type') || '', /text\/html/)
    const html = await response.text()
    assert.match(html, /阿里云盘/)
    assert.match(html, /aliyunpan_upload/)
    assert.match(html, /api\/aliyundrive/)
  } finally {
    server.close()
  }
})

test('http api returns 400 for malformed json and 404 for unknown routes', async () => {
  const { handler } = createFixtures()
  const { server, base } = await listen(handler)
  try {
    const malformed = await fetch(base + '/api/aliyundrive/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad',
    })
    assert.equal(malformed.status, 400)
    await malformed.text()

    const unknown = await request(base, '/api/aliyundrive/nope')
    assert.equal(unknown.status, 404)
  } finally {
    server.close()
  }
})

test('registerAliyundriveApi mounts the route through an optional webServer inject fiber', () => {
  const { handler } = createFixtures()
  const routes = []
  const ctx = {
    inject(names, callback) {
      const webCtx = {
        webServer: {
          register(route) { routes.push(route) },
        },
        effect(fn) { fn() },
      }
      callback(webCtx)
      return { dispose() {} }
    },
    effect() {},
    get(name) { throw new Error('should not call ctx.get') },
  }
  const dispose = registerAliyundriveApi(ctx, { tools: [], taskManager: createTaskManager() })
  assert.equal(routes.length, 2)
  const apiRoute = routes.find((route) => route.path === '/api/aliyundrive')
  const uiRoute = routes.find((route) => route.path === '/aliyundrive')
  assert.equal(apiRoute.kind, 'prefix')
  assert.equal(typeof apiRoute.handler, 'function')
  assert.equal(uiRoute.kind, 'prefix')
  assert.equal(typeof uiRoute.handler, 'function')
  assert.equal(typeof dispose, 'function')
})
