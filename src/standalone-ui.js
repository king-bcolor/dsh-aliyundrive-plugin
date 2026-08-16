export const STANDALONE_UI_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>阿里云盘控制台</title>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#0e1116;color:#e6e6e6;font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif}
header{position:sticky;top:0;z-index:10;background:rgba(16,19,26,.92);border-bottom:1px solid #232834;padding:10px 16px;display:flex;align-items:center;gap:10px}
header h1{font-size:15px;margin:0}
header .muted{color:#7f8a9e;font-size:12px}
.root{display:grid;grid-template-columns:250px minmax(0,1fr);gap:14px;padding:14px;max-width:1280px;margin:0 auto}
.sidebar,.card{background:#141821;border:1px solid #232834;border-radius:12px}
.sidebar{padding:10px;position:sticky;top:60px;height:calc(100vh - 74px);overflow:auto}
.sidebar h3{color:#7f8a9e;font-size:11px;margin:10px 4px 4px}
.tool{display:block;width:100%;text-align:left;border:0;background:transparent;color:#aeb7c8;font:inherit;padding:7px 8px;border-radius:7px;cursor:pointer}
.tool:hover{background:#1d2330}
.tool.active{background:#20324d;color:#fff;font-weight:600}
.quick{border-top:1px solid #232834;margin-top:10px;padding-top:10px;display:flex;flex-wrap:wrap;gap:6px}
.quick button{background:#1d2330;color:#dfe4ec;border:1px solid #2b3342;border-radius:999px;font:inherit;font-size:12px;padding:4px 10px;cursor:pointer}
main{min-width:0;display:flex;flex-direction:column;gap:14px}
.card{padding:14px}
.card h2{margin:0 0 4px;font-size:15px}
.card p.desc{margin:0 0 12px;color:#7f8a9e;font-size:12px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.field{display:flex;flex-direction:column;gap:5px;min-width:0}
.field.wide{grid-column:1/-1}
.field>span{color:#aeb7c8;font-size:12px}
input,select,textarea{background:#0e1116;color:#e6e6e6;border:1px solid #2b3342;border-radius:8px;padding:7px 9px;font:inherit;min-width:0;outline:none}
input:focus,select:focus,textarea:focus{border-color:#4d8df7}
textarea{min-height:68px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
.check{display:flex !important;flex-direction:row !important;align-items:center;gap:7px}
.check input{width:16px;height:16px;margin:0}
.actions{grid-column:1/-1;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.run{background:#2563eb;color:#fff;border:0;border-radius:8px;padding:8px 16px;font:inherit;font-weight:600;cursor:pointer}
.run:disabled{opacity:.5;cursor:default}
.muted{color:#7f8a9e;font-size:12px}
.error{grid-column:1/-1;color:#ff6b6b;font-size:12px}
.result{grid-column:1/-1;margin-top:4px}
pre{white-space:pre-wrap;word-break:break-word;background:#0b0e13;border:1px solid #232834;border-radius:8px;padding:10px;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;margin:0;max-height:360px;overflow:auto}
.task{border:1px solid #232834;border-radius:9px;padding:8px 10px;display:flex;justify-content:space-between;gap:10px;margin-top:8px}
.task .title{font-weight:600}
.task .meta{color:#7f8a9e;font-size:11px;margin-top:2px}
.task .stop{background:transparent;border:1px solid #ff6b6b;color:#ff6b6b;border-radius:6px;padding:3px 8px;font:inherit;font-size:12px;cursor:pointer}
.head{display:flex;justify-content:space-between;align-items:center}
.head .refresh{background:#1d2330;border:1px solid #2b3342;color:#dfe4ec;border-radius:6px;padding:4px 10px;font:inherit;font-size:12px;cursor:pointer}
.empty{color:#7f8a9e;padding:10px 0;font-size:12px}
@media(max-width:860px){.root{grid-template-columns:1fr}.sidebar{position:static;height:auto;max-height:240px}}
</style>
</head>
<body>
<header><h1>阿里云盘控制台</h1><span class="muted" id="status">连接中…</span></header>
<div class="root">
  <aside class="sidebar">
    <div id="groups"></div>
    <div class="quick" id="quick"></div>
  </aside>
  <main>
    <section class="card">
      <h2 id="tool-title"></h2>
      <p class="desc" id="tool-desc"></p>
      <form class="grid" id="tool-form"></form>
      <div class="result" id="result-wrap" hidden><pre id="result"></pre></div>
    </section>
    <section class="card">
      <div class="head"><h2>后台任务</h2><button class="refresh" id="refresh-tasks">刷新</button></div>
      <div id="tasks"></div>
    </section>
  </main>
</div>
<script>
const API='/api/aliyundrive';
const GROUPS=[
  {label:'账号',tools:['aliyunpan_login','aliyunpan_who','aliyunpan_loglist','aliyunpan_drive','aliyunpan_quota','aliyunpan_pwd']},
  {label:'文件',tools:['aliyunpan_cd','aliyunpan_ls','aliyunpan_mkdir','aliyunpan_rename','aliyunpan_mv','aliyunpan_cp','aliyunpan_rm']},
  {label:'传输',tools:['aliyunpan_upload','aliyunpan_download']},
  {label:'分享',tools:['aliyunpan_share_set']},
  {label:'相册',tools:['aliyunpan_album_list','aliyunpan_album_show','aliyunpan_album_download']},
  {label:'同步',tools:['aliyunpan_sync_start','aliyunpan_sync_stop','aliyunpan_sync_list']},
  {label:'任务',tools:['aliyunpan_task_status','aliyunpan_task_list','aliyunpan_task_stop']}
];
const QUICK=[
  ['登录状态','aliyunpan_who',{}],['账号列表','aliyunpan_loglist',{}],['配额','aliyunpan_quota',{}],
  ['当前目录','aliyunpan_pwd',{}],['相册列表','aliyunpan_album_list',{}],['任务列表','aliyunpan_task_list',{}]
];
let tools=[]; let selected='aliyunpan_who'; let taskTimer=null;
const $=id=>document.getElementById(id);
async function api(path,opt={}){const r=await fetch(API+path,{...opt,headers:opt.body?{'content-type':'application/json'}:{}});return r.json()}
function parseArray(raw){const s=String(raw??'').trim();if(!s)return[];try{const v=JSON.parse(s);if(Array.isArray(v))return v.map(String)}catch{}if(!s.includes('\\n')&&s.includes(','))return s.split(',').map(x=>x.trim()).filter(Boolean);return s.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean)}
function collect(){const args={};for(const el of document.querySelectorAll('#tool-form [data-key]')){const key=el.dataset.key;const spec=JSON.parse(el.dataset.spec);let v=el.type==='checkbox'?el.checked:el.value;if(spec.type==='array')v=parseArray(v);else if(spec.type==='integer'||spec.type==='number')v=v===''?undefined:Number(v);else if(spec.type==='json'){try{v=v===''?undefined:JSON.parse(v)}catch{throw new Error(key+' 不是有效 JSON')}}else if(spec.type==='boolean')v=el.checked;else if(v==='')v=undefined;if(v!==undefined)args[key]=v}return args}
function fieldHtml(key,spec){const label=spec.description||key;const star=spec.required?' *':'';if(spec.type==='boolean')return '<label class="field check" style="grid-column:1/-1"><input type="checkbox" data-key="'+key+'" data-spec="'+esc(JSON.stringify(spec))+'"><span>'+esc(label)+star+'</span></label>';
if(spec.type==='array'||spec.type==='json')return '<label class="field wide"><span>'+esc(label)+star+'</span><textarea data-key="'+key+'" data-spec="'+esc(JSON.stringify(spec))+'" placeholder="'+(spec.type==='array'?'每行一个值，或 JSON 数组':'JSON 值')+'"></textarea></label>';
if(spec.enum&&Array.isArray(spec.enum)){let opts='<option value="">（可选）</option>';for(const v of spec.enum)opts+='<option value="'+esc(String(v))+'">'+esc(String(v))+'</option>';return '<label class="field"><span>'+esc(label)+star+'</span><select data-key="'+key+'" data-spec="'+esc(JSON.stringify(spec))+'">'+opts+'</select></label>'}
return '<label class="field"><span>'+esc(label)+star+'</span><input data-key="'+key+'" data-spec="'+esc(JSON.stringify(spec))+'" type="'+(spec.type==='integer'||spec.type==='number'?'number':'text')+'"></label>'}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function current(){return tools.find(t=>t.name===selected)||tools[0]}
function renderGroups(){const g=$('groups');g.innerHTML='';for(const group of GROUPS){const present=group.tools.filter(n=>tools.some(t=>t.name===n));if(!present.length)continue;g.insertAdjacentHTML('beforeend','<h3>'+esc(group.label)+'</h3>'+present.map(n=>'<button class="tool'+(n===selected?' active':'')+'" data-tool="'+n+'">'+esc(n.replace('aliyunpan_',''))+'</button>').join(''))}
g.querySelectorAll('.tool').forEach(btn=>btn.onclick=()=>{selected=btn.dataset.tool;renderGroups();renderTool()})}
function renderQuick(){const q=$('quick');q.innerHTML='';for(const [label,name,args] of QUICK){const b=document.createElement('button');b.textContent=label;b.onclick=()=>execute(name,args);q.appendChild(b)}}
function renderTool(){const t=current();if(!t)return;$('tool-title').textContent=t.name;$('tool-desc').textContent=t.description||'';const form=$('tool-form');form.innerHTML='';const props=t.parameters&&t.parameters.properties||{};for(const [key,spec] of Object.entries(props))form.insertAdjacentHTML('beforeend',fieldHtml(key,spec));const required=(t.parameters&&t.parameters.required)||[];form.insertAdjacentHTML('beforeend','<div class="error" id="form-error" hidden></div><div class="actions"><button class="run" type="submit">执行 '+esc(t.name)+'</button><span class="muted">'+(required.length?('必填：'+esc(required.join(', '))):'无必填参数')+'</span></div>');form.onsubmit=async e=>{e.preventDefault();const err=$('form-error');err.hidden=true;let args;try{args=collect()}catch(ex){err.textContent=ex.message;err.hidden=false;return}const btn=form.querySelector('.run');btn.disabled=true;btn.textContent='执行中…';try{await execute(t.name,args)}finally{btn.disabled=false;btn.textContent='执行 '+t.name}}}
function showResult(data){const w=$('result-wrap');w.hidden=false;$('result').textContent=JSON.stringify(data,null,2)}
async function execute(name,args){const data=await api('/execute',{method:'POST',body:JSON.stringify({tool:name,args:args||{}})});showResult(data);loadTasks();return data}
async function loadTasks(){try{const d=await api('/tasks');const box=$('tasks');if(!d.ok||!Array.isArray(d.tasks))return;if(!d.tasks.length){box.innerHTML='<div class="empty">暂无任务。上传、下载、同步、登录会显示在这里。</div>';return}box.innerHTML='';for(const t of d.tasks){const div=document.createElement('div');div.className='task';const pct=t.progress&&t.progress.percent!=null?t.progress.percent+'% · ':'';div.innerHTML='<div><div class="title">'+esc(t.toolName)+' · '+esc(t.id)+'</div><div class="meta">'+esc(pct+t.status+(t.error?' · '+t.error:''))+'</div></div>'+(t.status==='running'?'<button class="stop" data-id="'+esc(t.id)+'">停止</button>':'');div.querySelector('.stop')&&(div.querySelector('.stop').onclick=()=>stop(t.id));box.appendChild(div)}}catch{}}
async function stop(id){const d=await api('/tasks/stop',{method:'POST',body:JSON.stringify({taskId:id})});showResult(d);loadTasks()}
async function boot(){try{const d=await api('/tools');if(d.ok&&Array.isArray(d.tools)){tools=d.tools;$('status').textContent='已连接 · '+tools.length+' 个工具';renderGroups();renderQuick();renderTool();loadTasks();taskTimer=setInterval(loadTasks,2000)}else{$('status').textContent='工具列表加载失败'}}catch(e){$('status').textContent='无法连接 /api/aliyundrive：'+e.message}}
boot();
</script>
</body>
</html>`;
