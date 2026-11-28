(function(){
"use strict";
const DIMENSION_COLORS=["#4ade80","#60a5fa","#fbbf24","#fb923c","#f87171","#a3e635","#94a3b8"],SPECIAL_COLOR="#22d3ee",COLORS=DIMENSION_COLORS,OUTCOME_STATUSES=new Set(["completed","mva","missed"]);
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const uid=()=> "hr-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
const IST_DATE_PARTS_FORMATTER=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"});
const ORDINAL_DATE_FORMATTER=new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",weekday:"long",month:"long",day:"numeric",year:"numeric"});
const IST_TIME_FORMATTER=new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",hour:"numeric",minute:"2-digit",second:"2-digit",hour12:true});
const ARCHIVE_DATE_FORMATTER=new Intl.DateTimeFormat("en-IN",{weekday:"short",day:"numeric",month:"short",timeZone:"Asia/Kolkata"});
const LOCAL_SHORT_DATE_FORMATTER=new Intl.DateTimeFormat(undefined,{weekday:"short",month:"short",day:"numeric"});
const today=()=>{const p=Object.fromEntries(IST_DATE_PARTS_FORMATTER.formatToParts(new Date()).map(x=>[x.type,x.value]));return p.year+"-"+p.month+"-"+p.day};

function validDateKey(value){
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+"T12:00:00Z");
 return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
}
function shiftDateKey(date,days){const value=new Date(date+"T12:00:00Z");value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10)}
function periodContains(period,date){return !!period&&validDateKey(period.from)&&period.from<=date&&(!period.through||period.through>=date)}
function buildEligibilityBaseline(dimensions,habits,startDate,mva){
 const dimensionHistory={},habitHistory={};
 dimensions.forEach(d=>{dimensionHistory[d.id]=d.active===false?[]:[{from:startDate,through:null}]});
 habits.forEach(h=>{
  const allocations=(h.points||[]).map(a=>({dimensionId:a.dimensionId,dimensionName:dimensions.find(d=>d.id===a.dimensionId)?.name||"Dimension",points:Number(a.points)||0}));
  habitHistory[h.id]=h.active===false||!allocations.length?[]:[{from:startDate,through:null,name:h.name,allocations,mva:Number(mva)||.25}];
 });
 return {dimensions:dimensionHistory,habits:habitHistory};
}
function normalizeEligibility(source,dimensions,habits,startDate,mva){
 const fallback=buildEligibilityBaseline(dimensions,habits,startDate,mva),input=isPlainObject(source)?source:{};
 const dimensionSource=isPlainObject(input.dimensions)?input.dimensions:{},habitSource=isPlainObject(input.habits)?input.habits:{};
 const dimensionsOut={},habitsOut={};
 Object.keys({...fallback.dimensions,...dimensionSource}).forEach(id=>{
  const list=Array.isArray(dimensionSource[id])?dimensionSource[id]:fallback.dimensions[id]||[];
  dimensionsOut[id]=list.filter(p=>isPlainObject(p)&&validDateKey(p.from)&&(!p.through||validDateKey(p.through))&&(!p.through||p.through>=p.from)).map(p=>({from:p.from,through:p.through||null}));
 });
 Object.keys({...fallback.habits,...habitSource}).forEach(id=>{
  const list=Array.isArray(habitSource[id])?habitSource[id]:fallback.habits[id]||[];
  habitsOut[id]=list.filter(p=>isPlainObject(p)&&validDateKey(p.from)&&(!p.through||validDateKey(p.through))&&(!p.through||p.through>=p.from)&&Array.isArray(p.allocations)).map(p=>({
   from:p.from,through:p.through||null,name:String(p.name||"Habit"),
   allocations:p.allocations.filter(a=>isPlainObject(a)&&typeof a.dimensionId==="string"&&Number.isFinite(Number(a.points))&&Number(a.points)>0).map(a=>({dimensionId:a.dimensionId,dimensionName:String(a.dimensionName||"Dimension"),points:Number(a.points)})),
   mva:Number.isFinite(Number(p.mva))?Math.min(.5,Math.max(.1,Number(p.mva))):Number(mva)||.25
  }));
 });
 return {dimensions:dimensionsOut,habits:habitsOut};
}
function eligibilityPeriodAt(list,date){return (Array.isArray(list)?list:[]).find(p=>periodContains(p,date))||null}
function replaceEligibilityFrom(list,date,nextPeriod){
 const prior=(Array.isArray(list)?list:[]).filter(p=>p.from<date).map(p=>!p.through||p.through>=date?{...p,through:shiftDateKey(date,-1)}:p);
 if(nextPeriod)prior.push(nextPeriod);
 return prior;
}
function makeHabitEligibilityPeriod(h,date){
 return {from:date,through:null,name:h.name,allocations:(h.points||[]).map(a=>({dimensionId:a.dimensionId,dimensionName:D(a.dimensionId)?.name||"Dimension",points:Number(a.points)||0})).filter(a=>a.points>0),mva:Number(data.settings.mva)||.25};
}
function refreshHabitEligibility(h,date=today()){
 if(!data.eligibility)data.eligibility={dimensions:{},habits:{}};
 data.eligibility.habits[h.id]=replaceEligibilityFrom(data.eligibility.habits[h.id]||[],date,h.active&&!h.archived&&h.points?.length?makeHabitEligibilityPeriod(h,date):null);
}
function refreshDimensionEligibility(d,date=today()){
 if(!data.eligibility)data.eligibility={dimensions:{},habits:{}};
 data.eligibility.dimensions[d.id]=replaceEligibilityFrom(data.eligibility.dimensions[d.id]||[],date,d.active!==false&&!d.archived?{from:date,through:null}:null);
}
function eligibilityHabitPeriod(habitId,date){return eligibilityPeriodAt(data.eligibility?.habits?.[habitId],date)}
function eligibleHabitIdsForDate(date){
 if(!validDateKey(date)||date<(data.settings.trackingStartDate||today())||date>today()||isSpecialDay(date))return [];
 const out=[];
 Object.entries(data.eligibility?.habits||{}).forEach(([id,history])=>{
  if(!H(id))return;
  const p=eligibilityPeriodAt(history,date);if(!p)return;
  if((p.allocations||[]).some(a=>eligibilityPeriodAt(data.eligibility?.dimensions?.[a.dimensionId],date)))out.push(id);
 });
 return out.sort((a,b)=>(H(a)?.name||"").localeCompare(H(b)?.name||""));
}
function snapshotForHabitDate(h,date){
 const p=h?eligibilityHabitPeriod(h.id,date):null;
 const allocations=(p?.allocations||snapshot(h).points).filter(a=>eligibilityPeriodAt(data.eligibility?.dimensions?.[a.dimensionId],date));
 return {habitId:h?.id||"",name:p?.name||h?.name||"Habit",poolName:P(h?.poolId)?.name||"Habit Library",
  points:allocations.map(a=>({dimensionId:a.dimensionId,dimensionName:a.dimensionName||D(a.dimensionId)?.name||"Archived Dimension",points:Number(a.points)||0})),
  mva:Number.isFinite(Number(p?.mva))?Number(p.mva):Number(data.settings.mva)||.25};
}
function ensureDateRecord(date){if(!data.records[date])data.records[date]={date,items:{}};if(!isPlainObject(data.records[date].items))data.records[date].items={};return data.records[date]}
function cleanupDateRecord(date){
 const r=data.records[date];if(!r)return;
 const hasItems=Object.values(r.items||{}).some(item=>OUTCOME_STATUSES.has(item?.status));
 const hasAck=Array.isArray(r.acknowledgedUnrecordedIds)&&r.acknowledgedUnrecordedIds.length>0;
 if(!hasItems&&!r.specialDay&&!String(r.specialNote||"").trim()&&!hasAck)delete data.records[date];
}
function removePendingReconciliation(date,id){
 data.settings.pendingReconciliation=(data.settings.pendingReconciliation||[]).map(x=>x.date===date?{...x,habitIds:x.habitIds.filter(hid=>hid!==id)}:x).filter(x=>x.habitIds.length);
}
function queueReconciliationItem(date,id){
 if(date<(data.settings.trackingStartDate||today())||date>=today()||isSpecialDay(date)||!eligibleHabitIdsForDate(date).includes(id))return;
 const pending=data.settings.pendingReconciliation||(data.settings.pendingReconciliation=[]);
 let row=pending.find(x=>x.date===date);if(!row){row={date,habitIds:[]};pending.push(row)}
 if(!row.habitIds.includes(id))row.habitIds.push(id);
 pending.sort((a,b)=>a.date.localeCompare(b.date));
}

