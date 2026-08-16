window.__ModuleLoader__.load({
id: "dsh-aliyundrive-plugin",
factory: (require) => {
var module = { exports: {} };
var exports = module.exports;
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

const React = require("react");
const { useState, useEffect, useMemo, useRef } = React;
const h = React.createElement;

const API_BASE = "/api/aliyundrive";
const TOOL_GROUPS = [
{ id: "account", label: "账号", tools: ["aliyunpan_login", "aliyunpan_who", "aliyunpan_loglist", "aliyunpan_drive", "aliyunpan_quota", "aliyunpan_pwd"] },
{ id: "files", label: "文件", tools: ["aliyunpan_cd", "aliyunpan_ls", "aliyunpan_mkdir", "aliyunpan_rename", "aliyunpan_mv", "aliyunpan_cp", "aliyunpan_rm"] },
{ id: "transfer", label: "传输", tools: ["aliyunpan_upload", "aliyunpan_download"] },
{ id: "share", label: "分享", tools: ["aliyunpan_share_set"] },
{ id: "album", label: "相册", tools: ["aliyunpan_album_list", "aliyunpan_album_show", "aliyunpan_album_download"] },
{ id: "sync", label: "同步", tools: ["aliyunpan_sync_start", "aliyunpan_sync_stop", "aliyunpan_sync_list"] },
{ id: "tasks", label: "任务", tools: ["aliyunpan_task_status", "aliyunpan_task_list", "aliyunpan_task_stop"] }
];

const QUICK_ACTIONS = [
{ label: "登录状态", tool: "aliyunpan_who", args: {} },
{ label: "账号列表", tool: "aliyunpan_loglist", args: {} },
{ label: "配额", tool: "aliyunpan_quota", args: {} },
{ label: "当前目录", tool: "aliyunpan_pwd", args: {} },
{ label: "相册列表", tool: "aliyunpan_album_list", args: {} },
{ label: "任务列表", tool: "aliyunpan_task_list", args: {} }
];

const css = `
.adrive-root{box-sizing:border-box;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-module-platform);font:var(--dsw-alias-body);display:grid;grid-template-columns:250px minmax(0,1fr);gap:14px;padding:16px;overflow:hidden}
.adrive-root *,.adrive-root *::before,.adrive-root *::after{box-sizing:border-box}
.adrive-sidebar{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:12px;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.adrive-sidebar-head{padding:12px 12px 8px}
.adrive-sidebar-head h2{margin:0;font-size:14px;font-weight:700}
.adrive-sidebar-scroll{min-height:0;overflow:auto;padding:4px 8px 10px;flex:1}
.adrive-group{margin:8px 0 2px}
.adrive-group-title{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:17px;padding:0 6px;font-weight:600}
.adrive-tool{width:100%;color:var(--dsw-alias-label-secondary);background:none;border:0;border-radius:7px;text-align:left;font:inherit;font-size:13px;line-height:20px;padding:7px 8px;cursor:pointer;display:block}
.adrive-tool:hover{background:var(--dsw-alias-interactive-bg-hover)}
.adrive-tool[data-active=true]{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 12%,transparent);color:var(--dsw-alias-label-primary);font-weight:600}
.adrive-quick{border-top:1px solid var(--dsw-alias-border-l2);padding:10px;display:flex;flex-wrap:wrap;gap:6px}
.adrive-quick button{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;border-radius:999px;padding:4px 10px;cursor:pointer}
.adrive-main{min-width:0;min-height:0;display:flex;flex-direction:column;gap:12px;overflow:hidden}
.adrive-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:12px;min-height:0;overflow:auto;padding:14px}
.adrive-card h1{margin:0 0 4px;font-size:16px;line-height:24px}
.adrive-card p{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.adrive-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
.adrive-field{display:flex;flex-direction:column;gap:5px;min-width:0}
.adrive-field-wide{grid-column:1 / -1}
.adrive-field>span{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.adrive-field input,.adrive-field select,.adrive-field textarea{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;border-radius:8px;padding:7px 9px;min-width:0;outline:none}
.adrive-field input:focus,.adrive-field select:focus,.adrive-field textarea:focus{border-color:var(--dsw-alias-state-business-primary)}
.adrive-field textarea{min-height:70px;resize:vertical;font-family:var(--ds-font-family-code)}
.adrive-check{display:flex !important;flex-direction:row !important;align-items:center;gap:7px}
.adrive-check input{width:16px;height:16px;margin:0}
.adrive-actions{grid-column:1 / -1;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.adrive-run{border:0;background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-inverse);font:inherit;font-weight:600;font-size:13px;border-radius:8px;padding:8px 16px;cursor:pointer}
.adrive-run:disabled{opacity:.5;cursor:default}
.adrive-error{grid-column:1 / -1;color:var(--dsw-alias-state-error-primary);font-size:12px}
.adrive-result{grid-column:1 / -1;margin-top:4px}
.adrive-result pre{white-space:pre-wrap;word-break:break-word;background:var(--dsw-alias-bg-module-platform);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:10px;font-family:var(--ds-font-family-code);font-size:12px;line-height:18px;margin:0;max-height:320px;overflow:auto}
.adrive-tasks{display:flex;flex-direction:column;gap:8px}
.adrive-task-row{border:1px solid var(--dsw-alias-border-l2);border-radius:9px;padding:8px 10px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px}
.adrive-task-main{min-width:0}
.adrive-task-name{font-weight:600;font-size:12px;line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.adrive-task-meta{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}
.adrive-task-actions{display:flex;align-items:center;gap:6px}
.adrive-stop{border:1px solid var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary);background:none;border-radius:6px;padding:3px 8px;font:inherit;font-size:12px;cursor:pointer}
.adrive-section-title{display:flex;align-items:center;justify-content:space-between;gap:10px}
.adrive-section-title h2{margin:0;font-size:14px;line-height:22px}
.adrive-refresh{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;border-radius:6px;padding:4px 10px;cursor:pointer}
.adrive-empty{color:var(--dsw-alias-label-tertiary);font-size:12px;padding:10px 0}
@media (width<=900px){.adrive-root{grid-template-columns:minmax(0,1fr);overflow:auto}.adrive-sidebar{max-height:240px}.adrive-form{grid-template-columns:minmax(0,1fr)}}
`;
if (typeof document !== "undefined") {
const tagId = "dsh-aliyundrive-plugin/client.css";
if (document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
const tag = document.createElement("style");
tag.dataset.plugin = "dsh-aliyundrive-plugin";
tag.dataset.pluginCss = tagId;
tag.textContent = css;
document.head.appendChild(tag);
}
}

async function api(path, options = {}) {
const response = await fetch(API_BASE + path, {
...options,
headers: options.body === undefined ? {} : { "content-type": "application/json" }
});
return response.json();
}

function parseArray(raw) {
const text = String(raw ?? "").trim();
if (!text) return [];
try {
const parsed = JSON.parse(text);
if (Array.isArray(parsed)) return parsed.map(String);
} catch {}
if (!text.includes("\n") && text.includes(",")) return text.split(",").map((item) => item.trim()).filter(Boolean);
return text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function fieldValue(spec, raw) {
switch (spec.type) {
case "array": return parseArray(raw);
case "integer": return raw === "" || raw === undefined ? undefined : Number(raw);
case "number": return raw === "" || raw === undefined ? undefined : Number(raw);
case "boolean": return raw === true;
case "json": {
if (raw === "" || raw === undefined) return undefined;
return JSON.parse(raw);
}
default: return raw === "" ? undefined : raw;
}
}

function ToolForm({ tool, onResult, onTaskStarted }) {
const properties = tool.parameters?.properties ?? {};
const required = new Set(tool.parameters?.required ?? []);
const initial = useMemo(() => {
const values = {};
for (const [key, spec] of Object.entries(properties)) {
if (spec.type === "boolean") values[key] = false;
else if (spec.type === "array") values[key] = "";
else if (spec.type === "integer" || spec.type === "number") values[key] = "";
else if (spec.type === "json") values[key] = "";
else values[key] = "";
}
return values;
}, [tool.name]);
const [values, setValues] = useState(initial);
const [busy, setBusy] = useState(false);
const [error, setError] = useState("");

function set(key, value) {
setValues((old) => ({ ...old, [key]: value }));
}

async function submit(event) {
event.preventDefault();
setError("");
const args = {};
for (const [key, spec] of Object.entries(properties)) {
const raw = values[key];
if (required.has(key) && (raw === "" || raw === undefined || raw === false && spec.type === "boolean")) {
setError("缺少必填参数：" + key);
return;
}
try {
const value = fieldValue(spec, raw);
if (value !== undefined) args[key] = value;
} catch {
setError(key + " 的输入不是有效 JSON");
return;
}
}
setBusy(true);
try {
const result = await api("/execute", { method: "POST", body: JSON.stringify({ tool: tool.name, args }) });
onResult(result);
if (result && result.taskId) onTaskStarted();
} finally {
setBusy(false);
}
}

return h("form", { className: "adrive-form", onSubmit: submit },
Object.entries(properties).map(([key, spec]) => {
const title = spec.description || key;
const control = (() => {
if (spec.type === "boolean") {
return h("label", { className: "adrive-field adrive-check" },
h("input", { type: "checkbox", checked: values[key] === true, onChange: (event) => set(key, event.target.checked) }),
h("span", null, title + (required.has(key) ? " *" : "")));
}
const common = { value: values[key], onChange: (event) => set(key, event.target.value) };
if (spec.type === "array" || spec.type === "json") {
return h("label", { className: "adrive-field adrive-field-wide" },
h("span", null, title + (required.has(key) ? " *" : "")),
h("textarea", { ...common, placeholder: spec.type === "array" ? "每行一个值；或粘贴 JSON 数组" : "JSON 值" }));
}
if (spec.enum && Array.isArray(spec.enum)) {
return h("label", { className: "adrive-field" },
h("span", null, title + (required.has(key) ? " *" : "")),
h("select", common,
h("option", { value: "" }, "（可选）"),
spec.enum.map((value) => h("option", { key: String(value), value: String(value) }, String(value)))));
}
return h("label", { className: "adrive-field" },
h("span", null, title + (required.has(key) ? " *" : "")),
h("input", { ...common, type: spec.type === "integer" || spec.type === "number" ? "number" : "text", step: spec.type === "number" ? "any" : undefined }));
})();
return h("div", { key });
}),
error && h("div", { className: "adrive-error" }, error),
h("div", { className: "adrive-actions" },
h("button", { className: "adrive-run", type: "submit", disabled: busy }, busy ? "执行中…" : "执行 " + tool.name),
h("span", { className: "adrive-task-meta" }, tool.parameters?.required?.length ? "必填：" + tool.parameters.required.join(", ") : "无必填参数")));
}

function TasksPanel({ tasks, onRefresh, onStop }) {
return h("div", { className: "adrive-card" },
h("div", { className: "adrive-section-title" },
h("h2", null, "后台任务"),
h("button", { className: "adrive-refresh", onClick: onRefresh }, "刷新")),
tasks.length === 0
? h("div", { className: "adrive-empty" }, "暂无任务。上传、下载、同步、登录会在这里显示进度。")
: h("div", { className: "adrive-tasks" },
tasks.map((task) => h("div", { className: "adrive-task-row", key: task.id },
h("div", { className: "adrive-task-main" },
h("div", { className: "adrive-task-name" }, task.toolName + " · " + task.id),
h("div", { className: "adrive-task-meta" },
(task.progress?.percent ?? null) !== null && task.progress ? task.progress.percent + "% · " : "",
task.status,
task.error ? " · " + task.error : "")),
h("div", { className: "adrive-task-actions" },
task.status === "running" && h("button", { className: "adrive-stop", onClick: () => onStop(task.id) }, "停止"))))));
}

function AliyundriveView() {
const [tools, setTools] = useState([]);
const [selected, setSelected] = useState("aliyunpan_who");
const [result, setResult] = useState(null);
const [tasks, setTasks] = useState([]);
const [loadError, setLoadError] = useState("");
const timer = useRef(null);

async function loadTools() {
try {
const data = await api("/tools");
if (data.ok && Array.isArray(data.tools)) setTools(data.tools);
} catch (error) {
setLoadError("无法连接 /api/aliyundrive：" + error.message);
}
}

async function loadTasks() {
try {
const data = await api("/tasks");
if (data.ok && Array.isArray(data.tasks)) setTasks(data.tasks);
} catch {}
}

useEffect(() => {
loadTools();
loadTasks();
timer.current = setInterval(loadTasks, 2000);
return () => clearInterval(timer.current);
}, []);

async function execute(toolName, args) {
const data = await api("/execute", { method: "POST", body: JSON.stringify({ tool: toolName, args: args ?? {} }) });
setResult(data);
if (data && data.taskId) await loadTasks();
return data;
}

async function stopTask(taskId) {
const data = await api("/tasks/stop", { method: "POST", body: JSON.stringify({ taskId }) });
setResult(data);
await loadTasks();
}

const selectedTool = tools.find((tool) => tool.name === selected) ?? tools[0];
const quickTools = useMemo(() => {
const map = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
return QUICK_ACTIONS.filter((action) => map[action.tool]).map((action) => ({ ...action, description: map[action.tool]?.description }));
}, [tools]);

return h("div", { className: "adrive-root" },
h("aside", { className: "adrive-sidebar" },
h("div", { className: "adrive-sidebar-head" }, h("h2", null, "阿里云盘"), loadError && h("div", { className: "adrive-error" }, loadError)),
h("div", { className: "adrive-sidebar-scroll" },
TOOL_GROUPS.map((group) => h("div", { className: "adrive-group", key: group.id },
h("div", { className: "adrive-group-title" }, group.label),
group.tools.map((name) => {
const tool = tools.find((candidate) => candidate.name === name);
return h("button", {
key: name,
className: "adrive-tool",
"data-active": selected === name,
onClick: () => { setSelected(name); setResult(null); }
}, tool ? name.replace("aliyunpan_", "") : name);
})))),
h("div", { className: "adrive-quick" },
quickTools.map((action) => h("button", { key: action.tool, title: action.description, onClick: () => execute(action.tool, action.args) }, action.label)))),
h("main", { className: "adrive-main" },
selectedTool && h("section", { className: "adrive-card" },
h("h1", null, selectedTool.name),
h("p", null, selectedTool.description),
h(ToolForm, { key: selectedTool.name, tool: selectedTool, onResult: setResult, onTaskStarted: loadTasks })),
result && h("section", { className: "adrive-card adrive-result" },
h("pre", null, JSON.stringify(result, null, 2))),
h(TasksPanel, { tasks, onRefresh: loadTasks, onStop: stopTask })));
}

const inject = ["slots"];
function apply(ctx) {
ctx.slots.inject("conversation.view", () => ctx.slots.register({
name: "conversation.view",
id: "aliyundrive",
order: 50,
label: () => "阿里云盘",
inject: () => ({})
}, AliyundriveView));
}

exports.apply = apply;
exports.inject = inject;
return module.exports;
}
});
//# sourceMappingURL=client.js.map
