import test from 'node:test'
import assert from 'node:assert/strict'
import { createTaskManager } from '../src/task-manager.js'

test('task manager creates, updates, finishes and lists tasks', () => {
  const tasks = createTaskManager()
  const id = tasks.createTask({ toolName: 'aliyunpan_upload', command: 'upload', args: ['upload', '/a', '/b'] })
  assert.match(id, /^aliyunpan_/)
  const task = tasks.getTask(id)
  assert.equal(task.id, id)
  assert.equal(task.toolName, 'aliyunpan_upload')
  assert.equal(task.status, 'running')

  tasks.updateTask(id, { progress: { percent: 12 } })
  assert.equal(tasks.getTask(id).progress.percent, 12)

  tasks.finishTask(id, { ok: true, stdout: 'done' })
  assert.equal(tasks.getTask(id).status, 'completed')
  assert.deepEqual(tasks.getTask(id).result, { ok: true, stdout: 'done' })

  const id2 = tasks.createTask({ toolName: 'aliyunpan_download', command: 'download', args: ['download', '/a'] })
  tasks.failTask(id2, new Error('boom'))
  assert.equal(tasks.getTask(id2).status, 'failed')
  assert.equal(tasks.getTask(id2).error, 'boom')

  assert.equal(tasks.listTasks().length, 2)
})

test('task manager returns undefined for unknown task id', () => {
  const tasks = createTaskManager()
  assert.equal(tasks.getTask('missing'), undefined)
})

test('task manager attaches, resolves and stops background handles', () => {
  const tasks = createTaskManager()
  const id = tasks.createTask({ toolName: 'aliyunpan_upload', command: 'upload', args: ['upload', '/a', '/b'] })
  let killed = false
  const handle = {
    kill() {
      killed = true
    },
  }
  tasks.setHandle(id, handle)
  assert.equal(tasks.getHandle(id), handle)
  assert.equal(tasks.stopTask(id), true)
  assert.equal(killed, true)
  assert.equal(tasks.stopTask('missing'), false)
})
