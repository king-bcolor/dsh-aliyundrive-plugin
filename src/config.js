/**
 * Runtime configuration for the aliyundrive plugin.
 * The DSH loader may pass a raw config object from the profile patch row;
 * normalizeConfig validates and fills defaults before tools are registered.
 */

export const DEFAULT_CONFIG = Object.freeze({
  aliyunpanBin: 'aliyunpan',
  configDir: undefined,
  timeoutMs: 60000,
  longRunningTimeoutMs: 3600000,
  maxOutputBytes: 1024 * 1024,
  confirmDangerous: true,
})

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string`)
  }
}

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive integer`)
  }
}

/**
 * @param {Record<string, unknown> | undefined} raw
 */
export function normalizeConfig(raw = {}) {
  const input = raw && typeof raw === 'object' ? raw : {}
  const config = {
    aliyunpanBin: input.aliyunpanBin ?? DEFAULT_CONFIG.aliyunpanBin,
    configDir: input.configDir ?? DEFAULT_CONFIG.configDir,
    timeoutMs: input.timeoutMs ?? DEFAULT_CONFIG.timeoutMs,
    longRunningTimeoutMs: input.longRunningTimeoutMs ?? DEFAULT_CONFIG.longRunningTimeoutMs,
    maxOutputBytes: input.maxOutputBytes ?? DEFAULT_CONFIG.maxOutputBytes,
    confirmDangerous: input.confirmDangerous ?? DEFAULT_CONFIG.confirmDangerous,
  }

  assertNonEmptyString(config.aliyunpanBin, 'aliyunpanBin')
  if (config.configDir !== undefined && config.configDir !== null) {
    assertNonEmptyString(config.configDir, 'configDir')
  } else {
    config.configDir = undefined
  }
  assertPositiveInteger(config.timeoutMs, 'timeoutMs')
  assertPositiveInteger(config.longRunningTimeoutMs, 'longRunningTimeoutMs')
  assertPositiveInteger(config.maxOutputBytes, 'maxOutputBytes')
  if (typeof config.confirmDangerous !== 'boolean') {
    throw new TypeError('confirmDangerous must be a boolean')
  }

  return config
}

/**
 * Child-process environment for aliyunpan. The CLI reads ALIYUNPAN_CONFIG_DIR
 * to relocate its config/login state; we never read the files themselves.
 *
 * @param {ReturnType<typeof normalizeConfig>} config
 */
export function buildAliyunpanEnv(config) {
  const env = { ...process.env }
  if (config.configDir !== undefined) {
    env.ALIYUNPAN_CONFIG_DIR = config.configDir
  }
  return env
}
