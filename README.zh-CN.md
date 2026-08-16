# dsh-aliyundrive-plugin

> **English README**：[README.md](./README.md)

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件，把 [aliyunpan](https://github.com/tickstep/aliyunpan) 阿里云盘命令行工具封装为模型可调用的工具集。

## 它是什么
`dsh-aliyundrive-plugin` 把阿里云盘操作暴露给 DSH Agent：账号状态、网盘切换、目录浏览、文件管理、上传/下载进度、分享、相册、同步备份，全部通过结构化工具完成。

## 功能
- 账号：登录引导、当前用户、账号列表。
- 网盘：切换备份盘/资源库、配额。
- 文件：ls/ll、cd、pwd、mkdir、mv、cp、rename、rm（默认确认）。
- 传输：上传/下载，支持并发、重试、正则排除、进度展示。
- 分享：创建分享与快传链接（`share set`；aliyunpan v0.3.x 未提供 list/cancel）。
- 相册：列表、查看、批量下载。
- 同步：upload/download 模式，exclusive/increment 策略。
- 长传输后台运行：可用 `aliyunpan_task_status` 轮询、`aliyunpan_task_list` 列出、`aliyunpan_task_stop` 停止。
- 危险操作默认需要显式确认。

## 用例
- 让 Agent 列出云盘目录文件。
- 把本地文件夹上传到阿里云盘。
- 带进度和重试地下载文件。
- 管理分享和相册。
- 建立本地与云盘目录的增量同步。

完整命令/用例/参数目录见 [docs/用例目录/README.md](./docs/用例目录/README.md)。

## 安装
### 前置条件
- Node.js 22+，已安装 `dsh` CLI。
- 已安装 `aliyunpan` CLI（见 https://github.com/tickstep/aliyunpan）。

### 从 GitHub 安装
```bash
dsh plugin --profile default add github:<owner>/dsh-aliyundrive-plugin
# 如 pnpm 请求构建许可，请在 profile 的 pnpm-workspace.yaml 中 allowBuilds 后重试
```

### 本地安装
```bash
git clone https://github.com/<owner>/dsh-aliyundrive-plugin.git
cd dsh-aliyundrive-plugin
dsh plugin --profile default add .
```

## 使用
```bash
dsh --profile default
```
示例提示词：
- `列出我备份盘根目录的文件。`
- `把 ~/Documents 上传到 /我的文档。`
- `启动从 ~/Documents 到 /备份盘/我的文档 的增量同步。`

## 配置
```yaml
- id: aliyundrive
  name: dsh-aliyundrive-plugin
  config:
    aliyunpanBin: /usr/local/bin/aliyunpan
    timeoutMs: 60000
    longRunningTimeoutMs: 3600000
    confirmDangerous: true
```

## 开发
本项目全程 TDD：
```bash
npm test
```

## License
MIT
