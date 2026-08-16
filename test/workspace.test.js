import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

test('dsh-aliyundrive-plugin workspace is a valid DSH bundle', async () => {
  const pkg = require('../package.json')
  assert.equal(pkg.name, 'dsh-aliyundrive-plugin')
  assert.equal(pkg.type, 'module')
  assert.equal(pkg.main, 'index.js')
  assert.deepEqual(pkg.dsh, { bundle: { patch: './cordis.patch.yml' } })
  assert.ok(pkg.files.includes('index.js'))
  assert.ok(pkg.files.includes('cordis.patch.yml'))
})

test('dsh-aliyundrive-plugin cordis.patch.yml inserts the plugin row', async () => {
  const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  assert.ok(patch.includes('id: aliyundrive'))
  assert.ok(patch.includes('name: dsh-aliyundrive-plugin'))
})

test('dsh-aliyundrive-plugin entry exports name and apply', async () => {
  const mod = await import('../index.js')
  assert.equal(typeof mod.name, 'string')
  assert.equal(typeof mod.apply, 'function')
})
