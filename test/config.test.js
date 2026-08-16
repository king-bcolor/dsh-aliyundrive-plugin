import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_CONFIG, buildAliyunpanEnv, normalizeConfig } from '../src/config.js'

test('normalizeConfig returns defaults for empty input', () => {
  const config = normalizeConfig()
  assert.equal(config.aliyunpanBin, 'aliyunpan')
  assert.equal(config.timeoutMs, 60000)
  assert.equal(config.longRunningTimeoutMs, 3600000)
  assert.equal(config.confirmDangerous, true)
  assert.equal(config.configDir, undefined)
  assert.equal(config.maxOutputBytes, 1024 * 1024)
})

test('normalizeConfig merges valid overrides', () => {
  const config = normalizeConfig({
    aliyunpanBin: '/usr/local/bin/aliyunpan',
    configDir: '/tmp/aliyunpan-config',
    timeoutMs: 30000,
    confirmDangerous: false,
  })
  assert.equal(config.aliyunpanBin, '/usr/local/bin/aliyunpan')
  assert.equal(config.configDir, '/tmp/aliyunpan-config')
  assert.equal(config.timeoutMs, 30000)
  assert.equal(config.confirmDangerous, false)
})

test('normalizeConfig rejects invalid timeout', () => {
  assert.throws(() => normalizeConfig({ timeoutMs: 0 }), /timeoutMs/)
  assert.throws(() => normalizeConfig({ timeoutMs: -1 }), /timeoutMs/)
  assert.throws(() => normalizeConfig({ timeoutMs: 'soon' }), /timeoutMs/)
})

test('normalizeConfig rejects invalid aliyunpanBin', () => {
  assert.throws(() => normalizeConfig({ aliyunpanBin: '' }), /aliyunpanBin/)
  assert.throws(() => normalizeConfig({ aliyunpanBin: 42 }), /aliyunpanBin/)
})

test('buildAliyunpanEnv sets ALIYUNPAN_CONFIG_DIR when configDir is provided', () => {
  const env = buildAliyunpanEnv(normalizeConfig({ configDir: '/tmp/adrive-cfg' }))
  assert.equal(env.ALIYUNPAN_CONFIG_DIR, '/tmp/adrive-cfg')
})

test('buildAliyunpanEnv inherits process env', () => {
  const env = buildAliyunpanEnv(normalizeConfig())
  assert.equal(env.PATH, process.env.PATH)
  if (process.env.ALIYUNPAN_CONFIG_DIR !== undefined) {
    assert.equal(env.ALIYUNPAN_CONFIG_DIR, process.env.ALIYUNPAN_CONFIG_DIR)
  }
})

test('DEFAULT_CONFIG is frozen and readable', () => {
  assert.equal(DEFAULT_CONFIG.aliyunpanBin, 'aliyunpan')
  assert.ok(Object.isFrozen(DEFAULT_CONFIG))
})
