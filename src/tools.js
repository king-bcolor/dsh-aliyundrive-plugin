/**
 * aliyundrive tool catalog: model-facing tools that wrap the aliyunpan CLI.
 *
 * Every tool returns a structured JSON object. Read-only commands execute
 * immediately; upload/download/sync are registered in the task manager and
 * expose their taskId for status polling.
 */

import { runAliyunpan, startAliyunpan } from './aliyunpan-runner.js'
import { UnsafePathError, buildAliyunpanArgs } from './command-builder.js'
import { defineTool } from './define-tool.js'
import { lastNonEmptyLine, parseLsLines, parsePwd, renderJson } from './render.js'
import { createTaskManager } from './task-manager.js'

const LONG_RUNNING_TOOLS = new Set([
  'aliyunpan_upload',
  'aliyunpan_download',
  'aliyunpan_sync_start',
])

const UNSUPPORTED_TOOLS = new Map([
  ['aliyunpan_sync_stop', '当前 aliyunpan v0.3.x 仅支持 sync start；sync stop 不可用。'],
  ['aliyunpan_sync_list', '当前 aliyunpan v0.3.x 仅支持 sync start；sync list 不可用。'],
])

function requiresConfirmation(toolName, args, config) {
  if (config.confirmDangerous === false) return false
  switch (toolName) {
    case 'aliyunpan_rm':
      return true
    case 'aliyunpan_upload':
    case 'aliyunpan_download':
    case 'aliyunpan_album_download':
      return args.ow === true
    case 'aliyunpan_sync_start':
      return args.policy === 'exclusive'
    default:
      return false
  }
}

function confirmationMessage(toolName, args) {
  switch (toolName) {
    case 'aliyunpan_rm':
      return '删除操作需要显式 confirm: true 才能执行。'
    case 'aliyunpan_sync_start':
      return 'exclusive 同步策略会删除目标目录多余文件，需要显式 confirm: true。'
    default:
      return '覆盖/危险操作需要显式 confirm: true 才能执行。'
  }
}

function structuredError(error, message) {
  return { ok: false, error, message }
}

const NOT_LOGGED_IN_PATTERN = /未登录账号/u

function classifyResult(toolName, result) {
  if (!result || typeof result !== 'object') return result
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  if (toolName !== 'aliyunpan_login' && NOT_LOGGED_IN_PATTERN.test(output)) {
    return {
      ...result,
      ok: false,
      error: 'NOT_LOGGED_IN',
      message: '尚未登录阿里云盘：请先调用 aliyunpan_login 完成浏览器授权登录。',
    }
  }
  if (result.ok !== true && !result.error) {
    const detail = lastNonEmptyLine(`${result.stderr ?? ''}\n${result.stdout ?? ''}`)
    return {
      ...result,
      error: 'CLI_ERROR',
      message: detail || `aliyunpan exited with code ${result.code}`,
    }
  }
  return result
}

/**
 * @param {import('./config.js').normalizeConfig} config
 * @param {{ run?: Function, taskManager?: ReturnType<typeof createTaskManager> }} [deps]
 */
