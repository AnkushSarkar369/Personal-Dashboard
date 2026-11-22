(function(){
"use strict";
const DIMENSION_COLORS=["#4ade80","#60a5fa","#fbbf24","#fb923c","#f87171","#a3e635","#94a3b8"],SPECIAL_COLOR="#22d3ee",COLORS=DIMENSION_COLORS;
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const uid=()=> "hr-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
const today=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).map(x=>[x.type,x.value]));return p.year+"-"+p.month+"-"+p.day};
let period="1m",view="overview",selectedDate=today(),selectedStatsHabit=null,dataFolder=null,saveTimer=null,draggedHabitId=null,lastTouchedHabitId=null;
function sampleData(){
 const dims=[["health","Health",COLORS[0]],["academics","Academics",COLORS[1]],["relationships","Relationships",COLORS[2]],["looks","Looksmaxxing",COLORS[3]]].map(([id,name,color])=>({id:"d-"+id,name,color,benchmark:1000,archived:false}));
 const pools=[
  {id:"p-health",name:"Health",color:COLORS[0],dimensionIds:["d-health"],archived:false},
  {id:"p-learning",name:"Learning",color:COLORS[1],dimensionIds:["d-academics"],archived:false},
  {id:"p-social",name:"Relationships",color:COLORS[2],dimensionIds:["d-relationships"],archived:false},
  {id:"p-presence",name:"Personal presence",color:COLORS[3],dimensionIds:["d-looks"],archived:false}
 ];
 const habits=[
  ["h-water","Drink 4L water","p-health",10,"d-health"],["h-workout","Workout","p-health",25,"d-health"],["h-walk","Walking","p-health",20,"d-health"],["h-weigh","Weight check","p-health",5,"d-health"],
  ["h-study","Deep study session","p-learning",25,"d-academics"],["h-read","Read","p-learning",10,"d-academics"],["h-revise","Revision","p-learning",15,"d-academics"],
  ["h-connect","Meaningful conversation","p-social",15,"d-relationships"],["h-family","Time with family","p-social",10,"d-relationships"],
  ["h-groom","Grooming routine","p-presence",8,"d-looks"],["h-posture","Posture & mobility","p-presence",10,"d-looks"]
 ].map(([id,name,poolId,points,dimensionId])=>({id,name,poolId,points:[{dimensionId,points}],active:true,archived:false}));
 return {version:2,visualVersion:2,settings:{mva:.25,defaultBenchmark:1000},dimensions:dims,pools,habits,records:{}};
}
function safeColor(value,fallback){
 const v=String(value||"").trim();
 return /^#[0-9a-f]{6}$/i.test(v)?v:fallback;
}
function normalize(x){
 const base=sampleData();
 if(!x||typeof x!=="object")return base;
 const oldVisualVersion=Number(x.visualVersion)||0;
 const dimensions=(Array.isArray(x.dimensions)?x.dimensions:base.dimensions).map((d,i)=>({
  ...d,
  color:oldVisualVersion>=2?safeColor(d.color,DIMENSION_COLORS[i%DIMENSION_COLORS.length]):DIMENSION_COLORS[i%DIMENSION_COLORS.length],
  archived:false
 }));
 const habits=(Array.isArray(x.habits)?x.habits:base.habits).map(h=>({
  ...h,
  points:Array.isArray(h.points)?h.points.filter(a=>a&&a.dimensionId).map(a=>({...a,points:Number(a.points)||0})):[],
  active:h.active!==false&&!h.archived,
  archived:false,
  poolId:h.poolId??null
 }));
 return {version:2,visualVersion:2,settings:Object.assign(base.settings,x.settings||{}),dimensions,pools:Array.isArray(x.pools)?x.pools:[],habits,records:x.records&&typeof x.records==="object"?x.records:{}};
}
let data=sampleData();
try{const raw=localStorage.getItem("habit-radar-state");if(raw)data=normalize(JSON.parse(raw));}catch(e){console.warn("Local storage unavailable",e)}
function D(id){return data.dimensions.find(x=>x.id===id)}function P(id){return data.pools.find(x=>x.id===id)}function H(id){return data.habits.find(x=>x.id===id)}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function titleCase(s){
 const acronyms={mva:"MVA",json:"JSON",api:"API",url:"URL",csv:"CSV",html:"HTML",css:"CSS",svg:"SVG",id:"ID",am:"AM",pm:"PM",ist:"IST"};
 return String(s??"").replace(/[A-Za-z]+(?:'[A-Za-z]+)?/g,(word,offset,full)=>{
  if(offset>0&&/\d/.test(full[offset-1]))return word;
  const lower=word.toLowerCase();
  return acronyms[lower]||(lower.length===1?lower.toUpperCase():lower[0].toUpperCase()+lower.slice(1));
 });
}
function dimensionLabel(name){return String(name??"").trim().toUpperCase();}
function applyTitleCase(){
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),nodes=[];
 while(walker.nextNode())if(walker.currentNode.nodeValue.trim())nodes.push(walker.currentNode);
 nodes.forEach(node=>{if(!node.parentElement.closest("script,style,[data-dimension-name]"))node.nodeValue=titleCase(node.nodeValue)});
 document.querySelectorAll("[title],[aria-label],[placeholder]").forEach(el=>{
  if(el.matches("[data-open-dimension],[data-edit-dimension],[data-modal-points]"))return;
  ["title","aria-label","placeholder"].forEach(attr=>{if(el.hasAttribute(attr))el.setAttribute(attr,titleCase(el.getAttribute(attr)))});
 });
}
function ordinalDay(day){const n=Number(day),lastTwo=n%100;if(lastTwo>=11&&lastTwo<=13)return n+"th";return n+(n%10===1?"st":n%10===2?"nd":n%10===3?"rd":"th")}
function formatOrdinalDate(date){const parts=Object.fromEntries(new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",weekday:"long",month:"long",day:"numeric",year:"numeric"}).formatToParts(date).map(x=>[x.type,x.value]));return parts.weekday+", "+parts.month+" "+ordinalDay(parts.day)+", "+parts.year}
function formatIstTime(date){return date.toLocaleTimeString("en-IN",{timeZone:"Asia/Kolkata",hour:"numeric",minute:"2-digit",second:"2-digit",hour12:true}).replace(/\b(am|pm)\b/i,x=>x.toUpperCase())+" IST"}
function clockMarkup(date){const time=formatIstTime(date).replace(/\sIST$/,"");return '<span class="clock-digits">'+esc(time)+'</span><span class="clock-zone">IST</span>'}
function prefersReducedMotion(){return !!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)}
function resolvedCount(record,habits){return habits.reduce((n,h)=>{const s=record?.items?.[h.id]?.status;return n+(s==="completed"||s==="mva"?1:0)},0)}
function fmt(n){return (Math.round((Number(n)||0)*100)/100).toLocaleString(undefined,{maximumFractionDigits:2})}
function toast(s){const e=$("#toast");e.textContent=titleCase(s);e.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.classList.remove("show"),2300)}
function save(){try{localStorage.setItem("habit-radar-state",JSON.stringify(data));$("#storageDot").classList.add("saved");$("#storageText").textContent="Saved In This Browser"}catch(e){$("#storageText").textContent="Export Backup To Save";console.warn(e)}clearTimeout(saveTimer);saveTimer=setTimeout(saveFolder,250);render()}
function habitAllocations(h){return (Array.isArray(h?.points)?h.points:[]).filter((x,i,a)=>D(x.dimensionId)&&a.findIndex(y=>y.dimensionId===x.dimensionId)===i)}
function habitAccent(h){const a=habitAllocations(h);return a.length>1?SPECIAL_COLOR:D(a[0]?.dimensionId)?.color||"#aeb8c7"}
function activeHabits(){return data.habits.filter(h=>h.active&&!h.archived&&habitAllocations(h).length>0)}
function snapshot(h){const p=P(h.poolId);return {habitId:h.id,name:h.name,poolName:p?.name||"Habit Library",points:(h.points||[]).map(x=>({dimensionId:x.dimensionId,dimensionName:D(x.dimensionId)?.name||"Archived Dimension",points:Number(x.points)||0})),mva:Number(data.settings.mva)||.25}}
function pointsFor(s,status){const m=status==="completed"?1:status==="mva"?s.mva:0;return s.points.reduce((a,x)=>a+x.points*m,0)}
function cycle(id,date,status){const h=H(id);if(!h)return;const rec=data.records[date]||(data.records[date]={date,items:{}});if(status==="missed")rec.items[id]={status:"missed",snapshot:snapshot(h),updatedAt:new Date().toISOString()};else rec.items[id]={status,snapshot:snapshot(h),updatedAt:new Date().toISOString()};save()}
function rawPoints(dimId,range){let total=0;const now=new Date(today()+"T12:00:00"),start=new Date(now);if(range==="1m")start.setDate(start.getDate()-29);if(range==="3m")start.setDate(start.getDate()-89);Object.entries(data.records).forEach(([date,rec])=>{const dt=new Date(date+"T12:00:00");if(range!=="all"&&(dt<start||dt>now))return;Object.values(rec.items||{}).forEach(it=>{const s=it.snapshot;if(!s)return;const mult=it.status==="completed"?1:it.status==="mva"?s.mva:0;s.points.forEach(x=>{if(x.dimensionId===dimId)total+=x.points*mult})})});return total}
function percent(d,range){const ds=data.dimensions.filter(x=>!x.archived),max=Math.max(25,...ds.map(x=>rawPoints(x.id,range)));return Math.min(100,rawPoints(d.id,range)/(max*1.18)*100)}
function switchView(v){view=v;render();window.scrollTo({top:0,behavior:"smooth"})}
function setSidebarOpen(open){const app=$(".app");app.classList.toggle("sidebar-collapsed",!open);$("#sidebarClose").setAttribute("aria-expanded",String(open));$("#sidebarReopen").setAttribute("aria-expanded",String(open));try{localStorage.setItem("habitRadarSidebarOpen",open?"1":"0")}catch(e){}}
function render(){const statHabit=H(selectedStatsHabit);const labels={overview:["Your Character","Overview"],tracker:["Daily Tracker","Daily Tracker"],"habit-stats":["Your Activity","Statistics"],library:["","Habit Library"],stats:["","Statistics"],settings:["","Settings & Data"]};$("#pageEyebrow").textContent=labels[view][0];$("#pageTitle").textContent=labels[view][1];$("#todayLabel").textContent=titleCase(new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"}));$$(".view").forEach(e=>e.classList.toggle("active",e.id==="view-"+view));$$(".nav-item[data-view]").forEach(e=>e.classList.toggle("active",e.dataset.view===view||(view==="habit-stats"&&e.dataset.view==="tracker")));renderOverview();renderTracker();renderHabitStats();renderLibrary();renderStats();renderSettings();applyTitleCase()}
function renderOverview(){
 const ds=data.dimensions.filter(d=>!d.archived),parts=formatOrdinalDate(new Date()).split(", ");
 $("#overviewDate").innerHTML='<span class="character-weekday">'+esc(parts[0])+'</span><span class="character-date-rest">'+esc(parts.slice(1).join(", "))+'</span>';
 $("#overviewPeriodLabel").textContent=period==="1m"?"LAST 30 DAYS":period==="3m"?"LAST 90 DAYS":"ALL RECORDED TIME";
 drawRadar(ds,period);
}
function drawRadar(ds,range){
 const svg=$("#radar"),cx=500,cy=380,r=230,n=ds.length;
 svg.setAttribute("viewBox","0 0 1000 760");
 svg.setAttribute("preserveAspectRatio","xMidYMid meet");
 if(!n){svg.innerHTML='<text x="500" y="380" text-anchor="middle" fill="#8993a2" font-size="18">Create your first life dimension</text>';return}
 const vals=ds.map(d=>rawPoints(d.id,range)),max=Math.max(25,...vals)*1.18;
 const xy=(i,k)=>{const a=-Math.PI/2+i*2*Math.PI/n;return[cx+Math.cos(a)*r*k,cy+Math.sin(a)*r*k]};
 let defs='<defs><radialGradient id="coreGlow"><stop offset="0" stop-color="#ffffff" stop-opacity=".18"/><stop offset=".55" stop-color="#a88cff" stop-opacity=".07"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient><linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c4a8ff" stop-opacity=".25"/><stop offset=".5" stop-color="#75e8ce" stop-opacity=".10"/><stop offset="1" stop-color="#72a8ff" stop-opacity=".18"/></linearGradient><filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
 let out=defs+'<g class="star-field">';
 let seed=82471;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<58;i++){
  const sx=10+random()*980,sy=10+random()*740,size=.55+random()*.95,peak=(.34+random()*.34).toFixed(2),duration=(3.5+random()*4.5).toFixed(2),delay=(-random()*8).toFixed(2);
  out+='<circle class="star" cx="'+sx.toFixed(1)+'" cy="'+sy.toFixed(1)+'" r="'+size.toFixed(2)+'" style="--star-peak:'+peak+';--twinkle:'+duration+'s;animation-delay:'+delay+'s"/>';
 }
 out+='</g><circle cx="'+cx+'" cy="'+cy+'" r="310" fill="url(#coreGlow)"/>';
 [.25,.5,.75,1].forEach(k=>out+='<polygon class="radar-grid" points="'+ds.map((d,i)=>xy(i,k).join(",")).join(" ")+'"/>');
 ds.forEach((d,i)=>{const q=xy(i,1);out+='<line class="radar-axis" x1="'+cx+'" y1="'+cy+'" x2="'+q[0]+'" y2="'+q[1]+'" style="stroke:'+esc(d.color)+';stroke-opacity:.48"/><circle class="radar-orbit" cx="'+q[0]+'" cy="'+q[1]+'" r="5" style="stroke:'+esc(d.color)+'"/>'});
 const points=ds.map((d,i)=>xy(i,vals[i]/max).join(",")).join(" ");
 out+='<polygon class="radar-shape" points="'+points+'"/>';
 ds.forEach((d,i)=>{
  const a=-Math.PI/2+i*2*Math.PI/n,p=xy(i,vals[i]/max),label=xy(i,1.27),anchor=Math.cos(a)>.2?"start":Math.cos(a)<-.2?"end":"middle";
  out+='<circle class="radar-node-glow" cx="'+p[0]+'" cy="'+p[1]+'" r="15" fill="'+esc(d.color)+'"/>'+
   '<circle class="radar-node" cx="'+p[0]+'" cy="'+p[1]+'" r="5.5" fill="'+esc(d.color)+'"/>'+
   '<circle class="radar-point" cx="'+p[0]+'" cy="'+p[1]+'" r="2.3" style="fill:#fff;filter:url(#softGlow)"/>'+
   '<text class="radar-label" data-dimension-name="true" x="'+label[0]+'" y="'+(label[1]-6)+'" text-anchor="'+anchor+'" style="fill:'+esc(d.color)+';color:'+esc(d.color)+'">'+esc(dimensionLabel(d.name))+'</text>'+
   '<text class="radar-value" x="'+label[0]+'" y="'+(label[1]+15)+'" text-anchor="'+anchor+'">'+fmt(vals[i])+' pts</text>';
 });
 out+='<circle cx="'+cx+'" cy="'+cy+'" r="3" fill="#f4edff"/>';
 svg.innerHTML=out;
}
function renderTracker(){
 const hs=activeHabits(),todayDate=today(),rec=data.records[todayDate],now=new Date(),dateParts=formatOrdinalDate(now).split(", ");
 $("#liveDate").innerHTML='<span class="date-weekday">'+esc(dateParts[0])+'</span><span class="date-rest">'+esc(dateParts.slice(1).join(", "))+'</span>';
 $("#liveClock").innerHTML=clockMarkup(now);
 $("#trackerEmpty").hidden=hs.length>0;
 const resolved=resolvedCount(rec,hs);
 $("#todayProgressLabel").textContent=resolved+" / "+hs.length+" resolved";
 $("#todayProgressFill").style.transform="scaleX("+(hs.length?resolved/hs.length:0)+")";
 $("#trackerList").innerHTML=hs.map(h=>{
  const it=rec?.items[h.id],status=it?.status||"";
  return '<div class="daily-habit '+(status?"is-"+status:"")+'" style="--habit-accent:'+esc(habitAccent(h))+';" data-open-habit="'+esc(h.id)+'" data-drag-habit="'+esc(h.id)+'" tabindex="0" role="link" aria-label="Open '+esc(titleCase(h.name))+' statistics. Drag to reorder.">'+
   '<span class="daily-grip" draggable="true" title="Drag to reorder" aria-label="Drag to reorder">⠿</span>'+
   '<span class="daily-habit-name">'+esc(titleCase(h.name))+'</span>'+
   '<div class="status-dots" role="group" aria-label="'+esc(titleCase(h.name))+' status">'+
    '<button class="status-dot completed '+(status==="completed"?"chosen":"")+'" data-set-status="completed" data-habit="'+esc(h.id)+'" aria-label="Completed" aria-pressed="'+(status==="completed")+'" title="Completed"></button>'+
    '<button class="status-dot mva '+(status==="mva"?"chosen":"")+'" data-set-status="mva" data-habit="'+esc(h.id)+'" aria-label="Minimum viable action" aria-pressed="'+(status==="mva")+'" title="Minimum viable action"></button>'+
    '<button class="status-dot missed '+(status==="missed"?"chosen":"")+'" data-set-status="missed" data-habit="'+esc(h.id)+'" aria-label="Not completed" aria-pressed="'+(status==="missed")+'" title="Not completed"></button>'+
   '</div></div>';
 }).join("");
}
function openHabitStats(id){if(!H(id))return;selectedStatsHabit=id;view="habit-stats";render();window.scrollTo({top:0,behavior:"smooth"})}
function reorderHabits(fromId,toId){
 if(!fromId||!toId||fromId===toId)return;
 const ordered=activeHabits(),from=ordered.findIndex(h=>h.id===fromId),to=ordered.findIndex(h=>h.id===toId);
 if(from<0||to<0)return;
 const [moved]=ordered.splice(from,1);ordered.splice(to,0,moved);
 const activeIds=new Set(ordered.map(h=>h.id));let index=0;
 data.habits=data.habits.map(h=>activeIds.has(h.id)?ordered[index++]:h);
 save();toast("Habit Order Updated.");
}
function renderHabitStats(){
 const h=H(selectedStatsHabit);
 if(!h){$("#habitStatsName").textContent="Habit Statistics";$("#habitStatsName").style.color="";$("#habitStatsName").style.textShadow="";$("#habitStatsDescription").textContent="Select A Habit From The Daily Tracker.";$("#habitStatsCards").innerHTML="";$("#habitStatsTable").innerHTML='<div class="empty-state">No Habit Selected.</div>';return}
 $("#habitStatsName").textContent=titleCase(h.name);$("#habitStatsName").style.color=habitAccent(h);$("#habitStatsName").style.textShadow="0 0 22px "+habitAccent(h)+"33";
 $("#habitStatsDescription").textContent=(habitAllocations(h).length>1?"Shared Habit · ":"")+"Individual Habit Progress";
 const now=new Date(today()+"T12:00:00+05:30"),start=new Date(now);
 if(period==="1m")start.setDate(start.getDate()-29);
 if(period==="3m")start.setDate(start.getDate()-89);
 const entries=Object.entries(data.records).map(([date,rec])=>({date,item:rec.items?.[h.id]})).filter(x=>x.item&&(period==="all"||(new Date(x.date+"T12:00:00+05:30")>=start&&new Date(x.date+"T12:00:00+05:30")<=now))).sort((a,b)=>a.date.localeCompare(b.date));
 let earned=0,completed=0,mva=0,missed=0;
 entries.forEach(({item})=>{earned+=pointsFor(item.snapshot,item.status);if(item.status==="completed")completed++;else if(item.status==="mva")mva++;else if(item.status==="missed")missed++});
 $("#habitStatsCards").innerHTML=
  '<div class="stat-card"><div class="eyebrow">Points Earned</div><strong>'+fmt(earned)+'</strong><span>'+(period==="all"?"All Recorded Activity":period==="1m"?"Last 30 Days":"Last 90 Days")+'</span></div>'+
  '<div class="stat-card"><div class="eyebrow">Completed Days</div><strong>'+completed+'</strong><span>Full Completion</span></div>'+
  '<div class="stat-card"><div class="eyebrow">MVA Days</div><strong>'+mva+'</strong><span>Minimum Viable Action</span></div>'+
  '<div class="stat-card"><div class="eyebrow">Not Completed</div><strong>'+missed+'</strong><span>Recorded Misses</span></div>';
 $("#habitStatsTable").innerHTML=entries.length?
  '<table class="data-table"><thead><tr><th>Date</th><th>Status</th><th>Points</th></tr></thead><tbody>'+
  entries.slice().reverse().map(({date,item})=>'<tr><td>'+formatOrdinalDate(new Date(date+"T12:00:00+05:30"))+'</td><td>'+titleCase(item.status==="mva"?"MVA":item.status)+'</td><td>'+fmt(pointsFor(item.snapshot,item.status))+'</td></tr>').join("")+
  '</tbody></table>':'<div class="empty-state">No Activity Recorded In This Period.</div>';
}
function renderLibrary(){
 const touched=lastTouchedHabitId,host=$("#dimensionCards"),dims=data.dimensions;
 host.innerHTML=dims.map(d=>{
  const habits=data.habits.filter(h=>habitAllocations(h).some(a=>a.dimensionId===d.id));
  const active=habits.filter(h=>h.active&&!h.archived).sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:"base"}));
  const inactive=habits.filter(h=>!h.active||h.archived).sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:"base"}));
  const rows=(list,isInactive)=>list.length?list.map(h=>{
   const allocation=habitAllocations(h).find(a=>a.dimensionId===d.id),shared=habitAllocations(h).length>1,locked=!h.active||h.archived;
   return '<article class="library-habit-row '+(isInactive?'is-inactive ':'')+(shared?'is-shared':'')+(touched===h.id?' just-saved':'')+'" style="--habit-accent:'+esc(habitAccent(h))+'">'+
    '<button class="library-habit-main" data-edit-habit="'+esc(h.id)+'" aria-label="Edit '+esc(h.name)+'"><span class="library-habit-copy"><strong>'+esc(titleCase(h.name))+'</strong><small>'+fmt(allocation?.points||0)+' pts'+(shared?' <span class="shared-label">Shared</span>':'')+'</small></span></button>'+
    '<button class="library-lock '+(locked?'is-locked':'is-unlocked')+'" data-toggle-habit="'+esc(h.id)+'" aria-label="'+(locked?'Activate ':'Deactivate ')+esc(h.name)+'" title="'+(locked?'Unlock Habit':'Lock Habit')+'">'+
    (locked?'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10" width="15" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10" width="15" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 7.5-2"></path><path d="M16.5 5.5V10"></path></svg>')+'</button></article>';
  }).join(""):'<div class="library-group-empty">'+(isInactive?'No Inactive Habits':'No Active Habits')+'</div>';
  return '<article class="dimension-card" data-dimension-card="'+esc(d.id)+'" style="--dimension-accent:'+esc(safeColor(d.color,DIMENSION_COLORS[0]))+'">'+
   '<header class="dimension-card-header"><div class="dimension-title-wrap"><span class="dimension-color-mark"></span><h3 data-dimension-name="true">'+esc(dimensionLabel(d.name))+'</h3></div><div class="dimension-header-tools"><span class="dimension-total">'+habits.length+'</span><button class="dimension-edit" data-edit-dimension="'+esc(d.id)+'" aria-label="Rename '+esc(dimensionLabel(d.name))+'" title="Rename Dimension">···</button></div></header>'+
   '<section class="library-group"><div class="library-group-heading"><span>Active</span><span>'+active.length+'</span></div><div class="library-habit-list">'+rows(active,false)+'</div></section>'+
   '<section class="library-group inactive-group"><div class="library-group-heading"><span>Inactive</span><span>'+inactive.length+'</span></div><div class="library-habit-list">'+rows(inactive,true)+'</div></section></article>';
 }).join("")+'<button class="add-dimension-card" data-add-dimension><span class="add-dimension-plus">＋</span><strong>Add Dimension</strong><small>Create another area of life</small></button>';
 lastTouchedHabitId=null;
}
function nextDimensionColor(){const used=new Set(data.dimensions.map(d=>safeColor(d.color,"")));return DIMENSION_COLORS.find(c=>!used.has(c))||DIMENSION_COLORS[data.dimensions.length%DIMENSION_COLORS.length]}
function addDimension(){
 const name=prompt("Dimension Name");if(name===null||!name.trim())return;
 if(data.dimensions.some(d=>d.name.trim().toLowerCase()===name.trim().toLowerCase())){toast("That Dimension Already Exists.");return}
 data.dimensions.push({id:uid(),name:name.trim(),color:nextDimensionColor(),benchmark:Number(data.settings.defaultBenchmark)||1000,archived:false});
 save();toast("Dimension Added.");
}
function editDimension(id){
 const d=D(id);if(!d)return;const name=prompt("Rename Dimension",dimensionLabel(d.name));
 if(name===null)return;if(!name.trim()){toast("Dimension Name Cannot Be Empty.");return}
 if(data.dimensions.some(x=>x.id!==id&&x.name.trim().toLowerCase()===name.trim().toLowerCase())){toast("That Dimension Already Exists.");return}
 d.name=name.trim();save();toast("Dimension Renamed.");
}
function openHabitModal(id){
 const h=id?H(id):null,dims=data.dimensions;if(!dims.length){toast("Create A Dimension Before Adding Habits.");return}
 const existing=new Map((h?.points||[]).map(x=>[x.dimensionId,x.points]));
 const options=dims.map(d=>{
  const checked=existing.has(d.id),points=checked?existing.get(d.id):10;
  return '<label class="dimension-choice '+(checked?'selected':'')+'"><span class="dimension-choice-name"><input type="checkbox" data-modal-dimension="'+esc(d.id)+'" '+(checked?'checked':'')+'><i style="--choice-accent:'+esc(d.color)+'"></i><span data-dimension-name="true">'+esc(dimensionLabel(d.name))+'</span></span><span class="dimension-points"><input type="number" data-modal-points="'+esc(d.id)+'" min="0.25" step="0.25" value="'+esc(points)+'" '+(!checked?'disabled':'')+' aria-label="'+esc(dimensionLabel(d.name))+' points"><small>pts</small></span></label>';
 }).join("");
 const modal=$("#libraryModal");modal.dataset.editingHabit=h?.id||"";
 modal.innerHTML='<div class="library-modal-backdrop" data-close-library-modal></div><section class="library-dialog" role="dialog" aria-modal="true" aria-labelledby="libraryDialogTitle">'+
  '<header class="library-dialog-header"><div><div class="eyebrow">'+(h?'Habit Configuration':'New Habit')+'</div><h3 id="libraryDialogTitle">'+(h?'Edit Habit':'Add A Habit')+'</h3></div><button type="button" class="modal-close" data-close-library-modal aria-label="Close">×</button></header>'+
  '<form id="libraryHabitForm" class="library-dialog-form" novalidate><div class="form-field"><label for="libraryHabitName">Habit Name</label><input id="libraryHabitName" maxlength="60" required value="'+esc(h?.name||'')+'" placeholder="e.g. Read for 30 minutes"></div>'+
  '<div class="library-modal-section"><div class="library-modal-section-heading"><div><strong>Dimensions</strong><small>Choose every dimension this habit contributes to.</small></div><span>Points / Dimension</span></div><div class="dimension-choice-list">'+options+'</div></div>'+
  '<p class="library-modal-note">Habits assigned to multiple dimensions automatically receive the shared aqua identity.</p>'+
  '<div class="library-dialog-actions"><button type="button" class="secondary-button" data-close-library-modal>Cancel</button><button type="submit" class="primary-button">'+(h?'Save Changes':'Create Habit')+'</button></div></form></section>';
 modal.hidden=false;$("#libraryHabitName").focus();
}
function closeHabitModal(){const modal=$("#libraryModal");modal.hidden=true;modal.innerHTML="";modal.dataset.editingHabit=""}
function submitHabitModal(e){
 e.preventDefault();const modal=$("#libraryModal"),name=$("#libraryHabitName").value.trim();
 if(!name){toast("Enter A Habit Name.");$("#libraryHabitName").focus();return}
 const selected=Array.from(modal.querySelectorAll("[data-modal-dimension]:checked")),allocations=[];
 selected.forEach(check=>{
  const id=check.dataset.modalDimension,input=Array.from(modal.querySelectorAll("[data-modal-points]")).find(x=>x.dataset.modalPoints===id),points=Number(input?.value);
  if(Number.isFinite(points)&&points>0)allocations.push({dimensionId:id,points});
 });
 if(!allocations.length){toast("Select At Least One Dimension And Assign Points.");return}
 if(allocations.length!==selected.length){toast("Every Selected Dimension Needs Positive Points.");return}
 const id=modal.dataset.editingHabit,h=id?H(id):null;
 if(h){h.name=name;h.points=allocations;h.archived=false;}
 else data.habits.push({id:uid(),name,poolId:null,points:allocations,active:true,archived:false});
 closeHabitModal();save();toast(h?"Habit Updated.":"Habit Added.");
}
function toggleHabit(id){const h=H(id);if(!h)return;h.active=!(h.active&&!h.archived);h.archived=false;lastTouchedHabitId=id;save();toast(h.active?"Habit activated.":"Habit made inactive.")}

