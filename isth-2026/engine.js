/* ISTH 2026 Congress - per-room show-call engine (shared).
   Each room page sets window.__ROOM (room title) before loading this script.
   Pulls the shared ../sessions.json, filters to the room, groups by day. */
(function(){
const ROOM = window.__ROOM || 'TBC';
const SLUG = window.__SLUG || ROOM.toLowerCase().replace(/[^a-z0-9]+/g,'-');
const EVENT_NAME = 'ISTH 2026 Congress';
const VENUE = 'Paris Expo Porte de Versailles';
const DATA_URL = './sessions.json';
const CREW_URL = './crew.json';
const NTFY_TOPIC = 'gass-isth-2026-'+SLUG+'-offset';
const NTFY = 'https://ntfy.sh/'+NTFY_TOPIC;
const OFFKEY = 'schedOffset:'+NTFY_TOPIC;

let SESSIONS=[];      // this room's sessions
let DAYS=[];          // sorted distinct date strings (YYYY-MM-DD)
let curDay=null;
let OFFSET=parseInt(localStorage.getItem(OFFKEY)||'0',10)||0;
let followLive=localStorage.getItem('followLive')!=='0';
let lastFocusKey=null;
let CREW=null;

const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function pad(n){return String(n).padStart(2,'0');}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function dateParts(d){const[y,m,da]=d.split('-').map(Number);return{y,m,da};}
function wd(d){const{y,m,da}=dateParts(d);return new Date(y,m-1,da).getDay();}
function dayLabel(d){const{m,da}=dateParts(d);return WD[wd(d)]+' '+da;}
function daySub(d){const{m}=dateParts(d);return MO[m-1];}
// absolute instant for an ISO string (carries +02:00 Paris offset), plus offset minutes
function absMs(iso){return new Date(iso).getTime()+OFFSET*60000;}
// Paris wall-clock HH:MM from ISO + offset
function wall(iso){
  let mins=parseInt(iso.slice(11,13),10)*60+parseInt(iso.slice(14,16),10)+OFFSET;
  mins=((mins%1440)+1440)%1440;
  return pad(Math.floor(mins/60))+':'+pad(mins%60);
}
function todayParis(){
  // current date in Europe/Paris as YYYY-MM-DD
  try{const f=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'});return f.format(new Date());}
  catch(e){return new Date().toISOString().slice(0,10);}
}

function buildShell(){
  document.title = ROOM+' - '+EVENT_NAME;
  document.body.innerHTML = `
  <header><div class="head-inner">
    <div class="brandrow">
      <img class="logo" src="/agenda/logo.png" alt="gassProductions">
      <div class="clock"><span id="clock">--:--</span><small id="clockdate">Paris time</small></div>
    </div>
    <div class="kicker"><a href="./">${esc(EVENT_NAME)}</a> &nbsp;•&nbsp; All rooms</div>
    <h1 id="roomName">${esc(ROOM)}</h1>
    <div class="event-meta" id="event-meta"></div>
    <div id="crewPanel" class="crewpanel" hidden>
      <select id="crewSelect"><option value="">Select your name…</option></select>
      <div id="crewCalls" class="crewcalls"></div>
    </div>
    <div class="divider"></div>
    <div class="days" id="days"></div>
    <div class="offsetbar">
      <button type="button" id="offMinus" aria-label="Reduce by 1 minute">−</button>
      <input type="number" id="offset" inputmode="numeric" step="1" value="0">
      <button type="button" id="offPlus" aria-label="Add 1 minute">+</button>
      <span>min</span>
      <button type="button" id="offReset" class="reset">Reset</button>
      <span class="offset-note ok" id="offNote">On schedule</span>
      <label class="followtog"><input type="checkbox" id="followLive"> Auto-scroll to live</label>
      <span class="sync" id="syncState">connecting…</span>
    </div>
  </div></header>
  <div class="updated"><span class="dot"></span><span id="updated">Live - auto-refreshing</span></div>
  <main id="timeline"></main>
  <footer>Run of Show by <b>gassProductions</b> • Live Event &amp; Creative Video Production<br>
  ${esc(EVENT_NAME)} • ${esc(VENUE)} • 11-15 July 2026 • This page updates automatically.</footer>`;
}

function renderMeta(){
  const meta=[];
  meta.push(`<span>📍 <b>${esc(VENUE)}</b></span>`);
  meta.push(`<span>📅 <b>11-15 July 2026</b></span>`);
  if(CREW && CREW.length) meta.push(`<span>On-site: <button type="button" class="crewbtn" id="crewBtn">Call times ▾</button></span>`);
  document.getElementById('event-meta').innerHTML=meta.join('');
}

function renderDays(){
  const t=todayParis();
  document.getElementById('days').innerHTML=DAYS.map(d=>
    `<button type="button" class="day${d===curDay?' active':''}${d===t?' today':''}" data-day="${d}">`+
    `${dayLabel(d)}<small>${daySub(d)}</small></button>`).join('');
}

function renderTimeline(){
  const now=Date.now();
  const segs=SESSIONS.filter(s=>s.s.slice(0,10)===curDay)
    .map(s=>({...s,_a:absMs(s.s),_b:absMs(s.e)}))
    .sort((a,b)=>a._a-b._a);

  let liveIdx=-1,nextIdx=-1;
  let started=-1;
  for(let i=0;i<segs.length;i++){ if(segs[i]._a<=now) started=i; }
  const lastEnd=segs.length?segs[segs.length-1]._b:null;
  if(started===-1){ nextIdx=segs.findIndex(s=>now<s._a); }
  else if(lastEnd&&now>=lastEnd){ liveIdx=-1;nextIdx=-1; }
  else { liveIdx=started; nextIdx=(liveIdx+1<segs.length)?liveIdx+1:-1; }
  const focusIdx=liveIdx!==-1?liveIdx:nextIdx;

  const tl=document.getElementById('timeline');
  if(!segs.length){ tl.innerHTML=`<div class="empty">No sessions in <b>${esc(ROOM)}</b> on this day.</div>`; return; }
  tl.innerHTML=segs.map((s,i)=>{
    const isLive=i===liveIdx,isNext=i===nextIdx,isDone=now>=s._b;
    const cls=['seg']; if(isLive)cls.push('live'); else if(isDone)cls.push('done');
    let badge=''; if(isLive)badge='<div class="badge live">● Live now</div>'; else if(isNext)badge='<div class="badge next">Up next</div>';
    const showId=/^[A-Za-z]/.test(String(s.id));
    const dur=Math.round((new Date(s.e)-new Date(s.s))/60000);
    return `<div class="${cls.join(' ')}"${i===focusIdx?' id="focus-seg"':''}>
      <div class="time-col">
        <div class="time-start">${wall(s.s)}</div>
        <div class="time-end">→ ${wall(s.e)}</div>
        ${dur>0?`<div class="dur">${dur} min</div>`:''}
      </div>
      <div class="info">
        ${showId?`<div class="seg-id">${esc(s.id)}</div>`:''}
        <div class="seg-head"><div class="seg-title">${esc(s.t)}</div>${badge}</div>
        ${s.type?`<div class="seg-type">${esc(s.type)}</div>`:''}
      </div>
    </div>`;
  }).join('');

  const fk=(focusIdx>=0&&segs[focusIdx])?(curDay+'|'+segs[focusIdx].s+'|'+segs[focusIdx].t):null;
  if(followLive && curDay===todayParis() && fk && fk!==lastFocusKey){
    const el=document.getElementById('focus-seg');
    if(el) el.scrollIntoView({behavior:'smooth',block:'center'});
    lastFocusKey=fk;
  }
}

function render(){ renderMeta(); renderDays(); renderTimeline(); }

function tickClock(){
  try{const f=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
    document.getElementById('clock').textContent=f.format(new Date());}
  catch(e){const n=new Date();document.getElementById('clock').textContent=pad(n.getHours())+':'+pad(n.getMinutes())+':'+pad(n.getSeconds());}
}

async function load(){
  try{
    const res=await fetch(DATA_URL+'?t='+Date.now(),{cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    const all=await res.json();
    SESSIONS=all.filter(s=>s.room===ROOM);
    DAYS=[...new Set(SESSIONS.map(s=>s.s.slice(0,10)))].sort();
    if(!DAYS.length) DAYS=['2026-07-11'];
    const t=todayParis();
    if(!curDay) curDay = DAYS.includes(t)?t:DAYS[0];
    if(!DAYS.includes(curDay)) curDay=DAYS[0];
    render();
    const n=new Date();
    document.getElementById('updated').textContent='Live - last checked '+pad(n.getHours())+':'+pad(n.getMinutes())+':'+pad(n.getSeconds());
  }catch(e){
    document.getElementById('timeline').innerHTML='<div class="err">Could not load programme data ('+e.message+').</div>';
  }
}

function updateNote(){
  const note=document.getElementById('offNote'); if(!note)return;
  if(OFFSET>0){note.textContent='Running '+OFFSET+' min behind - times adjusted';note.className='offset-note late';}
  else if(OFFSET<0){note.textContent=Math.abs(OFFSET)+' min ahead - times adjusted';note.className='offset-note late';}
  else{note.textContent='On schedule';note.className='offset-note ok';}
}
function setSync(t,ok){const el=document.getElementById('syncState');if(el){el.textContent=t;el.className='sync'+(ok?' on':'');}}
function applyOffset(pub){localStorage.setItem(OFFKEY,String(OFFSET));updateNote();renderTimeline();if(pub)fetch(NTFY,{method:'POST',body:String(OFFSET)}).catch(()=>{});}
function applyRemote(v){if(v===OFFSET)return;OFFSET=v;localStorage.setItem(OFFKEY,String(OFFSET));const inp=document.getElementById('offset');if(inp&&document.activeElement!==inp)inp.value=OFFSET;updateNote();renderTimeline();}

function wireUp(){
  const inp=document.getElementById('offset'); inp.value=OFFSET;
  inp.addEventListener('input',()=>{OFFSET=Math.round(Number(inp.value)||0);applyOffset(true);});
  document.getElementById('offMinus').addEventListener('click',()=>{OFFSET-=1;inp.value=OFFSET;applyOffset(true);});
  document.getElementById('offPlus').addEventListener('click',()=>{OFFSET+=1;inp.value=OFFSET;applyOffset(true);});
  document.getElementById('offReset').addEventListener('click',()=>{OFFSET=0;inp.value=OFFSET;applyOffset(true);});
  const ft=document.getElementById('followLive'); ft.checked=followLive;
  ft.addEventListener('change',()=>{followLive=ft.checked;localStorage.setItem('followLive',followLive?'1':'0');if(followLive){lastFocusKey=null;renderTimeline();}});
  document.getElementById('days').addEventListener('click',e=>{const b=e.target.closest('.day');if(b){curDay=b.dataset.day;lastFocusKey=null;render();}});
  document.getElementById('event-meta').addEventListener('click',e=>{if(e.target.closest('.crewbtn')){const p=document.getElementById('crewPanel');p.hidden=!p.hidden;}});
  updateNote();
}

function initSync(){
  setSync('connecting…',false);
  fetch(NTFY+'/json?poll=1&since=12h').then(r=>r.text()).then(t=>{
    const lines=t.trim().split('\n').filter(Boolean);
    for(let i=lines.length-1;i>=0;i--){try{const m=JSON.parse(lines[i]);if(m.event==='message'&&m.message!=null){applyRemote(Math.round(Number(m.message)||0));break;}}catch(e){}}
  }).catch(()=>{});
  try{const es=new EventSource(NTFY+'/sse');
    es.onopen=()=>setSync('synced with crew',true);
    es.onerror=()=>setSync('reconnecting…',false);
    es.onmessage=ev=>{try{const m=JSON.parse(ev.data);if(m.event==='message'&&m.message!=null)applyRemote(Math.round(Number(m.message)||0));}catch(e){}};
  }catch(e){setSync('offline - local only',false);}
}

async function initCrew(){
  try{
    const r=await fetch(CREW_URL+'?t='+Date.now(),{cache:'no-store'}); if(!r.ok)return;
    const d=await r.json(); CREW=Array.isArray(d.crew)&&d.crew.length?d.crew:null; if(!CREW)return;
    const sel=document.getElementById('crewSelect');
    sel.innerHTML='<option value="">Select your name…</option>'+CREW.map((p,i)=>`<option value="${i}">${esc(p.name)}</option>`).join('');
    sel.addEventListener('change',()=>renderCrew(sel.value));
    renderMeta();
  }catch(e){}
}
function renderCrew(idx){
  const wrap=document.getElementById('crewCalls');
  if(idx===''||idx==null||!CREW){wrap.innerHTML='';return;}
  const p=CREW[+idx]; if(!p){wrap.innerHTML='';return;}
  let html=p.phone?`<div class="crew-phone">${esc(p.phone)}</div>`:'';
  html+=(p.calls||[]).map(c=>{
    const role=[esc(c.role||''),c.room?esc(c.room):''].filter(Boolean).join(' · ');
    return `<div class="crewcall"><div class="cc-when">${esc(c.date)} · ${esc(c.start)} - ${esc(c.end)}</div>${role?`<div class="cc-role">${role}</div>`:''}${c.note?`<div class="cc-note">${esc(c.note)}</div>`:''}</div>`;
  }).join('')||'<div class="crew-empty">No calls listed.</div>';
  wrap.innerHTML=html;
}

buildShell();
wireUp();
tickClock(); setInterval(tickClock,1000);
load(); initCrew(); initSync();
setInterval(load,60000);
setInterval(renderTimeline,30000);
})();