let period="1m",view="overview",selectedDate=today(),editingSpecialDate=null,selectedStatsHabit=null,statsSpotlightHabit=null,dataFolder=null,saveTimer=null,lastTouchedHabitId=null,draggedDimensionId=null,expandedInactiveDimensions=new Set(),folderWriteQueue=Promise.resolve();
function sampleStructure(){
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
 return {dims,pools,habits,settings:{mva:.25,defaultBenchmark:1000}};
}
function sampleData(){
 const {dims,pools,habits,settings}=sampleStructure();
 const records={};const todayDate=new Date(today()+"T12:00:00"),cycle=["completed","completed","mva","completed","missed","completed","mva","completed"];
 for(let offset=89;offset>=0;offset--){const dt=new Date(todayDate);dt.setDate(dt.getDate()-offset);const date=dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0"),items={};
 habits.forEach((h,index)=>{const seed=(offset*7+index*11+index*index)%19;if(seed===0||seed===7||seed===14)return;const status=cycle[(offset*3+index*5+Math.floor(offset/6))%cycle.length],p=pools.find(x=>x.id===h.poolId);items[h.id]={status,snapshot:{habitId:h.id,name:h.name,poolName:p?.name||"Habit Library",points:h.points.map(x=>({dimensionId:x.dimensionId,dimensionName:dims.find(d=>d.id===x.dimensionId)?.name||"Dimension",points:x.points})),mva:.25},updatedAt:new Date(dt.getTime()+index*60000).toISOString()};});
 if(Object.keys(items).length)records[date]={date,items};}
 const firstDate=Object.keys(records).sort()[0]||today();
 settings.trackingStartDate=firstDate;settings.lastReconciledThrough=shiftDateKey(today(),-1);settings.pendingReconciliation=[];
 return {version:3,visualVersion:2,settings,dimensions:dims,pools,habits,records,eligibility:buildEligibilityBaseline(dims,habits,firstDate,settings.mva)};
}
function safeColor(value,fallback){
 const v=String(value||"").trim();
 return /^#[0-9a-f]{6}$/i.test(v)?v:fallback;
}
function isPlainObject(value){return value!==null&&typeof value==="object"&&!Array.isArray(value)}
function validateBackupPayload(value){
 if(!isPlainObject(value))throw new Error("Backup must contain a JSON object.");
 for(const key of ["dimensions","pools","habits"])if(value[key]!==undefined&&!Array.isArray(value[key]))throw new Error("Backup field '"+key+"' must be an array.");
 if(value.settings!==undefined&&!isPlainObject(value.settings))throw new Error("Backup settings are malformed.");
 if(value.records!==undefined&&!isPlainObject(value.records))throw new Error("Backup records are malformed.");
 for(const [key,list] of [["dimensions",value.dimensions],["pools",value.pools],["habits",value.habits]]){
  if(!list)continue;
  list.forEach((item,index)=>{
   if(!isPlainObject(item))throw new Error("Invalid "+key+" entry at position "+(index+1)+".");
   if(key!=="pools"&&(typeof item.id!=="string"||typeof item.name!=="string"))throw new Error("Invalid "+key+" identity at position "+(index+1)+".");
   if(key==="habits"&&item.points!==undefined){
    if(!Array.isArray(item.points))throw new Error("Habit point allocations must be an array.");
    item.points.forEach(point=>{if(!isPlainObject(point)||typeof point.dimensionId!=="string"||!Number.isFinite(Number(point.points)))throw new Error("A habit point allocation is malformed.")});
   }
  });
 }
 if(value.eligibility!==undefined&&!isPlainObject(value.eligibility))throw new Error("Eligibility history is malformed.");
 Object.entries(value.records||{}).forEach(([date,record])=>{
  if(!validDateKey(date)||!isPlainObject(record)||!isPlainObject(record.items))throw new Error("A historical record is malformed.");
  if(record.specialDay!==undefined&&typeof record.specialDay!=="boolean")throw new Error("A special-day flag is malformed.");
  if(record.specialNote!==undefined&&typeof record.specialNote!=="string")throw new Error("A special-day note is malformed.");
  if(record.acknowledgedUnrecordedIds!==undefined&&(!Array.isArray(record.acknowledgedUnrecordedIds)||record.acknowledgedUnrecordedIds.some(id=>typeof id!=="string")))throw new Error("Reconciliation acknowledgements are malformed.");
  Object.values(record.items).forEach(item=>{
   if(!isPlainObject(item)||!OUTCOME_STATUSES.has(item.status)||!isPlainObject(item.snapshot)||!Array.isArray(item.snapshot.points))throw new Error("A historical habit entry is malformed.");
   item.snapshot.points.forEach(point=>{if(!isPlainObject(point)||typeof point.dimensionId!=="string"||!Number.isFinite(Number(point.points)))throw new Error("A historical point allocation is malformed.")});
  });
 });
 const settings=isPlainObject(value.settings)?value.settings:{};
 if(settings.trackingStartDate!==undefined&&!validDateKey(settings.trackingStartDate))throw new Error("Tracking start date is malformed.");
 if(settings.lastReconciledThrough!==undefined&&!validDateKey(settings.lastReconciledThrough))throw new Error("Reconciliation cursor is malformed.");
 if(settings.pendingReconciliation!==undefined&&(!Array.isArray(settings.pendingReconciliation)||settings.pendingReconciliation.some(x=>!isPlainObject(x)||!validDateKey(x.date)||!Array.isArray(x.habitIds)||x.habitIds.some(id=>typeof id!=="string"))))throw new Error("Pending reconciliation data is malformed.");
 return value;
}
function normalize(x){
 if(!isPlainObject(x))return sampleData();
 const base=sampleStructure(),oldVisualVersion=Number(x.visualVersion)||0,incomingSettings=isPlainObject(x.settings)?x.settings:{};
 const requestedStart=validDateKey(incomingSettings.trackingStartDate)?incomingSettings.trackingStartDate:today();
 const trackingStartDate=requestedStart>today()?today():requestedStart;
 const mva=Number(incomingSettings.mva),benchmark=Number(incomingSettings.defaultBenchmark);
 const dimensions=(Array.isArray(x.dimensions)?x.dimensions:base.dims).map((d,i)=>({...d,
  color:oldVisualVersion>=2?safeColor(d.color,DIMENSION_COLORS[i%DIMENSION_COLORS.length]):DIMENSION_COLORS[i%DIMENSION_COLORS.length],
  active:d.active!==false&&!d.archived,archived:false
 }));
 const habits=(Array.isArray(x.habits)?x.habits:base.habits).map(h=>({...h,
  points:Array.isArray(h.points)?h.points.filter(a=>a&&a.dimensionId).map(a=>({...a,points:Number(a.points)||0})):[],
  active:h.active!==false&&!h.archived,archived:false,poolId:h.poolId??null
 }));
 const defaultMva=Number.isFinite(mva)?Math.min(.5,Math.max(.1,mva)):base.settings.mva;
 const eligibility=normalizeEligibility(x.eligibility,dimensions,habits,trackingStartDate,defaultMva);
 const pending=Array.isArray(incomingSettings.pendingReconciliation)?incomingSettings.pendingReconciliation.filter(row=>isPlainObject(row)&&validDateKey(row.date)&&Array.isArray(row.habitIds)).map(row=>({date:row.date,habitIds:Array.from(new Set(row.habitIds.filter(id=>typeof id==="string")))})).filter(row=>row.habitIds.length):[];
 return {version:3,visualVersion:2,settings:{mva:defaultMva,
  defaultBenchmark:Number.isFinite(benchmark)?Math.max(1,benchmark):base.settings.defaultBenchmark,
  trackingStartDate,lastReconciledThrough:validDateKey(incomingSettings.lastReconciledThrough)?incomingSettings.lastReconciledThrough:shiftDateKey(today(),-1),
  pendingReconciliation:pending
 },dimensions,pools:Array.isArray(x.pools)?x.pools:[],habits,records:isPlainObject(x.records)?x.records:{},eligibility};
}
let data;
try{
 const raw=localStorage.getItem("habit-radar-state");
 data=raw?normalize(validateBackupPayload(JSON.parse(raw))):sampleData();
}catch(e){
 console.warn("Saved data could not be loaded; using the sample workspace.",e);
 data=sampleData();
}
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
  if(el.closest("[data-preserve-case]"))return;
  ["title","aria-label","placeholder"].forEach(attr=>{if(el.hasAttribute(attr))el.setAttribute(attr,titleCase(el.getAttribute(attr)))});
 });
}
function ordinalDay(day){const n=Number(day),lastTwo=n%100;if(lastTwo>=11&&lastTwo<=13)return n+"th";return n+(n%10===1?"st":n%10===2?"nd":n%10===3?"rd":"th")}
function formatOrdinalDate(date){const parts=Object.fromEntries(ORDINAL_DATE_FORMATTER.formatToParts(date).map(x=>[x.type,x.value]));return parts.weekday+", "+parts.month+" "+ordinalDay(parts.day)+", "+parts.year}
function formatIstTime(date){return IST_TIME_FORMATTER.format(date).replace(/\b(am|pm)\b/i,x=>x.toUpperCase())+" IST"}
function clockMarkup(date){const time=formatIstTime(date).replace(/\sIST$/,"");return '<span class="clock-digits">'+esc(time)+'</span><span class="clock-zone">IST</span>'}
function resolvedCount(record,habits){return habits.reduce((n,h)=>n+(OUTCOME_STATUSES.has(record?.items?.[h.id]?.status)?1:0),0)}
function fmt(n){return (Math.round((Number(n)||0)*100)/100).toLocaleString(undefined,{maximumFractionDigits:2})}
function toast(s){const e=$("#toast");e.textContent=titleCase(s);e.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.classList.remove("show"),2300)}
function persist(renderAfter){try{localStorage.setItem("habit-radar-state",JSON.stringify(data));$("#storageDot").classList.add("saved");$("#storageText").textContent="Saved In This Browser"}catch(e){$("#storageText").textContent="Export Backup To Save";console.warn(e)}clearTimeout(saveTimer);saveTimer=setTimeout(saveFolder,250);if(renderAfter)render()}
function save(){persist(true)}
function habitAllocations(h){return (Array.isArray(h?.points)?h.points:[]).filter((x,i,a)=>D(x.dimensionId)&&a.findIndex(y=>y.dimensionId===x.dimensionId)===i)}
function habitAccent(h){const a=habitAllocations(h);return a.length>1?SPECIAL_COLOR:D(a[0]?.dimensionId)?.color||"#aeb8c7"}
function snapshot(h){const p=P(h.poolId);return {habitId:h.id,name:h.name,poolName:p?.name||"Habit Library",points:(h.points||[]).map(x=>({dimensionId:x.dimensionId,dimensionName:D(x.dimensionId)?.name||"Archived Dimension",points:Number(x.points)||0})),mva:Number(data.settings.mva)||.25}}
function pointsFor(s,status){const m=status==="completed"?1:status==="mva"?s.mva:0;return s.points.reduce((a,x)=>a+x.points*m,0)}
function cycle(id,date,status){
 const h=H(id);if(!h||!OUTCOME_STATUSES.has(status))return;
 const rec=ensureDateRecord(date),previous=rec.items[id];
 if(previous?.status===status){delete rec.items[id];if(date<today())queueReconciliationItem(date,id);cleanupDateRecord(date)}
 else{
  rec.items[id]={status,snapshot:previous?.snapshot||snapshotForHabitDate(h,date),updatedAt:new Date().toISOString()};
  rec.acknowledgedUnrecordedIds=(rec.acknowledgedUnrecordedIds||[]).filter(x=>x!==id);
  removePendingReconciliation(date,id);
 }
 save();
}
function rawPoints(dimId,range){
 let total=0;const end=today(),start=range==="1m"?shiftDateKey(end,-29):range==="3m"?shiftDateKey(end,-89):(data.settings.trackingStartDate||end);
 Object.entries(data.records||{}).forEach(([date,rec])=>{
  if(date<start||date<(data.settings.trackingStartDate||end)||date>end||isSpecialDay(date))return;
  Object.values(rec.items||{}).forEach(it=>{
   const s=it.snapshot;if(!s||!Array.isArray(s.points)||!OUTCOME_STATUSES.has(it.status))return;
   const mult=it.status==="completed"?1:it.status==="mva"?(Number(s.mva)||.25):0;
   s.points.forEach(x=>{if(x.dimensionId===dimId)total+=Number(x.points||0)*mult});
  });
 });
 return total;
}
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
let radarAtmosphereController=null;
function syncRadarAtmosphere(){
 const canvas=$(".radar-atmosphere");
 if(!canvas)return;
 if(!radarAtmosphereController)radarAtmosphereController=createRadarAtmosphere(canvas);
 radarAtmosphereController?.setActive($("#view-overview")?.classList.contains("active"));
}
function createRadarAtmosphere(canvas){
 let ctx;
 try{ctx=canvas.getContext("2d",{alpha:true})}catch(e){return {setActive(){}}}
 if(!ctx)return {setActive(){}};
 const motionQuery=window.matchMedia?window.matchMedia("(prefers-reduced-motion: reduce)"):null;
 const palette=["224,235,255","174,205,255","136,226,231","205,186,255","255,225,190"];
 let width=0,height=0,dpr=1,particles=[],raf=0,lastFrame=0,active=false;
 const random=(min,max)=>min+Math.random()*(max-min);
 function seedParticles(){
  const count=Math.min(58,Math.max(28,Math.round(width*height/26000)));
  particles=Array.from({length:count},()=>({
   x:random(0,width),y:random(0,height),
   vx:random(-.11,.11),vy:random(-.085,.085),
   radius:random(.38,1.05),alpha:random(.16,.4),
   phase:random(0,Math.PI*2),speed:random(.00035,.00085),
   rgb:palette[Math.floor(Math.random()*palette.length)],
   glow:Math.random()<.15
  }));
 }
 function draw(now,advance){
  if(!width||!height)return;
  if(advance){
   const step=lastFrame?Math.min(2.2,(now-lastFrame)/40):1;
   particles.forEach(p=>{
    p.x+=p.vx*step;p.y+=p.vy*step;
    if(p.x<-8)p.x=width+8;else if(p.x>width+8)p.x=-8;
    if(p.y<-8)p.y=height+8;else if(p.y>height+8)p.y=-8;
   });
  }
  ctx.clearRect(0,0,width,height);
  ctx.lineWidth=.55;
  for(let i=0;i<particles.length;i++){
   const a=particles[i];
   for(let j=i+1;j<particles.length;j++){
    const b=particles[j],dx=a.x-b.x,dy=a.y-b.y,dist=Math.hypot(dx,dy);
    if(dist<96){
     ctx.strokeStyle="rgba(151,184,222,"+((1-dist/96)*.045)+")";
     ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
   }
  }
  particles.forEach(p=>{
   const wave=.5+.5*Math.sin((motionQuery?.matches?0:now)*p.speed+p.phase);
   const alpha=p.alpha*(.45+wave*.55);
   if(p.glow){
    const spread=p.radius*7,glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,spread);
    glow.addColorStop(0,"rgba("+p.rgb+","+(alpha*.22)+")");
    glow.addColorStop(1,"rgba("+p.rgb+",0)");
    ctx.fillStyle=glow;ctx.fillRect(p.x-spread,p.y-spread,spread*2,spread*2);
   }
   ctx.globalAlpha=alpha;ctx.fillStyle="rgb("+p.rgb+")";
   ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();
   if(p.glow&&wave>.9){
    const glint=(wave-.9)*10*alpha;
    ctx.globalAlpha=glint;ctx.strokeStyle="rgb("+p.rgb+")";ctx.lineWidth=.65;
    ctx.beginPath();ctx.moveTo(p.x-p.radius*2.8,p.y);ctx.lineTo(p.x+p.radius*2.8,p.y);
    ctx.moveTo(p.x,p.y-p.radius*2.8);ctx.lineTo(p.x,p.y+p.radius*2.8);ctx.stroke();
   }
  });
  ctx.globalAlpha=1;
 }
 function resize(){
  const rect=canvas.getBoundingClientRect();
  width=Math.max(1,rect.width);height=Math.max(1,rect.height);
  dpr=Math.min(window.devicePixelRatio||1,1.35);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  seedParticles();draw(performance.now(),false);
 }
 function stop(){if(raf)cancelAnimationFrame(raf);raf=0}
 function frame(now){
  raf=0;
  if(!active||document.hidden||motionQuery?.matches)return;
  if(now-lastFrame>=40){draw(now,true);lastFrame=now}
  raf=requestAnimationFrame(frame);
 }
 function start(){
  if(!active||document.hidden)return;
  if(motionQuery?.matches){stop();draw(performance.now(),false);return}
  if(!raf){lastFrame=performance.now();raf=requestAnimationFrame(frame)}
 }
 function setActive(next){
  next=!!next;
  if(next===active)return;
  active=next;
  if(!active){stop();return}
  resize();start();
 }
 window.addEventListener("resize",()=>{if(active)resize()},{passive:true});
 document.addEventListener("visibilitychange",()=>active?(document.hidden?stop():start()):null);
 if(motionQuery){
  const onMotionChange=()=>{if(!active)return;if(motionQuery.matches){stop();draw(performance.now(),false)}else start()};
  if(motionQuery.addEventListener)motionQuery.addEventListener("change",onMotionChange);
  else if(motionQuery.addListener)motionQuery.addListener(onMotionChange);
 }
 return {setActive};
}
function renderActiveView(){
 if(view==="overview")renderOverview();
 else if(view==="tracker")renderTracker();
 else if(view==="habit-stats")renderHabitStats();
 else if(view==="library")renderLibrary();
 else if(view==="stats")renderStats();
 else if(view==="settings")renderSettings();
}
function render(){const labels={overview:["Your Character","Overview"],tracker:["Daily Tracker","Daily Tracker"],"habit-stats":["Your Activity","Statistics"],library:["","Habit Library"],stats:["","Statistics"],settings:["","Settings & Data"]};$("#pageEyebrow").textContent=labels[view][0];$("#pageTitle").textContent=labels[view][1];$("#todayLabel").textContent=titleCase(LOCAL_SHORT_DATE_FORMATTER.format(new Date()));$$(".view").forEach(e=>e.classList.toggle("active",e.id==="view-"+view));$$(".nav-item[data-view]").forEach(e=>e.classList.toggle("active",e.dataset.view===view||(view==="habit-stats"&&e.dataset.view==="tracker")));renderActiveView();applyTitleCase();syncRadarAtmosphere()}
let activeDim=null;
function dimIndex(i){return String(i+1).padStart(2,"0")}
function dimColor(d,i){return safeColor(d.color,DIMENSION_COLORS[i%DIMENSION_COLORS.length])}
function setActiveDim(id){
 id=id||null;if(id===activeDim)return;activeDim=id;
 const plate=document.querySelector(".plate-screen");if(!plate)return;
 plate.classList.toggle("has-active",!!id);
 plate.querySelectorAll("[data-dim]").forEach(el=>el.classList.toggle("is-active",!!id&&el.dataset.dim===id));
}
function renderOverview(){
 const ds=data.dimensions.filter(d=>!d.archived&&d.active!==false);
 activeDim=null;$(".plate-screen").classList.remove("has-active");
 drawRadar(ds,ds.map(d=>rawPoints(d.id,period)));
}
function drawRadar(ds,vals){
 const svg=$("#radar"),n=ds.length,compact=!!(window.matchMedia&&window.matchMedia("(max-width:700px)").matches);
 const W=compact?760:1000,H=compact?900:760,cx=W/2,cy=compact?450:382,r=compact?235:275,lab=1.2;
 svg.setAttribute("viewBox","0 0 "+W+" "+H);svg.setAttribute("class",compact?"is-compact":"");
 if(!n){svg.innerHTML='<text class="radar-empty" x="'+cx+'" y="'+cy+'" text-anchor="middle">Create your first dimension</text>';return}
 const max=Math.max(25,...vals)*1.18,TAU=Math.PI*2;
 const ang=i=>-Math.PI/2+i*TAU/n;
 const at=(i,k)=>[cx+Math.cos(ang(i))*r*k,cy+Math.sin(ang(i))*r*k];
 const f=v=>v.toFixed(1),pt=a=>f(a[0])+" "+f(a[1]),mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
 const P=ds.map((d,i)=>at(i,vals[i]/max)),col=ds.map((d,i)=>esc(dimColor(d,i)));
 // defs: one radial gradient per dimension (centre to its own tip) and a soft core
 let out='<defs><radialGradient id="radar-core" cx="'+cx+'" cy="'+cy+'" r="'+(r*.62)+'" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".085"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>';
 ds.forEach((d,i)=>{const len=Math.max(24,Math.hypot(P[i][0]-cx,P[i][1]-cy));out+='<radialGradient id="radar-g'+i+'" cx="'+cx+'" cy="'+cy+'" r="'+f(len)+'" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="'+col[i]+'" stop-opacity=".07"/><stop offset="1" stop-color="'+col[i]+'" stop-opacity=".66"/></radialGradient>'});
 out+='</defs><circle cx="'+cx+'" cy="'+cy+'" r="'+(r*.62)+'" fill="url(#radar-core)"/><g class="radar-rings">';
 [.2,.4,.6,.8,1].forEach(k=>{out+='<circle class="radar-ring'+(k===1?' is-outer':'')+'" cx="'+cx+'" cy="'+cy+'" r="'+f(r*k)+'"/>'});
 // dial ticks: a minor tick every 5 degrees, a major tick every 30
 let minor="",major="";
 for(let t=0;t<72;t++){const a=t*TAU/72-Math.PI/2,big=t%6===0,r0=r*1.04,r1=r*(big?1.095:1.07),c=Math.cos(a),s=Math.sin(a),seg="M"+f(cx+c*r0)+" "+f(cy+s*r0)+"L"+f(cx+c*r1)+" "+f(cy+s*r1);if(big)major+=seg;else minor+=seg}
 out+='<path class="radar-tick" d="'+minor+'"/><path class="radar-tick is-major" d="'+major+'"/></g>';
 // axes, tip dots and dimension names
 ds.forEach((d,i)=>{
  const a=ang(i),c=Math.cos(a),s=Math.sin(a),t=at(i,1.02),L=at(i,lab);
  const anchor=compact?"middle":(c>.2?"start":c<-.2?"end":"middle");
  let ly=L[1];if(s<-.6)ly-=12;else if(s>.6)ly+=14;
  const name=esc(dimensionLabel(d.name));
  out+='<g class="radar-tip" role="button" tabindex="0" data-dim="'+esc(d.id)+'" data-open-dimension="'+esc(d.id)+'" aria-label="Open '+name+' in Habit Library" style="--dimension-accent:'+col[i]+'"><line class="radar-axis" x1="'+cx+'" y1="'+cy+'" x2="'+f(t[0])+'" y2="'+f(t[1])+'" pointer-events="none"/><circle class="radar-end-hit" cx="'+f(t[0])+'" cy="'+f(t[1])+'" r="13" fill="transparent" pointer-events="all"/><circle class="radar-end" cx="'+f(t[0])+'" cy="'+f(t[1])+'" r="3" pointer-events="none"/><text class="radar-index" x="'+f(L[0])+'" y="'+f(ly-15)+'" text-anchor="'+anchor+'" dominant-baseline="central">'+dimIndex(i)+'</text><text class="radar-name" data-dimension-name="true" x="'+f(L[0])+'" y="'+f(ly+8)+'" text-anchor="'+anchor+'" dominant-baseline="central">'+name+'</text></g>';
 });
 // data: per-dimension gradient sector, coloured outer edge, node
 out+='<g class="radar-data" pointer-events="none">';
 ds.forEach((d,i)=>{
  const p=P[i];let shape;
  if(n>=3){const m1=mid(P[(i-1+n)%n],p),m2=mid(p,P[(i+1)%n]);
   shape='<polygon class="radar-sector" fill="url(#radar-g'+i+')" points="'+[[cx,cy],m1,p,m2].map(pt).join(",")+'"/><path class="radar-edge" d="M'+pt(m1)+' L'+pt(p)+' L'+pt(m2)+'"/>';
  }else shape='<line class="radar-spoke" x1="'+cx+'" y1="'+cy+'" x2="'+f(p[0])+'" y2="'+f(p[1])+'"/>';
  out+='<g class="radar-dim" data-dim="'+esc(d.id)+'" style="--dimension-accent:'+col[i]+'">'+shape+'<circle class="radar-halo" cx="'+f(p[0])+'" cy="'+f(p[1])+'" r="11"/><circle class="radar-node" cx="'+f(p[0])+'" cy="'+f(p[1])+'" r="5.5"/></g>';
 });
 out+='</g><circle class="radar-center" cx="'+cx+'" cy="'+cy+'" r="2.5"/>';
 svg.innerHTML=out;
}
function renderTracker(){
 const date=selectedDate||today(),isToday=date===today(),rec=data.records[date],now=new Date(),dateParts=formatOrdinalDate(new Date(date+"T12:00:00")).split(", ");
 const withinTracking=date>=(data.settings.trackingStartDate||today())&&date<=today()&&!isSpecialDay(date);
 const eligibleIds=withinTracking?eligibleHabitIdsForDate(date):[];
 const trackedById=new Map();
 eligibleIds.forEach(id=>{
  const h=H(id);if(!h)return;
  const p=eligibilityHabitPeriod(id,date);
  trackedById.set(id,{...h,name:p?.name||h.name,points:(p?.allocations||h.points||[]).map(a=>({dimensionId:a.dimensionId,points:a.points}))});
 });
 const tracked=Array.from(trackedById.values()),trackedIds=new Set(tracked.map(h=>h.id));
 const dimensions=data.dimensions.filter(d=>!!eligibilityPeriodAt(data.eligibility?.dimensions?.[d.id],date));
 const groups=dimensions.map(d=>({
  dimension:d,
  habits:tracked.filter(h=>(eligibilityHabitPeriod(h.id,date)?.allocations||[]).some(a=>a.dimensionId===d.id)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:"base",numeric:true}))
 })).filter(group=>group.habits.length);
 const groupedIds=new Set(groups.flatMap(group=>group.habits.map(h=>h.id)));
 const historical=Object.entries(rec?.items||{}).filter(([id,item])=>!groupedIds.has(id)&&item?.snapshot).map(([id,item])=>({id,name:item.snapshot.name||H(id)?.name||"Archived Habit",snapshot:item.snapshot,historical:true}));
 const resolved=resolvedCount(rec,tracked);
 $("#liveDate").innerHTML='<span class="date-weekday">'+(isSpecialDay(date)?'<span class="date-context">★ SPECIAL DAY / </span>':isToday?"":'<span class="date-context">ARCHIVE / </span>')+esc(dateParts[0])+'</span><span class="date-rest">'+esc(dateParts.slice(1).join(", "))+'</span>';
 $("#liveClock").innerHTML=isToday?clockMarkup(now):'<button class="archive-back-button" data-back-stats>← Back To Statistics</button>';
 $("#todayProgressLabel").textContent=resolved+" / "+tracked.length+" recorded";
 $("#todayProgressFill").style.transform="scaleX("+(tracked.length?resolved/tracked.length:0)+")";
 $("#trackerEmpty").hidden=tracked.length+historical.length>0;
 $("#trackerEmpty").textContent=date<(data.settings.trackingStartDate||today())?"This date is before your Tracking Start Date. Historical entries remain available below.":"No active habits were eligible on this date.";
 const rowMarkup=(h,dimension=null)=>{
  const historicalRow=!!h.historical,it=rec?.items[h.id],status=it?.status||"",snapshot=historicalRow?h.snapshot:it?.snapshot;
  const accent=historicalRow
   ?(snapshot?.points?.length>1?SPECIAL_COLOR:D(snapshot?.points?.[0]?.dimensionId)?.color||"#aeb8c7")
   :safeColor(dimension?.color,habitAccent(h));
  const shared=!historicalRow&&(eligibilityHabitPeriod(h.id,date)?.allocations||h.points||[]).length>1;
  return '<div class="daily-habit '+(status?"is-"+status:"")+(historicalRow?" is-historical":"")+'" style="--habit-accent:'+esc(accent)+';--dimension-accent:'+esc(accent)+';" '+(historicalRow?'':'data-open-habit="'+esc(h.id)+'"')+' data-preserve-case tabindex="0" '+(historicalRow?'':'role="link"')+' aria-label="'+esc(h.name)+(historicalRow?". Historical record.":". Open statistics.")+'">'+
   '<span class="daily-habit-name" data-preserve-case>'+esc(h.name)+(shared?'<small class="daily-shared-label">Shared</small>':'')+'</span>'+
   '<div class="status-dots" role="group" aria-label="Habit status">'+
    '<button class="status-dot completed '+(status==="completed"?"chosen":"")+'" data-set-status="completed" data-habit="'+esc(h.id)+'" aria-label="Completed" aria-pressed="'+(status==="completed")+'" title="Completed · click again to clear"></button>'+
    '<button class="status-dot mva '+(status==="mva"?"chosen":"")+'" data-set-status="mva" data-habit="'+esc(h.id)+'" aria-label="Minimum viable action" aria-pressed="'+(status==="mva")+'" title="Minimum viable action · click again to clear"></button>'+
    '<button class="status-dot missed '+(status==="missed"?"chosen":"")+'" data-set-status="missed" data-habit="'+esc(h.id)+'" aria-label="Not completed" aria-pressed="'+(status==="missed")+'" title="Not completed · click again to clear"></button>'+
   '</div></div>';
 };
 const sections=groups.map((group,index)=>{
  const d=group.dimension,color=safeColor(d.color,DIMENSION_COLORS[index%DIMENSION_COLORS.length]);
  return '<section class="daily-dimension-group" style="--dimension-accent:'+esc(color)+'">'+
   '<header class="daily-dimension-heading"><span class="daily-dimension-index">'+dimIndex(index)+'</span>'+
   '<div class="daily-dimension-copy"><h3 data-dimension-name="true">'+esc(dimensionLabel(d.name))+'</h3><span>'+group.habits.length+' '+(group.habits.length===1?'habit':'habits')+'</span></div>'+
   '<i class="daily-dimension-marker" aria-hidden="true"></i></header><div class="daily-dimension-habits">'+group.habits.map(h=>rowMarkup(h,d)).join("")+'</div></section>';
 }).join("");
 const historySection=historical.length
  ?'<section class="daily-dimension-group daily-history-group"><header class="daily-dimension-heading"><span class="daily-dimension-index">↺</span><div class="daily-dimension-copy"><h3>Past Entries</h3><span>'+historical.length+' historical '+(historical.length===1?'record':'records')+'</span></div></header><div class="daily-dimension-habits">'+historical.sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:"base",numeric:true})).map(h=>rowMarkup(h)).join("")+'</div></section>'
  :'';
 $("#trackerList").innerHTML=sections+historySection;
}
function renderHabitStats(){
 const h=H(selectedStatsHabit);
 if(!h){$("#habitStatsName").textContent="Habit Statistics";$("#habitStatsName").style.color="";$("#habitStatsName").style.textShadow="";$("#habitStatsDescription").textContent="Select A Habit From The Daily Tracker.";$("#habitStatsCards").innerHTML="";$("#habitStatsTable").innerHTML='<div class="empty-state">No Habit Selected.</div>';return}
 $("#habitStatsName").textContent=h.name;$("#habitStatsName").dataset.preserveCase="";$("#habitStatsName").style.color=habitAccent(h);$("#habitStatsName").style.textShadow="0 0 22px "+habitAccent(h)+"33";
 $("#habitStatsDescription").textContent=(habitAllocations(h).length>1?"Shared Habit · ":"")+"Individual Habit Progress";
 const entries=statsHabitRecords(h.id).map(({date,item})=>({date,item}));
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
 const dimensionIds=new Set(dims.map(d=>d.id));
 const allocationsByHabit=new Map(data.habits.map(h=>[h.id,habitAllocations(h)]));
 const linked=data.habits.filter(h=>(allocationsByHabit.get(h.id)||[]).some(a=>dimensionIds.has(a.dimensionId)));
 const activeLinked=linked.filter(h=>h.active&&!h.archived);
 $("#libraryCounts").innerHTML='<strong>'+String(dims.length).padStart(2,"0")+'</strong> dimensions <span>·</span> <strong>'+String(linked.length).padStart(2,"0")+'</strong> habits <span>·</span> <strong>'+String(activeLinked.length).padStart(2,"0")+'</strong> active';
 host.innerHTML=dims.map((d,di)=>{
  const color=safeColor(d.color,DIMENSION_COLORS[0]);
  const habits=data.habits.filter(h=>(allocationsByHabit.get(h.id)||[]).some(a=>a.dimensionId===d.id));
  const active=habits.filter(h=>h.active&&!h.archived).sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:"base"}));
  const inactive=habits.filter(h=>!h.active||h.archived).sort((a,b)=>a.name.localeCompare(b.name,undefined,{sensitivity:"base"}));
  const allocatedPoints=h=>Number((allocationsByHabit.get(h.id)||[]).find(a=>a.dimensionId===d.id)?.points)||0;
  const activePoints=active.reduce((sum,h)=>sum+allocatedPoints(h),0);
  const lockIcon=locked=>locked
   ?'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10" width="15" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>'
   :'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10" width="15" height="11" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 7.5-2"></path><path d="M16.5 5.5V10"></path></svg>';
  const rows=(list,isInactive)=>list.length?list.map(h=>{
   const allocations=allocationsByHabit.get(h.id)||[],shared=allocations.length>1,locked=!h.active||h.archived;
   const accent=shared?SPECIAL_COLOR:D(allocations[0]?.dimensionId)?.color||"#aeb8c7";
   return '<article class="library-habit-row '+(isInactive?'is-inactive ':'')+(shared?'is-shared ':'')+(touched===h.id?'just-saved':'')+'" style="--habit-accent:'+esc(accent)+'">'+
    '<button class="library-habit-main" data-preserve-case data-edit-habit="'+esc(h.id)+'" aria-label="Edit '+esc(h.name)+'">'+
     '<span class="library-habit-indicator" aria-hidden="true"></span>'+
     '<span class="library-habit-name-wrap"><strong class="library-habit-name" data-preserve-case>'+esc(h.name)+'</strong>'+(shared?'<small class="shared-label">Shared</small>':'')+'</span>'+
     '<span class="library-habit-points">'+fmt(allocatedPoints(h))+' <small>pts</small></span>'+
    '</button>'+
    '<button class="library-lock '+(locked?'is-locked':'is-unlocked')+'" data-preserve-case data-toggle-habit="'+esc(h.id)+'" aria-label="'+(locked?'Activate ':'Deactivate ')+esc(h.name)+'" title="'+(locked?'Activate Habit':'Deactivate Habit')+'">'+lockIcon(locked)+'</button>'+
    '<button class="library-lock library-delete" data-preserve-case data-delete-habit="'+esc(h.id)+'" aria-label="Delete '+esc(h.name)+'" title="Delete Habit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9 7V4.5h6V7m-8.5 0 1 13h9l1-13M10 10.5v6m4-6v6"></path></svg></button>'+
   '</article>';
  }).join(""):'<div class="library-group-empty">'+(isInactive?'No inactive habits.':'No active habits yet.')+'</div>';
  const inactiveDisclosure=inactive.length
   ?'<details class="library-inactive" data-inactive-dimension="'+esc(d.id)+'"'+(expandedInactiveDimensions.has(d.id)?' open':'')+'>'+
     '<summary><span>'+inactive.length+' inactive</span><span class="inactive-chevron" aria-hidden="true">⌄</span></summary>'+
     '<div class="library-inactive-list">'+rows(inactive,true)+'</div>'+
    '</details>'
   :'';
  const dimensionInactive=d.active===false;
  const dimensionActions=
   '<button class="dimension-add-habit" data-preserve-case data-add-habit-dimension="'+esc(d.id)+'" aria-label="Add habit to '+esc(d.name)+'" title="Add Habit">+</button>'+
   '<button class="dimension-control dimension-toggle" data-toggle-dimension="'+esc(d.id)+'" data-preserve-case aria-label="'+(dimensionInactive?'Activate ':'Deactivate ')+esc(d.name)+'" title="'+(dimensionInactive?'Activate Dimension':'Deactivate Dimension')+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v9M6.2 6.2a8 8 0 1 0 11.6 0"></path></svg></button>'+
   '<button type="button" class="dimension-control dimension-grab" data-drag-dimension="'+esc(d.id)+'" data-preserve-case draggable="true" aria-label="Reorder '+esc(d.name)+'" title="Grab To Reorder"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="6" r="1.25"/><circle cx="16" cy="6" r="1.25"/><circle cx="8" cy="12" r="1.25"/><circle cx="16" cy="12" r="1.25"/><circle cx="8" cy="18" r="1.25"/><circle cx="16" cy="18" r="1.25"/></svg></button>'+
   '<button class="dimension-control dimension-delete" data-delete-dimension="'+esc(d.id)+'" data-preserve-case aria-label="Delete '+esc(d.name)+'" title="Delete Dimension"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9 7V4.5h6V7m-8.5 0 1 13h9l1-13M10 10.5v6m4-6v6"></path></svg></button>';
  return '<article class="dimension-card '+(dimensionInactive?'is-dimension-inactive':'')+'" data-dimension-card="'+esc(d.id)+'" style="--dimension-accent:'+esc(color)+'">'+
   '<header class="dimension-card-header">'+
    '<div class="dimension-plate-head">'+
     '<div class="dimension-index-lockup"><span class="dimension-index">'+dimIndex(di)+'</span><i class="dimension-rule"></i></div>'+
     '<div class="dimension-identity-copy">'+
      '<button class="dimension-name-button" data-edit-dimension="'+esc(d.id)+'" aria-label="Rename '+esc(dimensionLabel(d.name))+'" title="Rename Dimension"><span class="plate-name" data-dimension-name="true">'+esc(dimensionLabel(d.name))+'</span></button>'+
      '<div class="dimension-summary"><span>'+active.length+' '+(active.length===1?'habit':'habits')+'</span><i>·</i><span>'+fmt(activePoints)+' pts</span>'+(dimensionInactive?'<i>·</i><span class="dimension-state">Paused</span>':'')+'</div>'+
     '</div>'+
     '<div class="dimension-plate-glyph">'+dimensionGlyph(di,dims.length,color)+'</div>'+
    '</div>'+
   '</header>'+
   '<section class="dimension-habits" aria-label="Habits for '+esc(d.name)+'"><div class="library-habit-list">'+rows(active,false)+'</div>'+inactiveDisclosure+'</section>'+
   '<aside class="dimension-actions">'+dimensionActions+'</aside>'+
  '</article>';
 }).join("")+'<button class="add-dimension-card" data-add-dimension><span class="add-dimension-plus">＋</span><strong>Add Dimension</strong><small>Create another area of life</small></button>';
 host.querySelectorAll("details[data-inactive-dimension]").forEach(details=>{
  details.addEventListener("toggle",()=>{
   const id=details.dataset.inactiveDimension;
   if(details.open)expandedInactiveDimensions.add(id);
   else expandedInactiveDimensions.delete(id);
  });
 });
 lastTouchedHabitId=null;
}
function nextDimensionColor(){const used=new Set(data.dimensions.map(d=>safeColor(d.color,"")));return DIMENSION_COLORS.find(c=>!used.has(c))||DIMENSION_COLORS[data.dimensions.length%DIMENSION_COLORS.length]}
function addDimension(){
 const name=prompt("Dimension Name");if(name===null||!name.trim())return;
 if(data.dimensions.some(d=>d.name.trim().toLowerCase()===name.trim().toLowerCase())){toast("That Dimension Already Exists.");return}
 const dimension={id:uid(),name:name.trim(),color:nextDimensionColor(),benchmark:Number(data.settings.defaultBenchmark)||1000,active:true,archived:false};
 data.dimensions.push(dimension);refreshDimensionEligibility(dimension,today());
 save();toast("Dimension Added.");
}
function editDimension(id){
 const d=D(id);if(!d)return;const name=prompt("Rename Dimension",dimensionLabel(d.name));
 if(name===null)return;if(!name.trim()){toast("Dimension Name Cannot Be Empty.");return}
 if(data.dimensions.some(x=>x.id!==id&&x.name.trim().toLowerCase()===name.trim().toLowerCase())){toast("That Dimension Already Exists.");return}
 d.name=name.trim();save();toast("Dimension Renamed.");
}
function toggleDimension(id){
 const d=D(id);if(!d)return;
 d.active=d.active===false;refreshDimensionEligibility(d,today());
 save();toast(d.active?"Dimension Activated.":"Dimension Deactivated.");
}
function deleteDimension(id){
 const d=D(id);if(!d)return;
 const assigned=data.habits.filter(h=>habitAllocations(h).some(a=>a.dimensionId===id));
 const exclusive=assigned.filter(h=>habitAllocations(h).length===1),shared=assigned.length-exclusive.length;
 const message='Delete the "'+d.name+'" dimension?'+
  (assigned.length?'\n\n'+assigned.length+' linked habit'+(assigned.length===1?'':'s')+' will be affected. '+
   (exclusive.length?exclusive.length+' habit'+(exclusive.length===1?'':'s')+' assigned only here will leave the current library. ':'')+
   (shared?shared+' shared habit'+(shared===1?'':'s')+' will remain linked to their other dimensions. ':'')+
   'Historical records will be retained.':'')+
  '\n\nThis cannot be undone.';
 if(!confirm(message))return;
 const exclusiveIds=new Set(exclusive.map(h=>h.id));
 data.habits=data.habits.filter(h=>!exclusiveIds.has(h.id));
 data.habits.forEach(h=>{h.points=(h.points||[]).filter(point=>point.dimensionId!==id);if(h.points.length)refreshHabitEligibility(h,today())});
 data.dimensions=data.dimensions.filter(item=>item.id!==id);
 if(exclusiveIds.has(selectedStatsHabit))selectedStatsHabit=null;
 if(exclusiveIds.has(statsSpotlightHabit))statsSpotlightHabit=null;
 expandedInactiveDimensions.delete(id);lastTouchedHabitId=null;
 save();toast("Dimension Deleted. Historical Records Preserved.");
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
 if(h){h.name=name;h.points=allocations;h.archived=false;refreshHabitEligibility(h,today());}
 else{const habit={id:uid(),name,poolId:null,points:allocations,active:true,archived:false};data.habits.push(habit);refreshHabitEligibility(habit,today())}
 closeHabitModal();save();toast(h?"Habit Updated.":"Habit Added.");
}
function toggleHabit(id){
 const h=H(id);if(!h)return;
 h.active=!(h.active&&!h.archived);h.archived=false;refreshHabitEligibility(h,today());
 if(!h.active)habitAllocations(h).forEach(a=>expandedInactiveDimensions.add(a.dimensionId));
 lastTouchedHabitId=id;save();toast(h.active?"Habit activated.":"Habit made inactive.");
}
function deleteHabit(id){
 const h=H(id);if(!h)return;
 const historyCount=Object.values(data.records||{}).reduce((count,record)=>count+(record.items?.[id]?1:0),0);
 const message='Permanently delete "'+h.name+'"'+(historyCount?' and its '+historyCount+' historical record'+(historyCount===1?'':'s'):'')+'? This cannot be undone.';
 if(!confirm(message))return;
 data.habits=data.habits.filter(item=>item.id!==id);
 if(data.eligibility?.habits)delete data.eligibility.habits[id];
 data.settings.pendingReconciliation=(data.settings.pendingReconciliation||[]).map(row=>({...row,habitIds:row.habitIds.filter(hid=>hid!==id)})).filter(row=>row.habitIds.length);
 Object.values(data.records||{}).forEach(record=>{if(record.items)delete record.items[id]});
 Object.keys(data.records||{}).forEach(date=>{if(!Object.keys(data.records[date].items||{}).length)delete data.records[date]});
 if(selectedStatsHabit===id)selectedStatsHabit=null;
 if(statsSpotlightHabit===id)statsSpotlightHabit=null;
 lastTouchedHabitId=null;
 save();toast("Habit And Its History Deleted.");
}

