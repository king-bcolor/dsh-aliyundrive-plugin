import test from 'node:test'
import assert from 'node:assert/strict'
import { apply, name } from '../index.js'

test('apply registers tools into a mock DSH context', () => {
  const registered = []
  const ctx = {
    tools: {
      register(tool) {
        registered.push(tool)
      },
    },
  }
  apply(ctx, { aliyunpanBin: '/usr/local/bin/aliyunpan' })
  assert.equal(name, 'aliyundrive')
  assert.ok(registered.length >= 24)
  assert.ok(registered.every((tool) => typeof tool.name === 'string' && typeof tool.execute === 'function'))
})

test('apply falls back to ctx.aliyundrive when tools service is absent', () => {
  const ctx = {}
  apply(ctx, {})
  assert.ok(ctx.aliyundrive)
  assert.equal(ctx.aliyundrive.config.aliyunpanBin, 'aliyunpan')
  assert.ok(Array.isArray(ctx.aliyundrive.tools))
  assert.ok(ctx.aliyundrive.taskManager)
})

test('apply does not read ctx.config without inject', () => {
  const registered = []
  const ctx = new Proxy({
    tools: {
      register(tool) {
        registered.push(tool)
      },
    },
  }, {
    get(target, property, receiver) {
      if (property === 'config') throw new Error('cannot get property "config" without inject')
      return Reflect.get(target, property, receiver)
    },
  })
  assert.doesNotThrow(() => apply(ctx, { aliyunpanBin: '/usr/local/bin/aliyunpan' }))
  assert.ok(registered.length > 0)
})

test('apply does not decorate a Cordis context that already has tools', () => {
  const registered = []
  const ctx = new Proxy({
    tools: {
      register(tool) {
        registered.push(tool)
      },
    },
  }, {
    set(target, property, value, receiver) {
      if (property === 'aliyundrive') throw new Error('cannot set property "aliyundrive" without provide')
      return Reflect.set(target, property, value, receiver)
    },
  })
  assert.doesNotThrow(() => apply(ctx, {}))
  assert.ok(registered.length > 0)
})
