import test from 'node:test'
import assert from 'node:assert/strict'
import { createAliyundriveTools } from '../src/tools.js'
import { normalizeConfig } from '../src/config.js'
import { createTaskManager } from '../src/task-manager.js'

function createHarness(overrides = {}) {
  const calls = []
  const run = async (_config, args, _opts) => {
    calls.push(args)
    return {
      ok: true,
      code: 0,
      stdout: 'MOCK OK',
      stderr: '',
      command: args.join(' '),
      durationMs: 1,
      timedOut: false,
    }
  }
  const startCalls = []
  const deferreds = []
  const start = async (_config, args, _opts) => {
    startCalls.push(args)
    let resolveDone
    const done = new Promise((resolve) => {
      resolveDone = resolve
    })
    const deferred = { args, resolve: resolveDone }
    deferreds.push(deferred)
    return {
      command: args.join(' '),
      args,
      status: 'running',
      done,
      snapshot: () => ({
        status: 'running',
        progress: { percent: 12, line: '12%' },
        stdoutTail: 'progress',
        stderrTail: '',
      }),
      kill() {
        deferred.killed = true
      },
    }
  }
  const taskManager = createTaskManager()
  const config = normalizeConfig(overrides.config ?? {})
  const tools = createAliyundriveTools(config, { run, start, taskManager })
  const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]))
  return { calls, run, startCalls, deferreds, taskManager, tools, byName }
}

test('tools expose the documented tool names', () => {
  const { tools } = createHarness()
  const names = tools.map((tool) => tool.name)
  for (const expected of [
    'aliyunpan_login',
    'aliyunpan_who',
    'aliyunpan_loglist',
    'aliyunpan_drive',
    'aliyunpan_quota',
    'aliyunpan_pwd',
    'aliyunpan_cd',
    'aliyunpan_ls',
    'aliyunpan_mkdir',
    'aliyunpan_rename',
    'aliyunpan_mv',
    'aliyunpan_cp',
    'aliyunpan_rm',
    'aliyunpan_upload',
    'aliyunpan_download',
    'aliyunpan_share_set',
    'aliyunpan_album_list',
    'aliyunpan_album_show',
    'aliyunpan_album_download',
    'aliyunpan_sync_start',
    'aliyunpan_sync_stop',
    'aliyunpan_sync_list',
    'aliyunpan_task_status',
    'aliyunpan_task_list',
    'aliyunpan_task_stop',
  ]) {
    assert.ok(names.includes(expected), `missing tool ${expected}`)
  }
})

test('aliyunpan_who executes the who command and returns structured result', async () => {
  const { byName, calls } = createHarness()
  const result = await byName.aliyunpan_who.execute({}, {})
  assert.equal(result.ok, true)
  assert.equal(result.command, 'who')
  assert.deepEqual(calls[0], ['who'])
})

test('aliyunpan_ls maps detail/sort/order into command args', async () => {
  const { byName, calls } = createHarness()
  await byName.aliyunpan_ls.execute({ path: '/books', detail: true, sort: 'size', order: 'desc' }, {})
  assert.deepEqual(calls[0], ['ll', '--desc', '--size', '/books'])
})

test('aliyunpan_rm refuses to run without confirm when confirmDangerous is true', async () => {
  const { byName, calls } = createHarness()
  const result = await byName.aliyunpan_rm.execute({ paths: ['/a'] }, {})
  assert.equal(result.ok, false)
  assert.equal(result.error, 'CONFIRM_REQUIRED')
  assert.equal(calls.length, 0)
})

test('aliyunpan_rm runs when confirm is true', async () => {
  const { byName, calls } = createHarness()
  const result = await byName.aliyunpan_rm.execute({ paths: ['/a'], confirm: true }, {})
  assert.equal(result.ok, true)
  assert.deepEqual(calls[0], ['rm', '/a'])
})

test('aliyunpan_download refuses --ow without confirm', async () => {
  const { byName, calls } = createHarness()
  const result = await byName.aliyunpan_download.execute({ remotePaths: ['/a'], ow: true }, {})
  assert.equal(result.ok, false)
  assert.equal(result.error, 'CONFIRM_REQUIRED')
  assert.equal(calls.length, 0)
})

test('aliyunpan_upload starts a background task and returns taskId', async () => {
  const { byName, startCalls, taskManager, deferreds } = createHarness()
  const result = await byName.aliyunpan_upload.execute({ localPaths: ['/local/a'], remotePath: '/remote' }, {})
  assert.equal(result.ok, true)
  assert.equal(result.status, 'running')
  assert.equal(result.taskId, taskManager.listTasks()[0].id)
  assert.deepEqual(startCalls[0], ['upload', '/local/a', '/remote'])

  const task = taskManager.getTask(result.taskId)
  assert.equal(task.status, 'running')
  deferreds[0].resolve({
    ok: true,
    code: 0,
    stdout: 'upload done',
    stderr: '',
    command: 'aliyunpan upload',
    durationMs: 1,
    timedOut: false,
  })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(taskManager.getTask(result.taskId).status, 'completed')
})

