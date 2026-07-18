// state.js
const TS=32,MW=22,MH=15;
const T={FLOOR:0,WALL:1,STAIRS:2,CHEST:3};
const GS={
  currentUser:null,player:null,dungeonState:null,
  canvas:null,ctx:null,GW:0,GH:0,camX:0,camY:0,
  monsters:[],projs:[],parts:[],fxList:[],dmgNums:[],chests:[],
  skCds:{},atkCd:0,dgCd:0,isDodging:false,dodgeTimer:0,
  berserk:false,berserkT:0,combo:0,comboTimer:0,
  MAP:null,curRoom:1,totRooms:6,roomOK:false,noDmgRoom:true,lastAngle:0,
  RAF:null,lastT:0,resizeAdded:false,
  keys:{},joy:{on:false,dx:0,dy:0},joyTouching:false,
  audioCtx:null,paused:false,
  lvupAnim:{active:false,timer:0,level:0},
  bossIntro:{active:false,timer:0,phase:'show',bossX:0,bossY:0},
  showPerf:false,
  preBossShown:false,
  // Admin flags
  adminMode:false,
  isImmortal:false,
  noCooldown:false,
  unlockAll:false
};
const el=id=>document.getElementById(id);
const txt=(id,v)=>{const e=el(id);if(e)e.textContent=v;};
const pct=(id,v,max)=>{const e=el(id);if(e)e.style.width=clamp(v/max*100,0,100)+'%';};
const dist=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const rnd=(mn,mx)=>mn+Math.random()*(mx-mn);
const rndI=n=>Math.floor(Math.random()*n);
const clamp=(v,mn,mx)=>Math.max(mn,Math.min(mx,v));
const cap=s=>s[0].toUpperCase()+s.slice(1);
let _nt=null;
function notify(msg,color){
  const n=el('notif');if(!n)return;
  n.textContent=msg;n.style.borderColor=color||'var(--gold)';
  n.classList.add('show');clearTimeout(_nt);
  _nt=setTimeout(()=>n.classList.remove('show'),2600);
}
function openMod(id){const e=el(id);if(e)e.classList.add('on');}
function closeMod(id){const e=el(id);if(e)e.classList.remove('on');}
function showScr(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const t=el(id);if(t)t.classList.add('active');
}
function shakeScr(){
  const w=el('gWrap');if(!w)return;
  w.style.animation='none';void w.offsetWidth;
  w.style.animation='shake .18s ease-out';
  setTimeout(()=>w.style.animation='',220);
}
let _cfmOK=null,_cfmCancel=null;
function showConfirm(title,msg,okLabel,cancelLabel,onOK,onCancel){
  txt('cfmTitle',title);txt('cfmMsg',msg);
  txt('cfmOK',okLabel||'OK');txt('cfmCancel',cancelLabel||'Cancel');
  _cfmOK=onOK;_cfmCancel=onCancel;openMod('mConfirm');
}
function cfmDoOK(){closeMod('mConfirm');if(_cfmOK)_cfmOK();}
function cfmDoCancel(){closeMod('mConfirm');if(_cfmCancel)_cfmCancel();}
let _promptDone=null;
function showPrompt(title,placeholder,onDone){
  txt('promptTitle',title);
  const inp=el('promptInp');if(inp){inp.value='';inp.placeholder=placeholder||'';}
  _promptDone=onDone;openMod('mPrompt');
  setTimeout(()=>{const i=el('promptInp');if(i)i.focus();},100);
}
function promptDoOK(){const val=(el('promptInp')?.value||'').trim();closeMod('mPrompt');if(_promptDone)_promptDone(val);}
function promptDoCancel(){closeMod('mPrompt');if(_promptDone)_promptDone(null);}
