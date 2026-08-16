# 阿里云盘命令行（aliyunpan）用例目录

> 数据来源：GitHub 仓库 `tickstep/aliyunpan` README 与 `docs/manual.md`（阿里云盘命令行客户端，支持 JavaScript 插件与同步备份）。

## 1. 全局说明
- 命令可交互模式运行（仿 Linux shell），也可直接 `aliyunpan <命令> [参数]`。
- 交互模式提示符：`aliyunpan >`，登录后为 `aliyunpan:<工作目录> <昵称>$`。
- 内置帮助：`help`、`<命令> -h`。
- 配置目录：环境变量 `ALIYUNPAN_CONFIG_DIR` 指定，默认程序目录。
- Debug：`ALIYUNPAN_VERBOSE=1`。

## 2. 账号与登录
### 2.1 `login`
- **示例**：`aliyunpan login`
- **说明**：浏览器授权登录；需一次授权一次扫码两次登录。
- **参数限制**：链接 5 分钟有效；账号最多同时登录 10 台设备。

### 2.2 `loglist`
- **示例**：`aliyunpan loglist`
- **说明**：列出所有已登录账号。

### 2.3 `who`
- **示例**：`aliyunpan who`
- **说明**：获取当前账号。

### 2.4 `su <uid>`
- **示例**：`aliyunpan su` / `aliyunpan su 123456`
- **说明**：切换账号。
- **参数限制**：不传 uid 时交互选择。

### 2.5 `logout`
- **示例**：`aliyunpan logout`
- **说明**：退出当前账号，有确认。

## 3. 网盘与工作目录
### 3.1 `drive`
- **示例**：`aliyunpan drive` / `aliyunpan drive <driveId>`
- **说明**：切换备份盘/资源库。
- **参数限制**：不传 driveId 交互选择；默认备份盘。

### 3.2 `quota`
- **示例**：`aliyunpan quota`
- **说明**：查看网盘总空间和已用空间。

### 3.3 `cd`
- **示例**：`aliyunpan cd /我的文档`、`aliyunpan cd ..`、`aliyunpan cd /`
- **说明**：切换工作目录。

### 3.4 `pwd`
- **示例**：`aliyunpan pwd`
- **说明**：输出当前工作目录。

### 3.5 `ls / l / ll`
- **示例**：`aliyunpan ls`、`aliyunpan ls 我的文档`、`aliyunpan ll /我的文档`
- **说明**：列出目录；ll 显示详细信息。
- **参数限制**：`-driveId value` 指定网盘 ID。

## 4. 上传/下载
### 4.1 `upload, u`
- **示例**：`aliyunpan upload /Users/tickstep/Downloads/apt.zip /tmp`、`aliyunpan upload /Users/tickstep/Downloads /photo -ui`
- **说明**：上传文件/目录，支持批量、秒传、进度 UI。
- **参数限制**（据 manual）：
  - `-p value`：同时上传文件数，默认 10。
  - `-sp value`：上传分片大小。
  - `--exn value`：排除名称（正则），可多次。
  - `--ui`：UI 面板展示进度。
  - `--driveId value`：网盘 ID。

### 4.2 `download, d`
- **示例**：`aliyunpan d /我的文档/1.mp4`、`aliyunpan d /photo -ui`
- **说明**：下载文件/目录，支持断点续传、并行、多用户联合下载。
- **参数限制**：
  - `--ow`：覆盖已存在文件。
  - `--status`：输出所有线程工作状态。
  - `--save`：保存到当前工作目录。
  - `--saveto value`：保存到指定目录。
  - `-x`：文件加执行权限（Windows 无效）。
  - `-p value`：同时下载文件数，取值范围 1~3，默认 1。
  - `--sp value`：单文件下载最大线程(分片)数，取值范围 1~3，默认 0。
  - `--retry value`：下载失败最大重试次数，默认 3。
  - `--nocheck`：下载完成不校验。
  - `--np`：不展示进度条。
  - `--driveId value`：网盘 ID。
  - `--exn value`：排除名称（正则），可多次。
  - `--md`：多用户联合下载（BETA）。
  - `--ui`：UI 面板展示下载详情（BETA）。

## 5. 文件管理
### 5.1 `mkdir`
- **示例**：`aliyunpan mkdir /我的文档/新目录`
- **说明**：创建目录。

### 5.2 `rm`
- **示例**：`aliyunpan rm /tmp/test.txt`
- **说明**：删除文件/目录到回收站。

### 5.3 `mv`
- **示例**：`aliyunpan mv /a.txt /b/a.txt`
- **说明**：移动文件/目录。

### 5.4 `rename`
- **示例**：`aliyunpan rename /a.txt b.txt`
- **说明**：重命名文件。

### 5.5 `recycle`
- **说明**：回收站管理（列表/恢复/彻底删除等，以 `-h` 为准）。

## 6. 分享
### 6.1 `share`
- **说明**：分享文件/目录。
- **子命令**：设置分享、创建快传链接、列出已分享、取消分享。
- **示例**：`aliyunpan share set /my.doc`、`aliyunpan share list`、`aliyunpan share cancel <id>`

## 7. 相册
### 7.1 `album, abm`
- **说明**：相簿(Beta)。
- **示例**：`aliyunpan album list`、`aliyunpan album show <albumId>`、`aliyunpan album download <albumId>`
- **说明**：展示共享相簿列表、指定相簿文件、批量下载相册所有普通/实况照片。

## 8. 同步备份
### 8.1 `sync`
- **示例**：
```bash
aliyunpan sync start -ldir "/tickstep/Documents/设计文档" -pdir "/备份盘/我的文档" -mode "upload" -drive "backup"
```
- **说明**：备份本地→云盘（upload）、云盘→本地（download）。
- **参数限制**：
  - `-ldir`：本地目录。
  - `-pdir`：云盘目录。
  - `-mode`：upload / download。
  - `-drive`：backup / resource。
  - `-policy`：exclusive（排他/镜像）或 increment（增量）。
  - 支持 `sync start/stop/list` 等。

## 9. JavaScript 插件
- 支持 JS 插件定制上传/下载关键步骤行为；详见 `docs/plugin_manual.md`。

## 10. 配置
### 10.1 `config set`
- **示例**：`aliyunpan config set -savedir D:/Downloads`
- **说明**：显示和修改程序配置项。
- **参数限制**：`-savedir` 等配置项以 `config set -h` 为准。

## 11. 参数限制汇总
| 参数 | 作用域 | 限制 |
| --- | --- | --- |
| `-driveId` | ls/upload/download | 网盘 ID |
| `-p` | download | 1~3，默认 1 |
| `-p` | upload | 并发上传文件数，默认 10 |
| `--sp` | download | 1~3，默认 0 |
| `--retry` | download | 默认 3 |
| `--exn` | upload/download | 正则，可多次 |
| `--saveto` | download | 目录路径 |
| `--ui` | upload/download | bool |
| `--ow` / `--save` / `--nocheck` / `--np` / `--md` | download | bool |
| `-mode` | sync | upload / download |
| `-policy` | sync | exclusive / increment |
| `-drive` | sync | backup / resource |
