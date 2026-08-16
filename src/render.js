/**
 * Rendering helpers shared by aliyunpan tool outputs.
 * DSH model output is rendered as compact JSON text; humans can still inspect
 * the raw stdout/stderr fields.
 */

export function renderJson(_args, value) {
  return [{
    type: 'text',
    text: JSON.stringify(value, null, 2),
  }]
}

export function lastNonEmptyLine(text) {
  const lines = (text ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  return lines.at(-1) ?? ''
}

export function parsePwd(stdout) {
  return lastNonEmptyLine(stdout)
}

export function parseLsLines(stdout) {
  return (stdout ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

export function summarize(text) {
  const line = lastNonEmptyLine(text)
  return line.length > 200 ? `${line.slice(0, 197)}...` : line
}
