/**
 * Maps tool arguments to aliyunpan CLI argv arrays.
 *
 * All path arguments are validated with assertSafePath even though the runner
 * uses spawn (no shell): this keeps path semantics explicit and rejects the
 * shell metacharacters that were historically dangerous for shell-backed
 * integrations.
 */

export class UnsafePathError extends Error {
  constructor(path, reason) {
    super(`unsafe path ${JSON.stringify(path)}: ${reason}`)
    this.name = 'UnsafePathError'
  }
}

const UNSAFE_PATH_PATTERN = /[\r\n\x00|;&`$]/u

/**
 * @param {unknown} value
 * @param {string} label
 * @returns {string | undefined}
 */
export function assertSafePath(value, label = 'path') {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') {
    throw new TypeError(`${label} must be a string`)
  }
  if (value.trim() === '') {
    throw new UnsafePathError(value, 'empty path')
  }
  if (value.startsWith('-')) {
    throw new UnsafePathError(value, 'path must not start with "-"')
  }
  if (UNSAFE_PATH_PATTERN.test(value)) {
    throw new UnsafePathError(value, 'forbidden character in path')
  }
  return value
}

function pushDriveId(argv, driveId) {
  if (driveId !== undefined) {
    assertSafePath(driveId, 'driveId')
    argv.push('--driveId', driveId)
  }
}

function pushExcludes(argv, exn) {
  if (exn !== undefined) {
    if (!Array.isArray(exn)) throw new TypeError('exn must be an array of strings')
    for (const item of exn) {
      if (typeof item !== 'string' || item.trim() === '' || /[\r\n\x00]/u.test(item)) {
        throw new UnsafePathError(item, 'exclude pattern must be a non-empty string without control characters')
      }
      argv.push('--exn', item)
    }
  }
}

function pushNumber(argv, flag, value) {
  if (value !== undefined) {
    if (typeof value !== 'number' && !/^\d+$/.test(String(value))) {
      throw new TypeError(`${flag} must be a number`)
    }
    argv.push(flag, String(value))
  }
}

function pushBoolean(argv, flag, value) {
  if (value === true) argv.push(flag)
}

function assertEnum(value, allowed, label) {
  if (value === undefined) return undefined
  if (!allowed.includes(value)) {
    throw new TypeError(`${label} must be one of ${allowed.join(', ')}`)
  }
  return value
}

function assertRequiredPath(value, label) {
  if (value === undefined || value === null) {
    throw new TypeError(`${label} is required`)
  }
  return assertSafePath(value, label)
}

function assertPathArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty array of paths`)
  }
  return value.map((item) => assertSafePath(item, label))
}

/**
 * @param {string} toolName
 * @param {Record<string, any>} args
 * @returns {string[]}
 */