function statsDateRange(){
 const end=today(),settingStart=data.settings.trackingStartDate||end;
 const periodStart=period==="1m"?shiftDateKey(end,-29):period==="3m"?shiftDateKey(end,-89):settingStart;
 return {start:periodStart>settingStart?periodStart:settingStart,end};
}
function isSpecialDay(date){return data.records?.[date]?.specialDay===true}
function isPerformanceDate(date){return validDateKey(date)&&date>=(data.settings.trackingStartDate||today())&&date<=today()&&!isSpecialDay(date)}
function inStatsRange(date){const {start,end}=statsDateRange();return isPerformanceDate(date)&&date>=start&&date<=end}
function statsRecords(){return Object.entries(data.records||{}).filter(([date,record])=>inStatsRange(date)&&Object.values(record.items||{}).some(item=>OUTCOME_STATUSES.has(item?.status))).sort((a,b)=>a[0].localeCompare(b[0]))}
function archiveRecords(){const {start,end}=statsDateRange();return Object.entries(data.records||{}).filter(([date,record])=>validDateKey(date)&&date>=start&&date<=end&&(Object.values(record.items||{}).some(item=>OUTCOME_STATUSES.has(item?.status))||unrecordedOutcomeCount(record)>0||record.specialDay||String(record.specialNote||"").trim())).sort((a,b)=>a[0].localeCompare(b[0]))}
function dailyRecordPoints(record){return Object.values(record?.items||{}).reduce((sum,item)=>sum+(item?.snapshot&&OUTCOME_STATUSES.has(item.status)?pointsFor(item.snapshot,item.status):0),0)}
function knownOutcomeCount(record){return Object.values(record?.items||{}).filter(item=>OUTCOME_STATUSES.has(item?.status)).length}
function unrecordedOutcomeCount(record){const items=record?.items||{};return new Set((Array.isArray(record?.acknowledgedUnrecordedIds)?record.acknowledgedUnrecordedIds:[]).filter(id=>!OUTCOME_STATUSES.has(items[id]?.status))).size}
function isFullyLoggedDay(date,record){const expected=eligibleHabitIdsForDate(date);return expected.length>0&&expected.every(id=>OUTCOME_STATUSES.has(record?.items?.[id]?.status))}
function statsHabitRecords(id){const rows=[];statsRecords().forEach(([date,record])=>{const item=record.items?.[id];if(item?.snapshot&&OUTCOME_STATUSES.has(item.status))rows.push({date,item})});return rows}
function renderWeeklyDistribution(){
 const totals=Array(7).fill(0),counts=Array(7).fill(0),labels=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],{start,end}=statsDateRange();
 for(let date=start;date<=end;date=shiftDateKey(date,1)){
  if(!isPerformanceDate(date))continue;
  const record=data.records[date];
  if(!record||knownOutcomeCount(record)===0)continue;
  const day=(new Date(date+"T12:00:00").getDay()+6)%7;
  counts[day]++;totals[day]+=dailyRecordPoints(record);
 }
 const values=totals.map((v,i)=>counts[i]?v/counts[i]:0),max=Math.max(1,...values);
 $("#weeklyChart").innerHTML='<div class="weekly-bars">'+values.map((v,i)=>'<div class="weekly-bar-column"><div class="weekly-bar-value">'+(v?fmt(v):"—")+'</div><div class="weekly-bar-track"><i style="height:'+Math.max(v?3:0,v/max*100)+'%"></i></div><span>'+labels[i]+'</span></div>').join("")+'</div><div class="chart-footnote">Average points per recorded weekday · '+(period==="1m"?"30 days":period==="3m"?"90 days":"all time")+'</div>';
}
function renderHabitSpotlight(records=statsRecords()){
 const host=$("#spotlightChart"),entriesByHabit=new Map();
 records.forEach(([date,record])=>Object.entries(record.items||{}).forEach(([id,item])=>{
  if(!item?.snapshot||!OUTCOME_STATUSES.has(item.status))return;
  const entries=entriesByHabit.get(id)||[];
  entries.push({date,item});entriesByHabit.set(id,entries);
 }));
 const eligible=data.habits.map(h=>({habit:h,entries:entriesByHabit.get(h.id)||[]})).filter(x=>x.entries.length);
 if(!eligible.length){statsSpotlightHabit=null;$("#spotlightName").textContent="No Habit History";host.innerHTML='<div class="stats-empty">No habit activity in the selected period.</div>';return}
 const selected=eligible.find(x=>x.habit.id===statsSpotlightHabit);
 const choice=selected||eligible.slice().sort((a,b)=>{
  const countDiff=b.entries.length-a.entries.length;if(countDiff)return countDiff;
  const points=x=>x.entries.reduce((sum,row)=>sum+pointsFor(row.item.snapshot,row.item.status),0);
  const scoreDiff=points(b)-points(a);return scoreDiff||a.habit.name.localeCompare(b.habit.name);
 })[0];
 statsSpotlightHabit=choice.habit.id;
 const h=choice.habit;
 $("#spotlightName").textContent=h.name;$("#spotlightName").dataset.preserveCase="";
 const daily=choice.entries.map(x=>({date:x.date,value:pointsFor(x.item.snapshot,x.item.status),status:x.item.status}));
 const w=600,ht=260,p={l:28,r:16,t:18,b:34},max=Math.max(1,...daily.map(x=>x.value)),x=i=>p.l+(daily.length===1?(w-p.l-p.r)/2:i/(daily.length-1)*(w-p.l-p.r)),y=v=>ht-p.b-v/max*(ht-p.t-p.b),pts=daily.map((d,i)=>x(i)+","+y(d.value)).join(" "),area=p.l+","+y(0)+" "+pts+" "+x(daily.length-1)+","+y(0);
 const circles=daily.map((d,i)=>'<circle cx="'+x(i).toFixed(1)+'" cy="'+y(d.value).toFixed(1)+'" r="3.5" class="spotlight-point"><title>'+esc(d.date)+': '+fmt(d.value)+' points · '+esc(d.status)+'</title></circle>').join("");
 host.innerHTML='<svg class="spotlight-svg" data-preserve-case viewBox="0 0 '+w+' '+ht+'" role="img" aria-label="Daily points for '+esc(h.name)+'"><line x1="'+p.l+'" y1="'+y(0)+'" x2="'+(w-p.r)+'" y2="'+y(0)+'" class="chart-axis"/><line x1="'+p.l+'" y1="'+y(max/2)+'" x2="'+(w-p.r)+'" y2="'+y(max/2)+'" class="chart-gridline"/><polygon points="'+area+'" class="spotlight-area"/><polyline points="'+pts+'" class="spotlight-line"/>'+circles+'<text x="'+p.l+'" y="'+(ht-8)+'" class="chart-date-label">'+esc(daily[0].date.slice(5))+'</text><text x="'+(w-p.r)+'" y="'+(ht-8)+'" text-anchor="end" class="chart-date-label">'+esc(daily[daily.length-1].date.slice(5))+'</text></svg><div class="spotlight-summary"><strong>'+fmt(daily.reduce((n,v)=>n+v.value,0))+'</strong><span>points in selected period</span><span class="spotlight-record-count">'+daily.length+' recorded '+(daily.length===1?"day":"days")+'</span></div>';
}
function renderDailyArchive(){
 const rows=archiveRecords().slice().reverse();
 let recorded=0,fully=0,special=0,unrecorded=0;
 rows.forEach(([date,record])=>{
  if(record.specialDay)special++;
  if(!record.specialDay&&unrecordedOutcomeCount(record)>0)unrecorded++;
  if(!isPerformanceDate(date)||knownOutcomeCount(record)===0)return;
  recorded++;
  if(isFullyLoggedDay(date,record))fully++;
 });
 $("#archiveSummary").textContent=recorded+" recorded · "+fully+" fully logged · "+unrecorded+" with unrecorded entries · "+special+" special";
 $("#dailyArchive").innerHTML=rows.length?rows.map(([date,record])=>{
  const count=knownOutcomeCount(record),unknown=unrecordedOutcomeCount(record),points=dailyRecordPoints(record),label=ARCHIVE_DATE_FORMATTER.format(new Date(date+"T12:00:00"));
  const special=!!record.specialDay;
  const status=special?"Excluded":count?count+" logged"+(unknown?" · "+unknown+" unknown":""):unknown?unknown+" unrecorded":"No activity";
  const note=String(record.specialNote||"").trim();
  const noteEditor=special&&editingSpecialDate===date?'<div class="archive-note-compact"><textarea rows="2" maxlength="500" data-special-note="'+esc(date)+'" aria-label="Reason for special day" placeholder="Why was this day special?">'+esc(record.specialNote||"")+'</textarea><button type="button" class="archive-note-save" data-save-special-note="'+esc(date)+'">Save</button></div>':"";
  return '<div class="archive-entry"><div class="archive-entry-main"><button type="button" class="archive-row '+(special?'is-special':'')+'" data-open-day="'+esc(date)+'" aria-label="Open '+esc(label)+' record"><span class="archive-date">'+esc(label)+'</span><span class="archive-count">'+status+'</span><strong class="archive-points">'+(special||count===0?"—":fmt(points)+' <small>pts</small>')+'</strong><span class="archive-open" aria-hidden="true">↗</span></button><button type="button" class="archive-row-star '+(special?'is-special':'')+'" data-toggle-special="'+esc(date)+'" aria-label="'+(special?"Remove Special Day":"Mark Special Day")+'" aria-pressed="'+special+'" '+(special&&note?'aria-describedby="archiveNoteTooltip"':"")+'>'+(special?"★":"☆")+'</button></div>'+noteEditor+'</div>';
 }).join(""):'<div class="stats-empty">No recorded days in this period.</div>';
}
function saveSpecialDayNote(date){
 if(!validDateKey(date)||date>today())return;
 const record=data.records[date],input=$('[data-special-note="'+date+'"]');
 if(!record?.specialDay||!input)return;
 record.specialNote=input.value.trim();
 editingSpecialDate=null;
 hideArchiveNoteTooltip();
 save();toast("Special Day Note Saved.");
}
function toggleSpecialDay(date){
 if(!validDateKey(date)||date>today())return;
 hideArchiveNoteTooltip();
 const record=ensureDateRecord(date);record.specialDay=!record.specialDay;
 const shouldEdit=record.specialDay;
 editingSpecialDate=shouldEdit?date:null;
 if(shouldEdit)data.settings.pendingReconciliation=(data.settings.pendingReconciliation||[]).filter(row=>row.date!==date);
 else if(date<today()){
  eligibleHabitIdsForDate(date).forEach(id=>{
   if(!OUTCOME_STATUSES.has(record.items?.[id]?.status)&&!(record.acknowledgedUnrecordedIds||[]).includes(id))queueReconciliationItem(date,id);
  });
 }
 cleanupDateRecord(date);save();
 if(shouldEdit){
  const input=$('[data-special-note="'+date+'"]');
  if(input){input.focus();input.setSelectionRange(input.value.length,input.value.length)}
  toast("Add A Reason For This Day.");
 }else toast("Date Restored To Normal Tracking.");
}
function getArchiveNoteTooltip(){
 let tooltip=$("#archiveNoteTooltip");
 if(!tooltip){
  tooltip=document.createElement("div");
  tooltip.id="archiveNoteTooltip";
  tooltip.className="archive-note-tooltip";
  tooltip.setAttribute("role","tooltip");
  tooltip.hidden=true;
  document.body.appendChild(tooltip);
 }
 return tooltip;
}
function showArchiveNoteTooltip(star){
 const date=star?.dataset.toggleSpecial,record=date?data.records[date]:null,note=String(record?.specialNote||"").trim();
 if(!note||!record?.specialDay){hideArchiveNoteTooltip();return}
 const tooltip=getArchiveNoteTooltip();
 tooltip.textContent=note;
 tooltip.hidden=false;
 tooltip.classList.remove("below");
 const rect=star.getBoundingClientRect(),tooltipRect=tooltip.getBoundingClientRect();
 const left=Math.min(window.innerWidth-tooltipRect.width/2-12,Math.max(tooltipRect.width/2+12,rect.left+rect.width/2));
 let top=rect.top-tooltipRect.height-9;
 if(top<8){top=rect.bottom+9;tooltip.classList.add("below")}
 tooltip.style.left=left+"px";
 tooltip.style.top=top+"px";
}
function hideArchiveNoteTooltip(){
 const tooltip=$("#archiveNoteTooltip");
 if(tooltip)tooltip.hidden=true;
}
function openArchiveDay(date){if(!validDateKey(date)||!data.records[date])return;selectedDate=date;view="tracker";render();window.scrollTo({top:0,behavior:"smooth"})}
function renderHabitLeaders(records=statsRecords()){
 const cats=[["completed","Most Completed","Full completions"],["mva","Most MVAed","Minimum viable actions"],["missed","Most Missed","Recorded misses"]],totals=new Map();
 records.forEach(([,record])=>Object.entries(record.items||{}).forEach(([id,item])=>{if(!OUTCOME_STATUSES.has(item?.status))return;const v=totals.get(id)||{completed:0,mva:0,missed:0,name:item.snapshot?.name||H(id)?.name||"Unknown Habit"};v[item.status]++;totals.set(id,v)}));
 $("#habitLeaders").innerHTML=cats.map(([key,label,desc])=>{const max=Math.max(0,...Array.from(totals.values(),v=>v[key])),leaders=max?Array.from(totals.entries()).filter(([,v])=>v[key]===max).sort((a,b)=>a[1].name.localeCompare(b[1].name)).map(([id,v])=>({id,...v})):[],visible=leaders.slice(0,2),remaining=leaders.length-visible.length;return '<section class="leader-category"><div class="leader-category-heading"><span>'+label+'</span><small>'+desc+'</small></div>'+(leaders.length?'<div class="leader-names">'+visible.map(v=>'<div class="leader-row"><strong>'+esc(v.name)+'</strong><span>'+v[key]+'</span></div>').join("")+(remaining?'<div class="leader-more">+'+remaining+' more</div>':'')+'</div>':'<div class="leader-empty">No records</div>')+'</section>'}).join("");
}
function renderStats(){
 const records=statsRecords();
 renderWeeklyDistribution();
 renderHabitSpotlight(records);
 renderDailyArchive();
 renderHabitLeaders(records);
}
function openDimensionInLibrary(id){
 const d=D(id);if(!d)return;
 view="library";render();
 const card=Array.from(document.querySelectorAll("[data-dimension-card]")).find(el=>el.dataset.dimensionCard===id);
 if(card){card.classList.add("dimension-card-focus");card.scrollIntoView({behavior:"smooth",block:"center"});}
}
function renderSettings(){
 $("#mvaRange").value=data.settings.mva;$("#mvaValue").textContent=Number(data.settings.mva).toFixed(2)+"×";
 $("#defaultBenchmark").value=data.settings.defaultBenchmark;
 $("#trackingStartDate").value=data.settings.trackingStartDate||today();$("#trackingStartDate").max=today();
 const pending=(data.settings.pendingReconciliation||[]).reduce((n,row)=>n+row.habitIds.length,0);
 $("#reviewPending").hidden=pending===0;$("#reviewPending").textContent="Review "+pending+" Unrecorded";$("#reviewPending").title="Open the list of historical habit entries that still need an outcome.";
 $("#trackingStartDetail").textContent="Tracking from "+data.settings.trackingStartDate+". Earlier records are retained but excluded from performance statistics.";
 $("#storageDetail").textContent=dataFolder?"Connected Folder. Automatic JSON Backup Is Enabled.":"Browser Storage Is Active. Folder-Based Saving Is Optional And Only Available In Supported Browsers.";
}
function setTrackingStartDate(){
 const next=$("#trackingStartDate").value;
 if(!validDateKey(next)||next>today()){toast("Choose A Valid Date Up To Today.");renderSettings();return}
 if(next===data.settings.trackingStartDate)return;
 if(!confirm("Change the tracking boundary to "+next+"? Existing records will be preserved, but statistics before this date will be excluded. Current active habits and dimensions will be used as the eligibility baseline from this date onward. Outstanding reconciliation will be recalculated on the next application launch.")){renderSettings();return}
 data.settings.trackingStartDate=next;
 data.eligibility=buildEligibilityBaseline(data.dimensions,data.habits,next,data.settings.mva);
 data.settings.pendingReconciliation=[];data.settings.lastReconciledThrough=shiftDateKey(next,-1);
 save();toast("Tracking Start Date Updated.");
}
function prepareReconciliationAtLaunch(){
 const settings=data.settings,yesterday=shiftDateKey(today(),-1),start=settings.trackingStartDate||today();
 let cursor=validDateKey(settings.lastReconciledThrough)?settings.lastReconciledThrough:shiftDateKey(today(),-1);
 const pending=new Map();
 (settings.pendingReconciliation||[]).forEach(row=>{
  if(!validDateKey(row.date)||row.date<start||row.date>yesterday||isSpecialDay(row.date))return;
  const ids=(row.habitIds||[]).filter(id=>H(id)&&eligibleHabitIdsForDate(row.date).includes(id)&&!OUTCOME_STATUSES.has(data.records[row.date]?.items?.[id]?.status)&&!(data.records[row.date]?.acknowledgedUnrecordedIds||[]).includes(id));
  if(ids.length)pending.set(row.date,new Set(ids));
 });
 let date=cursor<start?shiftDateKey(start,-1):cursor;
 while(date<yesterday){
  date=shiftDateKey(date,1);
  if(date<start||isSpecialDay(date))continue;
  const record=data.records[date],acknowledged=new Set(record?.acknowledgedUnrecordedIds||[]);
  const missing=eligibleHabitIdsForDate(date).filter(id=>!OUTCOME_STATUSES.has(record?.items?.[id]?.status)&&!acknowledged.has(id));
  if(missing.length){const set=pending.get(date)||new Set();missing.forEach(id=>set.add(id));pending.set(date,set)}
 }
 settings.lastReconciledThrough=yesterday;
 settings.pendingReconciliation=Array.from(pending.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([day,ids])=>({date:day,habitIds:Array.from(ids)}));
 persist(false);
 if(settings.pendingReconciliation.length)renderReconciliationModal();
}
function renderReconciliationModal(){
 const host=$("#reconciliationModal"),pending=data.settings.pendingReconciliation||[];
 if(!pending.length){host.hidden=true;host.innerHTML="";return}
 const count=pending.reduce((n,row)=>n+row.habitIds.length,0);host.hidden=false;
 host.innerHTML='<div class="reconciliation-backdrop" data-dismiss-reconciliation></div><section class="reconciliation-dialog" role="dialog" aria-modal="true" aria-labelledby="reconciliationTitle">'+
  '<header class="reconciliation-header"><div><div class="eyebrow">HISTORICAL CHECK-IN</div><h2 id="reconciliationTitle">A Few Entries Were Left Open</h2><p>'+count+' unrecorded habit'+(count===1?'':'s')+' across '+pending.length+' day'+(pending.length===1?'':'s')+'. Enter what you remember; unknown is allowed.</p></div><button type="button" class="reconciliation-close" data-dismiss-reconciliation aria-label="Review later">×</button></header>'+
  '<div class="reconciliation-days">'+pending.map(row=>{
   const label=ORDINAL_DATE_FORMATTER.format(new Date(row.date+"T12:00:00"));
   return '<section class="reconciliation-day"><h3>'+esc(label)+'</h3>'+row.habitIds.map(id=>{
    const h=H(id),p=eligibilityHabitPeriod(id,row.date),name=p?.name||h?.name||"Habit";
    return '<div class="reconciliation-habit"><strong data-preserve-case>'+esc(name)+'</strong><div class="reconciliation-actions"><button type="button" data-reconcile-status="completed" data-reconcile-date="'+esc(row.date)+'" data-reconcile-habit="'+esc(id)+'">Completed</button><button type="button" data-reconcile-status="mva" data-reconcile-date="'+esc(row.date)+'" data-reconcile-habit="'+esc(id)+'">MVA</button><button type="button" data-reconcile-status="missed" data-reconcile-date="'+esc(row.date)+'" data-reconcile-habit="'+esc(id)+'">Missed</button><button type="button" class="reconcile-unknown" data-reconcile-status="unknown" data-reconcile-date="'+esc(row.date)+'" data-reconcile-habit="'+esc(id)+'">Leave Unknown</button></div></div>';
   }).join("")+'</section>';
  }).join("")+'</div><footer class="reconciliation-footer"><span>Unresolved entries will remain here next time you open Habit Radar.</span><button type="button" class="secondary-button" data-dismiss-reconciliation>Review Later</button></footer></section>';
}
function reconcileEntry(date,id,status){
 const h=H(id);if(!h)return;const record=ensureDateRecord(date);
 if(status==="unknown")record.acknowledgedUnrecordedIds=Array.from(new Set([...(record.acknowledgedUnrecordedIds||[]),id]));
 else if(OUTCOME_STATUSES.has(status)){
  record.items[id]={status,snapshot:snapshotForHabitDate(h,date),updatedAt:new Date().toISOString()};
  record.acknowledgedUnrecordedIds=(record.acknowledgedUnrecordedIds||[]).filter(x=>x!==id);
 }
 removePendingReconciliation(date,id);cleanupDateRecord(date);save();renderReconciliationModal();
}
function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportData(){download("habit-radar-backup-"+today()+".json",JSON.stringify(data,null,2));toast("Backup Exported.")}
function importData(file){const reader=new FileReader();reader.onload=()=>{try{const parsed=validateBackupPayload(JSON.parse(reader.result));data=normalize(parsed);statsSpotlightHabit=null;selectedStatsHabit=null;expandedInactiveDimensions.clear();save();toast("Backup Restored.")}catch(e){console.warn("Backup import rejected",e);toast("Invalid Or Incompatible Backup File.")}};reader.onerror=()=>toast("Could Not Read Backup File.");reader.readAsText(file)}
async function chooseFolder(){if(!window.showDirectoryPicker){toast("Folder Saving Is Not Supported Here. Use JSON Export/Import.");return}try{dataFolder=await window.showDirectoryPicker({mode:"readwrite"});const saved=await saveFolder();renderSettings();toast(saved?"Data Folder Connected.":"Folder Connected, But Initial Backup Failed.")}catch(e){if(e.name!=="AbortError")toast("Could Not Connect Folder.")}}
async function saveFolder(){
 if(!dataFolder)return false;
 const folder=dataFolder,payload=JSON.stringify(data,null,2);
 folderWriteQueue=folderWriteQueue.catch(()=>{}).then(async()=>{
  const file=await folder.getFileHandle("habit-radar.json",{create:true}),w=await file.createWritable();
  try{await w.write(payload);await w.close()}catch(e){try{await w.abort()}catch(_){}throw e}
 });
 try{await folderWriteQueue;return true}catch(e){console.warn(e);toast("Folder Save Failed. Export A JSON Backup.");return false}
}
function restoreSample(){if(confirm("Replace The Current Workspace With The Original Sample Data? Export A Backup First If Needed.")){data=sampleData();save();toast("Sample Workspace Restored.")}}
function resetAllData(){
 if(!confirm("Permanently erase all dimensions, habits, settings and historical records from this workspace? This cannot be undone. Export a backup first if needed."))return;
 const start=today();data={version:3,visualVersion:2,settings:{mva:.25,defaultBenchmark:1000,trackingStartDate:start,lastReconciledThrough:shiftDateKey(start,-1),pendingReconciliation:[]},dimensions:[],pools:[],habits:[],records:{},eligibility:{dimensions:{},habits:{}}};
 selectedDate=start;selectedStatsHabit=null;statsSpotlightHabit=null;save();toast("All Workspace Data Cleared.");
}
function archiveStarFromTarget(target){
 return target instanceof Element?target.closest(".archive-row-star.is-special"):null;
}
function handleArchiveStarEnter(event){
 const star=archiveStarFromTarget(event.target);
 if(star)showArchiveNoteTooltip(star);
}
function handleArchiveStarLeave(event){
 const star=archiveStarFromTarget(event.target);
 if(star&&!star.contains(event.relatedTarget))hideArchiveNoteTooltip();
}
document.addEventListener("pointerover",handleArchiveStarEnter);
document.addEventListener("focusin",handleArchiveStarEnter);
document.addEventListener("pointerout",handleArchiveStarLeave);
document.addEventListener("focusout",handleArchiveStarLeave);
window.addEventListener("scroll",hideArchiveNoteTooltip,true);
window.addEventListener("resize",hideArchiveNoteTooltip);
document.addEventListener("click",e=>{
 if(e.target.closest("#sidebarClose")){setSidebarOpen($(".app").classList.contains("sidebar-collapsed"));return}
 const close=e.target.closest("[data-close-library-modal]");if(close){closeHabitModal();return}
 if(e.target===$("#libraryModal")){closeHabitModal();return}
 const back=e.target.closest("[data-back-tracker]");if(back){selectedDate=today();switchView("tracker");return}
 const backStats=e.target.closest("[data-back-stats]");if(backStats){switchView("stats");return}
 const archiveDay=e.target.closest("[data-open-day]");if(archiveDay){openArchiveDay(archiveDay.dataset.openDay);return}
 const dismissReconcile=e.target.closest("[data-dismiss-reconciliation]");if(dismissReconcile){$("#reconciliationModal").hidden=true;return}
 const reconcileButton=e.target.closest("[data-reconcile-status]");if(reconcileButton){reconcileEntry(reconcileButton.dataset.reconcileDate,reconcileButton.dataset.reconcileHabit,reconcileButton.dataset.reconcileStatus);return}
 const stateBtn=e.target.closest("[data-set-status]");if(stateBtn){cycle(stateBtn.dataset.habit,selectedDate||today(),stateBtn.dataset.setStatus);return}
 const habitRow=e.target.closest("[data-open-habit]");if(habitRow&&!e.target.closest("button,.status-dots")){openHabitStats(habitRow.dataset.openHabit);return}
 const dimensionRow=e.target.closest("[data-open-dimension]");if(dimensionRow){openDimensionInLibrary(dimensionRow.dataset.openDimension);return}
 const nav=e.target.closest("[data-view]");if(nav){switchView(nav.dataset.view);return}
 const go=e.target.closest("[data-go]");if(go){switchView(go.dataset.go);return}
 const addForDimension=e.target.closest("[data-add-habit-dimension]");if(addForDimension){openHabitModal(null,addForDimension.dataset.addHabitDimension);return}
 const addDim=e.target.closest("[data-add-dimension]");if(addDim){addDimension();return}
 const removeDimension=e.target.closest("[data-delete-dimension]");if(removeDimension){deleteDimension(removeDimension.dataset.deleteDimension);return}
 const toggleDimensionButton=e.target.closest("[data-toggle-dimension]");if(toggleDimensionButton){toggleDimension(toggleDimensionButton.dataset.toggleDimension);return}
 const removeHabit=e.target.closest("[data-delete-habit]");if(removeHabit){deleteHabit(removeHabit.dataset.deleteHabit);return}
 const toggle=e.target.closest("[data-toggle-habit]");if(toggle){toggleHabit(toggle.dataset.toggleHabit);return}
 const editHabit=e.target.closest("[data-edit-habit]");if(editHabit){openHabitModal(editHabit.dataset.editHabit);return}
 const dim=e.target.closest("[data-edit-dimension]");if(dim){editDimension(dim.dataset.editDimension);return}
 const periodBtn=e.target.closest("[data-period]");if(periodBtn){period=periodBtn.dataset.period;$$("[data-period]").forEach(b=>b.classList.toggle("selected",b.dataset.period===period));renderActiveView();applyTitleCase();return}
 const specialToggle=e.target.closest("[data-toggle-special]");if(specialToggle){toggleSpecialDay(specialToggle.dataset.toggleSpecial);return}
 const noteSave=e.target.closest("[data-save-special-note]");if(noteSave){saveSpecialDayNote(noteSave.dataset.saveSpecialNote);return}
 const startSave=e.target.closest("#saveTrackingStartDate");if(startSave){setTrackingStartDate();return}
 const pendingReview=e.target.closest("#reviewPending");if(pendingReview){renderReconciliationModal();return}
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
$("#mvaRange").onchange=e=>{
 data.settings.mva=Number(e.target.value);
 data.habits.filter(h=>h.active&&!h.archived).forEach(h=>refreshHabitEligibility(h,today()));
 save();toast("MVA Multiplier Updated For Future Activity.");
};
$("#defaultBenchmark").onchange=e=>{data.settings.defaultBenchmark=Math.max(1,Number(e.target.value)||1000);save()};
$("#exportData").onclick=exportData;
$("#importData").onchange=e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=""};
$("#chooseFolder").onclick=chooseFolder;
$("#saveNow").onclick=()=>dataFolder?saveFolder().then(saved=>{if(saved)toast("Saved.")}):exportData();
$("#resetData").onclick=restoreSample;
$("#resetAllData").onclick=resetAllData;

document.addEventListener("dragstart",e=>{
 const handle=e.target.closest("[data-drag-dimension]");
 if(!handle||!e.target.closest("#dimensionCards")){e.preventDefault();return}
 draggedDimensionId=handle.dataset.dragDimension;
 const card=handle.closest("[data-dimension-card]");
 card?.classList.add("dragging-dimension");
 if(e.dataTransfer){e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",draggedDimensionId)}
});
document.addEventListener("dragover",e=>{
 if(!draggedDimensionId)return;
 const card=e.target.closest("#dimensionCards [data-dimension-card]");
 if(!card||card.dataset.dimensionCard===draggedDimensionId)return;
 e.preventDefault();
 $$("#dimensionCards .drop-target-dimension").forEach(node=>node.classList.remove("drop-target-dimension"));
 card.classList.add("drop-target-dimension");
 if(e.dataTransfer)e.dataTransfer.dropEffect="move";
});
document.addEventListener("drop",e=>{
 if(!draggedDimensionId)return;
 const card=e.target.closest("#dimensionCards [data-dimension-card]");
 if(!card){draggedDimensionId=null;return}
 e.preventDefault();
 const from=data.dimensions.findIndex(d=>d.id===draggedDimensionId);
 const to=data.dimensions.findIndex(d=>d.id===card.dataset.dimensionCard);
 if(from>=0&&to>=0&&from!==to){
  const [moved]=data.dimensions.splice(from,1);
  data.dimensions.splice(to,0,moved);
  save();toast("Dimension Order Updated.");
 }
 draggedDimensionId=null;
 $$("#dimensionCards .dimension-card").forEach(node=>node.classList.remove("dragging-dimension","drop-target-dimension"));
});
document.addEventListener("dragend",()=>{
 draggedDimensionId=null;
 $$("#dimensionCards .dimension-card").forEach(node=>node.classList.remove("dragging-dimension","drop-target-dimension"));
});
document.addEventListener("keydown",e=>{
 const handle=e.target.closest("[data-drag-dimension]");
 if(!handle||!e.altKey||!["ArrowUp","ArrowDown"].includes(e.key))return;
 e.preventDefault();
 const from=data.dimensions.findIndex(d=>d.id===handle.dataset.dragDimension);
 const to=from+(e.key==="ArrowUp"?-1:1);
 if(from<0||to<0||to>=data.dimensions.length)return;
 const [moved]=data.dimensions.splice(from,1);data.dimensions.splice(to,0,moved);
 save();toast("Dimension Order Updated.");
});
document.addEventListener("keydown",e=>{
  const dimensionRow=e.target.closest("[data-open-dimension]");
  if(dimensionRow&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openDimensionInLibrary(dimensionRow.dataset.openDimension);return}
  const row=e.target.closest("[data-open-habit]");
  if(!row||e.target.closest("button,.status-dots"))return;
  if(e.key==="Enter"){e.preventDefault();openHabitStats(row.dataset.openHabit)}
 });
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();dataFolder?saveFolder():exportData()}});
if(window.matchMedia)window.matchMedia("(max-width:700px)").addEventListener("change",()=>{if(view==="overview")renderOverview()});
document.addEventListener("mouseover",e=>{if(view!=="overview")return;const t=e.target.closest&&e.target.closest(".plate-screen [data-dim]");setActiveDim(t?t.dataset.dim:null)});
document.addEventListener("focusin",e=>{const t=e.target.closest&&e.target.closest(".plate-screen [data-dim]");if(t)setActiveDim(t.dataset.dim)});
document.addEventListener("focusout",e=>{if(e.target.closest&&e.target.closest(".plate-screen [data-dim]"))setActiveDim(null)});
render();
try{if(localStorage.getItem("habitRadarSidebarOpen")==="0")setSidebarOpen(false)}catch(e){}
prepareReconciliationAtLaunch();
let lastDay=today();setInterval(()=>{if(view==="tracker"&&selectedDate===today()){const now=new Date(),day=today();$("#liveClock").innerHTML=clockMarkup(now);if(day!==lastDay){lastDay=day;renderTracker()}}},1000);
})();