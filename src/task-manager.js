/**
 * In-memory long-task registry for upload/download/sync operations.
 *
 * Background subprocess handles are attached to task records; status tools
 * read live snapshots while the process is running and the final result once
 * it exits.
 */

let sequence = 0

export function createTaskManager() {
  const tasks = new Map()
  const handles = new Map()

  return {
    createTask({ toolName, command, args }) {
      sequence += 1
      const id = `aliyunpan_${Date.now().toString(36)}_${sequence}`
      const task = {
        id,
        toolName,
        command,
        args,
        status: 'running',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
        result: null,
        error: null,
      }
      tasks.set(id, task)
      return id
    },

    getTask(id) {
      return tasks.get(id)
    },

    listTasks() {
      return [...tasks.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    updateTask(id, patch) {
      const task = tasks.get(id)
      if (!task) return undefined
      Object.assign(task, patch, { updatedAt: new Date().toISOString() })
      return task
    },

    setHandle(id, handle) {
      if (!tasks.has(id)) return undefined
      handles.set(id, handle)
      return handle
    },

    getHandle(id) {
      return handles.get(id)
    },

    stopTask(id, signal = 'SIGTERM') {
      const task = tasks.get(id)
      const handle = handles.get(id)
      if (!task || !handle || task.status !== 'running') return false
      this.updateTask(id, { status: 'stopping' })
      handle.kill(signal)
      return true
    },

    finishTask(id, result) {
      handles.delete(id)
      return this.updateTask(id, {
        status: 'completed',
        result,
        error: null,
        completedAt: new Date().toISOString(),
      })
    },

    failTask(id, error) {
      handles.delete(id)
      const message = error instanceof Error ? error.message : String(error)
      return this.updateTask(id, {
        status: 'failed',
        result: null,
        error: message,
        completedAt: new Date().toISOString(),
      })
    },
  }
}