export function buildAliyunpanArgs(toolName, args = {}) {
  const argv = []
  switch (toolName) {
    case 'aliyunpan_login':
      return ['login']

    case 'aliyunpan_who':
      return ['who']

    case 'aliyunpan_loglist':
      return ['loglist']

    case 'aliyunpan_drive':
      argv.push('drive')
      if (args.driveId !== undefined) argv.push(assertSafePath(args.driveId, 'driveId'))
      return argv

    case 'aliyunpan_quota':
      return ['quota']

    case 'aliyunpan_pwd':
      return ['pwd']

    case 'aliyunpan_cd':
      argv.push('cd')
      pushDriveId(argv, args.driveId)
      argv.push(assertRequiredPath(args.path, 'path'))
      return argv

    case 'aliyunpan_ls':
      argv.push(args.detail === true ? 'll' : 'ls')
      pushDriveId(argv, args.driveId)
      assertEnum(args.order, ['asc', 'desc'], 'order')
      assertEnum(args.sort, ['time', 'name', 'size'], 'sort')
      if (args.order === 'asc') argv.push('--asc')
      if (args.order === 'desc') argv.push('--desc')
      if (args.sort === 'time') argv.push('--time')
      if (args.sort === 'name') argv.push('--name')
      if (args.sort === 'size') argv.push('--size')
      if (args.path !== undefined) argv.push(assertSafePath(args.path, 'path'))
      return argv

    case 'aliyunpan_mkdir':
      argv.push('mkdir')
      pushDriveId(argv, args.driveId)
      argv.push(assertRequiredPath(args.path, 'path'))
      return argv

    case 'aliyunpan_rename':
      argv.push('rename')
      pushDriveId(argv, args.driveId)
      argv.push(assertRequiredPath(args.path, 'path'))
      argv.push(assertRequiredPath(args.newName, 'newName'))
      return argv

    case 'aliyunpan_mv':
    case 'aliyunpan_cp': {
      const command = toolName === 'aliyunpan_mv' ? 'mv' : 'cp'
      argv.push(command)
      pushDriveId(argv, args.driveId)
      const paths = assertPathArray(args.paths, 'paths')
      const destination = assertRequiredPath(args.destination, 'destination')
      argv.push(...paths, destination)
      return argv
    }

    case 'aliyunpan_rm':
      argv.push('rm')
      pushDriveId(argv, args.driveId)
      argv.push(...assertPathArray(args.paths, 'paths'))
      return argv

    case 'aliyunpan_upload': {
      argv.push('upload')
      pushDriveId(argv, args.driveId)
      pushExcludes(argv, args.exn)
      pushBoolean(argv, '--ui', args.ui)
      pushBoolean(argv, '--ow', args.ow)
      pushBoolean(argv, '--skip', args.skip)
      pushBoolean(argv, '--norapid', args.noRapid)
      pushBoolean(argv, '--np', args.noProgress)
      pushNumber(argv, '-p', args.parallel)
      pushNumber(argv, '--retry', args.retry)
      pushNumber(argv, '--timeout', args.timeout)
      pushNumber(argv, '--bs', args.blockSize)
      const localPaths = assertPathArray(args.localPaths, 'localPaths')
      const remotePath = assertRequiredPath(args.remotePath, 'remotePath')
      argv.push(...localPaths, remotePath)
      return argv
    }

    case 'aliyunpan_download': {
      argv.push('download')
      pushDriveId(argv, args.driveId)
      pushBoolean(argv, '--save', args.save)
      if (args.saveTo !== undefined) {
        assertSafePath(args.saveTo, 'saveTo')
        argv.push('--saveto', args.saveTo)
      }
      pushBoolean(argv, '--ow', args.ow)
      pushBoolean(argv, '--status', args.status)
      pushBoolean(argv, '-x', args.x)
      pushNumber(argv, '--retry', args.retry)
      if (args.nocheck === true || args.check === false) argv.push('--nocheck')
      pushBoolean(argv, '--np', args.noProgress)
      pushNumber(argv, '-p', args.parallel)
      pushExcludes(argv, args.exn)
      argv.push(...assertPathArray(args.remotePaths, 'remotePaths'))
      return argv
    }

    case 'aliyunpan_share_set': {
      argv.push('share', 'set')
      pushDriveId(argv, args.driveId)
      assertEnum(args.time, ['0', '1', '2'], 'time')
      assertEnum(args.mode, ['1', '2', '3'], 'mode')
      if (args.time !== undefined) argv.push('--time', String(args.time))
      if (args.mode !== undefined) argv.push('--mode', String(args.mode))
      if (args.sharePwd !== undefined) argv.push('--sharePwd', String(args.sharePwd))
      argv.push(...assertPathArray(args.paths, 'paths'))
      return argv
    }

    case 'aliyunpan_album_list':
      return ['album', 'list']

    case 'aliyunpan_album_show':
      argv.push('album', 'list-file')
      argv.push(assertRequiredPath(args.albumId, 'albumId'))
      return argv

    case 'aliyunpan_album_download': {
      argv.push('album', 'download-file')
      pushBoolean(argv, '--ow', args.ow)
      if (args.saveTo !== undefined) {
        assertSafePath(args.saveTo, 'saveTo')
        argv.push('--saveto', args.saveTo)
      }
      pushBoolean(argv, '--np', args.noProgress)
      argv.push(assertRequiredPath(args.albumId, 'albumId'))
      return argv
    }

    case 'aliyunpan_sync_start': {
      argv.push('sync', 'start')
      assertEnum(args.drive, ['backup', 'resource'], 'drive')
      assertEnum(args.mode, ['upload', 'download'], 'mode')
      assertEnum(args.policy, ['exclusive', 'increment'], 'policy')
      assertEnum(args.cycle, ['infinity', 'onetime'], 'cycle')
      if (args.drive !== undefined) argv.push('--drive', assertSafePath(args.drive, 'drive'))
      argv.push('--ldir', assertRequiredPath(args.ldir, 'ldir'))
      argv.push('--pdir', assertRequiredPath(args.pdir, 'pdir'))
      if (args.mode !== undefined) argv.push('--mode', String(args.mode))
      if (args.policy !== undefined) argv.push('--policy', String(args.policy))
      if (args.cycle !== undefined) argv.push('--cycle', String(args.cycle))
      pushNumber(argv, '--dp', args.dp)
      pushNumber(argv, '--up', args.up)
      pushNumber(argv, '--dbs', args.dbs)
      pushNumber(argv, '--ubs', args.ubs)
      if (args.log !== undefined) argv.push('--log', String(args.log))
      pushNumber(argv, '--ldt', args.ldt)
      pushNumber(argv, '--sit', args.sit)
      return argv
    }

    case 'aliyunpan_sync_stop':
      return ['sync', 'stop']

    case 'aliyunpan_sync_list':
      return ['sync', 'list']

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}