export function createAliyundriveTools(config, deps = {}) {
  const run = deps.run ?? ((cfg, argv, opts) => runAliyunpan(cfg, argv, opts))
  const start = deps.start ?? ((cfg, argv, opts) => startAliyunpan(cfg, argv, opts))
  const taskManager = deps.taskManager ?? createTaskManager()

  async function executeSpawn(toolName, args) {
    if (UNSUPPORTED_TOOLS.has(toolName)) {
      return structuredError('UNSUPPORTED_COMMAND', UNSUPPORTED_TOOLS.get(toolName))
    }

    if (requiresConfirmation(toolName, args, config) && args.confirm !== true) {
      return structuredError('CONFIRM_REQUIRED', confirmationMessage(toolName, args))
    }

    let argv
    try {
      argv = buildAliyunpanArgs(toolName, args)
    } catch (error) {
      return structuredError(
        error instanceof UnsafePathError ? 'UNSAFE_PATH' : 'INVALID_ARGS',
        error.message,
      )
    }

    const isLongRunning = LONG_RUNNING_TOOLS.has(toolName)

    if (isLongRunning) {
      let handle
      try {
        handle = await start(config, argv, { timeoutMs: config.longRunningTimeoutMs })
      } catch (error) {
        return structuredError('RUNNER_ERROR', error.message)
      }
      const taskId = taskManager.createTask({ toolName, command: argv[0], args: argv })
      taskManager.setHandle(taskId, handle)
      handle.done.then(
        (raw) => {
          const result = classifyResult(toolName, raw)
          if (result.ok) {
            taskManager.finishTask(taskId, result)
          } else {
            taskManager.failTask(taskId, new Error(result.error || result.message || `exit code ${result.code}`))
          }
        },
        (error) => {
          taskManager.failTask(taskId, error)
        },
      )
      return {
        ok: true,
        taskId,
        status: handle.status ?? 'running',
        command: handle.command ?? argv.join(' '),
        message: '长任务已启动，请使用 aliyunpan_task_status 轮询进度。',
      }
    }

    try {
      const raw = await run(config, argv, { timeoutMs: config.timeoutMs })
      return classifyResult(toolName, raw)
    } catch (error) {
      return structuredError('RUNNER_ERROR', error.message)
    }
  }

  const output = { schema: { type: 'json' }, render: renderJson }

  const tools = [
    defineTool({
      name: 'aliyunpan_login',
      description: 'Login to Alibaba Cloud Drive by opening the browser authorization flow (the link is valid for about 5 minutes). Run aliyunpan_who afterwards to verify the login state.',
      parameters: {},
      output,
      execute: () => executeSpawn('aliyunpan_login', {}),
    }),

    defineTool({
      name: 'aliyunpan_who',
      description: 'Show the currently logged-in Alibaba Cloud Drive account.',
      parameters: {},
      output,
      execute: async () => {
        const result = await executeSpawn('aliyunpan_who', {})
        return result.ok ? { ...result, account: result.stdout } : result
      },
    }),

    defineTool({
      name: 'aliyunpan_loglist',
      description: 'List every Alibaba Cloud Drive account that has been logged in on this machine.',
      parameters: {},
      output,
      execute: async () => {
        const result = await executeSpawn('aliyunpan_loglist', {})
        return result.ok ? { ...result, accounts: parseLsLines(result.stdout) } : result
      },
    }),

    defineTool({
      name: 'aliyunpan_drive',
      description: 'Switch the active cloud drive (backup drive or resource drive). Leave driveId empty to list available drives interactively.',
      parameters: {
        driveId: { type: 'string', description: 'Optional drive id; omit to list available drives.' },
      },
      output,
      execute: (args) => executeSpawn('aliyunpan_drive', args),
    }),

    defineTool({
      name: 'aliyunpan_quota',
      description: 'Get total and used storage quota of the current Alibaba Cloud Drive.',
      parameters: {},
      output,
      execute: () => executeSpawn('aliyunpan_quota', {}),
    }),

    defineTool({
      name: 'aliyunpan_pwd',
      description: 'Print the current working directory on Alibaba Cloud Drive.',
      parameters: {},
      output,
      execute: async () => {
        const result = await executeSpawn('aliyunpan_pwd', {})
        return result.ok ? { ...result, path: parsePwd(result.stdout) } : result
      },
    }),

    defineTool({
      name: 'aliyunpan_cd',
      description: 'Change the current working directory on Alibaba Cloud Drive.',
      parameters: {
        path: { type: 'string', required: true, description: 'Absolute or relative cloud-drive path, e.g. /我的资源.' },
        driveId: { type: 'string', description: 'Optional drive id.' },
      },
      output,
      execute: (args) => executeSpawn('aliyunpan_cd', args),
    }),

    defineTool({
      name: 'aliyunpan_ls',
      description: 'List files and directories in the current or specified Alibaba Cloud Drive directory. Set detail to true for ll (detailed) output.',
      parameters: {
        path: { type: 'string', description: 'Optional directory path; defaults to the current working directory.' },
        driveId: { type: 'string', description: 'Optional drive id.' },
        detail: { type: 'boolean', description: 'Use ll detailed output when true.' },
        order: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction.' },
        sort: { type: 'string', enum: ['time', 'name', 'size'], description: 'Sort key.' },
      },
      output,
      execute: async (args) => {
        const result = await executeSpawn('aliyunpan_ls', args)
        return result.ok ? { ...result, files: parseLsLines(result.stdout) } : result
      },
    }),

    defineTool({
      name: 'aliyunpan_mkdir',
      description: 'Create a directory on Alibaba Cloud Drive.',
      parameters: {
        path: { type: 'string', required: true, description: 'Directory path to create.' },
        driveId: { type: 'string', description: 'Optional drive id.' },
      },
      output,
      execute: (args) => executeSpawn('aliyunpan_mkdir', args),
    }),

    defineTool({
      name: 'aliyunpan_rename',
      description: 'Rename a file or directory. The new name must stay in the same parent directory.',
      parameters: {
        path: { type: 'string', required: true, description: 'Existing file/directory path.' },
        newName: { type: 'string', required: true, description: 'New name (same directory).' },
        driveId: { type: 'string', description: 'Optional drive id.' },
      },
      output,
      execute: (args) => executeSpawn('aliyunpan_rename', args),
    }),

    defineTool({
      name: 'aliyunpan_mv',
      description: 'Move one or more files/directories to a destination directory on the same drive.',
      parameters: {
        paths: { type: 'array', items: { type: 'string' }, required: true, description: 'Source file/directory paths.' },
        destination: { type: 'string', required: true, description: 'Destination directory path.' },
        driveId: { type: 'string', description: 'Optional drive id.' },
      },
      output,
      execute: (args) => executeSpawn('aliyunpan_mv', args),
    }),

    defineTool({
      name: 'aliyunpan_cp',
      description: 'Copy one or more files/directories inside the same Alibaba Cloud Drive.',
      parameters: {
        paths: { type: 'array', items: { type: 'string' }, required: true, description: 'Source file/directory paths.' },
        destination: { type: 'string', required: true, description: 'Destination directory path.' },
        driveId: { type: 'string', description: 'Optional drive id.' },
      },
      output,
      execute: (args) => executeSpawn('aliyunpan_cp', args),
    }),

    defineTool({
      name: 'aliyunpan_rm',
      description: 'Delete one or more files/directories. They move to the cloud recycle bin. This is destructive, so confirm must be explicitly true.',
      parameters: {
        paths: { type: 'array', items: { type: 'string' }, required: true, description: 'Paths to delete.' },
        driveId: { type: 'string', description: 'Optional drive id.' },
        confirm: { type: 'boolean', description: 'Must be true to execute this destructive operation.' },
      },
      output,
      execute: (args) => executeSpawn('aliyunpan_rm', args),
    }),

    defineTool({
      name: 'aliyunpan_upload',
      description: 'Upload local files/directories to an Alibaba Cloud Drive directory. Returns a taskId that can be polled with aliyunpan_task_status.',
      parameters: {
        localPaths: { type: 'array', items: { type: 'string' }, required: true, description: 'Local source paths.' },
        remotePath: { type: 'string', required: true, description: 'Destination cloud-drive directory.' },
        driveId: { type: 'string', description: 'Optional drive id.' },
        exn: { type: 'array', items: { type: 'string' }, description: 'Regex exclude patterns, repeated for each pattern.' },
        ui: { type: 'boolean', description: 'Show the upload progress UI panel.' },
        ow: { type: 'boolean', description: 'Overwrite same-name files (moves existing files to recycle bin). Requires confirm: true.' },
        skip: { type: 'boolean', description: 'Skip same-name files without checking content.' },
        noRapid: { type: 'boolean', description: 'Disable rapid-upload SHA1 detection.' },
        noProgress: { type: 'boolean', description: 'Disable the text progress bar.' },
        parallel: { type: 'integer', description: 'Concurrent upload count (1~20).' },
        retry: { type: 'integer', description: 'Upload retry count.' },
        timeout: { type: 'integer', description: 'Upload HTTP timeout in seconds.' },
        blockSize: { type: 'integer', description: 'Upload block size in KB.' },
        confirm: { type: 'boolean', description: 'Required when ow is true.' },
      },
      output,
      execute: (args) => executeSpawn('aliyunpan_upload', args),
    }),

    defineTool({
      name: 'aliyunpan_download',
      description: 'Download files/directories from Alibaba Cloud Drive to a local directory. Returns a taskId that can be polled with aliyunpan_task_status.',
      parameters: {
        remotePaths: { type: 'array', items: { type: 'string' }, required: true, description: 'Cloud-drive source paths.' },
        saveTo: { type: 'string', description: 'Local save directory.' },
        save: { type: 'boolean', description: 'Save into the current local working directory.' },
        ow: { type: 'boolean', description: 'Overwrite existing files. Requires confirm: true.' },
        status: { type: 'boolean', description: 'Print all worker thread status.' },
        x: { type: 'boolean', description: 'Add executable permission to downloaded files.' },
        retry: { type: 'integer', description: 'Download retry count.' },
        nocheck: { type: 'boolean', description: 'Skip checksum verification after download.' },
        noProgress: { type: 'boolean', description: 'Disable the text progress bar.' },
        parallel: { type: 'integer', description: 'Concurrent download file count (1~3).' },
        driveId: { type: 'string', description: 'Optional drive id.' },
        exn: { type: 'array', items: { type: 'string' }, description: 'Regex exclude patterns.' },
        confirm: { type: 'boolean', description: 'Required when ow is true.' },
      },
      output,
      execute: (args) => executeSpawn('aliyunpan_download', args),
    }),

    defineTool({
      name: 'aliyunpan_share_set',
      description: 'Create a share or rapid-transfer link for one or more files/directories.',
      parameters: {
        paths: { type: 'array', items: { type: 'string' }, required: true, description: 'Paths to share.' },
        driveId: { type: 'string', description: 'Optional drive id.' },
        time: { type: 'string', enum: ['0', '1', '2'], description: 'Validity: 0=permanent, 1=1 day, 2=7 days.' },
        mode: { type: 'string', enum: ['1', '2', '3'], description: 'Mode: 1=private share, 2=public share, 3=rapid-transfer.' },
        sharePwd: { type: 'string', description: 'Optional 4-character share password.' },
      },
      output,
      execute: (args) => executeSpawn('aliyunpan_share_set', args),
    }),

    defineTool({
      name: 'aliyunpan_album_list',
      description: 'List shared albums on Alibaba Cloud Drive.',
      parameters: {},
      output,
      execute: () => executeSpawn('aliyunpan_album_list', {}),
    }),

    defineTool({
      name: 'aliyunpan_album_show',
      description: 'List files in one shared album by album name.',
      parameters: {
        albumId: { type: 'string', required: true, description: 'Album name or id.' },
      },
      output,
      execute: async (args) => {
        const result = await executeSpawn('aliyunpan_album_show', args)
        return result.ok ? { ...result, files: parseLsLines(result.stdout) } : result
      },
    }),

    defineTool({
      name: 'aliyunpan_album_download',
      description: 'Download all files from a shared album to a local directory.',
      parameters: {
        albumId: { type: 'string', required: true, description: 'Album name or id.' },
        saveTo: { type: 'string', description: 'Local save directory.' },
        ow: { type: 'boolean', description: 'Overwrite existing files. Requires confirm: true.' },
        noProgress: { type: 'boolean', description: 'Disable the text progress bar.' },
        confirm: { type: 'boolean', description: 'Required when ow is true.' },
      },
      output,
      execute: (args) => executeSpawn('aliyunpan_album_download', args),
    }),

    defineTool({
      name: 'aliyunpan_sync_start',
      description: 'Start an upload/download sync backup task between a local directory and a dedicated cloud directory. Returns a taskId.',
      parameters: {
        ldir: { type: 'string', required: true, description: 'Local directory full path.' },
        pdir: { type: 'string', required: true, description: 'Cloud directory full path.' },
        mode: { type: 'string', enum: ['upload', 'download'], description: 'Backup mode.' },
        policy: { type: 'string', enum: ['exclusive', 'increment'], description: 'Backup policy. exclusive deletes extra target files and requires confirm: true.' },
        drive: { type: 'string', enum: ['backup', 'resource'], description: 'Drive name.' },
        cycle: { type: 'string', enum: ['infinity', 'onetime'], description: 'Backup cycle.' },
        dp: { type: 'integer', description: 'Download parallel count (1~10).' },
        up: { type: 'integer', description: 'Upload parallel count (1~10).' },
        dbs: { type: 'integer', description: 'Download block size in KB.' },
        ubs: { type: 'integer', description: 'Upload block size in KB.' },
        log: { type: 'boolean', description: 'Show per-file backup log.' },
        ldt: { type: 'number', description: 'Local modification detection delay in seconds.' },
        sit: { type: 'number', description: 'Directory scan interval in minutes.' },
        confirm: { type: 'boolean', description: 'Required when policy is exclusive.' },
      },
      output,
      execute: (args) => executeSpawn('aliyunpan_sync_start', args),
    }),

    defineTool({
      name: 'aliyunpan_sync_stop',
      description: 'Stop a sync backup task. Note: current aliyunpan v0.3.x CLI does not expose sync stop.',
      parameters: {
        taskId: { type: 'string', required: true, description: 'Sync task id.' },
      },
      output,
      execute: (args) => executeSpawn('aliyunpan_sync_stop', args),
    }),

    defineTool({
      name: 'aliyunpan_sync_list',
      description: 'List sync backup tasks. Note: current aliyunpan v0.3.x CLI does not expose sync list.',
      parameters: {},
      output,
      execute: () => executeSpawn('aliyunpan_sync_list', {}),
    }),

    defineTool({
      name: 'aliyunpan_task_status',
      description: 'Poll the status of a previously started aliyunpan upload/download/sync task by taskId.',
      parameters: {
        taskId: { type: 'string', required: true, description: 'Task id returned by aliyunpan_upload/download/sync_start.' },
      },
      output,
      execute: (args) => {
        const task = taskManager.getTask(args.taskId)
        if (!task) {
          return structuredError('TASK_NOT_FOUND', `no task found for taskId ${args.taskId}`)
        }
        const handle = taskManager.getHandle(args.taskId)
        if (task.status === 'running' && handle) {
          const live = handle.snapshot()
          return {
            ok: true,
            ...task,
            progress: live.progress,
            stdoutTail: live.stdoutTail,
            stderrTail: live.stderrTail,
          }
        }
        return { ok: true, ...task }
      },
    }),

    defineTool({
      name: 'aliyunpan_task_list',
      description: 'List all aliyunpan long-running tasks tracked by this plugin session.',
      parameters: {},
      output,
      execute: () => {
        const tasks = taskManager.listTasks().map((task) => {
          const handle = taskManager.getHandle(task.id)
          if (task.status === 'running' && handle) {
            const live = handle.snapshot()
            return { ...task, progress: live.progress, stdoutTail: live.stdoutTail }
          }
          return task
        })
        return { ok: true, tasks }
      },
    }),

    defineTool({
      name: 'aliyunpan_task_stop',
      description: 'Stop a running aliyunpan background upload/download/sync task by taskId.',
      parameters: {
        taskId: { type: 'string', required: true, description: 'Task id returned by aliyunpan_upload/download/sync_start.' },
      },
      output,
      execute: (args) => {
        const task = taskManager.getTask(args.taskId)
        if (!task) {
          return structuredError('TASK_NOT_FOUND', `no task found for taskId ${args.taskId}`)
        }
        if (!taskManager.stopTask(args.taskId)) {
          return structuredError('TASK_NOT_RUNNING', `task ${args.taskId} is not running`)
        }
        return {
          ok: true,
          taskId: args.taskId,
          status: 'stopping',
          message: '已发送停止信号；请稍后通过 aliyunpan_task_status 确认任务状态。',
        }
      },
    }),
  ]

  return tools
}
