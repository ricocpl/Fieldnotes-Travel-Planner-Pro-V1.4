(() => {
'use strict';
const APP_VERSION='1.3.0',SCHEMA_VERSION=3,DB_NAME='fieldnotes-travel-planner',DB_STORE='state',HOUR=48;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const uid=()=>globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const dateStr=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays=(s,n)=>{const d=new Date(`${s}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const weekday=(s)=>new Date(`${s}T12:00:00Z`).getUTCDay();
const monday=(s)=>addDays(s,-((weekday(s)+6)%7));
const prettyDate=(s,opts={})=>new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short',...opts}).format(new Date(s+'T12:00:00Z'));
const addMinutes=(local,n)=>new Date(Date.parse(local+':00Z')+n*60000).toISOString().slice(0,16);
const durationMin=e=>Math.max(15,Math.round((Date.parse(e.endAt+':00Z')-Date.parse(e.startAt+':00Z'))/60000));
const fmtT=t=>String(t||'').slice(0,5);
const CATEGORIES=['Sightseeing','Dining','Hotel','Transport','Other'];
const CAT_ICONS={Sightseeing:'🏛',Dining:'☕',Hotel:'⌂',Transport:'✈',Other:'●'};
const COLORS=['#3478e9','#0e9a85','#db8931','#9063d6','#df668f','#318eaf','#bd7043'];
const categoryColor=c=>({Sightseeing:'#3478e9',Dining:'#0e9a85',Hotel:'#9063d6',Transport:'#dc8931',Other:'#6b7c94'}[c]||'#3478e9');
const clone=o=>structuredClone(o);
const defaultState=()=>({schemaVersion:SCHEMA_VERSION,appVersion:APP_VERSION,trips:[],places:[],events:[],areas:[],categories:[],prefs:{tripId:null,selectedDate:dateStr(new Date()),view:'week',theme:window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light',mapFilter:'all',selectedAreaId:null,panelWidth:46,mobileTab:'itinerary',mapViews:{}}});
let lastActivityTap=null,state=defaultState(),undo=[],redo=[],map=null,markers=new Map(),areaLayers=[],previewMarker=null,selectedPlaceId=null,selectedEventId=null,searchResults=[],pendingLocation=null,mapMode='navigate',drawing=null,requestTimer=0,persistTimer=0,noticeTimer=0,backendAvailable=false,lastSearchAt=0,dbPromise=null,activeActivityDrag=null,dragSuppressUntil=0;

function getDb(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{if(!('indexedDB' in window))return reject(new Error('IndexedDB unavailable'));const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>req.result.createObjectStore(DB_STORE);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});return dbPromise}
async function loadState(){
 try{const db=await getDb();const saved=await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly');const q=tx.objectStore(DB_STORE).get('main');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});backendAvailable='indexedDB';if(saved)state=normalize(saved)}
 catch(e){console.warn('IndexedDB unavailable; trying localStorage',e);try{const saved=localStorage.getItem(DB_NAME+'-state');if(saved)state=normalize(JSON.parse(saved));localStorage.setItem(DB_NAME+'-probe','ok');localStorage.removeItem(DB_NAME+'-probe');backendAvailable='localStorage';toast('Using browser local storage · export backups regularly')}catch(f){backendAvailable=false;toast('Browser storage unavailable: use JSON backup before closing',true)}}
 if(state.trips.length===0){const t=makeTrip('My First Trip');state.trips.push(t);state.prefs.tripId=t.id;state.prefs.selectedDate=t.startDate;scheduleSave()}
 if(!state.trips.some(t=>t.id===state.prefs.tripId))state.prefs.tripId=state.trips[0].id;
 ensureModelDefaults(state);setTheme();renderAll();initMap();if(backendAvailable)scheduleSave();
}
function normalize(v){
 if(!v||!Array.isArray(v.trips)||!Array.isArray(v.places)||!Array.isArray(v.events)||!Array.isArray(v.areas)||!v.prefs||typeof v.prefs!=='object')throw Error('Invalid backup structure');
 if(![1,2,3].includes(+v.schemaVersion))throw Error('Unsupported backup schema (V1.0–V1.3 accepted)');
 const b=defaultState(),n={...b,...v,trips:clone(v.trips),places:clone(v.places),events:clone(v.events),areas:clone(v.areas),categories:Array.isArray(v.categories)?clone(v.categories):[],prefs:{...b.prefs,...v.prefs,mapViews:v.prefs.mapViews||{}}};
 ensureModelDefaults(n);n.schemaVersion=SCHEMA_VERSION;n.appVersion=APP_VERSION;return n;
}
function scheduleSave(){
 clearTimeout(persistTimer);$('saveStatus').textContent='Saving…';persistTimer=setTimeout(async()=>{
  if(!backendAvailable){$('saveStatus').textContent='Not saved · Export backup';return}
  try{
   if(backendAvailable==='indexedDB'){const db=await getDb();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(state,'main');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
   else localStorage.setItem(DB_NAME+'-state',JSON.stringify(state));
   $('saveStatus').textContent='✓ Saved in browser';
  }catch(e){try{localStorage.setItem(DB_NAME+'-state',JSON.stringify(state));backendAvailable='localStorage';$('saveStatus').textContent='✓ Saved in browser';toast('Using browser localStorage fallback')}catch(f){backendAvailable=false;$('saveStatus').textContent='Save failed · Export backup';toast('Storage failed. Export a JSON backup.',true)}}
 },250);
}
function mutate(fn,{rerender=true}={}){undo.push(clone(state));if(undo.length>40)undo.shift();redo=[];fn();state.appVersion=APP_VERSION;scheduleSave();if(rerender)renderAll();refreshMap()}
function undoChange(){if(!undo.length)return;redo.push(clone(state));state=undo.pop();scheduleSave();renderAll();refreshMap();toast('Change undone')}
function redoChange(){if(!redo.length)return;undo.push(clone(state));state=redo.pop();scheduleSave();renderAll();refreshMap();toast('Change restored')}
function toast(message,error=false){const el=$('notice');el.hidden=false;el.style.background=error?'#a52b36':'var(--ink)';el.textContent=message;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.hidden=true,4000)}
function trip(){return state.trips.find(t=>t.id===state.prefs.tripId)||state.trips[0]}
function tripPlaces(){return state.places.filter(p=>p.tripId===trip()?.id)}
function tripEvents(){return state.events.filter(e=>e.tripId===trip()?.id)}
function tripAreas(){return state.areas.filter(a=>a.tripId===trip()?.id)}
function validCoords(lat,lng){return Number.isFinite(+lat)&&Number.isFinite(+lng)&&+lat>=-90&&+lat<=90&&+lng>=-180&&+lng<=180&&String(lat).trim()!==''&&String(lng).trim()!==''}
function makeTrip(name,init={}){const today=dateStr(new Date()),start=init.startDate||today;return{id:uid(),name,destination:init.destination||'',startDate:start,endDate:init.endDate||addDays(start,6),timezone:init.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/London',description:init.description||'',archived:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),ui:defaultTripUI(start)}}
const DEFAULT_ACTIVITY_CATS=[
 ['Sightseeing','#3478e9','🏛'],['Dining','#0e9a85','🍴'],['Hotel','#9063d6','⌂'],
 ['Transport','#dc8931','✈'],['Shopping','#d05b91','🛍'],['Activity','#318eaf','★'],
 ['Free Time','#7d8795','☕'],['Other','#6b7c94','●']
];
function defaultTripUI(start){return{startDate:start,visibleDays:7,snapMinutes:15,layout:{places:20,timetable:45,map:35},showPlaces:true,showMap:true,timetableMode:'select',exportSettings:defaultExportSettings()}}
function defaultExportSettings(){return{scope:'visible',from:'',to:'',pageSize:'A4',orientation:'landscape',scaleMode:'fit-page',customScale:100,showTitle:true,showDates:true,showLegend:true,showNotes:false,showPrintDate:false}}
function ensureModelDefaults(n){
 if(!Array.isArray(n.categories))n.categories=[];
 for(const t of n.trips){
   const base=defaultTripUI(t.startDate||dateStr(new Date()));
   if(!t.ui){base.startDate=t.id===n.prefs.tripId?monday(n.prefs.selectedDate||base.startDate):base.startDate;}
   t.ui={...base,...(t.ui||{}),layout:{...base.layout,...(t.ui?.layout||{})},exportSettings:{...base.exportSettings,...(t.ui?.exportSettings||{})}};
   if(!['select','move'].includes(t.ui.timetableMode))t.ui.timetableMode='select';
   if(!/^\d{4}-\d{2}-\d{2}$/.test(t.ui.startDate))t.ui.startDate=t.startDate;
   t.ui.visibleDays=Math.min(15,Math.max(1,Math.floor(+t.ui.visibleDays||7)));
   if(![5,10,15,30,60].includes(+t.ui.snapMinutes))t.ui.snapMinutes=15;
   if(!n.categories.some(c=>c.tripId===t.id))n.categories.push(...DEFAULT_ACTIVITY_CATS.map(([name,color,icon],order)=>({id:uid(),tripId:t.id,name,color,icon,order})));
   const cs=n.categories.filter(c=>c.tripId===t.id);
   for(const e of n.events.filter(e=>e.tripId===t.id)){
      let c=cs.find(c=>c.id===e.categoryId);
      if(!c){const old=String(e.category||'Other').trim();c=cs.find(c=>c.name.toLowerCase()===old.toLowerCase());if(!c){c={id:uid(),tripId:t.id,name:old,color:categoryColor(old),icon:CAT_ICONS[old]||'●',order:cs.length};n.categories.push(c);cs.push(c)}e.categoryId=c.id}
      e.category=c.name;
      if(e.googleMapsUrl===undefined)e.googleMapsUrl='';
      // Preserve existing V1.2 `color` overrides when migrating to explicit modes.
      if(!['category','custom'].includes(e.colourMode))e.colourMode=/^#[0-9a-f]{6}$/i.test(e.color||'')?'custom':'category';
      if(e.customColour===undefined)e.customColour=e.colourMode==='custom'?(e.color||null):null;
      if(e.colourMode==='custom'&&!/^#[0-9a-f]{6}$/i.test(e.customColour||'')){e.colourMode='category';e.customColour=null;}
   }
 }
}
function getTripCategories(tid=trip()?.id){return state.categories.filter(c=>c.tripId===tid).sort((a,b)=>(a.order||0)-(b.order||0))}
function eventCategory(e){return state.categories.find(c=>c.id===e?.categoryId&&c.tripId===e.tripId)||getTripCategories(e?.tripId).find(c=>c.name===e?.category)||null}
function eventColor(e){return e?.colourMode==='custom'&&/^#[0-9a-f]{6}$/i.test(e.customColour||'')?e.customColour:eventCategory(e)?.color||categoryColor(e?.category)}
function eventContrast(hex){const v=String(hex||'#3478e9').replace('#','');const rgb=[0,2,4].map(i=>parseInt(v.slice(i,i+2),16)/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]>.36?'#152338':'#ffffff'}
function eventCategoryName(e){return eventCategory(e)?.name||e.category||'Other'}
function getTripUI(){return trip()?.ui||defaultTripUI(trip()?.startDate||dateStr(new Date()))}
function saveTripUI(patch){Object.assign(trip().ui,patch);scheduleSave();renderAll();refreshMap()}
function validGoogleMapsURL(input){
 if(!input)return '';
 let url;try{url=new URL(String(input).trim())}catch{throw Error('Enter a valid Google Maps URL')}
 if(url.protocol!=='https:'||url.username||url.password)throw Error('Google Maps links must use HTTPS');
 const h=url.hostname.toLowerCase(),path=url.pathname;
 const normal=(h==='www.google.com'||h==='maps.google.com'||h==='google.com'||/^([a-z0-9-]+\.)?google\.(?:co\.uk|com\.hk|co\.jp|com\.au)$/.test(h))&&(path.startsWith('/maps')||h.startsWith('maps.google.'));
 const short=(h==='maps.app.goo.gl')||(h==='goo.gl'&&path.startsWith('/maps/'));
 if(!normal&&!short)throw Error('Only supported official HTTPS Google Maps links are accepted');
 return url.href;
}
function externalGoogleLink(e){try{return e.googleMapsUrl?validGoogleMapsURL(e.googleMapsUrl):''}catch{return ''}}
function areaHas(a,p){return +p.lat>=+a.south&&+p.lat<=+a.north&&+p.lng>=+a.west&&+p.lng<=+a.east}
function selectedArea(){return tripAreas().find(a=>a.id===state.prefs.selectedAreaId)||null}
function visitCount(placeId){return tripEvents().filter(e=>e.placeId===placeId).length}
function selectedDayPlaces(){const ids=new Set(tripEvents().filter(e=>e.startAt.slice(0,10)<=state.prefs.selectedDate&&e.endAt.slice(0,10)>=state.prefs.selectedDate&&e.placeId).map(e=>e.placeId));return tripPlaces().filter(p=>ids.has(p.id))}
function filteredPlaces(){const filter=state.prefs.mapFilter,a=selectedArea(),places=tripPlaces();if(filter==='day')return selectedDayPlaces();if(filter==='unscheduled')return places.filter(p=>!visitCount(p.id));if(filter==='area'&&a)return places.filter(p=>areaHas(a,p));return places}
function setTheme(){document.documentElement.dataset.theme=state.prefs.theme}
function setWorkspaceLayout(){
 const ui=getTripUI(),w=ui.layout||{},shown=[...(ui.showPlaces?['places']:[]),'timetable',...(ui.showMap?['map']:[])];
 const specs={places:['190px',w.places||20],timetable:['280px',w.timetable||45],map:['260px',w.map||35]};
 $('workspace').classList.toggle('hide-places',!ui.showPlaces);$('workspace').classList.toggle('hide-map',!ui.showMap);
 const cols=[];for(let i=0;i<shown.length;i++){if(i)cols.push('7px');const [min,weight]=specs[shown[i]];cols.push(`minmax(${min},${Math.max(1,+weight||1)}fr)`)}
 $('workspace').style.gridTemplateColumns=cols.join(' ');
 $('showPlaces').checked=ui.showPlaces!==false;$('showMap').checked=ui.showMap!==false;
 $('splitPlaces').setAttribute('aria-valuenow',String(Math.round(w.places||20)));
 $('splitter').setAttribute('aria-valuenow',String(Math.round(w.timetable||45)));
 requestAnimationFrame(()=>map?.resize());
}
function resizeAdjacentPanels(splitId,delta,start){
 const a=splitId==='splitPlaces'?'places':'timetable',b=splitId==='splitPlaces'?'timetable':'map';
 const min={places:190,timetable:280,map:260};let aWidth=Math.min(start.aWidth+start.bWidth-min[b],Math.max(min[a],start.aWidth+delta));
 const weightSum=start.wa+start.wb;
 getTripUI().layout[a]=weightSum*(aWidth/(start.aWidth+start.bWidth));getTripUI().layout[b]=weightSum-getTripUI().layout[a];setWorkspaceLayout();
}
function wireSplitter(id){const el=$(id);let start=null;
 const neighbors=()=>id==='splitPlaces'?[$('placesPanel'),$('plannerPanel')]:[$('plannerPanel'),$('mapPanel')];
 el.addEventListener('pointerdown',e=>{if(e.button!==0)return;const [a,b]=neighbors();start={pointerId:e.pointerId,x:e.clientX,aWidth:a.getBoundingClientRect().width,bWidth:b.getBoundingClientRect().width,wa:getTripUI().layout[id==='splitPlaces'?'places':'timetable'],wb:getTripUI().layout[id==='splitPlaces'?'timetable':'map']};el.setPointerCapture(e.pointerId);e.preventDefault()});
 el.addEventListener('pointermove',e=>{if(!start||e.pointerId!==start.pointerId)return;resizeAdjacentPanels(id,e.clientX-start.x,start)});
 const end=()=>{if(!start)return;start=null;scheduleSave()};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
 el.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const [a,b]=neighbors(),ui=getTripUI(),k1=id==='splitPlaces'?'places':'timetable',k2=id==='splitPlaces'?'timetable':'map';resizeAdjacentPanels(id,e.key==='ArrowRight'?18:-18,{aWidth:a.getBoundingClientRect().width,bWidth:b.getBoundingClientRect().width,wa:ui.layout[k1],wb:ui.layout[k2]});scheduleSave()});
}
function setPref(k,v,r=true){state.prefs[k]=v;scheduleSave();if(r)renderAll();refreshMap()}

function renderAll(){const t=trip();if(!t)return;const sel=$('tripSelect');sel.innerHTML=state.trips.map(q=>`<option value="${esc(q.id)}" ${q.id===t.id?'selected':''}>${q.archived?'[Archived] ':''}${esc(q.name)}</option>`).join('');$('tripTitle').textContent=t.name;$('tripDates').textContent=`${prettyDate(t.startDate)} – ${prettyDate(t.endDate)} · ${t.timezone}${t.destination?' · '+t.destination:''}`;const week=state.prefs.view==='week';$('focusDate').value=week?getTripUI().startDate:state.prefs.selectedDate;$('dateControlLabel').textContent=week?'Start date':'Date';$('focusDate').setAttribute('aria-label',week?'Timetable start date':'Selected date');$('visibleDays').value=getTripUI().visibleDays;$('daysControl').hidden=!week;$('snapMinutes').value=getTripUI().snapMinutes;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===state.prefs.view));$('mapFilter').value=state.prefs.mapFilter;$('placeCount').textContent=tripPlaces().length;$('areaCount').textContent=tripAreas().length;$('undoBtn').disabled=!undo.length;$('redoBtn').disabled=!redo.length;$('scheduleUndoBtn').disabled=!undo.length;$('scheduleRedoBtn').disabled=!redo.length;updateModeButtons();setWorkspaceLayout();renderCalendar();renderSelectedActivity();renderPlaces();renderAreas()}
function updateModeButtons(){const select=getTripUI().timetableMode!=='move';$('selectModeBtn').classList.toggle('active',select);$('moveModeBtn').classList.toggle('active',!select);$('selectModeBtn').setAttribute('aria-pressed',String(select));$('moveModeBtn').setAttribute('aria-pressed',String(!select));$('calendar').classList.toggle('is-select-mode',select)}
function renderSelectedActivity(){
 const el=$('selectedActivityBar'),e=tripEvents().find(x=>x.id===selectedEventId);
 el.hidden=!e;if(!e){el.innerHTML='';return}
 const color=eventColor(e),place=state.places.find(p=>p.id===e.placeId);
 el.innerHTML=`<span class="selected-activity-dot" style="background:${esc(color)}"></span><div class="selected-activity-info"><b>${esc(e.title)}</b><span>${esc(e.startAt.replace('T',' '))} → ${esc(e.endAt.replace('T',' '))} · ${esc(eventCategoryName(e))}${place?' · '+esc(place.name):''}${e.notes?' · '+esc(e.notes.slice(0,100)):''}</span></div><div class="selected-activity-actions"><button class="button subtle small" type="button" data-sel-action="edit">Edit</button><button class="button subtle small" type="button" data-sel-action="duplicate">Duplicate</button><button class="button subtle small" type="button" data-sel-action="colour">Colour</button><button class="button subtle small" type="button" data-sel-action="delete">Delete</button><button class="icon-btn" type="button" data-sel-action="clear" aria-label="Deselect activity">×</button></div>`;
}
function clearActivitySelection(){selectedEventId=null;renderAll();refreshMap()}
function duplicateSelectedActivity(){const e=tripEvents().find(x=>x.id===selectedEventId);if(!e)return;mutate(()=>{const copy={...clone(e),id:uid(),title:e.title+' (copy)',startAt:addMinutes(e.startAt,60),endAt:addMinutes(e.endAt,60),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};state.events.push(copy);selectedEventId=copy.id});toast('Activity duplicated')}
function deleteSelectedActivity(){const e=tripEvents().find(x=>x.id===selectedEventId);if(!e||!confirm(`Delete “${e.title}”? The linked Place will be retained.`))return;mutate(()=>{state.events=state.events.filter(x=>x.id!==e.id);selectedEventId=null});toast('Activity deleted')}
function renderPlaces(){const term=$('placeFilter').value.toLocaleLowerCase(),c=$('placeCategoryFilter').value;const items=tripPlaces().filter(p=>(c==='all'||p.category===c)&&`${p.name} ${p.address||''} ${p.notes||''}`.toLocaleLowerCase().includes(term));$('placeList').innerHTML=items.length?items.map(p=>`<div class="place-card" draggable="true" data-place-id="${esc(p.id)}" title="Drag onto the calendar"><div class="place-icon">${CAT_ICONS[p.category]||'●'}</div><div class="place-info"><div class="place-name">${esc(p.name)} ${p.favourite?'★':''}</div><div class="meta">${esc(p.category)} · ${visitCount(p.id)?visitCount(p.id)+' planned visit(s)':'Unscheduled'}</div></div><div class="card-actions"><button class="mini-btn" data-action="go-place" data-id="${p.id}">Map</button><button class="mini-btn" data-action="plan-place" data-id="${p.id}">+ Plan</button><button class="mini-btn" data-action="edit-place" data-id="${p.id}" aria-label="Edit ${esc(p.name)}">✎</button></div></div>`).join(''):'<div class="empty">No places yet. Search the map or add a place manually.</div>'}
function renderAreas(){const items=tripAreas(),a=selectedArea();$('areaList').innerHTML=items.length?items.map(r=>`<div class="area-chip ${r.id===a?.id?'active':''}"><button data-action="open-area" data-id="${r.id}" title="Fit map to saved geographic bounds">▱ ${esc(r.name)} · ${tripPlaces().filter(p=>areaHas(r,p)).length}</button><button data-action="edit-area" data-id="${r.id}" title="Rename area">✎</button><button class="del" data-action="delete-area" data-id="${r.id}" title="Remove area">×</button></div>`).join(''):'<span class="meta">No saved areas yet. Select Map Area and drag over the map.</span>';
const panel=$('areaPlaces');panel.hidden=!a;if(a){const ps=tripPlaces().filter(p=>areaHas(a,p));panel.innerHTML=`<b>${esc(a.name)}</b> · ${ps.length} place${ps.length===1?'':'s'} within geographic bounds<br>${ps.length?ps.map(p=>`<button class="mini-btn" data-action="go-place" data-id="${p.id}">${esc(p.name)}</button>`).join(''):'<span class="meta">No saved pins inside this area.</span>'}`}}
function renderCalendar(){
 const view=state.prefs.view,ui=getTripUI(),d=view==='week'?ui.startDate:state.prefs.selectedDate;
 const number=view==='week'?ui.visibleDays:1;
 $('calendarHeading').textContent=view==='week'?`${prettyDate(d,{year:'numeric'})} — ${prettyDate(addDays(d,number-1),{year:'numeric'})} · ${number} day${number!==1?'s':''}`:view==='day'?prettyDate(d,{weekday:'long',year:'numeric'}):`Agenda · ${prettyDate(d,{month:'long',year:'numeric'})}`;
 if(view==='agenda'){$('calendar').innerHTML=renderAgendaHTML();$('quickAddEvent')?.addEventListener('click',e=>{e.stopPropagation();openEventEditor()});return}
 const days=Array.from({length:number},(_,i)=>addDays(d,i));
 let html='<div class="calendar-frame"><div class="hours"><div style="height:40px"></div>'+Array.from({length:24},(_,i)=>`<div class="hour-label">${pad(i)}:00</div>`).join('')+'</div>';
 for(const day of days){html+=`<div class="daycol ${day===dateStr(new Date())?'today':''}" data-date="${day}"><div class="dayhead">${prettyDate(day,{weekday:'short'})} <strong>${day.slice(8)}</strong></div>`;
  for(const e of eventsOverlappingDay(day)){
   const dayStart=Date.parse(day+'T00:00:00Z'),from=Math.max(0,(Date.parse(e.startAt+':00Z')-dayStart)/60000),until=Math.min(1440,(Date.parse(e.endAt+':00Z')-dayStart)/60000);
   const top=40+Math.max(0,from)/60*HOUR,height=Math.max(22,(until-from)/60*HOUR-2),url=externalGoogleLink(e);
   html+=`<div class="calendar-event ${selectedEventId===e.id?'selected':''}" style="top:${top}px;height:${height}px;--eventcolor:${esc(eventColor(e))};--eventfg:${eventContrast(eventColor(e))}" data-action="open-event" data-id="${esc(e.id)}" tabindex="0" role="button" title="${esc(e.title)} · ${esc(e.startAt)} – ${esc(e.endAt)}"><div class="resize-handle resize-handle-top" data-resize="top" title="Resize start time"></div><div class="eventtime">${esc(fmtT(e.startAt.split('T')[1]))}–${esc(fmtT(e.endAt.split('T')[1]))}</div><div class="eventtitle">${esc(e.title)}</div>${url?`<a class="map-mini" data-external-map="1" target="_blank" rel="noopener noreferrer" href="${esc(url)}" aria-label="Open in Google Maps">⌖</a>`:''}<div class="resize-handle" data-resize="bottom" title="Drag to adjust duration"></div></div>`;
  }html+='</div>';
 }
 $('calendar').innerHTML=html+`<button type="button" class="button primary add-event-float" id="quickAddEvent" aria-label="Add activity">+ Activity</button>`;$('quickAddEvent').addEventListener('click',e=>{e.stopPropagation();openEventEditor()});
}
function eventsOverlappingDay(day){const start=day+'T00:00',end=addDays(day,1)+'T00:00';return tripEvents().filter(e=>e.startAt<end&&e.endAt>start).sort((a,b)=>a.startAt.localeCompare(b.startAt))}
function renderAgendaHTML(){const es=tripEvents().sort((a,b)=>a.startAt.localeCompare(b.startAt));const groups=new Map();for(const e of es){const day=e.startAt.slice(0,10);if(!groups.has(day))groups.set(day,[]);groups.get(day).push(e)}if(!groups.size)return '<div class="empty">No activities scheduled yet. Use + Place, + Activity, or drag a place onto the timetable.</div><div style="text-align:center"><button class="button primary" id="quickAddEvent">+ Activity</button></div>';return `<div class="agenda">${Array.from(groups,([day,items])=>`<section class="agenda-day"><div class="agenda-day-heading">${prettyDate(day,{weekday:'long',year:'numeric'})}</div>${items.map(e=>`<div class="agenda-event ${selectedEventId===e.id?'selected':''}" style="border-left-color:${esc(eventColor(e))}" data-action="open-event" data-id="${esc(e.id)}"><time>${esc(fmtT(e.startAt.split('T')[1]))}–${esc(fmtT(e.endAt.split('T')[1]))}</time><div class="event-body"><b>${esc(e.title)}</b><span class="meta">${esc(state.places.find(p=>p.id===e.placeId)?.name||eventCategoryName(e))}${e.notes?' · '+esc(e.notes):''}</span></div>${externalGoogleLink(e)?`<a class="event-map-link" href="${esc(externalGoogleLink(e))}" target="_blank" rel="noopener noreferrer" data-external-map="1" title="Open in Google Maps">⌖</a>`:''}<span>›</span></div>`).join('')}</section>`).join('')}<button class="button primary" id="quickAddEvent">+ Activity</button></div>`}

function showModal(title,body,onSave,{onDelete=null,submitLabel='Save',showSubmit=true}={}){const root=$('modalRoot');root.hidden=false;$('modalTitle').textContent=title;$('modalBody').innerHTML=`<form id="modalForm"><div>${body}</div><div class="modal-actions">${onDelete?'<button type="button" id="modalDelete" class="button danger">Delete</button>':'<span></span>'}<div class="right"><button type="button" class="button secondary" data-close-modal="1">Cancel</button>${showSubmit?`<button type="submit" class="button primary">${esc(submitLabel)}</button>`:''}</div></div></form>`;const form=$('modalForm');form.onsubmit=e=>{e.preventDefault();try{const ret=onSave?.(new FormData(form),form);if(ret!==false)closeModal()}catch(err){toast(err.message||'Invalid input',true)}};if(onDelete)$('modalDelete').onclick=()=>{if(onDelete())closeModal()};setTimeout(()=>form.querySelector('input:not([type=hidden]),textarea')?.focus(),30)}
function closeModal(){$('modalRoot').classList.remove('export-modal-open');$('modalRoot').hidden=true;$('modalBody').innerHTML='';if(mapMode==='area'){drawing=null;setMode('navigate')}}
const field=(label,name,val='',type='text',attrs='')=>`<div class="field"><label for="f_${name}">${esc(label)}</label><input id="f_${name}" name="${esc(name)}" type="${type}" value="${esc(val)}" ${attrs}></div>`;
const longField=(label,name,val='')=>`<div class="field full"><label for="f_${name}">${esc(label)}</label><textarea id="f_${name}" name="${esc(name)}" rows="2">${esc(val)}</textarea></div>`;
const selectField=(label,name,opts,selected)=>`<div class="field"><label for="f_${name}">${esc(label)}</label><select id="f_${name}" name="${name}">${opts.map(o=>{const v=typeof o==='string'?o:o.value,l=typeof o==='string'?o:o.label;return`<option value="${esc(v)}" ${selected===v?'selected':''}>${esc(l)}</option>`}).join('')}</select></div>`;
const v=f=>String(f||'').trim();
const namedTZ=tz=>{try{new Intl.DateTimeFormat('en-GB',{timeZone:tz}).format();return true}catch{return false}};
function openTripEditor(id=null){const t=state.trips.find(q=>q.id===id)||null;const p=t||makeTrip('New Trip');showModal(t?'Edit Trip':'Create Trip',`<div class="form-grid">${field('Trip name','name',p.name,'text','required maxlength="100"')}${field('Destination','destination',p.destination)}${field('Start date','startDate',p.startDate,'date','required')}${field('End date','endDate',p.endDate,'date','required')}${field('IANA time zone','timezone',p.timezone,'text','required placeholder="Europe/London"')}${t?selectField('Status','archived',[{value:'false',label:'Active'},{value:'true',label:'Archived'}],String(t.archived)):'<div class="field"><small class="meta">Example: Europe/London, Asia/Tokyo</small></div>'}${longField('Notes / description','description',p.description)}</div>`,f=>{const name=v(f.get('name')),start=v(f.get('startDate')),end=v(f.get('endDate')),tz=v(f.get('timezone'));if(!name)throw Error('Trip name is required');if(end<start)throw Error('End date must not be before start date');if(!namedTZ(tz))throw Error('Enter a valid IANA time zone (e.g. Europe/London)');mutate(()=>{if(t){Object.assign(t,{name,destination:v(f.get('destination')),startDate:start,endDate:end,timezone:tz,description:v(f.get('description')),archived:f.get('archived')==='true',updatedAt:new Date().toISOString()})}else{const nt=makeTrip(name,{destination:v(f.get('destination')),startDate:start,endDate:end,timezone:tz,description:v(f.get('description'))});state.trips.push(nt);ensureModelDefaults(state);state.prefs.tripId=nt.id;state.prefs.selectedDate=start;state.prefs.selectedAreaId=null;state.prefs.mapFilter='all'}});if(map){refreshMap();restoreMapView()};toast(t?'Trip updated':'Trip created')},{onDelete:t?()=>{if(state.trips.length===1){toast('Keep at least one trip',true);return false}if(!confirm(`Delete “${t.name}” with all its places, events and map areas?`))return false;mutate(()=>{state.trips=state.trips.filter(q=>q.id!==t.id);state.places=state.places.filter(p=>p.tripId!==t.id);state.events=state.events.filter(e=>e.tripId!==t.id);state.areas=state.areas.filter(a=>a.tripId!==t.id);state.categories=state.categories.filter(c=>c.tripId!==t.id);if(state.prefs.tripId===t.id){state.prefs.tripId=state.trips[0].id;state.prefs.selectedDate=trip().startDate;state.prefs.selectedAreaId=null}});restoreMapView();return true}:null})}
function openPlaceEditor(id=null,initial={}){const p=state.places.find(q=>q.id===id)||null;const x=p||{name:initial.name||'',category:'Sightseeing',lat:initial.lat??'',lng:initial.lng??'',address:initial.address||'',notes:'',favourite:false};showModal(p?'Edit Place':'Save Place',`<div class="form-grid">${field('Place name','name',x.name,'text','required maxlength="150"')}${selectField('Category','category',CATEGORIES,x.category)}${field('Latitude','lat',x.lat,'number','required step="any" min="-90" max="90"')}${field('Longitude','lng',x.lng,'number','required step="any" min="-180" max="180"')}${field('Address (optional)','address',x.address)}${selectField('Favourite','favourite',[{value:'false',label:'No'},{value:'true',label:'Yes'}],String(x.favourite))}${longField('Notes','notes',x.notes)}</div><div class="muted-warning">Map pins are stored with real latitude and longitude. Editing a pin updates its position while keeping calendar links.</div>`,f=>{if(!validCoords(f.get('lat'),f.get('lng')))throw Error('Coordinates must be valid latitude/longitude');const record={name:v(f.get('name')),category:v(f.get('category')),lat:+f.get('lat'),lng:+f.get('lng'),address:v(f.get('address')),notes:v(f.get('notes')),favourite:f.get('favourite')==='true'};if(!record.name)throw Error('Place name required');mutate(()=>{if(p)Object.assign(p,record);else{const id=uid();state.places.push({id,tripId:trip().id,...record,createdAt:new Date().toISOString()});selectedPlaceId=id}});clearSearch();if(p)selectedPlaceId=p.id;focusPlace(selectedPlaceId);toast('Place saved')},{onDelete:p?()=>{if(!confirm(`Delete “${p.name}”? Scheduled activities will be kept without the location link.`))return false;mutate(()=>{state.places=state.places.filter(x=>x.id!==p.id);state.events.filter(e=>e.placeId===p.id).forEach(e=>e.placeId=null)});selectedPlaceId=null;toast('Place deleted');return true}:null})}
function openEventEditor(id=null,preset={}){lastActivityTap=null;
 const existing=state.events.find(e=>e.id===id)||null,day=preset.date||state.prefs.selectedDate,start=preset.time||'10:00';
 const cs=getTripCategories();const first=cs.find(c=>c.name==='Sightseeing')||cs[0];
 const record=existing||{title:'',startAt:day+'T'+start,endAt:addMinutes(day+'T'+start,60),category:first?.name||'Other',categoryId:first?.id||'',placeId:preset.placeId||'',notes:'',description:'',color:'',colourMode:'category',customColour:null,bookingRef:'',cost:'',status:'Planned',googleMapsUrl:''};
 const pp=state.places.find(p=>p.id===record.placeId),placeOpts=[{value:'',label:'No linked place'},...tripPlaces().map(p=>({value:p.id,label:p.name}))];
 const catOpts=cs.map(c=>({value:c.id,label:`${c.icon||'●'} ${c.name}`}));
 const body=`<div class="form-grid">
 ${field('Activity title','title',record.title||pp?.name||'','text','required maxlength="160"')}
 ${selectField('Activity category','categoryId',catOpts,record.categoryId||first?.id)}
 <div class="field full inline-actions"><span class="meta">Categories are customisable for this trip.</span><button type="button" class="button secondary small" id="manageCatsFromEvent">Manage categories</button></div>
 ${field('Start date','startDate',record.startAt.slice(0,10),'date','required')}${field('Start time','startTime',record.startAt.slice(11,16),'time','required')}
 ${field('End date','endDate',record.endAt.slice(0,10),'date','required')}${field('End time','endTime',record.endAt.slice(11,16),'time','required')}
 ${selectField('Linked map place','placeId',placeOpts,record.placeId||'')}${selectField('Status','status',['Planned','Visited','Skipped'],record.status||'Planned')}
 ${field('Google Maps Link (Optional)','googleMapsUrl',record.googleMapsUrl||'','url','placeholder="https://www.google.com/maps/…"')}
 <div class="field"><label>Google Maps</label>${externalGoogleLink(record)?`<a href="${esc(externalGoogleLink(record))}" target="_blank" rel="noopener noreferrer">⌖ Open in Google Maps</a>`:'<span class="meta">Optional separate link; saved Place coordinates are not replaced.</span>'}</div>
 ${field('Booking reference','bookingRef',record.bookingRef||'')}${field('Estimated cost','cost',record.cost||'','number','step="0.01" min="0"')}
 ${activityColourControls(record)}
 ${longField('Description','description',record.description||'')}${longField('Notes','notes',record.notes||'')}
 </div><div class="muted-warning">Times use ${esc(trip().timezone)}. Drag or resize the activity directly in the timetable; for precise changes, edit these fields. Google Maps links are opened externally and are not geocoded.</div>`;
 showModal(existing?'Edit Activity':'Plan Activity',body,f=>{
   const startAt=f.get('startDate')+'T'+f.get('startTime'),endAt=f.get('endDate')+'T'+f.get('endTime');
   if(endAt<=startAt)throw Error('End date/time must be after start date/time');
   const placeId=v(f.get('placeId')),catId=v(f.get('categoryId')),cat=cs.find(c=>c.id===catId);
   if(placeId&&!tripPlaces().some(p=>p.id===placeId))throw Error('Linked place not found');if(!cat)throw Error('Choose a valid category');
   const colourMode=v(f.get('colourMode'))==='custom'?'custom':'category';const customColour=colourMode==='custom'?v(f.get('customColour')):null;if(colourMode==='custom'&&!/^#[0-9a-f]{6}$/i.test(customColour))throw Error('Custom colour must be a valid #RRGGBB HEX value');
   const link=validGoogleMapsURL(v(f.get('googleMapsUrl')));
   const data={title:v(f.get('title')),categoryId:cat.id,category:cat.name,placeId:placeId||null,startAt,endAt,timezone:trip().timezone,notes:v(f.get('notes')),description:v(f.get('description')),status:v(f.get('status')),cost:v(f.get('cost')),bookingRef:v(f.get('bookingRef')),color:colourMode==='custom'?customColour:'',colourMode,customColour,googleMapsUrl:link,updatedAt:new Date().toISOString()};
   if(!data.title)throw Error('Activity title is required');
   mutate(()=>{if(existing)Object.assign(existing,data);else{const e={id:uid(),tripId:trip().id,...data,createdAt:new Date().toISOString()};state.events.push(e);selectedEventId=e.id}});
   state.prefs.selectedDate=startAt.slice(0,10);if(state.prefs.view==='week'&&(state.prefs.selectedDate<getTripUI().startDate||state.prefs.selectedDate>addDays(getTripUI().startDate,getTripUI().visibleDays-1)))getTripUI().startDate=state.prefs.selectedDate;
   renderAll();refreshMap();toast('Activity saved')
 },{onDelete:existing?()=>{if(!confirm('Delete this activity? The underlying saved place will remain.'))return false;mutate(()=>state.events=state.events.filter(e=>e.id!==id));selectedEventId=null;return true}:null});
 $('manageCatsFromEvent').onclick=()=>{if(!confirm('Open Category Manager? Unsaved changes in this activity form will be discarded.'))return;openCategoryManager()};wireActivityColourControls();
}
const ACTIVITY_SWATCHES=['#3478E9','#0E9A85','#D98931','#9063D6','#DF668F','#318EAF','#BD7043','#D43B45','#E7B93C','#51A95D','#111827','#747B8E','#12A8C9','#E35C22','#A549C8','#F3A0B5'];
function activityColourControls(rec){const custom=rec.colourMode==='custom'||(!rec.colourMode&&/^#[0-9a-f]{6}$/i.test(rec.color||''));const hex=custom?(rec.customColour||rec.color||ACTIVITY_SWATCHES[0]):ACTIVITY_SWATCHES[0];return `<div class="field full activity-colour-settings"><label>Activity Colour</label><div class="colour-mode-line"><label><input type="radio" name="colourMode" value="category" ${custom?'':'checked'}> Use category colour</label><label><input type="radio" name="colourMode" value="custom" ${custom?'checked':''}> Custom override</label></div><div class="colour-swatches">${ACTIVITY_SWATCHES.map(c=>`<button type="button" class="colour-swatch" data-swatch="${c}" style="background:${c}" title="${c}" aria-label="Use ${c}"></button>`).join('')}</div><div class="colour-custom-row"><input type="color" id="customColourPicker" value="${esc(hex)}" aria-label="Visual colour picker"><input type="text" id="f_customColour" name="customColour" value="${esc(hex)}" maxlength="7" pattern="^#[A-Fa-f0-9]{6}$" aria-label="Custom HEX colour"><span class="colour-preview" id="activityColourPreview" aria-label="Colour preview"></span><button type="button" id="resetActivityColour" class="button subtle small">Reset to Category Colour</button></div><p class="meta" id="activityColourHint">Choose a swatch or set a custom HEX colour. Category colours remain linked unless overridden.</p></div>`}
function wireActivityColourControls(){
 const root=$('modalBody'),picker=$('customColourPicker'),hex=$('f_customColour'),preview=$('activityColourPreview');if(!picker||!hex)return;
 function setColour(c){root.querySelector('input[name=colourMode][value=custom]').checked=true;hex.value=c.toUpperCase();picker.value=c;update()}
 function update(){const custom=root.querySelector('input[name=colourMode]:checked')?.value==='custom',valid=/^#[0-9a-f]{6}$/i.test(hex.value);const cat=state.categories.find(c=>c.id===root.querySelector('#f_categoryId')?.value);preview.style.background=custom&&valid?hex.value:(cat?.color||'#3478e9');hex.setCustomValidity(custom&&!valid?'Use #RRGGBB':'');hex.disabled=!custom;root.querySelectorAll('[data-swatch]').forEach(b=>b.classList.toggle('selected',custom&&b.dataset.swatch.toLowerCase()===hex.value.toLowerCase()));$('activityColourHint').textContent=custom?(valid?'Custom activity colour overrides the category colour.':'Enter a valid six-digit HEX colour.'):'Inheriting category colour. Changing that category will update this activity.'}
 root.querySelectorAll('[data-swatch]').forEach(b=>b.addEventListener('click',()=>setColour(b.dataset.swatch)));
 picker.addEventListener('input',()=>setColour(picker.value));hex.addEventListener('input',()=>{root.querySelector('input[name=colourMode][value=custom]').checked=true;if(/^#[a-f0-9]{6}$/i.test(hex.value))picker.value=hex.value;update()});root.querySelectorAll('input[name=colourMode]').forEach(r=>r.addEventListener('change',update));$('resetActivityColour').onclick=()=>{root.querySelector('input[name=colourMode][value=category]').checked=true;update()};$('f_categoryId').addEventListener('change',update);update();
}
function categoryUsedCount(id){return tripEvents().filter(e=>e.categoryId===id).length}
function renderCategoryManagerRows(){
 const mount=$('categoriesView');if(!mount)return;
 mount.innerHTML=`<p class="meta">Each category has a stable ID; changing its name or colour updates linked activities. A custom activity colour override takes precedence.</p><div class="category-manager-list">${getTripCategories().map((c,i,arr)=>`
 <div class="category-manager-row" data-category-id="${esc(c.id)}">
 <input type="text" class="category-icon" data-field="icon" value="${esc(c.icon||'●')}" maxlength="4" title="Optional icon" aria-label="Icon for ${esc(c.name)}">
 <input type="text" data-field="name" value="${esc(c.name)}" maxlength="70" aria-label="Category name" required>
 <input type="color" data-field="color" value="${esc(/^#[0-9A-Fa-f]{6}$/.test(c.color)?c.color:'#3478e9')}" title="Category colour" aria-label="Colour for ${esc(c.name)}">
 <span class="meta">${categoryUsedCount(c.id)} used</span>
 <div class="cat-actions"><button type="button" class="mini-btn" data-cat-action="save" title="Save name, icon and colour">Save</button><button type="button" class="mini-btn" data-cat-action="up" ${i===0?'disabled':''} title="Move up">↑</button><button type="button" class="mini-btn" data-cat-action="down" ${i===arr.length-1?'disabled':''} title="Move down">↓</button><button type="button" class="mini-btn" data-cat-action="delete" title="Delete category">×</button></div>
 </div>`).join('')}</div>
 <div class="category-add-row"><input type="text" id="catNewName" placeholder="New category name" aria-label="New category name" maxlength="70"><input type="text" id="catNewIcon" placeholder="●" aria-label="New category icon" maxlength="4" style="width:45px"><input type="color" id="catNewColor" aria-label="New category colour" value="#3478e9"><button type="button" class="button primary small" data-cat-action="create">+ Add category</button></div>
 <button type="button" class="button subtle small" data-cat-action="defaults" style="margin-top:8px">Add any missing default categories</button>`;
}
function openCategoryManager(){
 showModal('Activity Category Manager','<div id="categoriesView"></div>',()=>false,{showSubmit:false});renderCategoryManagerRows();
 $('modalBody').onclick=e=>{
   const button=e.target.closest('[data-cat-action]');if(!button)return;
   const action=button.dataset.catAction,row=button.closest('[data-category-id]'),id=row?.dataset.categoryId;
   const c=getTripCategories().find(c=>c.id===id),cats=getTripCategories();
   try{
    if(action==='create'){
      const name=v($('catNewName').value),icon=v($('catNewIcon').value)||'●',color=$('catNewColor').value;
      if(!name)throw Error('Enter a category name');if(cats.some(c=>c.name.toLowerCase()===name.toLowerCase()))throw Error('Category name already exists');
      mutate(()=>state.categories.push({id:uid(),tripId:trip().id,name,color,icon,order:cats.length}));renderCategoryManagerRows();toast('Category added');return;
    }
    if(action==='defaults'){
      const existing=new Set(cats.map(c=>c.name.toLowerCase()));const missing=DEFAULT_ACTIVITY_CATS.filter(([name])=>!existing.has(name.toLowerCase()));
      if(!missing.length){toast('All default categories are already present');return}
      mutate(()=>state.categories.push(...missing.map(([name,color,icon],i)=>({id:uid(),tripId:trip().id,name,color,icon,order:cats.length+i}))));renderCategoryManagerRows();toast('Default categories added');return;
    }
    if(!c)return;
    if(action==='save'){
      const name=v(row.querySelector('[data-field=name]').value),color=row.querySelector('[data-field=color]').value,icon=v(row.querySelector('[data-field=icon]').value)||'●';
      if(!name)throw Error('Category name is required');if(cats.some(x=>x.id!==id&&x.name.toLowerCase()===name.toLowerCase()))throw Error('Category name already exists');
      mutate(()=>{Object.assign(c,{name,color,icon});tripEvents().filter(e=>e.categoryId===id).forEach(e=>e.category=name)});renderCategoryManagerRows();toast('Category saved');return;
    }
    if(action==='up'||action==='down'){
      const index=cats.findIndex(x=>x.id===id),other=cats[index+(action==='up'?-1:1)];if(!other)return;
      mutate(()=>{const i=c.order;c.order=other.order;other.order=i});renderCategoryManagerRows();return;
    }
    if(action==='delete')openCategoryDelete(id);
   }catch(err){toast(err.message||'Category change failed',true)}
 };
}
function openCategoryDelete(id){
 const c=getTripCategories().find(x=>x.id===id);if(!c)return;const count=categoryUsedCount(id),other=getTripCategories().filter(x=>x.id!==id);
 if(!other.length){toast('At least one category is required',true);return}
 showModal('Delete Activity Category',`<div class="muted-warning">Delete <b>${esc(c.name)}</b>? ${count} scheduled activit${count===1?'y uses':'ies use'} this category. Activity records will never be deleted.</div>${count?selectField('Reassign affected activities to','reassignCategory',other.map(x=>({value:x.id,label:x.name})),other[0].id):'<p class="meta">No activities need reassignment.</p>'}`,f=>{
  const target=other.find(x=>x.id===f.get('reassignCategory'))||other[0];
  if(!confirm('Confirm deletion of this category?'))return false;
  mutate(()=>{tripEvents().filter(e=>e.categoryId===id).forEach(e=>{e.categoryId=target.id;e.category=target.name});state.categories=state.categories.filter(x=>x.id!==id);getTripCategories().forEach((x,i)=>x.order=i)});
  toast('Category removed. Activities preserved');
 },{submitLabel:'Delete category'});
}
function openAreaEditor(id=null,draft=null){const a=state.areas.find(x=>x.id===id)||null;const bb=draft||a;if(!bb)return;const s=`<div class="form-grid">${field('Area name','name',a?.name||`Area ${tripAreas().length+1}`,'text','required maxlength="100"')}</div><div class="muted-warning"><b>Geographic bounds (WGS84 / EPSG:4326)</b><br>North: ${Number(bb.north).toFixed(5)} · South: ${Number(bb.south).toFixed(5)}<br>West: ${Number(bb.west).toFixed(5)} · East: ${Number(bb.east).toFixed(5)}<br>Matching saved places: ${tripPlaces().filter(p=>areaHas(bb,p)).length}<br>Only the geographic bounds are saved; no screenshot or map tiles are downloaded.</div>`;showModal(a?'Rename Map Area':'Save Map Area',s,f=>{const name=v(f.get('name'));if(!name)throw Error('Area name required');const id2=a?.id||uid();mutate(()=>{if(a)a.name=name;else state.areas.push({id:id2,tripId:trip().id,name,north:+bb.north,south:+bb.south,east:+bb.east,west:+bb.west,createdAt:new Date().toISOString()});state.prefs.selectedAreaId=id2});drawing=null;setMode('navigate');fitSelectedArea();toast('Geographic area saved')})}
// OpenFreeMap provides vector basemaps; MapLibre draws them directly in the browser.
// The places and rectangles in the database remain WGS84 longitude / latitude.
const MAP_STYLE='https://tiles.openfreemap.org/styles/liberty';
const asLngLat=p=>[+p.lng,+p.lat];
const boxBounds=a=>[[+a.west,+a.south],[+a.east,+a.north]];
function mapStatus(message){$('mapHint').textContent=message}
function initMap(){
 if(map)return;
 if(!window.maplibregl){$('mapFallback').hidden=false;mapStatus('Map library could not load. Check internet connection.');return}
 try{
  let mapLoaded=false;
  map=new maplibregl.Map({container:'map',style:MAP_STYLE,center:[-0.1278,51.5074],zoom:11,maxZoom:20,attributionControl:true,dragRotate:false,pitchWithRotate:false});
  map.addControl(new maplibregl.NavigationControl({showCompass:false,visualizePitch:false}),'bottom-right');
  map.on('load',()=>{mapLoaded=true;ensureAreaLayers();refreshMap();$('mapFallback').hidden=true;mapStatus('Map ready · Navigate mode')});
  setTimeout(()=>{if(map&&!mapLoaded){$('mapFallback').hidden=false;mapStatus('Map data could not be loaded · check connection and retry')}},12000);
  map.on('click',ev=>{if(mapMode==='pin')openPlaceEditor(null,{lat:ev.lngLat.lat.toFixed(7),lng:ev.lngLat.lng.toFixed(7)})});
  map.on('mousemove',ev=>{$('coordsInfo').textContent=`Lat ${ev.lngLat.lat.toFixed(5)} · Lng ${ev.lngLat.lng.toFixed(5)}`});
  map.on('moveend',()=>{const center=map.getCenter();const t=trip();if(t){state.prefs.mapViews[t.id]={lat:center.lat,lng:center.lng,zoom:map.getZoom()};scheduleSave()}});
  map.on('error',ev=>{console.warn('Map service error',ev.error);mapStatus('Map service could not load some data · saved pins remain available')});
  $('mapFallback').hidden=true;restoreMapView();refreshMap();setMode('navigate');
 }catch(e){map?.remove();map=null;$('mapFallback').hidden=false;console.error('Map initialization failed',e);mapStatus('Map initialization failed')}
}
function ensureAreaLayers(){
 if(!map||!map.isStyleLoaded())return;
 if(!map.getSource('saved-areas'))map.addSource('saved-areas',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
 if(!map.getLayer('saved-areas-fill')){
  map.addLayer({id:'saved-areas-fill',type:'fill',source:'saved-areas',paint:{'fill-color':['case',['get','selected'],'#246ff1','#89a2bc'],'fill-opacity':['case',['get','selected'],0.16,0.065]}});
  map.addLayer({id:'saved-areas-outline',type:'line',source:'saved-areas',paint:{'line-color':['case',['get','selected'],'#246ff1','#7693b1'],'line-width':['case',['get','selected'],3,1.5],'line-dasharray':[3,2]}});
  map.on('click','saved-areas-fill',ev=>{if(mapMode!=='navigate')return;const id=ev.features?.[0]?.properties?.id;if(id)openArea(id)});
  map.on('mouseenter','saved-areas-fill',()=>{if(mapMode==='navigate')map.getCanvas().style.cursor='pointer'});
  map.on('mouseleave','saved-areas-fill',()=>{map.getCanvas().style.cursor=''});
 }
}
function refreshAreaLayers(){
 if(!map||!map.isStyleLoaded())return;
 ensureAreaLayers();const features=tripAreas().map(a=>({type:'Feature',properties:{id:a.id,name:a.name,selected:a.id===state.prefs.selectedAreaId},geometry:{type:'Polygon',coordinates:[[[a.west,a.south],[a.east,a.south],[a.east,a.north],[a.west,a.north],[a.west,a.south]]]}}));
 map.getSource('saved-areas')?.setData({type:'FeatureCollection',features});
}
function restoreMapView(){
 if(!map||!trip())return;const saved=state.prefs.mapViews[trip().id];
 if(saved&&validCoords(saved.lat,saved.lng))map.jumpTo({center:[saved.lng,saved.lat],zoom:saved.zoom||11});
 else if(tripPlaces().length)fitAllPins();
 else map.jumpTo({center:[-0.1278,51.5074],zoom:11});
 setTimeout(()=>map?.resize(),150);
}
function markerIcon(p,selected=false){
 const visits=tripEvents().filter(e=>e.placeId===p.id).sort((a,b)=>a.startAt.localeCompare(b.startAt));
 const dayVisits=tripEvents().filter(e=>e.startAt.slice(0,10)===state.prefs.selectedDate&&e.placeId).sort((a,b)=>a.startAt.localeCompare(b.startAt));
 const index=dayVisits.findIndex(e=>e.placeId===p.id);
 const dayOffset=visits.length?Math.max(0,Math.round((Date.parse(visits[0].startAt.slice(0,10)+'T12:00:00Z')-Date.parse(trip().startDate+'T12:00:00Z'))/86400000)):0;
 const color=visits.length?COLORS[dayOffset%COLORS.length]:'#7d8795';
 const el=document.createElement('div');el.className='map-pin-host'+(selected?' pin-selected':'');el.title=p.name;
 el.innerHTML=`<div class="pin-marker" style="background:${color}"><span>${index>=0?index+1:'•'}</span></div>`;
 return el;
}
function refreshMap(){
 if(!map)return;
 for(const m of markers.values())m.remove();markers.clear();
 refreshAreaLayers();
 for(const p of filteredPlaces()){
  if(!validCoords(p.lat,p.lng))continue;
  const marker=new maplibregl.Marker({element:markerIcon(p,selectedPlaceId===p.id),draggable:mapMode==='navigate',anchor:'bottom'})
    .setLngLat(asLngLat(p))
    .setPopup(new maplibregl.Popup({offset:25,maxWidth:'290px'}).setHTML(placePopup(p)))
    .addTo(map);
  marker.getElement().addEventListener('click',()=>{selectedPlaceId=p.id;selectedEventId=null;renderPlaces();refreshSelectedMarkerIcons();});
  marker.on('dragend',()=>{const ll=marker.getLngLat();mutate(()=>{const q=state.places.find(x=>x.id===p.id);if(q){q.lat=+ll.lat.toFixed(7);q.lng=+ll.lng.toFixed(7)}});toast('Place coordinates updated')});
  markers.set(p.id,marker);
 }
}
function refreshSelectedMarkerIcons(){for(const [id,m] of markers){m.getElement().classList.toggle('pin-selected',id===selectedPlaceId)}}
function placePopup(p){const ev=tripEvents().filter(e=>e.placeId===p.id).sort((a,b)=>a.startAt.localeCompare(b.startAt));return `<div class="popup-title">${esc(p.name)}</div><div class="popup-meta">${esc(p.category)} · ${(+p.lat).toFixed(5)}, ${(+p.lng).toFixed(5)}${p.address?'<br>'+esc(p.address):''}</div><div class="popup-actions"><button data-action="plan-place" data-id="${p.id}">+ Schedule</button><button data-action="edit-place" data-id="${p.id}">Edit pin</button>${ev.length?`<button data-action="open-event" data-id="${ev[0].id}">Open ${ev.length} visit${ev.length!==1?'s':''}</button>`:''}</div>`}
function focusPlace(id){
 const p=state.places.find(q=>q.id===id&&q.tripId===trip().id);if(!p)return;
 selectedPlaceId=id;refreshMap();
 if(map){map.easeTo({center:asLngLat(p),zoom:Math.max(map.getZoom(),13),duration:450});markers.get(id)?.togglePopup()}
 else toast('Place saved. Live map unavailable.',true);
}
function fitAllPins(){
 if(!map)return;const ps=filteredPlaces();if(!ps.length){toast('No visible pins to fit');return}
 if(ps.length===1)map.easeTo({center:asLngLat(ps[0]),zoom:14});
 else{const bounds=ps.reduce((acc,p)=>acc.extend(asLngLat(p)),new maplibregl.LngLatBounds(asLngLat(ps[0]),asLngLat(ps[0])));map.fitBounds(bounds,{padding:38,maxZoom:15})}
}
function openArea(id){const a=state.areas.find(x=>x.id===id&&x.tripId===trip().id);if(!a)return;state.prefs.selectedAreaId=id;state.prefs.mapFilter='area';scheduleSave();renderAll();refreshMap();fitSelectedArea()}
function fitSelectedArea(){const a=selectedArea();if(map&&a){map.fitBounds(boxBounds(a),{padding:28,maxZoom:16});mapStatus(`${a.name} · ${tripPlaces().filter(p=>areaHas(a,p)).length} saved pins`)}}
function setMode(mode){
 mapMode=mode;document.querySelectorAll('.map-tools .tool-btn').forEach(b=>b.classList.remove('active'));
 $(({navigate:'navMode',pin:'pinMode',area:'areaMode'})[mode]||'navMode').classList.add('active');
 $('mapDrawSurface').classList.toggle('active',mode==='area');
 mapStatus(mode==='pin'?'Click map to choose a new pin · Esc to cancel':mode==='area'?'Drag rectangle to select geographic bounds · Esc to cancel':'Map ready · Navigate mode');
 if(map){map.dragPan[mode==='navigate'?'enable':'disable']();map.doubleClickZoom[mode==='navigate'?'enable':'disable']();refreshMap()}
}
function endDrawing(){drawing=null;$('mapDrawRect').style.display='none';setMode('navigate')}
function setupDrawTool(){
 const surf=$('mapDrawSurface'),rect=$('mapDrawRect');
 const local=e=>{const r=surf.getBoundingClientRect();return{x:Math.max(0,Math.min(r.width,e.clientX-r.left)),y:Math.max(0,Math.min(r.height,e.clientY-r.top))}};
 surf.addEventListener('pointerdown',e=>{if(!map||mapMode!=='area'||!e.isPrimary)return;const p=local(e);drawing={start:p,current:p,pointerId:e.pointerId};surf.setPointerCapture(e.pointerId);rect.style.display='block';rect.style.left=p.x+'px';rect.style.top=p.y+'px';rect.style.width=rect.style.height='0px';e.preventDefault()});
 surf.addEventListener('pointermove',e=>{if(!drawing||drawing.pointerId!==e.pointerId)return;const p=local(e),s=drawing.start;drawing.current=p;rect.style.left=Math.min(s.x,p.x)+'px';rect.style.top=Math.min(s.y,p.y)+'px';rect.style.width=Math.abs(s.x-p.x)+'px';rect.style.height=Math.abs(s.y-p.y)+'px';e.preventDefault()});
 surf.addEventListener('pointerup',e=>{if(!drawing||drawing.pointerId!==e.pointerId)return;const s=drawing.start,c=local(e);rect.style.display='none';drawing=null;if(Math.abs(s.x-c.x)<12||Math.abs(s.y-c.y)<12){toast('Drag a larger rectangular area');return}const aa=map.unproject([s.x,s.y]),bb=map.unproject([c.x,c.y]);const west=Math.min(aa.lng,bb.lng),east=Math.max(aa.lng,bb.lng),south=Math.min(aa.lat,bb.lat),north=Math.max(aa.lat,bb.lat);if(east-west>180){toast('Area crosses the international date line: use a smaller region',true);return}openAreaEditor(null,{west,east,south,north});e.preventDefault()});
 surf.addEventListener('pointercancel',()=>{drawing=null;rect.style.display='none'});
}

async function searchMap(){const q=v($('searchPlace').value);if(!q)return;const m=q.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);if(m){const lat=+m[1],lng=+m[2];if(!validCoords(lat,lng)){toast('Invalid coordinates',true);return}clearSearch();showPreview({name:`${lat.toFixed(5)}, ${lng.toFixed(5)}`,lat,lng,address:'Manual coordinates'});return}
const now=Date.now();if(now-lastSearchAt<1100){toast('Wait at least one second between place searches');return}lastSearchAt=now;$('searchResults').hidden=false;$('searchResults').innerHTML='<div class="empty">Searching geographic locations…</div>';
try{const url='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q='+encodeURIComponent(q);const response=await fetch(url,{headers:{Accept:'application/json'}});if(!response.ok)throw Error('Search service responded '+response.status);const list=await response.json();searchResults=Array.isArray(list)?list:[];$('searchResults').innerHTML=searchResults.length?searchResults.map((r,i)=>`<button class="search-result" data-action="preview-search" data-index="${i}"><b>${esc(r.name||r.display_name?.split(',')[0])}</b><small>${esc(r.display_name)}</small></button>`).join(''):'<div class="empty">No matches. Try a more specific name or type coordinates.</div>'}catch(err){$('searchResults').innerHTML='<div class="empty">Place search unavailable. You can add a place manually using coordinates.</div>';toast('Online place search unavailable',true)}}
function showPreview(p){pendingLocation=p;clearSearch(false);if(!map){openPlaceEditor(null,p);return}if(previewMarker){previewMarker.remove();previewMarker=null}previewMarker=new maplibregl.Marker({color:'#d88d30'}).setLngLat(asLngLat(p)).setPopup(new maplibregl.Popup({offset:22}).setHTML(`<b>${esc(p.name)}</b><br><small>${esc(p.address||'')}</small><div class="popup-actions" style="margin-top:9px"><button data-action="save-preview">Save this place</button></div>`)).addTo(map);previewMarker.togglePopup();map.easeTo({center:asLngLat(p),zoom:Math.max(map.getZoom(),13)})}
function clearSearch(reset=true){$('searchResults').hidden=true;$('searchResults').innerHTML='';if(reset){pendingLocation=null;if(previewMarker)previewMarker.remove();previewMarker=null}}
function duplicateTrip(){const t=trip();if(!t)return;mutate(()=>{const nt={...clone(t),id:uid(),name:t.name+' (copy)',archived:false,createdAt:new Date().toISOString()};state.trips.push(nt);const idMap=new Map(),catMap=new Map();for(const c of getTripCategories(t.id)){const id=uid();catMap.set(c.id,id);state.categories.push({...clone(c),id,tripId:nt.id})}const places=tripPlaces().map(p=>{const id=uid();idMap.set(p.id,id);return{...clone(p),id,tripId:nt.id}});const evs=tripEvents().map(e=>({...clone(e),id:uid(),tripId:nt.id,placeId:idMap.get(e.placeId)||null,categoryId:catMap.get(e.categoryId)||e.categoryId}));const areas=tripAreas().map(a=>({...clone(a),id:uid(),tripId:nt.id}));state.places.push(...places);state.events.push(...evs);state.areas.push(...areas);state.prefs.tripId=nt.id;state.prefs.selectedAreaId=null});restoreMapView();toast('Trip duplicated')}

function switchDate(n){if(state.prefs.view==='week'){const u=getTripUI();u.startDate=addDays(u.startDate,n*u.visibleDays);state.prefs.selectedDate=u.startDate;scheduleSave();renderAll();refreshMap()}else setPref('selectedDate',addDays(state.prefs.selectedDate,n))}
function selectEvent(id){const e=state.events.find(x=>x.id===id&&x.tripId===trip().id);if(!e)return;selectedEventId=e.id;state.prefs.selectedDate=e.startAt.slice(0,10);if(state.prefs.view==='week'&&(state.prefs.selectedDate<getTripUI().startDate||state.prefs.selectedDate>addDays(getTripUI().startDate,getTripUI().visibleDays-1)))getTripUI().startDate=state.prefs.selectedDate;if(e.placeId){selectedPlaceId=e.placeId;state.prefs.mapFilter='all'}scheduleSave();renderAll();refreshMap();if(e.placeId)focusPlace(e.placeId)}

function assignDropped(item,day,time){if(item.placeId){const p=state.places.find(p=>p.id===item.placeId);if(!p)return;openEventEditor(null,{date:day,time,placeId:p.id});return}if(item.eventId){const e=state.events.find(e=>e.id===item.eventId);if(!e)return;const duration=durationMin(e);mutate(()=>{e.startAt=day+'T'+time;e.endAt=addMinutes(e.startAt,duration);e.updatedAt=new Date().toISOString()});toast('Activity moved')}}

// Pointer-event dragging and resizing: one undoable mutation only after drop.
function snapLocal(local,step){const mins=Number(local.slice(11,13))*60+Number(local.slice(14,16));return addMinutes(local,Math.round(mins/step)*step-mins)}
function cancelActivityDrag(){
 if(!activeActivityDrag)return;
 activeActivityDrag.node.classList.remove('dragging-active');activeActivityDrag.preview?.remove();
 activeActivityDrag=null;dragSuppressUntil=Date.now()+350;
}
function findTargetDay(x,y,origin){
 const c=$('calendar'),rect=c.getBoundingClientRect();
 if(x>rect.right-25)c.scrollLeft+=13;else if(x<rect.left+60)c.scrollLeft-=13;
 const py=Math.min(rect.bottom-15,Math.max(rect.top+48,y));
 const col=document.elementFromPoint(Math.min(rect.right-10,Math.max(rect.left+65,x)),py)?.closest('.daycol');
 return col||origin;
}
function calculateActivityDrag(d,x,y){
 const snap=getTripUI().snapMinutes||15;
 const dy=y-d.startY+($('calendar').scrollTop-d.scrollY);
 const dx=x-d.startX;
 const delta=Math.round((dy/HOUR*60)/snap)*snap;
 let col=d.origin;
 if(d.mode==='move')col=findTargetDay(x,y,d.origin);
 const diffDays=d.mode==='move'?Math.round((Date.parse(col.dataset.date+'T12:00:00Z')-Date.parse(d.origin.dataset.date+'T12:00:00Z'))/86400000):0;
 let start=d.startAt,end=d.endAt;
 if(d.mode==='move'){
   start=snapLocal(addMinutes(d.startAt,delta+diffDays*1440),snap);
   end=addMinutes(start,d.duration);
 }else if(d.mode==='bottom'){
   end=snapLocal(addMinutes(d.endAt,delta),snap);
   if(end<=addMinutes(start,snap))end=addMinutes(start,snap);
 }else{
   start=snapLocal(addMinutes(d.startAt,delta),snap);
   if(start>=addMinutes(end,-snap))start=addMinutes(end,-snap);
 }
 return {start,end,col};
}
function activityDragPreview(d,result){
 const rect=result.col.getBoundingClientRect(),c=$('calendar').getBoundingClientRect();
 const begin=result.start.slice(0,10),visibleDay=result.col.dataset.date;
 const dayStart=Date.parse(visibleDay+'T00:00:00Z');
 const from=Math.max(0,(Date.parse(result.start+':00Z')-dayStart)/60000),until=Math.min(1440,(Date.parse(result.end+':00Z')-dayStart)/60000);
 const height=Math.min(250,Math.max(36,(until-from)*HOUR/60));
 d.preview.style.display='block';
 d.preview.style.left=Math.max(c.left+48,rect.left+3)+'px';d.preview.style.width=Math.max(90,Math.min(rect.width-7,240))+'px';
 d.preview.style.top=Math.max(c.top+4,Math.min(c.bottom-45,rect.top+40+from*HOUR/60))+'px';
 d.preview.style.height=height+'px';
 d.preview.innerHTML=`<strong>${esc(d.title)}</strong><span class="meta">${esc(result.start.slice(0,10))} ${esc(result.start.slice(11,16))} → ${esc(result.end.slice(0,10))} ${esc(result.end.slice(11,16))}</span>`;
 d.node.classList.add('dragging-active');
}
function wireActivityPointerEvents(){
 const calendar=$('calendar');
 calendar.addEventListener('pointerdown',e=>{
   const node=e.target.closest('.calendar-event');if(getTripUI().timetableMode!=='move'||!node||e.button!==0||e.target.closest('a,button'))return;
   const entry=tripEvents().find(x=>x.id===node.dataset.id),origin=node.closest('.daycol');if(!entry||!origin)return;
   const handle=e.target.closest('[data-resize]');
   const mode=handle?handle.dataset.resize:'move';
   const preview=document.createElement('div');preview.className='activity-drag-preview';preview.style.display='none';document.body.append(preview);
   const d={node,origin,preview,id:entry.id,title:entry.title,startX:e.clientX,startY:e.clientY,scrollY:calendar.scrollTop,scrollX:calendar.scrollLeft,pointerId:e.pointerId,startAt:entry.startAt,endAt:entry.endAt,duration:durationMin(entry),mode,active:false,result:null};
   activeActivityDrag=d;node.setPointerCapture(e.pointerId);e.preventDefault();
 });
 calendar.addEventListener('pointermove',e=>{
   const d=activeActivityDrag;if(!d||d.pointerId!==e.pointerId)return;
   if(!d.active&&Math.hypot(e.clientX-d.startX,e.clientY-d.startY)<4)return;
   d.active=true;d.result=calculateActivityDrag(d,e.clientX,e.clientY);activityDragPreview(d,d.result);e.preventDefault();
 });
 calendar.addEventListener('pointerup',e=>{
   const d=activeActivityDrag;if(!d||e.pointerId!==d.pointerId)return;
   const moved=d.active&&d.result&&(d.result.start!==d.startAt||d.result.end!==d.endAt);
   cancelActivityDrag();
   if(!d.active){if(d.mode==='move')selectEvent(d.id);e.preventDefault();return}
   if(moved){
     const event=tripEvents().find(a=>a.id===d.id),next=d.result;
     if(!event)return;
     const conflict=tripEvents().some(a=>a.id!==event.id&&a.startAt<next.end&&a.endAt>next.start);
     mutate(()=>{event.startAt=next.start;event.endAt=next.end;event.updatedAt=new Date().toISOString();state.prefs.selectedDate=event.startAt.slice(0,10);selectedEventId=event.id});
     toast(conflict?'Activity updated · overlaps another planned activity':'Activity time updated');
   }
   e.preventDefault();
 });
 calendar.addEventListener('pointercancel',cancelActivityDrag);
 calendar.addEventListener('keydown',e=>{const node=e.target.closest('.calendar-event');if(!node)return;if(e.key==='Enter'){e.preventDefault();selectedEventId=node.dataset.id;openEventEditor(node.dataset.id)}else if(e.key===' '){e.preventDefault();selectEvent(node.dataset.id)}});
}
function download(filename,content,type='application/octet-stream'){const blob=content instanceof Blob?content:new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function backupData(){return{...clone(state),appVersion:APP_VERSION,schemaVersion:SCHEMA_VERSION,exportedAt:new Date().toISOString()}}
function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'trip'}
function icsEsc(v){return String(v||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')}
function exportIcs(){const es=tripEvents(),tz=trip().timezone,dt=s=>s.replace(/[-:]/g,'');const rows=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Fieldnotes//Travel Planner Pro//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:'+icsEsc(trip().name)];for(const e of es){const p=state.places.find(p=>p.id===e.placeId);rows.push('BEGIN:VEVENT','UID:'+e.id+'@fieldnotes.local','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z/,'Z'),'DTSTART;TZID='+tz+':'+dt(e.startAt)+'00','DTEND;TZID='+tz+':'+dt(e.endAt)+'00','SUMMARY:'+icsEsc(e.title),'DESCRIPTION:'+icsEsc(e.notes),'LOCATION:'+icsEsc(p?.address||p?.name||''),'END:VEVENT')}rows.push('END:VCALENDAR');download(slug(trip().name)+'.ics',rows.join('\r\n'),'text/calendar;charset=utf-8')}
function printItinerary(){const t=trip();const html=`<!doctype html><html><head><title>${esc(t.name)} itinerary</title><style>body{font:14px system-ui,Arial;padding:24px;max-width:850px;margin:auto;color:#233}h1{font-size:26px}h2{margin-top:26px;border-bottom:2px solid #dde}article{padding:11px 0;border-bottom:1px solid #ddd}time{display:inline-block;min-width:115px;font-weight:700;color:#2464b9}p{white-space:pre-wrap;color:#5a6470}@media print{body{padding:0}}</style></head><body><h1>${esc(t.name)}</h1><p>${esc(t.destination)} · ${esc(t.startDate)} – ${esc(t.endDate)} · ${esc(t.timezone)}</p>${Array.from(new Set(tripEvents().map(e=>e.startAt.slice(0,10)))).sort().map(day=>`<h2>${esc(prettyDate(day,{weekday:'long',year:'numeric'}))}</h2>${tripEvents().filter(e=>e.startAt.slice(0,10)===day).sort((a,b)=>a.startAt.localeCompare(b.startAt)).map(e=>{const p=state.places.find(x=>x.id===e.placeId);return `<article><time>${esc(e.startAt.slice(11,16))} – ${esc(e.endAt.slice(11,16))}</time><b>${esc(e.title)}</b><div>${esc(p?.address||p?.name||'')}</div><p>${esc(e.notes||'')}</p></article>`}).join('')}`).join('')||'<p>No planned activities</p>'}<script>window.addEventListener('load',()=>window.print());<\/script></body></html>`;const w=window.open('','_blank');if(!w){toast('Allow pop-ups to print the itinerary',true);return}w.document.open();w.document.write(html);w.document.close()}
function openExport(){showModal('Export & Backup',`<div class="export-options"><button id="doTimetable" type="button" class="button">Timetable PNG / PDF / Print<small>Custom dates, paper sizes, print preview and selected colours.</small></button><button id="doJson" type="button" class="button">Full JSON Backup<small>All trips, geographic pins, saved map areas and calendar events.</small></button><button id="doZip" type="button" class="button">ZIP Backup<small>Versioned data.json inside a ZIP (no attachments in V1.0).</small></button><button id="doIcs" type="button" class="button">ICS Calendar · Current Trip<small>Timezone-aware calendar events for Outlook, Apple and Google Calendar.</small></button><button id="doPrint" type="button" class="button">Print / Save as PDF · Current Trip<small>Opens a print-friendly itinerary with browser PDF output.</small></button><button id="doDuplicate" type="button" class="button">Duplicate Current Trip<small>Create a separate copy with new stable IDs.</small></button></div>`,null,{showSubmit:false});$('doTimetable').onclick=()=>openTimetableExport('pdf');$('doJson').onclick=()=>{download('fieldnotes-travel-backup.json',JSON.stringify(backupData(),null,2),'application/json');closeModal()};$('doZip').onclick=async()=>{try{if(!window.JSZip)await loadJsZip();if(!window.JSZip)throw Error('ZIP library unavailable');const zip=new JSZip();zip.file('data.json',JSON.stringify(backupData(),null,2));zip.file('README.txt','Fieldnotes Travel Planner Pro backup. Import this ZIP into the app to restore all trips and links.');const blob=await zip.generateAsync({type:'blob'});download('fieldnotes-travel-backup.zip',blob);closeModal()}catch(e){toast('ZIP export failed. Use JSON backup instead.',true)}};$('doIcs').onclick=()=>{exportIcs();closeModal()};$('doPrint').onclick=()=>{printItinerary();closeModal()};$('doDuplicate').onclick=()=>{if(confirm('Create an independent copy of the current trip?'))duplicateTrip();closeModal()}}
// V1.3 timetable output. SVG is the single print/preview/PNG source;
// provider map tiles and map DOM are never captured or included.
const PRINT_PAPERS={A4:[210,297],A3:[297,420],Letter:[215.9,279.4]};
function exportDateValid(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;return !Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s}
function exportConfigFromForm(){
 const form=$('modalForm'),data=new FormData(form),cfg={};
 for(const name of ['scope','from','to','pageSize','orientation','scaleMode'])cfg[name]=String(data.get(name)||'');
 cfg.customScale=Number(data.get('customScale')||100);
 for(const name of ['showTitle','showDates','showLegend','showNotes','showPrintDate'])cfg[name]=data.has(name);
 if(!PRINT_PAPERS[cfg.pageSize]||!['landscape','portrait'].includes(cfg.orientation)||!['visible','custom','trip'].includes(cfg.scope)||!['fit-width','fit-page','custom'].includes(cfg.scaleMode))throw Error('Invalid print/export settings');
 if(!Number.isFinite(cfg.customScale)||cfg.customScale<60||cfg.customScale>160)throw Error('Custom scale must be between 60% and 160%');
 if(cfg.scope==='custom'&&(!exportDateValid(cfg.from)||!exportDateValid(cfg.to)||cfg.from>cfg.to))throw Error('Choose a valid custom start and end date');
 return cfg;
}
function exportDates(cfg){
 const t=trip(),ui=getTripUI();let start,end;
 if(cfg.scope==='visible'){start=state.prefs.view==='week'?ui.startDate:state.prefs.selectedDate;end=addDays(start,state.prefs.view==='week'?ui.visibleDays-1:0)}
 else if(cfg.scope==='custom'){start=cfg.from;end=cfg.to}
 else{const events=tripEvents();start=[t.startDate,...events.map(e=>e.startAt.slice(0,10))].sort()[0];end=[t.endDate,...events.map(e=>addDays(e.endAt.slice(0,10),e.endAt.slice(11)==='00:00'?-1:0))].sort().at(-1)}
 if(!exportDateValid(start)||!exportDateValid(end)||start>end)throw Error('Invalid trip date range');
 const count=Math.round((Date.parse(end+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000)+1;
 if(count>366)throw Error('Maximum export range is 366 days. Choose a shorter date range.');
 return Array.from({length:count},(_,i)=>addDays(start,i));
}
function exportLayout(cfg){
 let [pw,ph]=PRINT_PAPERS[cfg.pageSize];if(cfg.orientation==='landscape')[pw,ph]=[ph,pw];
 const W=1200,H=Math.round(W*(ph-16)/(pw-16));
 const base=cfg.orientation==='landscape'?(cfg.pageSize==='A3'?6:4):(cfg.pageSize==='A3'?4:3);
 const scale=cfg.scaleMode==='custom'?cfg.customScale/100:cfg.scaleMode==='fit-width'?0.85:1;
 const cols=Math.max(1,Math.min(8,Math.floor(base/scale)));
 return{W,H,pw,ph,cols,scale};
}
const svgText=(x,y,t,size=15,color='#263448',weight=400,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-family="Arial,Helvetica,sans-serif" font-weight="${weight}" ${extra}>${esc(t)}</text>`;
const svgRect=(x,y,w,h,fill,rx=0,stroke='none',sw=1)=>`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${Math.max(0,w).toFixed(2)}" height="${Math.max(0,h).toFixed(2)}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const svgLine=(x1,y1,x2,y2,color='#e0e6ed',sw=1)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${sw}"/>`;
function wrapExportText(value,chars,maxLines=2){const words=String(value||'').replace(/\s+/g,' ').trim().split(' '),out=[];let line='';for(const word of words){if(!word)continue;if(!line)line=word;else if((line+' '+word).length<=chars)line+=' '+word;else{out.push(line);line=word}}if(line)out.push(line);if(out.length>maxLines){const result=out.slice(0,maxLines);result[maxLines-1]=result[maxLines-1].slice(0,Math.max(1,chars-1))+'…';return result}return out}
function eventSegmentsOnDay(day){const ds=day+'T00:00',de=addDays(day,1)+'T00:00';return eventsOverlappingDay(day).map(e=>({e,start:Math.max(0,(Date.parse((e.startAt>ds?e.startAt:ds)+':00Z')-Date.parse(ds+':00Z'))/60000),end:Math.min(1440,(Date.parse((e.endAt<de?e.endAt:de)+':00Z')-Date.parse(ds+':00Z'))/60000)})).filter(s=>s.end>s.start)}
function laneSegments(segs){
 const arr=segs.slice().sort((a,b)=>a.start-b.start||a.end-b.end),groups=[];let current=[],maxEnd=-1;
 for(const item of arr){if(current.length&&item.start>=maxEnd){groups.push(current);current=[];maxEnd=-1}current.push(item);maxEnd=Math.max(maxEnd,item.end)}if(current.length)groups.push(current);
 for(const g of groups){const busy=[];for(const seg of g){let lane=busy.findIndex(t=>t<=seg.start);if(lane<0){lane=busy.length;busy.push(-1)}busy[lane]=seg.end;seg.lane=lane}for(const seg of g)seg.laneCount=busy.length}
 return arr;
}
function createTimetableSVG(days,cfg,layout,pageIndex,pageTotal){
 const {W,H}=layout,margin=26,left=78,right=26,header=cfg.showTitle?150:100;
 const cats=getTripCategories().filter(c=>days.some(d=>eventsOverlappingDay(d).some(e=>e.categoryId===c.id)));
 const legendRows=cfg.showLegend?Math.ceil(cats.length/6):0;
 const legendH=Math.min(150,legendRows*23+(legendRows?18:0));
 let top=header+legendH+48,bottom=H-72;
 const all=days.flatMap(eventSegmentsOnDay),first=all.length?Math.floor(Math.min(...all.map(s=>s.start))/60)-1:7,last=all.length?Math.ceil(Math.max(...all.map(s=>s.end))/60)+1:22;
 const fromHour=Math.max(0,Math.min(22,first)),toHour=Math.max(fromHour+2,Math.min(24,last));
 const from=fromHour*60,to=toHour*60,scaleY=(bottom-top)/(to-from);
 const colW=(W-left-right)/days.length;
 let out=svgRect(0,0,W,H,'#ffffff')+svgRect(0,0,W,10,'#356cdb');
 out+=svgText(26,47,'FIELDNOTES  /  TRAVEL PLANNER',17,'#356cdb',700);
 if(cfg.showTitle)out+=svgText(26,90,trip().name,35,'#192c42',700);
 if(cfg.showDates)out+=svgText(26,header-22,`${prettyDate(days[0],{year:'numeric'})} – ${prettyDate(days.at(-1),{year:'numeric'})}  ·  ${trip().timezone}`,17,'#63758a',500);
 if(cfg.showLegend&&cats.length){let y=header+8;out+=svgText(26,y+5,'CATEGORIES',13,'#62728b',700);y+=22;cats.forEach((cat,i)=>{const x=26+(i%6)*(W-52)/6,yy=y+Math.floor(i/6)*23;out+=svgRect(x,yy-11,12,12,cat.color||'#567',3)+svgText(x+18,yy,cat.name.slice(0,19),12,'#4b5f77',600)});}
 out+=svgRect(left,top-39,W-left-right,39,'#eaf0fa');
 days.forEach((d,i)=>{const x=left+i*colW;out+=svgLine(x,top-39,x,bottom,'#d8e1ed');out+=svgText(x+10,top-16,prettyDate(d,{weekday:'short',month:'short',day:'numeric'}),Math.min(17,Math.max(12,colW/13)),'#263f62',700)});
 for(let hour=fromHour;hour<=toHour;hour++){let y=top+(hour*60-from)*scaleY;out+=svgLine(left,y,W-right,y,'#e0e6ef');if(hour<24)out+=svgText(23,y+4,`${pad(hour)}:00`,13,'#657589',500)}
 days.forEach((d,dayIndex)=>{
  const segments=laneSegments(eventSegmentsOnDay(d));const x=left+dayIndex*colW;
  for(const seg of segments){
    const start=Math.max(from,seg.start),end=Math.min(to,seg.end);if(start>=end)continue;
    const gap=4,laneW=(colW-gap*2)/seg.laneCount;
    const ex=x+gap+seg.lane*laneW,ey=top+(start-from)*scaleY+2,ew=Math.max(5,laneW-3),eh=Math.max(3,(end-start)*scaleY-4),color=eventColor(seg.e),fg=eventContrast(color);
    out+=`<g>`+svgRect(ex,ey,ew,eh,color,4);
    if(eh>=15){const size=Math.min(15,Math.max(9,ew/11));const startLabel=seg.e.startAt.slice(11,16),endLabel=seg.e.endAt.slice(11,16);out+=svgText(ex+5,ey+Math.min(14,eh-2),`${startLabel}–${endLabel}`,Math.max(8,size-2),fg,700);if(eh>=34){const lines=wrapExportText(seg.e.title,Math.max(7,Math.floor((ew-14)/(size*.58))),Math.max(1,Math.min(3,Math.floor((eh-16)/(size+3)))));lines.forEach((line,i)=>{const ty=ey+Math.min(29+i*(size+2),eh-3);if(ty<=ey+eh-3)out+=svgText(ex+5,ty,line,size,fg,600)})}}
    out+=`<title>${esc(seg.e.title)} · ${esc(seg.e.startAt)} – ${esc(seg.e.endAt)}</title></g>`;
  }
 });
 out+=svgLine(26,H-54,W-26,H-54,'#d6deeb');
 out+=svgText(26,H-29,`Fieldnotes · ${days.length} day${days.length===1?'':'s'} · ${fromHour}:00–${pad(toHour)}:00`,13,'#677b90');
 out+=svgText(W-130,H-29,`Page ${pageIndex} / ${pageTotal}`,12,'#677b90');
 if(cfg.showPrintDate)out+=svgText(W-340,H-29,`Prepared ${new Date().toLocaleDateString('en-GB')}`,12,'#677b90');
 return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Timetable ${esc(days[0])} to ${esc(days.at(-1))}">${out}</svg>`;
}
function createNotesSVG(pageLines,cfg,layout,pageIndex,total,label='Activity Notes'){const{W,H}=layout;let out=svgRect(0,0,W,H,'#ffffff')+svgRect(0,0,W,10,'#356cdb')+svgText(32,57,`${trip().name} · ${label}`,33,'#192c42',700);pageLines.forEach((entry,i)=>{const y=113+i*23;out+=svgText(36,y,entry.text,16,entry.head?'#294b82':'#475569',entry.head?700:400)});out+=svgLine(30,H-55,W-30,H-55)+svgText(32,H-28,'Fieldnotes · Activity appendix',13,'#64748b')+svgText(W-140,H-28,`Page ${pageIndex} / ${total}`,13,'#64748b');return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Activity notes">${out}</svg>`}
function makeNotesPages(days,cfg,layout){if(!cfg.showNotes)return[];const es=tripEvents().filter(e=>days.some(d=>e.startAt<addDays(d,1)+'T00:00'&&e.endAt>d+'T00:00')&&(e.notes||e.description));const lines=[];es.forEach(e=>{lines.push({text:`${e.startAt.replace('T',' ')} · ${e.title}`.slice(0,105),head:true});for(const source of [e.description,e.notes]){if(!source)continue;for(const raw of source.split(/\r?\n/)){for(const line of wrapExportText(raw,106,10000))lines.push({text:'   '+line,head:false})}}lines.push({text:'',head:false})});if(!lines.length)return[];const maxLines=Math.max(10,Math.floor((layout.H-190)/23)),pages=[];for(let i=0;i<lines.length;i+=maxLines)pages.push({type:'notes',lines:lines.slice(i,i+maxLines)});return pages}
function makeShortActivityPages(days,layout){
 // A 15-minute block may have no room for full text at a readable font.
 // Add a compact register so every short activity is printed with its full title/times.
 const ids=new Set(),es=[];
 for(const day of days){for(const seg of eventSegmentsOnDay(day)){if(seg.end-seg.start>=45&&seg.e.title.length<=56)continue;if(ids.has(seg.e.id))continue;ids.add(seg.e.id);es.push(seg.e)}}
 if(!es.length)return[];
 const lines=[];es.sort((a,b)=>a.startAt.localeCompare(b.startAt)).forEach(e=>{lines.push({head:true,text:`${e.startAt.replace('T',' ')} – ${e.endAt.replace('T',' ')}  ·  ${eventCategoryName(e)}`});for(const line of wrapExportText(e.title,98,1000))lines.push({head:false,text:'   '+line});lines.push({head:false,text:''})});
 const pages=[],maxLines=Math.max(12,Math.floor((layout.H-190)/23));for(let i=0;i<lines.length;i+=maxLines)pages.push({type:'details',lines:lines.slice(i,i+maxLines)});return pages;
}
function buildTimetableExport(cfg){const days=exportDates(cfg),layout=exportLayout(cfg),specs=[];for(let i=0;i<days.length;i+=layout.cols)specs.push({type:'timetable',days:days.slice(i,i+layout.cols)});specs.push(...makeShortActivityPages(days,layout));specs.push(...makeNotesPages(days,cfg,layout));if(specs.length>250)throw Error('Export has too many pages: choose a shorter date range');return{layout,days,pages:specs.map((s,i)=>({type:s.type,svg:s.type==='timetable'?createTimetableSVG(s.days,cfg,layout,i+1,specs.length):createNotesSVG(s.lines,cfg,layout,i+1,specs.length,s.type==='details'?'Short / Long Activity Details':'Activity Notes')}))}}
function openTimetableExport(initialFormat='pdf'){
 const saved={...defaultExportSettings(),...getTripUI().exportSettings},current=state.prefs.view==='week'?getTripUI().startDate:state.prefs.selectedDate;
 if(!saved.from)saved.from=current;if(!saved.to)saved.to=addDays(current,Math.max(0,getTripUI().visibleDays-1));
 const sel=(name,opts)=>`<select name="${name}" id="export_${name}">${opts.map(([v,l])=>`<option value="${v}" ${saved[name]===v?'selected':''}>${l}</option>`).join('')}</select>`;
 const box=(name,label)=>`<label class="export-check"><input type="checkbox" name="${name}" ${saved[name]?'checked':''}> ${label}</label>`;
 const body=`<div class="export-config"><div class="form-grid">
 <div class="field"><label for="export_scope">Content scope</label>${sel('scope',[['visible','Current visible timetable'],['custom','Custom date range'],['trip','Entire trip timetable']])}</div>
 <div class="field"><label for="export_pageSize">Paper size</label>${sel('pageSize',[['A4','A4'],['A3','A3'],['Letter','Letter']])}</div>
 <div class="field export-custom-dates"><label for="export_from">From date</label><input name="from" id="export_from" type="date" value="${esc(saved.from)}"></div>
 <div class="field export-custom-dates"><label for="export_to">To date</label><input name="to" id="export_to" type="date" value="${esc(saved.to)}"></div>
 <div class="field"><label for="export_orientation">Orientation</label>${sel('orientation',[['landscape','Landscape'],['portrait','Portrait']])}</div>
 <div class="field"><label for="export_scaleMode">Scale / density</label>${sel('scaleMode',[['fit-width','Fit to Width'],['fit-page','Fit to Page'],['custom','Custom Scale']])}</div>
 <div class="field export-custom-scale"><label for="export_customScale">Scale percentage (60–160%)</label><input id="export_customScale" name="customScale" type="number" min="60" max="160" value="${saved.customScale}"></div>
 </div><div class="export-checks">${box('showTitle','Trip title')}${box('showDates','Date range')}${box('showLegend','Category legend')}${box('showNotes','Activity notes appendix')}${box('showPrintDate','Print date')}</div></div>
 <div class="export-preview-heading"><strong>Print preview</strong><span id="exportPageCount" class="meta">Preparing…</span></div><div id="exportPreview" class="export-preview" aria-live="polite"></div><div class="export-actions"><button type="button" id="exportDoPng" class="button primary">Download PNG</button><button type="button" id="exportDoPdf" class="button secondary">Print / Save as PDF</button></div><p class="meta" id="exportProgress">The browser print dialog lets you choose a printer or “Save as PDF”. PNG is generated without the map.</p>`;
 showModal('Export / Print Timetable',body,null,{showSubmit:false});
 $('modalRoot').classList.add('export-modal-open');
 let currentResult=null;
 const update=()=>{const custom=$('export_scope').value==='custom',manual=$('export_scaleMode').value==='custom';document.querySelectorAll('.export-custom-dates').forEach(el=>el.hidden=!custom);$('export_customScale').closest('.field').hidden=!manual;
 try{const cfg=exportConfigFromForm();currentResult=buildTimetableExport(cfg);$('exportPageCount').textContent=`${currentResult.days.length} days · ${currentResult.pages.length} page(s)`;const maxPreview=15;$('exportPreview').innerHTML=currentResult.pages.slice(0,maxPreview).map(p=>`<div class="export-preview-page">${p.svg}</div>`).join('')+(currentResult.pages.length>maxPreview?`<div class="meta">Preview shows first ${maxPreview} of ${currentResult.pages.length} pages. All pages will be exported.</div>`:'');$('exportProgress').textContent='Ready. Preview and output use the same vector timetable pages.';$('exportDoPng').disabled=false;$('exportDoPdf').disabled=false}
 catch(err){currentResult=null;$('exportPageCount').textContent='Invalid range';$('exportPreview').innerHTML=`<p class="muted-warning">${esc(err.message)}</p>`;$('exportProgress').textContent='Adjust export settings.';$('exportDoPng').disabled=true;$('exportDoPdf').disabled=true}};
 $('modalForm').addEventListener('change',update);$('modalForm').addEventListener('input',e=>{if(e.target.type==='date'||e.target.type==='number')update()});
 $('exportDoPng').onclick=async()=>{if(!currentResult)return;const btn=$('exportDoPng');btn.disabled=true;try{const cfg=exportConfigFromForm();getTripUI().exportSettings=cfg;scheduleSave();await downloadTimetablePng(currentResult,txt=>$('exportProgress').textContent=txt);$('exportProgress').textContent='PNG generated and browser download requested.'}catch(err){$('exportProgress').textContent='PNG export failed: '+err.message;toast('PNG export failed: '+err.message,true)}finally{if(btn.isConnected)btn.disabled=false}};
 $('exportDoPdf').onclick=()=>{if(!currentResult)return;try{const cfg=exportConfigFromForm();getTripUI().exportSettings=cfg;scheduleSave();openTimetablePrint(currentResult,cfg)}catch(err){toast('Print unavailable: '+err.message,true)}};
 update();if(initialFormat==='png')$('exportDoPng').classList.add('recommended-export');else $('exportDoPdf').classList.add('recommended-export');
}
function openTimetablePrint(result,cfg){
 const pages=result.pages.map((p,i)=>`<section class="print-page${i===result.pages.length-1?' last':''}">${p.svg}</section>`).join('');
 const {pw,ph}=result.layout;const pageLabel=cfg.pageSize==='Letter'?'letter':cfg.pageSize.toLowerCase();
 const css=`@page{size:${pageLabel} ${cfg.orientation};margin:8mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;font-family:Arial,sans-serif;print-color-adjust:exact;-webkit-print-color-adjust:exact}.print-page{width:${pw-16}mm;height:${ph-16}mm;break-after:page;page-break-after:always;margin:0;overflow:hidden}.print-page.last{break-after:auto;page-break-after:auto}.print-page svg{display:block;width:100%;height:100%;print-color-adjust:exact;-webkit-print-color-adjust:exact}@media screen{body{background:#ebeff5}.print-page{background:#fff;margin:14px auto;box-shadow:0 3px 15px #999}}`;
 const win=window.open('','_blank');if(!win)throw Error('Popup blocked. Enable popups to print this timetable.');
 win.document.open();win.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(trip().name)} · Timetable PDF</title><style>${css}</style></head><body>${pages}<script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),200)});<\/script></body></html>`);win.document.close();
 $('exportProgress').textContent='Print view opened. In the browser dialog, select “Save as PDF” for a PDF file. No file is claimed saved until you confirm.';
}
async function svgToImage(svg){const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob);try{return await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('SVG page rendering failed'));im.src=url})}finally{setTimeout(()=>URL.revokeObjectURL(url),1000)}}
async function canvasBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNG encoding failed')),'image/png'))}
async function downloadTimetablePng(result,progress){const{W,H}=result.layout,pages=result.pages,maxBatch=Math.max(1,Math.floor(11000/H)),batches=[];
 for(let start=0;start<pages.length;start+=maxBatch){const chunk=pages.slice(start,start+maxBatch);const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H*chunk.length;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let i=0;i<chunk.length;i++){const img=await svgToImage(chunk[i].svg);ctx.drawImage(img,0,i*H,W,H);progress(`Generating PNG ${start+i+1} of ${pages.length}…`)}batches.push({name:`${slug(trip().name)}-timetable-${String(batches.length+1).padStart(2,'0')}.png`,blob:await canvasBlob(canvas)});canvas.width=0;canvas.height=0;
 }
 if(batches.length===1){download(`${slug(trip().name)}-timetable.png`,batches[0].blob);return}
 try{if(!window.JSZip)await loadJsZip();if(!window.JSZip)throw Error('ZIP library unavailable');const zip=new JSZip();batches.forEach(b=>zip.file(b.name,b.blob));download(`${slug(trip().name)}-timetable-png-pages.zip`,await zip.generateAsync({type:'blob'}));progress(`${batches.length} PNG images packaged in ZIP. Browser download requested.`)}
 catch(err){progress(`ZIP packaging unavailable. Downloading ${batches.length} PNG parts individually; allow multiple downloads if prompted.`);for(const b of batches){download(b.name,b.blob);await new Promise(r=>setTimeout(r,120))}}
}

function loadJsZip(){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://unpkg.com/jszip@3.10.1/dist/jszip.min.js';script.onload=resolve;script.onerror=reject;document.head.append(script)})}
function validateImport(x){const n=normalize(x);if(n.trips.length>500||n.places.length>100000||n.events.length>200000||n.areas.length>50000)throw Error('Backup exceeds supported size limits');const tripIds=new Set(n.trips.map(t=>t.id)),placeIds=new Set(n.places.map(p=>p.id));if(!n.trips.length||tripIds.size!==n.trips.length)throw Error('Trips missing or duplicated');for(const p of n.places){if(!tripIds.has(p.tripId)||!validCoords(p.lat,p.lng))throw Error('Invalid place reference or coordinates')}for(const e of n.events){if(!tripIds.has(e.tripId)||(e.placeId&&!placeIds.has(e.placeId))||e.endAt<=e.startAt)throw Error('Invalid schedule event reference or date')}for(const a of n.areas){if(!tripIds.has(a.tripId)||![a.north,a.south,a.east,a.west].every(Number.isFinite)||a.north<a.south||a.east<a.west)throw Error('Invalid saved map area')}const catIds=new Set(n.categories.map(c=>c.id));if(catIds.size!==n.categories.length)throw Error('Duplicated category IDs');for(const c of n.categories){if(!tripIds.has(c.tripId)||!c.name||!/^#[0-9a-f]{6}$/i.test(c.color||''))throw Error('Invalid activity category')};for(const e of n.events){if(!catIds.has(e.categoryId)||n.categories.find(c=>c.id===e.categoryId)?.tripId!==e.tripId)throw Error('Invalid activity category link');if(e.googleMapsUrl)validGoogleMapsURL(e.googleMapsUrl);if(!['category','custom'].includes(e.colourMode))throw Error('Invalid activity colour mode');if(e.colourMode==='custom'&&!/^#[0-9a-f]{6}$/i.test(e.customColour||''))throw Error('Invalid activity custom colour')}if(!tripIds.has(n.prefs.tripId))n.prefs.tripId=n.trips[0].id;if(!n.prefs.selectedDate)n.prefs.selectedDate=n.trips[0].startDate;return n}
async function importFile(file){if(!file)return;try{if(file.size>30*1024*1024)throw Error('Backup file exceeds 30 MB');let data;if(file.name.toLowerCase().endsWith('.zip')){if(!window.JSZip)await loadJsZip();const zip=await JSZip.loadAsync(await file.arrayBuffer());const entry=zip.file('data.json');if(!entry)throw Error('ZIP does not include data.json');data=JSON.parse(await entry.async('string'))}else data=JSON.parse(await file.text());const imported=validateImport(data);if(!confirm('Replace your current local travel planner database with this backup? Export your existing data first.'))return;mutate(()=>{state=imported});selectedPlaceId=null;selectedEventId=null;setTheme();renderAll();restoreMapView();refreshMap();toast('Backup successfully restored')}catch(e){toast('Restore failed: '+e.message,true);console.error(e)}}
function wire(){
$('newTrip').onclick=()=>openTripEditor();$('editTrip').onclick=()=>openTripEditor(trip().id);
$('tripSelect').onchange=e=>{state.prefs.tripId=e.target.value;state.prefs.selectedAreaId=null;state.prefs.selectedDate=getTripUI().startDate;state.prefs.mapFilter='all';selectedEventId=null;selectedPlaceId=null;scheduleSave();renderAll();restoreMapView();refreshMap()};
$('undoBtn').onclick=undoChange;$('redoBtn').onclick=redoChange;$('scheduleUndoBtn').onclick=undoChange;$('scheduleRedoBtn').onclick=redoChange;
$('selectModeBtn').onclick=()=>{cancelActivityDrag();saveTripUI({timetableMode:'select'})};$('moveModeBtn').onclick=()=>saveTripUI({timetableMode:'move'});$('pngExportBtn').onclick=()=>openTimetableExport('png');$('pdfExportBtn').onclick=()=>openTimetableExport('pdf');
$('themeBtn').onclick=()=>{state.prefs.theme=state.prefs.theme==='dark'?'light':'dark';setTheme();scheduleSave()};
$('exportBtn').onclick=openExport;$('importBtn').onclick=()=>$('importFile').click();$('importFile').onchange=e=>{importFile(e.target.files[0]);e.target.value=''};
$('prevDate').onclick=()=>switchDate(-1);$('nextDate').onclick=()=>switchDate(1);
 $('todayBtn').onclick=()=>{const today=dateStr(new Date());if(state.prefs.view==='week')getTripUI().startDate=today;setPref('selectedDate',today)};
 $('focusDate').onchange=e=>{if(!e.target.value)return;if(state.prefs.view==='week'){getTripUI().startDate=e.target.value;setPref('selectedDate',e.target.value)}else setPref('selectedDate',e.target.value)};
 $('visibleDays').onchange=e=>{const n=Number(e.target.value);if(!Number.isInteger(n)||n<1||n>15){toast('Choose an integer from 1 to 15 days',true);e.target.value=getTripUI().visibleDays;return}saveTripUI({visibleDays:n})};
 $('snapMinutes').onchange=e=>saveTripUI({snapMinutes:Number(e.target.value)});
 $('showPlaces').onchange=e=>saveTripUI({showPlaces:e.target.checked});
 $('showMap').onchange=e=>saveTripUI({showMap:e.target.checked});
 $('resetLayout').onclick=()=>{saveTripUI({layout:{places:20,timetable:45,map:35},showPlaces:true,showMap:true});$('workspaceMenu').open=false;toast('Workspace layout reset')};
 $('categoryManager').onclick=openCategoryManager;$('addActivityToolbar').onclick=()=>openEventEditor();
 $('manageCategoriesView').onclick=()=>{$('workspaceMenu').open=false;openCategoryManager()};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setPref('view',b.dataset.view));
$('addPlaceManual').onclick=()=>openPlaceEditor();$('placeFilter').oninput=renderPlaces;$('placeCategoryFilter').onchange=renderPlaces;
$('searchBtn').onclick=searchMap;$('searchPlace').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();searchMap()}};
$('mapFilter').onchange=e=>{if(e.target.value==='area'&&!selectedArea()){toast('Select a saved area first');e.target.value=state.prefs.mapFilter;return}setPref('mapFilter',e.target.value)};
$('navMode').onclick=()=>setMode('navigate');$('pinMode').onclick=()=>setMode('pin');$('areaMode').onclick=()=>setMode('area');$('fitPins').onclick=fitAllPins;
$('clearArea').onclick=()=>{state.prefs.selectedAreaId=null;state.prefs.mapFilter='all';scheduleSave();renderAll();refreshMap();fitAllPins()};
$('retryMap').onclick=()=>{if(map){for(const marker of markers.values())marker.remove();markers.clear();map.remove();map=null}initMap()};setupDrawTool();
$('mobileItinerary').onclick=()=>setMobileTab('itinerary');$('mobilePlaces').onclick=()=>setMobileTab('places');$('mobileMap').onclick=()=>setMobileTab('map');
$('modalRoot').addEventListener('click',e=>{if(e.target.closest('[data-close-modal]'))closeModal()});
$('calendar').addEventListener('click',e=>{if(e.target.closest('[data-action]')||e.target.closest('#quickAddEvent'))return;if(getTripUI().timetableMode==='select'){if(selectedEventId)clearActivitySelection();return}const dayHeader=e.target.closest('.dayhead');if(dayHeader){setPref('selectedDate',dayHeader.closest('.daycol').dataset.date);return}const col=e.target.closest('.daycol');if(!col)return;const y=e.clientY-col.getBoundingClientRect().top-40;const min=Math.min(1425,Math.max(0,Math.floor(y/HOUR*4)*15));openEventEditor(null,{date:col.dataset.date,time:pad(Math.floor(min/60))+':'+pad(min%60)})});
$('calendar').addEventListener('dragover',e=>{if(e.target.closest('.daycol'))e.preventDefault()});
$('calendar').addEventListener('drop',e=>{const col=e.target.closest('.daycol');if(!col)return;e.preventDefault();let item;try{item=JSON.parse(e.dataTransfer.getData('text/plain'))}catch{return}const y=e.clientY-col.getBoundingClientRect().top-40;const mins=Math.min(1425,Math.max(0,Math.floor(y/HOUR*4)*15));assignDropped(item,col.dataset.date,pad(Math.floor(mins/60))+':'+pad(mins%60))});
// Existing event blocks use pointer interactions instead of native HTML drag-and-drop.
$('placeList').addEventListener('dragstart',e=>{const node=e.target.closest('.place-card');if(node){e.dataTransfer.setData('text/plain',JSON.stringify({placeId:node.dataset.placeId}));e.dataTransfer.effectAllowed='copy'}});
 wireSplitter('splitPlaces');wireSplitter('splitter');wireActivityPointerEvents();
$('selectedActivityBar').addEventListener('click',e=>{const a=e.target.closest('[data-sel-action]')?.dataset.selAction;if(!a||!selectedEventId)return;if(a==='edit'||a==='colour')openEventEditor(selectedEventId);else if(a==='duplicate')duplicateSelectedActivity();else if(a==='delete')deleteSelectedActivity();else if(a==='clear')clearActivitySelection()});
window.addEventListener('resize',()=>map?.resize());
document.addEventListener('click',e=>{if(e.target.closest('a[data-external-map]'))return;const node=e.target.closest('[data-action]');if(node){const a=node.dataset.action,id=node.dataset.id;switch(a){case 'go-place':focusPlace(id);if(window.innerWidth<=700)setMobileTab('map');break;case 'plan-place':openEventEditor(null,{placeId:id});break;case 'edit-place':openPlaceEditor(id);break;case 'open-event':if(Date.now()>dragSuppressUntil){const now=Date.now();if(lastActivityTap?.id===id&&now-lastActivityTap.at<350){lastActivityTap=null;openEventEditor(id)}else{lastActivityTap={id,at:now};selectEvent(id)}}break;case 'open-area':openArea(id);if(window.innerWidth<=700)setMobileTab('map');break;case 'edit-area':openAreaEditor(id);break;case 'delete-area':{const area=state.areas.find(x=>x.id===id);if(area&&confirm(`Delete saved map area “${area.name}”? Pins and itinerary activities will remain.`)){mutate(()=>{state.areas=state.areas.filter(x=>x.id!==id);if(state.prefs.selectedAreaId===id){state.prefs.selectedAreaId=null;state.prefs.mapFilter='all'}})}break}case 'preview-search':{const r=searchResults[+node.dataset.index];if(r)showPreview({name:r.name||r.display_name?.split(',')[0],address:r.display_name,lat:+r.lat,lng:+r.lon});break}case 'save-preview':if(pendingLocation)openPlaceEditor(null,pendingLocation);break;}}else if(e.target.id==='quickAddEvent'){openEventEditor()}});
document.addEventListener('keydown',e=>{const inField=e.target.closest('input,textarea,select,[contenteditable=true]');if(e.key==='Escape'){if(selectedEventId&&!inField&&$('modalRoot').hidden&&!activeActivityDrag){clearActivitySelection();return}if(activeActivityDrag){cancelActivityDrag();return}if(!$('modalRoot').hidden){closeModal();return}if(mapMode!=='navigate'){endDrawing();return}clearSearch()}if(!inField&&$('modalRoot').hidden&&selectedEventId&&(e.key==='Delete'||e.key==='Backspace')){e.preventDefault();deleteSelectedActivity();return}if((e.ctrlKey||e.metaKey)&&!e.altKey&&['z','Z'].includes(e.key)&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();if(e.shiftKey)redoChange();else undoChange()}if((e.ctrlKey||e.metaKey)&&e.key==='y'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();redoChange()}});
}
function setMobileTab(tab){const isMap=tab==='map',isPlaces=tab==='places';$('workspace').classList.toggle('show-map',isMap);$('workspace').classList.toggle('show-places',isPlaces);$('mobileItinerary').classList.toggle('active',!isMap&&!isPlaces);$('mobilePlaces').classList.toggle('active',isPlaces);$('mobileMap').classList.toggle('active',isMap);state.prefs.mobileTab=tab;scheduleSave();if(isMap)setTimeout(()=>map?.resize(),100)}
wire();loadState().then(()=>{if(window.innerWidth<=700)setMobileTab(state.prefs.mobileTab||'itinerary')}).catch(err=>{toast('Initialization failed: '+err.message,true);console.error(err)});
})();
