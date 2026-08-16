# dsh-aliyundrive-plugin

> **中文文档**：[README.zh-CN.md](./README.zh-CN.md)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that wraps the [aliyunpan](https://github.com/tickstep/aliyunpan) Alibaba Cloud Drive CLI as model-callable tools.

## What it is
`dsh-aliyundrive-plugin` exposes Alibaba Cloud Drive operations to DSH agents: account status, drive switching, directory browsing, file management, upload/download with progress, sharing, albums, and sync backup — through structured tools.

## Features
- Account: login guidance, current user, account list.
- Drive: switch backup/resource drive, quota.
- Files: ls/ll, cd, pwd, mkdir, mv, cp, rename, rm (confirm-gated).
- Transfer: upload/download with concurrency, retry, regex exclusions, progress.
- Share: create shares and rapid-transfer links (`share set`; list/cancel are not exposed by aliyunpan v0.3.x).
- Albums: list, show, batch download.
- Sync: upload/download modes with exclusive/increment policies.
- Long transfers run in background: poll with `aliyunpan_task_status`, list with `aliyunpan_task_list`, stop with `aliyunpan_task_stop`.
- Dangerous operations require explicit confirmation.

## Use cases
- Ask the agent to list files in a cloud directory.
- Upload a local folder to Alibaba Cloud Drive.
- Download files with progress and retry.
- Manage shares and albums.
- Set up incremental sync between local and cloud directories.

See [docs/用例目录/README.md](./docs/用例目录/README.md) for the full command/use-case/parameter catalog (Chinese).

## Installation
### Preconditions
- Node.js 22+, `dsh` CLI installed.
- `aliyunpan` CLI installed (see https://github.com/tickstep/aliyunpan).

### Install from GitHub
```bash
dsh plugin --profile default add github:<owner>/dsh-aliyundrive-plugin
# allowlist build in $DSH_HOME/profiles/default/pnpm-workspace.yaml if requested
```

### Install locally
```bash
git clone https://github.com/<owner>/dsh-aliyundrive-plugin.git
cd dsh-aliyundrive-plugin
dsh plugin --profile default add .
```

## Usage
```bash
dsh --profile default
```
Example prompts:
- `List files in the root of my backup drive.`
- `Upload ~/Documents to /我的文档.`
- `Start sync from ~/Documents to /备份盘/我的文档 using increment policy.`

## Configuration
```yaml
- id: aliyundrive
  name: dsh-aliyundrive-plugin
  config:
    aliyunpanBin: /usr/local/bin/aliyunpan
    timeoutMs: 60000
    longRunningTimeoutMs: 3600000
    confirmDangerous: true
```

## Development
TDD is mandatory:
```bash
npm test
```

## License
MIT
