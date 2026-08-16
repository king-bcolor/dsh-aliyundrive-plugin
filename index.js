/**
 * dsh-aliyundrive-plugin — DeepSeek Harness plugin entry.
 *
 * The plugin registers aliyunpan-backed tools into ctx.tools and keeps a
 * session-local task registry for long upload/download/sync operations.
 * See docs/实现文档.md for the TDD plan and architecture.
 */

import { normalizeConfig } from './src/config.js'
import { createTaskManager } from './src/task-manager.js'
import { createAliyundriveTools } from './src/tools.js'

export const name = 'aliyundrive'
export const inject = ['tools']

export function apply(ctx = {}, rawConfig = {}) {
  // Cordis passes row config as the second argument. Do NOT read ctx.config:
  // without an explicit `inject`, accessing it on a Cordis Context throws.
  const config = normalizeConfig(rawConfig ?? {})
  const taskManager = createTaskManager()
  const tools = createAliyundriveTools(config, { taskManager })

  if (ctx.tools && typeof ctx.tools.register === 'function') {
    for (const tool of tools) ctx.tools.register(tool)
  } else {
    // Exposed only for tests, debugging and non-DSH embeddings. A real
    // Cordis Context cannot be decorated without `provide`.
    ctx.aliyundrive = { config, taskManager, tools }
  }
}