function renderStats(){
 const ds=data.dimensions.filter(d=>!d.archived),total=ds.reduce((a,d)=>a+rawPoints(d.id,period),0),rec=data.records[today()];
 let todayTotal=0;
 if(rec)Object.values(rec.items).forEach(it=>todayTotal+=pointsFor(it.snapshot,it.status));
 $("#statsCards").innerHTML=
  '<div class="stat-card"><div class="eyebrow">Points In View</div><strong>'+fmt(total)+'</strong><span>'+(period==="all"?"Accumulated Total":period==="1m"?"Last 30 Days":"Last 90 Days")+'</span></div>'+
  '<div class="stat-card"><div class="eyebrow">Active Habits</div><strong>'+activeHabits().length+'</strong><span>Currently enabled</span></div>'+
  '<div class="stat-card"><div class="eyebrow">Points Today</div><strong>'+fmt(todayTotal)+'</strong><span>Across all dimensions</span></div>';
 $("#statsTable").innerHTML=ds.length?
  '<div class="stats-table-wrap"><table class="data-table"><thead><tr><th>Dimension</th><th>Points</th><th>Benchmark</th><th>Progress</th></tr></thead><tbody>'+
  ds.map(d=>'<tr class="dimension-stat-row" data-open-dimension="'+esc(d.id)+'" tabindex="0" role="button" aria-label="Open '+esc(dimensionLabel(d.name))+' in Habit Library"><td><span class="dimension-table-label" style="--dimension-accent:'+esc(d.color)+'"><i></i><span data-dimension-name="true">'+esc(dimensionLabel(d.name))+'</span><span class="dimension-row-open" aria-hidden="true">↗</span></span></td><td>'+fmt(rawPoints(d.id,period))+'</td><td>'+fmt(d.benchmark)+'</td><td>'+percent(d,period).toFixed(1)+'%</td></tr>').join("")+
  '</tbody></table></div>':'<div class="empty-state">No dimensions to report.</div>';
 applyTitleCase();
}
function openDimensionInLibrary(id){
 const d=D(id);if(!d)return;
 view="library";render();
 const card=Array.from(document.querySelectorAll("[data-dimension-card]")).find(el=>el.dataset.dimensionCard===id);
 if(card){card.classList.add("dimension-card-focus");card.scrollIntoView({behavior:"smooth",block:"center"});}
}
function renderSettings(){$("#mvaRange").value=data.settings.mva;$("#mvaValue").textContent=Number(data.settings.mva).toFixed(2)+"×";$("#defaultBenchmark").value=data.settings.defaultBenchmark;$("#storageDetail").textContent=dataFolder?"Connected Folder. Automatic JSON Backup Is Enabled.":"Browser Storage Is Active. Folder-Based Saving Is Optional And Only Available In Supported Browsers."}
function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportData(){download("habit-radar-backup-"+today()+".json",JSON.stringify(data,null,2));toast("Backup Exported.")}
function importData(file){const reader=new FileReader();reader.onload=()=>{try{data=normalize(JSON.parse(reader.result));save();toast("Backup Restored.")}catch(e){toast("Invalid Backup File.")}};reader.readAsText(file)}
async function chooseFolder(){if(!window.showDirectoryPicker){toast("Folder Saving Is Not Supported Here. Use JSON Export/Import.");return}try{dataFolder=await window.showDirectoryPicker({mode:"readwrite"});await saveFolder();renderSettings();toast("Data Folder Connected.")}catch(e){if(e.name!=="AbortError")toast("Could Not Connect Folder.")}}
async function saveFolder(){if(!dataFolder)return;try{const file=await dataFolder.getFileHandle("habit-radar.json",{create:true}),w=await file.createWritable();await w.write(JSON.stringify(data,null,2));await w.close()}catch(e){console.warn(e);toast("Folder Save Failed. Export A JSON Backup.")}}
function restoreSample(){if(confirm("Replace The Current Workspace With The Original Sample Data? Export A Backup First If Needed.")){data=sampleData();save();toast("Sample Workspace Restored.")}}
document.addEventListener("click",e=>{
 if(e.target.closest("#sidebarClose")){setSidebarOpen(false);return}
 if(e.target.closest("#sidebarReopen")){setSidebarOpen(true);return}
 const close=e.target.closest("[data-close-library-modal]");if(close){closeHabitModal();return}
 if(e.target===$("#libraryModal")){closeHabitModal();return}
 const back=e.target.closest("[data-back-tracker]");if(back){switchView("tracker");return}
 const stateBtn=e.target.closest("[data-set-status]");if(stateBtn){cycle(stateBtn.dataset.habit,today(),stateBtn.dataset.setStatus);return}
 const habitRow=e.target.closest("[data-open-habit]");if(habitRow&&!e.target.closest("button,.daily-grip,.status-dots")){openHabitStats(habitRow.dataset.openHabit);return}
 const dimensionRow=e.target.closest("[data-open-dimension]");if(dimensionRow){openDimensionInLibrary(dimensionRow.dataset.openDimension);return}
 const nav=e.target.closest("[data-view]");if(nav){switchView(nav.dataset.view);return}
 const go=e.target.closest("[data-go]");if(go){switchView(go.dataset.go);return}
 if(e.target.closest("#addHabit")){openHabitModal(null);return}
 const addDim=e.target.closest("[data-add-dimension]");if(addDim){addDimension();return}
 const toggle=e.target.closest("[data-toggle-habit]");if(toggle){toggleHabit(toggle.dataset.toggleHabit);return}
 const editHabit=e.target.closest("[data-edit-habit]");if(editHabit){openHabitModal(editHabit.dataset.editHabit);return}
 const dim=e.target.closest("[data-edit-dimension]");if(dim){editDimension(dim.dataset.editDimension);return}
 const periodBtn=e.target.closest("[data-period]");if(periodBtn){period=periodBtn.dataset.period;$$("[data-period]").forEach(b=>b.classList.toggle("selected",b.dataset.period===period));renderOverview();renderStats();renderHabitStats();return}
});
$("#libraryModal").addEventListener("submit",e=>{if(e.target.id==="libraryHabitForm")submitHabitModal(e)});
$("#libraryModal").addEventListener("change",e=>{
 const check=e.target.closest("[data-modal-dimension]");if(!check)return;
 const points=Array.from($("#libraryModal").querySelectorAll("[data-modal-points]")).find(x=>x.dataset.modalPoints===check.dataset.modalDimension);
 if(points)points.disabled=!check.checked;
 check.closest(".dimension-choice")?.classList.toggle("selected",check.checked);
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#libraryModal").hidden)closeHabitModal()});
$("#mvaRange").oninput=e=>{$("#mvaValue").textContent=Number(e.target.value).toFixed(2)+"×"};
$("#mvaRange").onchange=e=>{data.settings.mva=Number(e.target.value);save();toast("MVA Multiplier Updated For Future Activity.")};
$("#defaultBenchmark").onchange=e=>{data.settings.defaultBenchmark=Math.max(1,Number(e.target.value)||1000);save()};
$("#exportData").onclick=exportData;
$("#importData").onchange=e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=""};
$("#chooseFolder").onclick=chooseFolder;
$("#saveNow").onclick=()=>dataFolder?saveFolder().then(()=>toast("Saved.")):exportData();
$("#resetData").onclick=restoreSample;

document.addEventListener("dragstart",e=>{const row=e.target.closest("[data-drag-habit]");if(!row||!e.target.closest(".daily-grip")){e.preventDefault();return}draggedHabitId=row.dataset.dragHabit;row.classList.add("dragging");if(e.dataTransfer){e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",draggedHabitId)}});
document.addEventListener("dragover",e=>{const row=e.target.closest("[data-drag-habit]");if(!row||!draggedHabitId)return;e.preventDefault();$$( ".daily-habit.drop-target").forEach(x=>x.classList.remove("drop-target"));if(row.dataset.dragHabit!==draggedHabitId)row.classList.add("drop-target")});
document.addEventListener("drop",e=>{const row=e.target.closest("[data-drag-habit]");if(!row||!draggedHabitId)return;e.preventDefault();reorderHabits(draggedHabitId,row.dataset.dragHabit);draggedHabitId=null;$$( ".daily-habit").forEach(x=>x.classList.remove("dragging","drop-target"))});
document.addEventListener("dragend",()=>{draggedHabitId=null;$$( ".daily-habit").forEach(x=>x.classList.remove("dragging","drop-target"))});
document.addEventListener("keydown",e=>{
  const dimensionRow=e.target.closest("[data-open-dimension]");
  if(dimensionRow&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openDimensionInLibrary(dimensionRow.dataset.openDimension);return}
  const row=e.target.closest("[data-drag-habit]");if(!row||e.target.closest("button"))return;
  if(e.key==="Enter"){e.preventDefault();openHabitStats(row.dataset.openHabit);return}
  if(!e.altKey||!["ArrowUp","ArrowDown"].includes(e.key))return;
  e.preventDefault();const list=activeHabits(),i=list.findIndex(h=>h.id===row.dataset.dragHabit),next=i+(e.key==="ArrowUp"?-1:1);
  if(next>=0&&next<list.length)reorderHabits(row.dataset.dragHabit,list[next].id)
 });
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();dataFolder?saveFolder():exportData()}});
render();
try{if(localStorage.getItem("habitRadarSidebarOpen")==="0")setSidebarOpen(false)}catch(e){}
let lastDay=today();setInterval(()=>{if(view==="tracker"){const now=new Date(),day=today();$("#liveClock").innerHTML=clockMarkup(now);if(day!==lastDay){lastDay=day;renderTracker()}}},1000);
})();