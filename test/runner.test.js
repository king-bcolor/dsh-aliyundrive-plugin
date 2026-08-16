import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeConfig } from '../src/config.js'
import { runAliyunpan, startAliyunpan } from '../src/aliyunpan-runner.js'

const fixture = fileURLToPath(new URL('./fixtures/mock-aliyunpan.js', import.meta.url))

test('runAliyunpan spawns with an args array and captures stdout', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'adrive-runner-'))
  const outFile = join(dir, 'args.json')
  try {
    const config = normalizeConfig({ aliyunpanBin: process.execPath, timeoutMs: 5000 })
    const result = await runAliyunpan(config, [fixture, 'who'], { env: { MOCK_ALIYUNPAN_OUT: outFile } })
    assert.equal(result.ok, true)
    assert.equal(result.code, 0)
    assert.match(result.stdout, /MOCK ALIYUNPAN OK/)
    const recorded = JSON.parse(await readFile(outFile, 'utf8'))
    assert.deepEqual(recorded.args, ['who'])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('runAliyunpan passes ALIYUNPAN_CONFIG_DIR into the child env', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'adrive-runner-'))
  const configDir = join(dir, 'config')
  const outFile = join(dir, 'env.json')
  try {
    const config = normalizeConfig({ aliyunpanBin: process.execPath, configDir, timeoutMs: 5000 })
    const result = await runAliyunpan(config, [fixture, 'pwd'], { env: { MOCK_ALIYUNPAN_OUT: outFile } })
    assert.equal(result.ok, true)
    const recorded = JSON.parse(await readFile(outFile, 'utf8'))
    assert.equal(recorded.env.ALIYUNPAN_CONFIG_DIR, configDir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('runAliyunpan maps timeouts and non-zero exit codes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'adrive-runner-'))
  try {
    const config = normalizeConfig({ aliyunpanBin: process.execPath, timeoutMs: 5000 })
    const timed = await runAliyunpan(config, [fixture, '--sleep', '200'], { timeoutMs: 50 })
    assert.equal(timed.ok, false)
    assert.equal(timed.timedOut, true)

    const failed = await runAliyunpan(config, [fixture, '--exit', '3'], { timeoutMs: 5000 })
    assert.equal(failed.ok, false)
    assert.equal(failed.code, 3)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('runAliyunpan returns a spawn error as a structured result', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'adrive-runner-'))
  try {
    const config = normalizeConfig({ aliyunpanBin: join(dir, 'does-not-exist'), timeoutMs: 5000 })
    const result = await runAliyunpan(config, ['who'])
    assert.equal(result.ok, false)
    assert.match(result.error, /spawn/i)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('runAliyunpan truncates stdout beyond maxOutputBytes', async () => {
  const config = normalizeConfig({ aliyunpanBin: process.execPath, timeoutMs: 5000 })
  const result = await runAliyunpan(config, [fixture, '--noise', '100000'], {
    maxOutputBytes: 256,
  })
  assert.equal(result.ok, true)
  assert.equal(result.outputTruncated, true)
  assert.ok(result.stdout.length <= 256)
})

test('startAliyunpan starts a background task and settles when it exits', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'adrive-start-'))
  try {
    const config = normalizeConfig({ aliyunpanBin: process.execPath, timeoutMs: 5000 })
    const handle = await startAliyunpan(config, [fixture, '--sleep', '60'], { timeoutMs: 5000 })
    assert.equal(handle.status, 'running')
    assert.equal(handle.snapshot().status, 'running')
    const result = await handle.done
    assert.equal(result.ok, true)
    assert.equal(handle.status, 'completed')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('startAliyunpan kill stops the child and fails the done result', async () => {
  const config = normalizeConfig({ aliyunpanBin: process.execPath, timeoutMs: 5000 })
  const handle = await startAliyunpan(config, [fixture, '--sleep', '60000'], { timeoutMs: 5000 })
  handle.kill('SIGTERM')
  const result = await handle.done
  assert.equal(result.ok, false)
  assert.ok(result.signal !== null || handle.status === 'failed')
})