test('aliyunpan_task_status reports running progress and completed result', async () => {
  const { byName, deferreds } = createHarness()
  const uploadResult = await byName.aliyunpan_upload.execute({ localPaths: ['/local/a'], remotePath: '/remote' }, {})
  const running = await byName.aliyunpan_task_status.execute({ taskId: uploadResult.taskId }, {})
  assert.equal(running.ok, true)
  assert.equal(running.status, 'running')
  assert.equal(running.progress.percent, 12)

  deferreds[0].resolve({
    ok: true,
    code: 0,
    stdout: 'upload done',
    stderr: '',
    command: 'aliyunpan upload',
    durationMs: 1,
    timedOut: false,
  })
  await new Promise((resolve) => setImmediate(resolve))
  const completed = await byName.aliyunpan_task_status.execute({ taskId: uploadResult.taskId }, {})
  assert.equal(completed.status, 'completed')
})

test('unsafe paths are rejected without spawning', async () => {
  const { byName, calls } = createHarness()
  const result = await byName.aliyunpan_cd.execute({ path: '/a|b' }, {})
  assert.equal(result.ok, false)
  assert.equal(result.error, 'UNSAFE_PATH')
  assert.equal(calls.length, 0)
})

test('sync stop and sync list report unsupported command', async () => {
  const { byName, calls } = createHarness()
  const stop = await byName.aliyunpan_sync_stop.execute({ taskId: 'x' }, {})
  assert.equal(stop.ok, false)
  assert.equal(stop.error, 'UNSUPPORTED_COMMAND')
  const list = await byName.aliyunpan_sync_list.execute({}, {})
  assert.equal(list.ok, false)
  assert.equal(list.error, 'UNSUPPORTED_COMMAND')
  assert.equal(calls.length, 0)
})

test('confirmDangerous=false lets destructive tools run with explicit args', async () => {
  const { byName, calls } = createHarness({ config: { confirmDangerous: false } })
  const result = await byName.aliyunpan_rm.execute({ paths: ['/a'] }, {})
  assert.equal(result.ok, true)
  assert.deepEqual(calls[0], ['rm', '/a'])
})

test('aliyunpan_upload with ow requires confirm', async () => {
  const { byName, calls } = createHarness()
  const result = await byName.aliyunpan_upload.execute({ localPaths: ['/local/a'], remotePath: '/remote', ow: true }, {})
  assert.equal(result.ok, false)
  assert.equal(result.error, 'CONFIRM_REQUIRED')
  assert.equal(calls.length, 0)
})

test('aliyunpan_download with ow and confirm starts a background task', async () => {
  const { byName, startCalls } = createHarness()
  const result = await byName.aliyunpan_download.execute({ remotePaths: ['/a'], ow: true, confirm: true }, {})
  assert.equal(result.ok, true)
  assert.equal(result.status, 'running')
  assert.deepEqual(startCalls[0], ['download', '--ow', '/a'])
})

test('aliyunpan_sync_start exclusive policy requires confirm', async () => {
  const { byName, calls, startCalls } = createHarness()
  const args = { ldir: '/local/docs', pdir: '/sync/docs', mode: 'upload', policy: 'exclusive' }
  const denied = await byName.aliyunpan_sync_start.execute(args, {})
  assert.equal(denied.ok, false)
  assert.equal(denied.error, 'CONFIRM_REQUIRED')
  assert.equal(calls.length, 0)

  const allowed = await byName.aliyunpan_sync_start.execute({ ...args, confirm: true }, {})
  assert.equal(allowed.ok, true)
  assert.equal(allowed.status, 'running')
  assert.equal(startCalls.length, 1)
})

test('aliyunpan_task_status returns TASK_NOT_FOUND for an unknown id', async () => {
  const { byName } = createHarness()
  const result = await byName.aliyunpan_task_status.execute({ taskId: 'missing' }, {})
  assert.equal(result.ok, false)
  assert.equal(result.error, 'TASK_NOT_FOUND')
})

test('login-required output is normalized to NOT_LOGGED_IN even on exit code 0', async () => {
  const taskManager = createTaskManager()
  const run = async () => ({
    ok: true,
    code: 0,
    stdout: '未登录账号\n',
    stderr: '',
    command: 'aliyunpan quota',
    durationMs: 1,
    timedOut: false,
  })
  const tools = createAliyundriveTools(normalizeConfig(), { run, taskManager })
  const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]))
  const result = await byName.aliyunpan_quota.execute({}, {})
  assert.equal(result.ok, false)
  assert.equal(result.error, 'NOT_LOGGED_IN')
  assert.match(result.message, /登录/)
})

test('aliyunpan_task_stop kills a running background task', async () => {
  const { byName, deferreds, taskManager } = createHarness()
  const upload = await byName.aliyunpan_upload.execute({ localPaths: ['/local/a'], remotePath: '/remote' }, {})
  const result = await byName.aliyunpan_task_stop.execute({ taskId: upload.taskId }, {})
  assert.equal(result.ok, true)
  assert.equal(result.status, 'stopping')
  assert.equal(deferreds[0].killed, true)
  assert.equal(taskManager.getTask(upload.taskId).status, 'stopping')
})
