/**
 * aliyunpan subprocess runner.
 *
 * Invariants:
 * - argv is passed as an array to child_process.spawn (never a shell string)
 * - stdout/stderr are captured with byte caps
 * - ordinary commands use config.timeoutMs; long transfers use
 *   config.longRunningTimeoutMs via the tools layer
 * - spawn failures are returned as structured results, not thrown
 */

import { spawn } from 'node:child_process'
import { buildAliyunpanEnv } from './config.js'
import { lastNonEmptyLine } from './render.js'

function shellQuote(arg) {
  if (arg === '') return "''"
  if (!/[^\w@%+=:,./\u4e00-\u9fff-]/.test(arg)) return arg
  return `'${arg.replaceAll("'", "'\\''")}'`
}

export function formatCommand(bin, args) {
  return [bin, ...args].map(shellQuote).join(' ')
}

function appendWithCap(target, chunk, limit, state) {
  if (state.truncated) return target
  if (target.length + chunk.length > limit) {
    state.truncated = true
    return target + chunk.slice(0, Math.max(0, limit - target.length))
  }
  return target + chunk
}

function parseProgress(text) {
  const matches = [...(text ?? '').matchAll(/(\d+(?:\.\d+)?)%/g)]
  const percent = matches.length > 0 ? Number(matches.at(-1)[1]) : null
  return {
    percent: Number.isFinite(percent) ? percent : null,
    line: lastNonEmptyLine(text),
  }
}

function buildResult(state, timeoutMs) {
  const ok = state.code === 0 && !state.timedOut && !state.signal
  const result = {
    ok,
    code: state.code,
    signal: state.signal,
    timedOut: state.timedOut,
    stdout: state.stdout,
    stderr: state.stderr,
    error: state.error,
    command: state.command,
    args: state.args,
    durationMs: state.durationMs,
    outputTruncated: state.outputTruncated,
  }
  if (!ok && !result.error && state.timedOut) {
    result.error = `timed out after ${timeoutMs}ms`
  }
  return result
}

/**
 * Spawn aliyunpan and expose both a Promise (`done`) and a live snapshot for
 * background upload/download/sync tasks.
 *
 * @param {any} config normalized config
 * @param {string[]} args aliyunpan argv (e.g. ['who'])
 * @param {{ timeoutMs?: number, env?: Record<string, string>, maxOutputBytes?: number }} [options]
 */
function spawnAliyunpan(config, args, options = {}) {
  const env = { ...buildAliyunpanEnv(config), ...(options.env ?? {}) }
  const maxOutputBytes = options.maxOutputBytes ?? config.maxOutputBytes
  const timeoutMs = options.timeoutMs ?? config.timeoutMs
  const startedAt = Date.now()
  const state = {
    status: 'running',
    code: null,
    signal: null,
    timedOut: false,
    stdout: '',
    stderr: '',
    error: '',
    command: formatCommand(config.aliyunpanBin, args),
    args,
    durationMs: 0,
    outputTruncated: false,
    settled: false,
    child: null,
    startedAt,
  }
  const stdoutState = { truncated: false }
  const stderrState = { truncated: false }

  let resolveDone
  const done = new Promise((resolve) => {
    resolveDone = resolve
  })
  let timer = null

  function finish(error) {
    if (state.settled) return
    state.settled = true
    clearTimeout(timer)
    state.durationMs = Date.now() - startedAt
    state.outputTruncated = stdoutState.truncated || stderrState.truncated
    if (error) {
      state.error = `spawn failed: ${error.message}`
    }
    state.status = buildResult(state, timeoutMs).ok ? 'completed' : 'failed'
    resolveDone(buildResult(state, timeoutMs))
  }

  let child
  try {
    child = spawn(config.aliyunpanBin, args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
  } catch (error) {
    state.durationMs = Date.now() - startedAt
    state.error = `spawn failed: ${error.message}`
    state.status = 'failed'
    state.settled = true
    queueMicrotask(() => resolveDone(buildResult(state, timeoutMs)))
    return makeHandle(state, done)
  }
  state.child = child

  timer = setTimeout(() => {
    state.timedOut = true
    child.kill('SIGTERM')
  }, timeoutMs)
  timer.unref?.()

  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk) => {
    state.stdout = appendWithCap(state.stdout, chunk, maxOutputBytes, stdoutState)
  })
  child.stderr.on('data', (chunk) => {
    state.stderr = appendWithCap(state.stderr, chunk, maxOutputBytes, stderrState)
  })

  child.on('error', (error) => {
    state.timedOut = false
    finish(error)
  })

  child.on('close', (code, signal) => {
    state.code = code
    state.signal = signal
    finish()
  })

  return makeHandle(state, done)
}

function makeHandle(state, done) {
  return {
    get status() {
      return state.status
    },
    get stdout() {
      return state.stdout
    },
    get stderr() {
      return state.stderr
    },
    snapshot() {
      return {
        status: state.status,
        code: state.code,
        signal: state.signal,
        timedOut: state.timedOut,
        stdoutTail: state.stdout.slice(-2000),
        stderrTail: state.stderr.slice(-2000),
        progress: parseProgress(state.stdout),
        durationMs: Date.now() - state.startedAt,
        outputTruncated: state.outputTruncated,
      }
    },
    kill(signal = 'SIGTERM') {
      if (state.child && state.status === 'running') state.child.kill(signal)
    },
    done,
  }
}

/**
 * Run aliyunpan to completion and return the structured result.
 */
export function runAliyunpan(config, args, options = {}) {
  return spawnAliyunpan(config, args, options).done
}

/**
 * Start aliyunpan in the background and return a live handle immediately.
 */
export function startAliyunpan(config, args, options = {}) {
  return spawnAliyunpan(config, args, options)
}
