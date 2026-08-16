# 阿里云盘命令行 DeepSeek Harness 插件 — UI 控件文档说明

> 当前实现：`lib/client.js` 在 DSH Web 会话中注册 `conversation.view` 标签页「阿里云盘」，通过 `/api/aliyundrive` 直接执行宿主工具；表单由工具 JSON Schema 自动生成，因此全部 25 个工具都有 UI 入口。

## 1. 设计原则
- 文件列表支持分页与路径导航。
- 传输任务展示实时进度（参考 aliyunpan `-ui` 面板）。
- 危险操作二次确认。
- 所有工具结果可切换 JSON 视图（当前实现始终显示 JSON）。
- 动态表单：不维护第二套工具清单，`GET /api/aliyundrive/tools` 返回的参数 schema 直接驱动控件生成。
- 长任务（登录/上传/下载/同步）不阻塞页面：执行立即返回 `taskId`，任务面板 2 秒轮询一次。

## 2. 控件清单
| 控件 | 类型 | 用途 | 数据绑定 |
| --- | --- | --- | --- |
| 登录状态卡 | Card | 当前账号/uid | who/loglist |
| 登录按钮 | Button | 打开浏览器登录 | login |
| 网盘选择器 | Select | 备份盘/资源库 | drive |
| 配额进度条 | Progress | 总空间/已用 | quota |
| 路径栏 | Breadcrumb | 工作目录导航 | pwd/cd |
| 文件列表 | Table | 文件名、大小、修改时间、类型 | ls/ll |
| 目录展开 | Tree | 目录树 | ls |
| 上传入口 | Upload | 选择本地文件/目录 | upload |
| 下载按钮 | Button | 下载选中文件 | download |
| 保存目录选择 | Select/Input | --saveto/--save | download |
| 覆盖确认 | ConfirmDialog | 覆盖已存在文件 | download --ow |
| 删除确认 | ConfirmDialog | 删除文件/目录 | rm |
| 新建目录 | Input | 目录名 | mkdir |
| 重命名 | Input | 新名称 | rename |
| 移动 | Select | 目标路径 | mv |
| 分享设置 | Form | 文件、有效期、密码 | share set |
| 快传链接 | Form | 文件 | share |
| 已分享列表 | Table | 分享链接、状态 | share list |
| 相册列表 | Grid | 相簿 | album list |
| 照片下载 | Button + Progress | 批量下载 | album download |
| 同步表单 | Form | 本地/云端目录、模式、策略 | sync start |
| 同步任务列表 | Table | 任务状态 | sync list |
| 传输进度面板 | Progress | 总进度、速度、失败数 | upload/download -ui |
| 排除规则输入 | TagInput | 正则排除 | --exn |
| 原始 JSON 开关 | Switch | JSON 输出 | 所有工具 |
| 错误提示 | Alert | 未登录、路径错误、权限不足 | 工具错误 |

## 3. 关键交互流程
### 3.1 登录
```
[登录状态卡] --未登录--> [登录按钮] --> 浏览器授权 --> 刷新状态
```
### 3.2 上传
```
[选择本地文件] --> [目标云端目录] --> [排除规则] --> 执行 --> [进度面板] --> 完成
```
### 3.3 同步
```
[同步表单] --> 启动任务 --> [同步任务列表] --> 查看状态/停止
```

## 4. 数据展示逻辑
- 文件大小自动适配 B/KB/MB/GB。
- 修改日期本地化展示。
- 上传/下载进度复用 aliyunpan `-ui` 的字段：总速度、文件数、失败数、总进度、单文件进度。
