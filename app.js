(function(){
"use strict";
const COLORS=["#4ade80","#a78bfa","#60a5fa","#f0abfc","#fbbf24","#fb923c","#5eead4","#fda4af"];
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const uid=()=> "hr-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
const today=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).map(x=>[x.type,x.value]));return p.year+"-"+p.month+"-"+p.day};
let period="1m",view="overview",selectedDate=today(),selectedPool=null,selectedHabit=null,selectedStatsHabit=null,dataFolder=null,saveTimer=null,draggedHabitId=null;
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
 return {version:1,settings:{mva:.25,defaultBenchmark:1000},dimensions:dims,pools,habits,records:{}};
}
function normalize(x){const base=sampleData();if(!x||typeof x!=="object")return base;return {version:1,settings:Object.assign(base.settings,x.settings||{}),dimensions:Array.isArray(x.dimensions)?x.dimensions:base.dimensions,pools:Array.isArray(x.pools)?x.pools:base.pools,habits:Array.isArray(x.habits)?x.habits:base.habits,records:x.records&&typeof x.records==="object"?x.records:{}}}
let data=sampleData();
try{const raw=localStorage.getItem("habit-radar-state");if(raw)data=normalize(JSON.parse(raw));}catch(e){console.warn("Local storage unavailable",e)}
if(!selectedPool)selectedPool=data.pools.find(p=>!p.archived)?.id||null;
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
function applyTitleCase(){
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),nodes=[];
 while(walker.nextNode())if(walker.currentNode.nodeValue.trim())nodes.push(walker.currentNode);
 nodes.forEach(node=>{if(!node.parentElement.closest("script,style"))node.nodeValue=titleCase(node.nodeValue)});
 document.querySelectorAll("[title],[aria-label],[placeholder]").forEach(el=>{
  ["title","aria-label","placeholder"].forEach(attr=>{if(el.hasAttribute(attr))el.setAttribute(attr,titleCase(el.getAttribute(attr)))});
 });
}
function ordinalDay(day){const n=Number(day),lastTwo=n%100;if(lastTwo>=11&&lastTwo<=13)return n+"th";return n+(n%10===1?"st":n%10===2?"nd":n%10===3?"rd":"th")}
function formatOrdinalDate(date){const parts=Object.fromEntries(new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",weekday:"long",month:"long",day:"numeric",year:"numeric"}).formatToParts(date).map(x=>[x.type,x.value]));return parts.weekday+", "+parts.month+" "+ordinalDay(parts.day)+", "+parts.year}
function formatIstTime(date){return date.toLocaleTimeString("en-IN",{timeZone:"Asia/Kolkata",hour:"numeric",minute:"2-digit",second:"2-digit",hour12:true}).replace(/\b(am|pm)\b/i,x=>x.toUpperCase())+" IST"}
function fmt(n){return (Math.round((Number(n)||0)*100)/100).toLocaleString(undefined,{maximumFractionDigits:2})}
function toast(s){const e=$("#toast");e.textContent=titleCase(s);e.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.classList.remove("show"),2300)}
function save(){try{localStorage.setItem("habit-radar-state",JSON.stringify(data));$("#storageDot").classList.add("saved");$("#storageText").textContent="Saved In This Browser"}catch(e){$("#storageText").textContent="Export Backup To Save";console.warn(e)}clearTimeout(saveTimer);saveTimer=setTimeout(saveFolder,250);render()}
function activeHabits(){return data.habits.filter(h=>h.active&&!h.archived&&P(h.poolId)&&!P(h.poolId).archived)}
function snapshot(h){const p=P(h.poolId);return {habitId:h.id,name:h.name,poolName:p?.name||"Archived Pool",points:h.points.map(x=>({dimensionId:x.dimensionId,dimensionName:D(x.dimensionId)?.name||"Archived Dimension",points:Number(x.points)||0})),mva:Number(data.settings.mva)||.25}}
function pointsFor(s,status){const m=status==="completed"?1:status==="mva"?s.mva:0;return s.points.reduce((a,x)=>a+x.points*m,0)}
function cycle(id,date,status){const h=H(id);if(!h)return;const rec=data.records[date]||(data.records[date]={date,items:{}});if(status==="missed")rec.items[id]={status:"missed",snapshot:snapshot(h),updatedAt:new Date().toISOString()};else rec.items[id]={status,snapshot:snapshot(h),updatedAt:new Date().toISOString()};save()}
function rawPoints(dimId,range){let total=0;const now=new Date(today()+"T12:00:00"),start=new Date(now);if(range==="1m")start.setDate(start.getDate()-29);if(range==="3m")start.setDate(start.getDate()-89);Object.entries(data.records).forEach(([date,rec])=>{const dt=new Date(date+"T12:00:00");if(range!=="all"&&(dt<start||dt>now))return;Object.values(rec.items||{}).forEach(it=>{const s=it.snapshot;if(!s)return;const mult=it.status==="completed"?1:it.status==="mva"?s.mva:0;s.points.forEach(x=>{if(x.dimensionId===dimId)total+=x.points*mult})})});return total}
function percent(d,range){const ds=data.dimensions.filter(x=>!x.archived),max=Math.max(25,...ds.map(x=>rawPoints(x.id,range)));return Math.min(100,rawPoints(d.id,range)/(max*1.18)*100)}
function switchView(v){view=v;render();window.scrollTo({top:0,behavior:"smooth"})}
function render(){const statHabit=H(selectedStatsHabit);const labels={overview:["Your Character","Overview"],tracker:["Daily Tracker","Daily Tracker"],"habit-stats":["Your Activity","Statistics"],library:["Your System","Habit Library"],stats:["The Long View","Statistics"],settings:["Preferences","Settings & Data"]};$("#pageEyebrow").textContent=labels[view][0];$("#pageTitle").textContent=labels[view][1];$("#todayLabel").textContent=titleCase(new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"}));$(".view").forEach(e=>e.classList.toggle("active",e.id==="view-"+view));$(".nav-item[data-view]").forEach(e=>e.classList.toggle("active",e.dataset.view===view||(view==="habit-stats"&&e.dataset.view==="tracker")));renderOverview();renderTracker();renderHabitStats();renderLibrary();renderStats();renderSettings();applyTitleCase()}
function renderOverview(){const ds=data.dimensions.filter(d=>!d.archived);drawRadar(ds,period);}
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
   '<text class="radar-label" x="'+label[0]+'" y="'+(label[1]-6)+'" text-anchor="'+anchor+'">'+esc(titleCase(d.name))+'</text>'+
   '<text class="radar-value" x="'+label[0]+'" y="'+(label[1]+15)+'" text-anchor="'+anchor+'">'+fmt(vals[i])+' pts</text>';
 });
 out+='<circle cx="'+cx+'" cy="'+cy+'" r="3" fill="#f4edff"/>';
 svg.innerHTML=out;
}
function renderTracker(){
 const hs=activeHabits(),rec=data.records[today()],now=new Date();
 $("#liveDate").textContent=formatOrdinalDate(now);
 $("#liveClock").textContent=formatIstTime(now);
 $("#trackerEmpty").hidden=hs.length>0;
 $("#trackerList").innerHTML=hs.map(h=>{
  const it=rec?.items[h.id],status=it?.status||"";
  return '<div class="daily-habit '+(status==="completed"?"is-completed":"")+'" data-open-habit="'+h.id+'" data-drag-habit="'+h.id+'" tabindex="0" role="link" aria-label="Open '+esc(titleCase(h.name))+' Statistics. Drag To Reorder.">'+
   '<span class="daily-grip" draggable="true" title="Drag To Reorder" aria-label="Drag To Reorder">⠿</span>'+
   '<span class="daily-habit-name">'+esc(titleCase(h.name))+'</span>'+
   '<div class="status-dots" role="group" aria-label="'+esc(titleCase(h.name))+' Status">'+
    '<button class="status-dot completed '+(status==="completed"?"chosen":"")+'" data-set-status="completed" data-habit="'+h.id+'" aria-label="Completed" title="Completed"></button>'+
    '<button class="status-dot mva '+(status==="mva"?"chosen":"")+'" data-set-status="mva" data-habit="'+h.id+'" aria-label="Minimum Viable Action" title="Minimum Viable Action"></button>'+
    '<button class="status-dot missed '+(status==="missed"?"chosen":"")+'" data-set-status="missed" data-habit="'+h.id+'" aria-label="Not Completed" title="Not Completed"></button>'+
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
 if(!h){$("#habitStatsName").textContent="Habit Statistics";$("#habitStatsDescription").textContent="Select A Habit From The Daily Tracker.";$("#habitStatsCards").innerHTML="";$("#habitStatsTable").innerHTML='<div class="empty-state">No Habit Selected.</div>';return}
 $("#habitStatsName").textContent=titleCase(h.name);
 $("#habitStatsDescription").textContent=(P(h.poolId)?.name?titleCase(P(h.poolId).name)+" · ":"")+"Individual Habit Progress";
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
function renderLibrary(){const ds=data.dimensions,pools=data.pools;if(!selectedPool||!P(selectedPool)||P(selectedPool).archived)selectedPool=pools[0]?.id||null;$("#dimensionManager").innerHTML=ds.map(d=>'<div class="manager-row"><button class="manager-item" data-edit-dimension="'+d.id+'"><i style="background:'+esc(d.color)+'"></i>'+esc(d.name)+(d.archived?" · Archived":"")+'</button><button class="manager-remove" title="'+(d.archived?"Restore Dimension":"Archive Dimension")+'" data-archive-dimension="'+d.id+'">'+(d.archived?"↶":"×")+'</button></div>').join("")||'<div class="muted">No dimensions</div>';
$("#poolManager").innerHTML=pools.map(p=>'<div class="manager-row"><button class="manager-item '+(p.id===selectedPool?"selected":"")+'" data-select-pool="'+p.id+'"><i style="background:'+esc(p.color)+'"></i>'+esc(titleCase(p.name))+'<span class="manager-count">'+data.habits.filter(h=>h.poolId===p.id&&!h.archived).length+'</span></button><button class="manager-remove" title="Archive Pool" data-archive-pool="'+p.id+'">'+(p.archived?"↶":"×")+'</button></div>').join("")||'<div class="muted">No pools</div>';
const p=P(selectedPool);$("#selectedPoolName").textContent=p?titleCase(p.name):"No Pool Selected";const hs=p?data.habits.filter(h=>h.poolId===p.id):[];$("#poolCount").textContent=hs.filter(h=>!h.archived).length+" Habits";$("#habitList").innerHTML=hs.length?hs.map(h=>'<button class="library-habit '+(h.archived?"archived ":"")+(h.id===selectedHabit?"selected":"")+'" data-select-habit="'+h.id+'"><span><strong>'+esc(h.name)+(h.archived?" · Archived":"")+'</strong><small>'+(h.active&&!h.archived?"Active":"Inactive")+' · '+h.points.map(x=>esc(titleCase(D(x.dimensionId)?.name||"Archived"))).join(", ")+'</small></span><span class="habit-points">'+fmt(h.points.reduce((a,x)=>a+x.points,0))+' pts</span></button>').join(""):'<div class="empty-state">This pool is empty. Create a habit to configure it.</div>';renderConfig();applyTitleCase()}
function renderConfig(){const h=H(selectedHabit);$("#configTitle").textContent=h?(h.archived?"Archived Habit":"Edit Habit"):"New Habit Configuration";if(!h){$("#configContent").innerHTML='<div class="config-empty">Select a habit from the list, or use New habit. All configuration lives here.</div>';return}const dims=data.dimensions.filter(d=>!d.archived),pools=data.pools.filter(p=>!p.archived);$("#configContent").innerHTML='<form id="habitConfig" class="config-form" novalidate><div class="form-field"><label for="cfgName">Habit name</label><input id="cfgName" name="name" maxlength="60" value="'+esc(titleCase(h.name))+'"></div><div class="form-field"><label for="cfgPool">Habit pool</label><select id="cfgPool" name="poolId">'+pools.map(p=>'<option value="'+p.id+'" '+(p.id===h.poolId?"selected":"")+'>'+esc(p.name)+'</option>').join("")+'</select></div><div class="config-section"><div class="config-label">Dimension Contributions</div><p class="muted">A habit can contribute to more than one dimension.</p>'+dims.map(d=>{const a=h.points.find(x=>x.dimensionId===d.id);return '<div class="allocation-row"><label><input type="checkbox" data-dim-check="'+d.id+'" '+(a?"checked":"")+'> <i class="swatch" style="background:'+esc(d.color)+'"></i>'+esc(d.name)+'</label><input type="number" min="0" step=".25" data-dim-points="'+d.id+'" value="'+(a?a.points:0)+'" aria-label="'+esc(d.name)+' points"></div>'}).join("")+'</div><div class="form-field"><label>Daily activation</label><label class="manager-item"><input type="checkbox" id="cfgActive" '+(h.active&&!h.archived?"checked":"")+' '+(h.archived?"disabled":"")+'> Enabled in daily tracker</label></div><div class="config-actions"><button type="submit" class="primary-button">Save configuration</button><button type="button" class="secondary-button" id="toggleArchive">'+(h.archived?"Restore Habit":"Archive Habit")+'</button><button type="button" class="danger-button" id="deleteHabit">Delete</button></div></form>';$("#habitConfig").addEventListener("submit",e=>{e.preventDefault();const name=$("#cfgName").value.trim();if(!name){toast("Enter A Habit Name.");$("#cfgName").focus();return}const allocations=[];dims.forEach(d=>{const check=$('[data-dim-check="'+d.id+'"]'),input=$('[data-dim-points="'+d.id+'"]'),points=Number(input.value);if(check.checked&&points>0)allocations.push({dimensionId:d.id,points})});if(!allocations.length){toast("Assign Points To At Least One Dimension.");return}h.name=name;h.poolId=$("#cfgPool").value;h.points=allocations;h.active=$("#cfgActive").checked;save();toast("Habit Configuration Saved.")});$("#toggleArchive").onclick=()=>{h.archived=!h.archived;if(h.archived)h.active=false;save();toast(h.archived?"Habit archived":"Habit restored")};$("#deleteHabit").onclick=()=>{if(confirm('Permanently Delete "'+titleCase(h.name)+'"? Historical Records Remain Preserved.')){data.habits=data.habits.filter(x=>x.id!==h.id);selectedHabit=null;save();toast("Habit Deleted.")}}}
function renderStats(){const ds=data.dimensions.filter(d=>!d.archived),total=ds.reduce((a,d)=>a+rawPoints(d.id,period),0),rec=data.records[today()];let todayTotal=0;if(rec)Object.values(rec.items).forEach(it=>todayTotal+=pointsFor(it.snapshot,it.status));$("#statsCards").innerHTML='<div class="stat-card"><div class="eyebrow">Points In View</div><strong>'+fmt(total)+'</strong><span>'+(period==="all"?"Accumulated Total":period==="1m"?"Last 30 Days":"Last 90 Days")+'</span></div><div class="stat-card"><div class="eyebrow">Active Habits</div><strong>'+activeHabits().length+'</strong><span>Currently enabled</span></div><div class="stat-card"><div class="eyebrow">Points Today</div><strong>'+fmt(todayTotal)+'</strong><span>Across all dimensions</span></div>';$("#statsTable").innerHTML=ds.length?'<table class="data-table"><thead><tr><th>Dimension</th><th>Points</th><th>Benchmark</th><th>Progress</th></tr></thead><tbody>'+ds.map(d=>'<tr><td>'+esc(d.name)+'</td><td>'+fmt(rawPoints(d.id,period))+'</td><td>'+fmt(d.benchmark)+'</td><td>'+percent(d,period).toFixed(1)+'%</td></tr>').join("")+'</tbody></table>':'<div class="empty-state">No dimensions to report.</div>';applyTitleCase()}
function renderSettings(){$("#mvaRange").value=data.settings.mva;$("#mvaValue").textContent=Number(data.settings.mva).toFixed(2)+"×";$("#defaultBenchmark").value=data.settings.defaultBenchmark;$("#storageDetail").textContent=dataFolder?"Connected Folder. Automatic JSON Backup Is Enabled.":"Browser Storage Is Active. Folder-Based Saving Is Optional And Only Available In Supported Browsers."}
function addDimension(){const name=prompt("Dimension Name");if(!name||!name.trim())return;const color=COLORS[data.dimensions.length%COLORS.length];data.dimensions.push({id:uid(),name:name.trim(),color,benchmark:Number(data.settings.defaultBenchmark)||1000,archived:false});save();toast("Dimension Added.")}
function addPool(){const name=prompt("Habit Pool Name");if(!name||!name.trim())return;const dims=data.dimensions.filter(d=>!d.archived);if(!dims.length){toast("Create A Dimension First.");return}const dimId=dims[0].id;const color=COLORS[data.pools.length%COLORS.length];const p={id:uid(),name:name.trim(),color,dimensionIds:[dimId],archived:false};data.pools.push(p);selectedPool=p.id;save();toast("Pool Created.")}
function newHabit(){let p=P(selectedPool);if(!p||p.archived)p=data.pools.find(x=>!x.archived);if(!p){addPool();return}const h={id:uid(),name:"New Habit",poolId:p.id,points:[{dimensionId:p.dimensionIds[0]||data.dimensions.find(d=>!d.archived)?.id,points:10}],active:true,archived:false};data.habits.push(h);selectedHabit=h.id;switchView("library");toast("New Habit Created. Configure It On The Right.")}
function editDimension(id){const d=D(id);if(!d)return;const name=prompt("Rename Dimension",titleCase(d.name));if(name===null)return;if(!name.trim()){toast("Dimension Name Cannot Be Empty.");return}d.name=name.trim();save()}
function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportData(){download("habit-radar-backup-"+today()+".json",JSON.stringify(data,null,2));toast("Backup Exported.")}
function importData(file){const reader=new FileReader();reader.onload=()=>{try{data=normalize(JSON.parse(reader.result));selectedPool=data.pools.find(p=>!p.archived)?.id||null;selectedHabit=null;save();toast("Backup Restored.")}catch(e){toast("Invalid Backup File.")}};reader.readAsText(file)}
async function chooseFolder(){if(!window.showDirectoryPicker){toast("Folder Saving Is Not Supported Here. Use JSON Export/Import.");return}try{dataFolder=await window.showDirectoryPicker({mode:"readwrite"});await saveFolder();renderSettings();toast("Data Folder Connected.")}catch(e){if(e.name!=="AbortError")toast("Could Not Connect Folder.")}}
async function saveFolder(){if(!dataFolder)return;try{const file=await dataFolder.getFileHandle("habit-radar.json",{create:true}),w=await file.createWritable();await w.write(JSON.stringify(data,null,2));await w.close()}catch(e){console.warn(e);toast("Folder Save Failed. Export A JSON Backup.")}}
function restoreSample(){if(confirm("Replace The Current Workspace With The Original Sample Data? Export A Backup First If Needed.")){data=sampleData();selectedPool=data.pools[0].id;selectedHabit=null;save();toast("Sample Workspace Restored.")}}
document.addEventListener("click",e=>{const back=e.target.closest("[data-back-tracker]");if(back){switchView("tracker");return}const stateBtn=e.target.closest("[data-set-status]");if(stateBtn){cycle(stateBtn.dataset.habit,today(),stateBtn.dataset.setStatus);return}const habitRow=e.target.closest("[data-open-habit]");if(habitRow&&!e.target.closest("button,.daily-grip")){openHabitStats(habitRow.dataset.openHabit);return}const nav=e.target.closest("[data-view]");if(nav){switchView(nav.dataset.view);return}const go=e.target.closest("[data-go]");if(go){switchView(go.dataset.go);return}const p=e.target.closest("[data-select-pool]");if(p){selectedPool=p.dataset.selectPool;selectedHabit=null;renderLibrary();return}const h=e.target.closest("[data-select-habit]");if(h){selectedHabit=h.dataset.selectHabit;renderLibrary();return}const dim=e.target.closest("[data-edit-dimension]");if(dim){editDimension(dim.dataset.editDimension);return}const archiveDim=e.target.closest("[data-archive-dimension]");if(archiveDim){const d=D(archiveDim.dataset.archiveDimension);if(d){if(d.archived){d.archived=false;save();toast("Dimension Restored.")}else if(confirm("Archive "+titleCase(d.name)+"? Historical Records Remain Preserved.")){d.archived=true;data.habits.forEach(h=>{h.points=h.points.filter(x=>x.dimensionId!==d.id);if(!h.points.length)h.active=false});save();toast("Dimension Archived.")}}return}const archivePool=e.target.closest("[data-archive-pool]");if(archivePool){const p=P(archivePool.dataset.archivePool);if(p){if(p.archived){p.archived=false;save();toast("Pool Restored.")}else if(confirm("Archive "+titleCase(p.name)+"? Its Habits Will Be Disabled, Not Deleted.")){p.archived=true;data.habits.filter(h=>h.poolId===p.id).forEach(h=>h.active=false);if(selectedPool===p.id)selectedPool=data.pools.find(x=>!x.archived)?.id||null;save();toast("Pool Archived.")}}return}const periodBtn=e.target.closest("[data-period]");if(periodBtn){period=periodBtn.dataset.period;$$("[data-period]").forEach(b=>b.classList.toggle("selected",b.dataset.period===period));renderOverview();renderStats();renderHabitStats();return}});
$("#renamePool").onclick=()=>{const p=P(selectedPool);if(!p)return;const name=prompt("Rename Habit Pool",titleCase(p.name));if(name===null)return;if(!name.trim()){toast("Pool Name Cannot Be Empty.");return}p.name=name.trim();save()};$("#addDimension").onclick=addDimension;$("#addPool").onclick=addPool;$("#newHabit").onclick=newHabit;$("#quickAdd").onclick=newHabit;$("#mvaRange").oninput=e=>{$("#mvaValue").textContent=Number(e.target.value).toFixed(2)+"×"};$("#mvaRange").onchange=e=>{data.settings.mva=Number(e.target.value);save();toast("MVA Multiplier Updated For Future Activity.")};$("#defaultBenchmark").onchange=e=>{data.settings.defaultBenchmark=Math.max(1,Number(e.target.value)||1000);save()};$("#exportData").onclick=exportData;$("#importData").onchange=e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=""};$("#chooseFolder").onclick=chooseFolder;$("#saveNow").onclick=()=>dataFolder?saveFolder().then(()=>toast("Saved.")):exportData();$("#resetData").onclick=restoreSample;
document.addEventListener("dragstart",e=>{const row=e.target.closest("[data-drag-habit]");if(!row||!e.target.closest(".daily-grip")){e.preventDefault();return}draggedHabitId=row.dataset.dragHabit;row.classList.add("dragging");if(e.dataTransfer){e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",draggedHabitId)}});
document.addEventListener("dragover",e=>{const row=e.target.closest("[data-drag-habit]");if(!row||!draggedHabitId)return;e.preventDefault();$(".daily-habit.drop-target").forEach(x=>x.classList.remove("drop-target"));if(row.dataset.dragHabit!==draggedHabitId)row.classList.add("drop-target")});
document.addEventListener("drop",e=>{const row=e.target.closest("[data-drag-habit]");if(!row||!draggedHabitId)return;e.preventDefault();reorderHabits(draggedHabitId,row.dataset.dragHabit);draggedHabitId=null;$(".daily-habit").forEach(x=>x.classList.remove("dragging","drop-target"))});
document.addEventListener("dragend",()=>{draggedHabitId=null;$(".daily-habit").forEach(x=>x.classList.remove("dragging","drop-target"))});
document.addEventListener("keydown",e=>{const row=e.target.closest("[data-drag-habit]");if(!row||e.target.closest("button"))return;if(e.key==="Enter"){e.preventDefault();openHabitStats(row.dataset.openHabit);return}if(!e.altKey||!["ArrowUp","ArrowDown"].includes(e.key))return;e.preventDefault();const list=activeHabits(),i=list.findIndex(h=>h.id===row.dataset.dragHabit),next=i+(e.key==="ArrowUp"?-1:1);if(next>=0&&next<list.length)reorderHabits(row.dataset.dragHabit,list[next].id)});
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();dataFolder?saveFolder():exportData()}});
render();
let lastDay=today();setInterval(()=>{if(view==="tracker"){const now=new Date(),day=today();$("#liveClock").textContent=formatIstTime(now);if(day!==lastDay){lastDay=day;renderTracker()}}},1000);
})();