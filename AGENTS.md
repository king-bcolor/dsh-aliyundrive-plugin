# AGENTS.md — dsh-aliyundrive-plugin

This directory is a DeepSeek Harness plugin workspace (bundle).

## Layout
- `package.json` — npm package manifest with `dsh.bundle.patch` pointing to `cordis.patch.yml`
- `cordis.patch.yml` — bundle patch inserted into a DSH profile
- `index.js` — Cordis plugin entry (`name` + `apply`)
- `test/` — node:test tests; run with `pnpm test` or `npm test`
- `docs/` — use-case, requirements, UI, implementation (TDD), submission docs

## Commands
```bash
pnpm test
dsh plugin --profile <name> add .
dsh --profile <name> --dump-config
```

## Rules
- Keep the workspace a valid installable bundle.
- Follow TDD: write a failing test before implementing each tool.
- Never commit credentials or login state.
