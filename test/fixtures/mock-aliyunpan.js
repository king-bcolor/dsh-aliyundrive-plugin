#!/usr/bin/env node
// Test fixture that records argv/env and optionally simulates sleep/failure.
import { writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const out = process.env.MOCK_ALIYUNPAN_OUT

if (out) {
  writeFileSync(out, JSON.stringify({
    args,
    env: {
      ALIYUNPAN_CONFIG_DIR: process.env.ALIYUNPAN_CONFIG_DIR ?? null,
      PATH: process.env.PATH,
    },
  }))
}

const sleepIndex = args.indexOf('--sleep')
if (sleepIndex !== -1) {
  const ms = Number(args[sleepIndex + 1] ?? '0')
  const started = Date.now()
  while (Date.now() - started < ms) {
    // busy wait so the parent timeout is exercised
  }
}

const noiseIndex = args.indexOf('--noise')
if (noiseIndex !== -1) {
  const size = Number(args[noiseIndex + 1] ?? '0')
  console.log('x'.repeat(size))
}

const exitIndex = args.indexOf('--exit')
if (exitIndex !== -1) {
  const code = Number(args[exitIndex + 1] ?? '0')
  console.log('MOCK ALIYUNPAN FAILURE')
  process.exit(code)
}

console.log('MOCK ALIYUNPAN OK')
console.log(`args=${args.join(' ')}`)
