import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

test('package declares a web client bundle', () => {
  const pkg = require('../package.json')
  assert.deepEqual(pkg.dsh.client, {
    platform: 'web',
    inject: [
      '@deepseek-ai/dsh-client-runtime',
      '@deepseek-ai/dsh-client-ui-conversation',
    ],
  })
  assert.equal(pkg.exports['./client'], './lib/client.js')
  assert.equal(pkg.exports['./package.json'], './package.json')
  assert.ok(pkg.files.includes('lib'))
})

test('client bundle loads into the DSH module table and exports apply/inject', async () => {
  const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  let loaded
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(record) {
          loaded = record
        },
      },
    },
    document: undefined,
    console,
  }
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox)
  assert.equal(loaded.id, 'dsh-aliyundrive-plugin')
  assert.equal(typeof loaded.factory, 'function')

  const exports = loaded.factory((specifier) => {
    if (specifier === 'react') {
      return { createElement: () => ({}), useState: () => [], useEffect: () => {}, useMemo: () => [], useRef: () => ({ current: null }) }
    }
    throw new Error(`unexpected require ${specifier}`)
  })
  assert.deepEqual([...exports.inject], ['slots'])
  assert.equal(typeof exports.apply, 'function')
})

test('client apply registers an aliyundrive conversation view tab', async () => {
  const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  let exports
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(record) {
          exports = record.factory((specifier) => {
            if (specifier === 'react') {
              return { createElement: () => ({}), useState: () => [], useEffect: () => {}, useMemo: () => [], useRef: () => ({ current: null }) }
            }
            throw new Error(`unexpected require ${specifier}`)
          })
        },
      },
    },
    document: undefined,
    console,
  }
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox)

  const registrations = []
  const ctx = {
    slots: {
      inject(name, callback) {
        if (name === 'conversation.view') callback()
      },
      register(entry, component) {
        registrations.push({ entry, component })
      },
    },
    effect(fn) { fn() },
  }
  exports.apply(ctx)
  assert.equal(registrations.length, 1)
  assert.equal(registrations[0].entry.name, 'conversation.view')
  assert.equal(registrations[0].entry.id, 'aliyundrive')
  assert.equal(registrations[0].entry.label(), '阿里云盘')
  assert.equal(typeof registrations[0].component, 'function')
})
