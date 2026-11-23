(function(){
"use strict";
const DIMENSION_COLORS=["#4ade80","#60a5fa","#fbbf24","#fb923c","#f87171","#a3e635","#94a3b8"],SPECIAL_COLOR="#22d3ee",COLORS=DIMENSION_COLORS;
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const uid=()=> "hr-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
const today=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).map(x=>[x.type,x.value]));return p.year+"-"+p.month+"-"+p.day};
let period="1m",view="overview",selectedDate=today(),selectedStatsHabit=null,statsSpotlightHabit=null,dataFolder=null,saveTimer=null,draggedHabitId=null,lastTouchedHabitId=null;
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
 const records={};const todayDate=new Date(today()+"T12:00:00"),cycle=["completed","completed","mva","completed","missed","completed","mva","completed"];
 for(let offset=89;offset>=0;offset--){const dt=new Date(todayDate);dt.setDate(dt.getDate()-offset);const date=dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0"),items={};
 habits.forEach((h,index)=>{const seed=(offset*7+index*11+index*index)%19;if(seed===0||seed===7||seed===14)return;const status=cycle[(offset*3+index*5+Math.floor(offset/6))%cycle.length],p=pools.find(x=>x.id===h.poolId);items[h.id]={status,snapshot:{habitId:h.id,name:h.name,poolName:p?.name||"Habit Library",points:h.points.map(x=>({dimensionId:x.dimensionId,dimensionName:dims.find(d=>d.id===x.dimensionId)?.name||"Dimension",points:x.points})),mva:.25},updatedAt:new Date(dt.getTime()+index*60000).toISOString()};});
 if(Object.keys(items).length)records[date]={date,items};}
 return {version:2,visualVersion:2,settings:{mva:.25,defaultBenchmark:1000},dimensions:dims,pools,habits,records};
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
 const acronyms={mva:"MVA",json:"JSON",api:"API",url:"URL",csv:"CSV",html:"HTML",css:"CSS",svg:"SVG",id:"ID",am:"AM",pm:"PM",ist:"IST",mvaed:"MVAed"};
 return String(s??"").replace(/[A-Za-z]+(?:'[A-Za-z]+)?/g,(word,offset,full)=>{
  if(offset>0&&/\d/.test(full[offset-1]))return word;
  const lower=word.toLowerCase();
  return acronyms[lower]||(lower.length===1?lower.toUpperCase():lower[0].toUpperCase()+lower.slice(1));
 });
}
function dimensionLabel(name){return String(name??"").trim();}
function applyTitleCase(){
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),nodes=[];
 while(walker.nextNode())if(walker.currentNode.nodeValue.trim())nodes.push(walker.currentNode);
 nodes.forEach(node=>{if(!node.parentElement.closest("script,style,[data-dimension-name],[data-preserve-case]"))node.nodeValue=titleCase(node.nodeValue)});
 document.querySelectorAll("[title],[aria-label],[placeholder]").forEach(el=>{
  if(el.matches("[data-open-dimension],[data-edit-dimension],[data-add-habit-dimension],[data-modal-points]"))return;
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
function cycle(id,date,status){const h=H(id),rec=data.records[date]||(data.records[date]={date,items:{}}),previous=rec.items?.[id];if(!h&&!previous?.snapshot)return;if(!["completed","mva","missed"].includes(status))return;rec.items[id]={status,snapshot:previous?.snapshot||snapshot(h),updatedAt:new Date().toISOString()};save()}
function rawPoints(dimId,range){let total=0;const now=new Date(today()+"T12:00:00"),start=new Date(now);if(range==="1m")start.setDate(start.getDate()-29);if(range==="3m")start.setDate(start.getDate()-89);Object.entries(data.records).forEach(([date,rec])=>{const dt=new Date(date+"T12:00:00");if(range!=="all"&&(dt<start||dt>now))return;Object.values(rec.items||{}).forEach(it=>{const s=it.snapshot;if(!s)return;const mult=it.status==="completed"?1:it.status==="mva"?s.mva:0;s.points.forEach(x=>{if(x.dimensionId===dimId)total+=x.points*mult})})});return total}
function percent(d,range){const ds=data.dimensions.filter(x=>!x.archived),max=Math.max(25,...ds.map(x=>rawPoints(x.id,range)));return Math.min(100,rawPoints(d.id,range)/(max*1.18)*100)}
function switchView(v){if(v==="stats"&&view!=="stats")statsSpotlightHabit=null;if(v==="tracker")selectedDate=today();view=v;render();window.scrollTo({top:0,behavior:"smooth"})}
function setSidebarOpen(open){
 const app=$(".app"),button=$("#sidebarClose");
 app.classList.toggle("sidebar-collapsed",!open);
 button.textContent=open?"‹":"›";
 button.setAttribute("aria-label",open?"Collapse sidebar":"Expand sidebar");
 button.title=open?"Collapse Sidebar":"Expand Sidebar";
 button.setAttribute("aria-expanded",String(open));
 try{localStorage.setItem("habitRadarSidebarOpen",open?"1":"0")}catch(e){}
}
function render(){const statHabit=H(selectedStatsHabit);const labels={overview:["Your Character","Overview"],tracker:["Daily Tracker","Daily Tracker"],"habit-stats":["Your Activity","Statistics"],library:["","Habit Library"],stats:["","Statistics"],settings:["","Settings & Data"]};$("#pageEyebrow").textContent=labels[view][0];$("#pageTitle").textContent=labels[view][1];$("#todayLabel").textContent=titleCase(new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"}));$$(".view").forEach(e=>e.classList.toggle("active",e.id==="view-"+view));$$(".nav-item[data-view]").forEach(e=>e.classList.toggle("active",e.dataset.view===view||(view==="habit-stats"&&e.dataset.view==="tracker")));renderOverview();renderTracker();renderHabitStats();renderLibrary();renderStats();renderSettings();applyTitleCase()}
const PERIOD_LABELS={"1m":"Last 30 Days","3m":"Last 90 Days","all":"All Recorded Activity"};
let activeDim=null;
function dimIndex(i){return String(i+1).padStart(2,"0")}
function dimColor(d,i){return safeColor(d.color,DIMENSION_COLORS[i%DIMENSION_COLORS.length])}
function joinNames(list){return list.length<2?list.join(""):list.slice(0,-1).join(", ")+" and "+list[list.length-1]}
function insightName(d,i){return '<span class="insight-name" data-dimension-name="true" style="color:'+esc(dimColor(d,i))+'">'+esc(dimensionLabel(d.name))+'</span>'}
function overviewInsight(ds,vals){
 if(!ds.length)return "";
 if(ds.length===1)return 'Only '+insightName(ds[0],0)+' is tracked, so there is no balance to compare yet.';
 const hi=Math.max(...vals),lo=Math.min(...vals);
 if(hi<=0)return 'No activity recorded in this period.';
 if(hi-lo<1e-9)return 'Level across every dimension, each at '+fmt(hi)+' points.';
 const pick=v=>ds.map((d,i)=>Math.abs(vals[i]-v)<1e-9?insightName(d,i):null).filter(Boolean);
 return '<em>Strongest:</em> '+joinNames(pick(hi))+'. <em>Lagging:</em> '+joinNames(pick(lo))+'.';
}
function setActiveDim(id){
 id=id||null;if(id===activeDim)return;activeDim=id;
 const plate=document.querySelector(".plate-screen");if(!plate)return;
 plate.classList.toggle("has-active",!!id);
 plate.querySelectorAll("[data-dim]").forEach(el=>el.classList.toggle("is-active",!!id&&el.dataset.dim===id));
}
function renderOverview(){
 const ds=data.dimensions.filter(d=>!d.archived),vals=ds.map(d=>rawPoints(d.id,period)),total=vals.reduce((a,b)=>a+b,0);
 activeDim=null;$(".plate-screen").classList.remove("has-active");
 const dp=Object.fromEntries(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",weekday:"long",day:"numeric",month:"long",year:"numeric"}).formatToParts(new Date()).map(x=>[x.type,x.value]));
 $("#mastheadDate").innerHTML='<em>'+esc(dp.weekday)+'</em> '+esc(dp.day+" "+dp.month+" "+dp.year);
 $("#mastheadPeriod").textContent=PERIOD_LABELS[period]||PERIOD_LABELS["1m"];
 $("#mastheadTotal").textContent=fmt(total);
 drawRadar(ds,vals);
 renderLedger(ds,vals);
 const insight=$("#insight");insight.innerHTML=overviewInsight(ds,vals);insight.hidden=!ds.length;
}
function renderLedger(ds,vals){
 const host=$("#ledger");
 if(!ds.length){host.innerHTML="";host.hidden=true;return}
 host.hidden=false;
 const max=Math.max(25,...vals)*1.18;
 host.innerHTML='<div class="ledger-head"><span>Dimension</span><span>Points</span></div>'+ds.map((d,i)=>{
  const name=esc(dimensionLabel(d.name));
  return '<div class="ledger-row" role="button" tabindex="0" data-dim="'+esc(d.id)+'" data-open-dimension="'+esc(d.id)+'" aria-label="Open '+name+' in Habit Library, '+fmt(vals[i])+' points" style="--dimension-accent:'+esc(dimColor(d,i))+'"><span class="ledger-index">'+dimIndex(i)+'</span><span class="ledger-name plate-name" data-dimension-name="true">'+name+'</span><span class="ledger-points">'+fmt(vals[i])+'</span><i class="ledger-bar"><b style="width:'+Math.min(100,vals[i]/max*100).toFixed(1)+'%"></b></i></div>';
 }).join("");
}
function drawRadar(ds,vals){
 const svg=$("#radar"),cx=380,cy=380,r=290,n=ds.length;
 if(!n){svg.innerHTML='<text class="radar-empty" x="380" y="384" text-anchor="middle">Create your first dimension</text>';return}
 const max=Math.max(25,...vals)*1.18;
 const ang=i=>-Math.PI/2+i*2*Math.PI/n;
 const at=(i,k)=>[cx+Math.cos(ang(i))*r*k,cy+Math.sin(ang(i))*r*k];
 const pt=a=>a[0].toFixed(1)+" "+a[1].toFixed(1);
 const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
 const P=ds.map((d,i)=>at(i,vals[i]/max));
 const accent=ds.map((d,i)=>'--dimension-accent:'+esc(dimColor(d,i)));
 let out='<g class="radar-rings">';
 [.25,.5,.75,1].forEach(k=>{out+='<circle class="radar-ring'+(k===1?' is-outer':'')+'" cx="'+cx+'" cy="'+cy+'" r="'+(r*k)+'"/><text class="radar-ring-label" x="'+(cx+6)+'" y="'+(cy-r*k+13)+'">'+Math.round(max*k)+'</text>'});
 out+='</g>';
 ds.forEach((d,i)=>{const t=at(i,1),ix=at(i,1.115);
  out+='<g class="radar-tip" data-dim="'+esc(d.id)+'" style="'+accent[i]+'"><line class="radar-axis" x1="'+cx+'" y1="'+cy+'" x2="'+t[0].toFixed(1)+'" y2="'+t[1].toFixed(1)+'"/><circle class="radar-end" cx="'+t[0].toFixed(1)+'" cy="'+t[1].toFixed(1)+'" r="2.6"/><text class="radar-index" x="'+ix[0].toFixed(1)+'" y="'+ix[1].toFixed(1)+'" text-anchor="middle" dominant-baseline="central">'+dimIndex(i)+'</text></g>';
 });
 out+='<g class="radar-data">';
 ds.forEach((d,i)=>{
  const p=P[i];let shape;
  if(n>=3){
   const m1=mid(P[(i-1+n)%n],p),m2=mid(p,P[(i+1)%n]);
   shape='<polygon class="radar-sector" points="'+[[cx,cy],m1,p,m2].map(pt).join(",")+'"/><path class="radar-edge" d="M'+pt(m1)+' L'+pt(p)+' L'+pt(m2)+'"/>';
  }else shape='<line class="radar-spoke" x1="'+cx+'" y1="'+cy+'" x2="'+p[0].toFixed(1)+'" y2="'+p[1].toFixed(1)+'"/>';
  out+='<g class="radar-dim" data-dim="'+esc(d.id)+'" style="'+accent[i]+'">'+shape+'<circle class="radar-node" cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="5"/></g>';
 });
 out+='</g><circle class="radar-center" cx="'+cx+'" cy="'+cy+'" r="2.5"/>';
 svg.innerHTML=out;
}
function renderTracker(){
 const date=selectedDate||today(),isToday=date===today(),rec=data.records[date],now=new Date(),dateParts=formatOrdinalDate(new Date(date+"T12:00:00")).split(", ");
 const active=activeHabits(),historical=Object.entries(rec?.items||{}).filter(([id,item])=>!active.some(h=>h.id===id)&&item?.snapshot).map(([id,item])=>({id,name:item.snapshot.name||H(id)?.name||"Archived Habit",historical:true}));
 const hs=[...active,...historical],resolved=resolvedCount(rec,hs);
 $("#liveDate").innerHTML='<span class="date-weekday">'+(isToday?"":'<span class="date-context">ARCHIVE / </span>')+esc(dateParts[0])+'</span><span class="date-rest">'+esc(dateParts.slice(1).join(", "))+'</span>';
 $("#liveClock").innerHTML=isToday?clockMarkup(now):'<button class="archive-back-button" data-back-stats>← Back To Statistics</button>';
 $("#todayProgressLabel").textContent=resolved+" / "+hs.length+" resolved";$("#todayProgressFill").style.transform="scaleX("+(hs.length?resolved/hs.length:0)+")";$("#trackerEmpty").hidden=hs.length>0;$("#trackerEmpty").textContent="No habits available for this day.";
 $("#trackerList").innerHTML=hs.map(h=>{const it=rec?.items[h.id],status=it?.status||"",accent=h.historical?(it?.snapshot?.points?.length>1?SPECIAL_COLOR:D(it?.snapshot?.points?.[0]?.dimensionId)?.color||"#aeb8c7"):habitAccent(h);
 return '<div class="daily-habit '+(status?"is-"+status:"")+(h.historical?" is-historical":"")+'" style="--habit-accent:'+esc(accent)+';" '+(h.historical?'':'data-open-habit="'+esc(h.id)+'" data-drag-habit="'+esc(h.id)+'"')+' tabindex="0" '+(h.historical?'':'role="link"')+' aria-label="'+esc(titleCase(h.name))+(h.historical?". Historical habit.":". Open statistics. Drag to reorder.")+'">'+(h.historical?'<span class="daily-grip historical-mark">◦</span>':'<span class="daily-grip" draggable="true" title="Drag to reorder" aria-label="Drag to reorder">⠿</span>')+'<span class="daily-habit-name">'+esc(titleCase(h.name))+'</span><div class="status-dots" role="group" aria-label="'+esc(titleCase(h.name))+' status"><button class="status-dot completed '+(status==="completed"?"chosen":"")+'" data-set-status="completed" data-habit="'+esc(h.id)+'" aria-label="Completed" aria-pressed="'+(status==="completed")+'" title="Completed"></button><button class="status-dot mva '+(status==="mva"?"chosen":"")+'" data-set-status="mva" data-habit="'+esc(h.id)+'" aria-label="Minimum viable action" aria-pressed="'+(status==="mva")+'" title="Minimum viable action"></button><button class="status-dot missed '+(status==="missed"?"chosen":"")+'" data-set-status="missed" data-habit="'+esc(h.id)+'" aria-label="Not completed" aria-pressed="'+(status==="missed")+'" title="Not completed"></button></div></div>';}).join("");
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
function dimensionGlyph(i,n,color){
 const c=16,r=13,ang=k=>-Math.PI/2+k*2*Math.PI/n,at=k=>[c+Math.cos(ang(k))*r,c+Math.sin(ang(k))*r],pt=a=>a[0].toFixed(1)+" "+a[1].toFixed(1);
 let body;
 if(n>=3){
  const pts=Array.from({length:n},(_,k)=>at(k)),a=pts[(i-1+n)%n],p=pts[i],b=pts[(i+1)%n];
  const m1=[(a[0]+p[0])/2,(a[1]+p[1])/2],m2=[(p[0]+b[0])/2,(p[1]+b[1])/2];
  body='<polygon class="glyph-outline" points="'+pts.map(pt).join(",")+'"/><polygon class="glyph-sector" points="'+[[c,c],m1,p,m2].map(pt).join(",")+'"/>';
 }else{const p=at(i);body='<circle class="glyph-outline" cx="16" cy="16" r="13"/><line class="glyph-spoke" x1="16" y1="16" x2="'+p[0].toFixed(1)+'" y2="'+p[1].toFixed(1)+'"/>'}
 return '<svg class="dimension-glyph" viewBox="0 0 32 32" aria-hidden="true" focusable="false" style="--dimension-accent:'+esc(color)+'">'+body+'</svg>';
}
function renderLibrary(){
 const touched=lastTouchedHabitId,host=$("#dimensionCards"),dims=data.dimensions.filter(d=>!d.archived);
 const linked=data.habits.filter(h=>habitAllocations(h).some(a=>dims.some(d=>d.id===a.dimensionId)));
 $("#libraryCounts").innerHTML='<strong>'+String(dims.length).padStart(2,"0")+'</strong> dimensions <span>·</span> <strong>'+String(linked.length).padStart(2,"0")+'</strong> habits';
 host.innerHTML=dims.map((d,di)=>{
  const habits=data.habits.filter(h=>habitAllocations(h).some(a=>a.dimensionId===d.id));
  const active=habits.filter(h=>h.active&&!h.archived).sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:"base"}));
  const inactive=habits.filter(h=>!h.active||h.archived).sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:"base"}));
  const rows=(list,isInactive)=>list.length?list.map(h=>{
   const allocation=habitAllocations(h).find(a=>a.dimensionId===d.id),shared=habitAllocations(h).length>1,locked=!h.active||h.archived;
   return '<article class="library-habit-row '+(isInactive?'is-inactive ':'')+(shared?'is-shared':'')+(touched===h.id?' just-saved':'')+'" style="--habit-accent:'+esc(habitAccent(h))+'"><button class="library-habit-main" data-edit-habit="'+esc(h.id)+'" aria-label="Edit '+esc(h.name)+'"><span class="library-habit-copy"><strong>'+esc(titleCase(h.name))+'</strong><small>'+fmt(allocation?.points||0)+' pts'+(shared?' <span class="shared-label">Shared</span>':'')+'</small></span></button><button class="library-lock '+(locked?'is-locked':'is-unlocked')+'" data-toggle-habit="'+esc(h.id)+'" aria-label="'+(locked?'Activate ':'Deactivate ')+esc(h.name)+'" title="'+(locked?'Unlock Habit':'Lock Habit')+'">'+(locked?'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10" width="15" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10" width="15" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 7.5-2"></path><path d="M16.5 5.5V10"></path></svg>')+'</button></article>';
  }).join(""):'<div class="library-group-empty">'+(isInactive?'No Inactive Habits':'No Active Habits')+'</div>';
  return '<article class="dimension-card" data-dimension-card="'+esc(d.id)+'" style="--dimension-accent:'+esc(safeColor(d.color,DIMENSION_COLORS[0]))+'"><header class="dimension-card-header"><div class="dimension-plate-head"><div class="dimension-plate-meta"><span class="dimension-index">'+dimIndex(di)+'</span><i class="dimension-rule"></i><span class="dimension-total" data-preserve-case>'+(active.length?active.length+" active · "+fmt(active.reduce((t,h)=>t+(Number(habitAllocations(h).find(a=>a.dimensionId===d.id)?.points)||0),0))+" pts/day":"None active")+'</span></div><button class="dimension-name-button" data-edit-dimension="'+esc(d.id)+'" aria-label="Rename '+esc(dimensionLabel(d.name))+'" title="Rename Dimension"><span class="plate-name" data-dimension-name="true">'+esc(dimensionLabel(d.name))+'</span></button></div><div class="dimension-header-tools">'+dimensionGlyph(di,dims.length,safeColor(d.color,DIMENSION_COLORS[0]))+'<button class="dimension-add-habit" data-add-habit-dimension="'+esc(d.id)+'" aria-label="Add habit to '+esc(dimensionLabel(d.name))+'" title="Add Habit">+</button></div></header><section class="library-group"><div class="library-group-heading"><span>Active</span><span>'+active.length+'</span></div><div class="library-habit-list">'+rows(active,false)+'</div></section><section class="library-group inactive-group"><div class="library-group-heading"><span>Inactive</span><span>'+inactive.length+'</span></div><div class="library-habit-list">'+rows(inactive,true)+'</div></section></article>';
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
function openHabitModal(id,preselectedDimensionId=null){
 const h=id?H(id):null,dims=data.dimensions;if(!dims.length){toast("Create A Dimension Before Adding Habits.");return}
 const existing=new Map((h?.points||[]).map(x=>[x.dimensionId,x.points]));
 const options=dims.map(d=>{
  const checked=existing.has(d.id)||(!h&&d.id===preselectedDimensionId),points=existing.has(d.id)?existing.get(d.id):10;
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

function statsDateRange(){const end=new Date(today()+"T12:00:00"),start=new Date(end);if(period==="1m")start.setDate(start.getDate()-29);else if(period==="3m")start.setDate(start.getDate()-89);else{const dates=Object.keys(data.records||{}).filter(d=>/^\\d{4}-\\d{2}-\\d{2}$/.test(d)).sort();if(dates.length)start.setTime(new Date(dates[0]+"T12:00:00").getTime())}return {start,end}}
function inStatsRange(date){const {start,end}=statsDateRange(),dt=new Date(date+"T12:00:00");return !Number.isNaN(dt.getTime())&&dt>=start&&dt<=end}
function statsRecords(){return Object.entries(data.records||{}).filter(([date])=>inStatsRange(date)).sort((a,b)=>a[0].localeCompare(b[0]))}
function dailyRecordPoints(record){return Object.values(record?.items||{}).reduce((sum,item)=>sum+(item?.snapshot?pointsFor(item.snapshot,item.status):0),0)}
function statsHabitRecords(id){const rows=[];statsRecords().forEach(([date,record])=>{const item=record.items?.[id];if(item?.snapshot&&["completed","mva","missed"].includes(item.status))rows.push({date,item})});return rows}
function renderWeeklyDistribution(){
 const totals=Array(7).fill(0),counts=Array(7).fill(0),labels=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],{start,end}=statsDateRange(),cursor=new Date(start);
 while(cursor<=end){const day=(cursor.getDay()+6)%7;counts[day]++;const date=cursor.getFullYear()+"-"+String(cursor.getMonth()+1).padStart(2,"0")+"-"+String(cursor.getDate()).padStart(2,"0");if(data.records[date])totals[day]+=dailyRecordPoints(data.records[date]);cursor.setDate(cursor.getDate()+1)}
 const values=totals.map((v,i)=>counts[i]?v/counts[i]:0),max=Math.max(1,...values);
 $("#weeklyChart").innerHTML='<div class="weekly-bars">'+values.map((v,i)=>'<div class="weekly-bar-column"><div class="weekly-bar-value">'+(v?fmt(v):"—")+'</div><div class="weekly-bar-track"><i style="height:'+Math.max(v?3:0,v/max*100)+'%"></i></div><span>'+labels[i]+'</span></div>').join("")+'</div><div class="chart-footnote">Average points per weekday · '+(period==="1m"?"30 days":period==="3m"?"90 days":"all time")+'</div>';
}
function renderHabitSpotlight(){
 const all=data.habits.filter(h=>h.id&&Object.values(data.records||{}).some(r=>r.items?.[h.id]?.snapshot));
 if(!statsSpotlightHabit||!all.some(h=>h.id===statsSpotlightHabit)){const choices=all.length?all:data.habits;statsSpotlightHabit=choices.length?choices[Math.floor(Math.random()*choices.length)].id:null}
 const h=H(statsSpotlightHabit),host=$("#spotlightChart");
 if(!h){$("#spotlightName").textContent="No Habit History";host.innerHTML='<div class="stats-empty">Record a habit to see its history.</div>';return}
 $("#spotlightName").textContent=titleCase(h.name);
 const daily=statsHabitRecords(h.id).map(x=>({date:x.date,value:pointsFor(x.item.snapshot,x.item.status),status:x.item.status}));
 if(!daily.length){host.innerHTML='<div class="stats-empty">No records for this habit in the selected period.</div>';return}
 const w=600,ht=260,p={l:28,r:16,t:18,b:34},max=Math.max(1,...daily.map(x=>x.value)),x=i=>p.l+(daily.length===1?(w-p.l-p.r)/2:i/(daily.length-1)*(w-p.l-p.r)),y=v=>ht-p.b-v/max*(ht-p.t-p.b),pts=daily.map((d,i)=>x(i)+","+y(d.value)).join(" "),area=p.l+","+y(0)+" "+pts+" "+x(daily.length-1)+","+y(0);
 const circles=daily.map((d,i)=>'<circle cx="'+x(i).toFixed(1)+'" cy="'+y(d.value).toFixed(1)+'" r="3.5" class="spotlight-point"><title>'+esc(d.date)+': '+fmt(d.value)+' points · '+esc(d.status)+'</title></circle>').join("");
 host.innerHTML='<svg class="spotlight-svg" viewBox="0 0 '+w+' '+ht+'" role="img" aria-label="Daily points for '+esc(h.name)+'"><line x1="'+p.l+'" y1="'+y(0)+'" x2="'+(w-p.r)+'" y2="'+y(0)+'" class="chart-axis"/><line x1="'+p.l+'" y1="'+y(max/2)+'" x2="'+(w-p.r)+'" y2="'+y(max/2)+'" class="chart-gridline"/><polygon points="'+area+'" class="spotlight-area"/><polyline points="'+pts+'" class="spotlight-line"/>'+circles+'<text x="'+p.l+'" y="'+(ht-8)+'" class="chart-date-label">'+esc(daily[0].date.slice(5))+'</text><text x="'+(w-p.r)+'" y="'+(ht-8)+'" text-anchor="end" class="chart-date-label">'+esc(daily[daily.length-1].date.slice(5))+'</text></svg><div class="spotlight-summary"><strong>'+fmt(daily.reduce((n,v)=>n+v.value,0))+'</strong><span>points in selected period</span><span class="spotlight-record-count">'+daily.length+' recorded '+(daily.length===1?"day":"days")+'</span></div>';
}
function renderDailyArchive(){const rows=statsRecords().filter(([,r])=>Object.keys(r.items||{}).length).reverse();$("#dailyArchive").innerHTML=rows.length?rows.map(([date,record])=>{const count=Object.keys(record.items||{}).length,points=dailyRecordPoints(record),label=new Intl.DateTimeFormat("en-IN",{weekday:"short",day:"numeric",month:"short",timeZone:"Asia/Kolkata"}).format(new Date(date+"T12:00:00"));return '<button type="button" class="archive-row" data-open-day="'+esc(date)+'" aria-label="Open '+esc(label)+' record"><span class="archive-date">'+esc(label)+'</span><span class="archive-count">'+count+' '+(count===1?"habit":"habits")+'</span><strong class="archive-points">'+fmt(points)+' <small>pts</small></strong><span class="archive-open" aria-hidden="true">↗</span></button>'}).join(""):'<div class="stats-empty">No recorded days in this period.</div>'}
function openArchiveDay(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!data.records[date])return;selectedDate=date;view="tracker";render();window.scrollTo({top:0,behavior:"smooth"})}
function renderHabitLeaders(){
 const cats=[["completed","Most Completed","Full completions"],["mva","Most MVAed","Minimum viable actions"],["missed","Most Missed","Recorded misses"]],totals=new Map();
 statsRecords().forEach(([,record])=>Object.entries(record.items||{}).forEach(([id,item])=>{if(!["completed","mva","missed"].includes(item?.status))return;const v=totals.get(id)||{completed:0,mva:0,missed:0,name:item.snapshot?.name||H(id)?.name||"Unknown Habit"};v[item.status]++;totals.set(id,v)}));
 $("#habitLeaders").innerHTML=cats.map(([key,label,desc])=>{const max=Math.max(0,...Array.from(totals.values(),v=>v[key])),leaders=max?Array.from(totals.entries()).filter(([,v])=>v[key]===max).sort((a,b)=>a[1].name.localeCompare(b[1].name)).map(([id,v])=>({id,...v})):[],visible=leaders.slice(0,2),remaining=leaders.length-visible.length;return '<section class="leader-category"><div class="leader-category-heading"><span>'+label+'</span><small>'+desc+'</small></div>'+(leaders.length?'<div class="leader-names">'+visible.map(v=>'<div class="leader-row"><strong>'+esc(titleCase(v.name))+'</strong><span>'+v[key]+'</span></div>').join("")+(remaining?'<div class="leader-more">+'+remaining+' more</div>':'')+'</div>':'<div class="leader-empty">No records</div>')+'</section>'}).join("");
}
function renderStats(){renderWeeklyDistribution();renderHabitSpotlight();renderDailyArchive();renderHabitLeaders();applyTitleCase()}
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
function resetAllData(){if(!confirm("Permanently erase all dimensions, habits, settings and historical records from this workspace? This cannot be undone. Export a backup first if needed."))return;data={version:2,visualVersion:2,settings:{mva:.25,defaultBenchmark:1000},dimensions:[],pools:[],habits:[],records:{}};selectedDate=today();selectedStatsHabit=null;statsSpotlightHabit=null;save();toast("All Workspace Data Cleared.")}
document.addEventListener("click",e=>{
 if(e.target.closest("#sidebarClose")){setSidebarOpen($(".app").classList.contains("sidebar-collapsed"));return}
 const close=e.target.closest("[data-close-library-modal]");if(close){closeHabitModal();return}
 if(e.target===$("#libraryModal")){closeHabitModal();return}
 const back=e.target.closest("[data-back-tracker]");if(back){selectedDate=today();switchView("tracker");return}
 const backStats=e.target.closest("[data-back-stats]");if(backStats){switchView("stats");return}
 const archiveDay=e.target.closest("[data-open-day]");if(archiveDay){openArchiveDay(archiveDay.dataset.openDay);return}
 const stateBtn=e.target.closest("[data-set-status]");if(stateBtn){cycle(stateBtn.dataset.habit,selectedDate||today(),stateBtn.dataset.setStatus);return}
 const habitRow=e.target.closest("[data-open-habit]");if(habitRow&&!e.target.closest("button,.daily-grip,.status-dots")){openHabitStats(habitRow.dataset.openHabit);return}
 const dimensionRow=e.target.closest("[data-open-dimension]");if(dimensionRow){openDimensionInLibrary(dimensionRow.dataset.openDimension);return}
 const nav=e.target.closest("[data-view]");if(nav){switchView(nav.dataset.view);return}
 const go=e.target.closest("[data-go]");if(go){switchView(go.dataset.go);return}
 const addForDimension=e.target.closest("[data-add-habit-dimension]");if(addForDimension){openHabitModal(null,addForDimension.dataset.addHabitDimension);return}
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
$("#resetAllData").onclick=resetAllData;

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
document.addEventListener("mouseover",e=>{if(view!=="overview")return;const t=e.target.closest&&e.target.closest(".plate-screen [data-dim]");setActiveDim(t?t.dataset.dim:null)});
document.addEventListener("focusin",e=>{const t=e.target.closest&&e.target.closest(".plate-screen [data-dim]");if(t)setActiveDim(t.dataset.dim)});
document.addEventListener("focusout",e=>{if(e.target.closest&&e.target.closest(".plate-screen [data-dim]"))setActiveDim(null)});
render();
try{if(localStorage.getItem("habitRadarSidebarOpen")==="0")setSidebarOpen(false)}catch(e){}
let lastDay=today();setInterval(()=>{if(view==="tracker"&&selectedDate===today()){const now=new Date(),day=today();$("#liveClock").innerHTML=clockMarkup(now);if(day!==lastDay){lastDay=day;renderTracker()}}},1000);
})();