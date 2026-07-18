// auth.js — Login, register, save, load + admin account seed
// Backend: MongoDB via api_connector.js (replaces Google Sheets)
const DB_KEY='GQ_DB_v2';
const dbGet=()=>JSON.parse(localStorage.getItem(DB_KEY)||'{"u":{}}');
const dbSet=d=>localStorage.setItem(DB_KEY,JSON.stringify(d));

function buildAdminPlayer(){
  // Compute expNext for level 87
  let xn=100;for(let i=1;i<87;i++)xn=Math.round(xn*1.55);
  const skLv={};Object.keys(SKILLS).forEach(s=>{skLv[s]=1;});
  skLv['violetFlash']=50;skLv['swordDance']=50;skLv['motherRosario']=50;
  return{
    name:'Yuuki',class:'warrior',cn:'Swordman',em:'🗡️',
    color:'#9944ff',gender:'female',skinStyle:'purple_red',
    level:87,exp:0,expNext:xn,sp:0,gold:314453,
    stats:{hp:7484,maxHp:7484,atk:617,def:876,spd:64,crit:72,mana:1478,maxMana:1478},
    grow:{hp:22,atk:4,def:5,spd:0.4,crit:0.5,mana:5},
    spAlloc:{hp:0,atk:0,def:0,spd:0,crit:0,mana:0},
    weapons:[{id:'zekken_blade',name:'Zekken',emoji:'🗡️',type:'zekken',rarity:'legendary',
      atkBonus:300,spdBonus:25,critBonus:10,color:'#bb44ff',eq:true}],
    eqType:'zekken',skLv,
    guild:{name:'Sleeping Knight',rank:'Legendary',level:10,members:7,leader:'Yuuki'},
    items:{hp_sm:10,hp_lg:5,mp_sm:10,mp_lg:5,elixir:3,revive:2,atk_gem:1,def_gem:1,spd_gem:1,crit_gem:1},
    activeRevive:false,quests:null,dp:{},isAdmin:true
  };
}

function seedAdmin(){
  const db=dbGet();
  const key='yuuki konno';
  if(!db.u[key]){
    db.u[key]={pw:'Zekken',pl:buildAdminPlayer(),created:Date.now()};
    dbSet(db);
  }
}

function migratePlayer(pl){
  if(!pl||!pl.stats)return null;
  pl.items=pl.items||{hp_sm:2,hp_lg:0,mp_sm:1,mp_lg:0,elixir:0,revive:0,atk_gem:0,def_gem:0,spd_gem:0,crit_gem:0};
  pl.quests=pl.quests||null;pl.activeRevive=pl.activeRevive||false;
  pl.guild=pl.guild||null;pl.dp=pl.dp||{};pl.skLv=pl.skLv||{};
  pl.sp=pl.sp||0;pl.gold=pl.gold||0;
  pl.spAlloc=pl.spAlloc||{hp:0,atk:0,def:0,spd:0,crit:0,mana:0};
  pl.weapons=pl.weapons||[];pl.eqType=pl.eqType||'sword';
  pl.grow=pl.grow||{hp:15,atk:3,def:3,spd:0.4,crit:0.5,mana:5};
  pl.gender=pl.gender||'male';pl.skinStyle=pl.skinStyle||'default';
  Object.keys(SKILLS).forEach(s=>{if(!pl.skLv[s])pl.skLv[s]=1;});
  const itemKeys=['hp_sm','hp_lg','mp_sm','mp_lg','elixir','revive','atk_gem','def_gem','spd_gem','crit_gem'];
  itemKeys.forEach(k=>{if(pl.items[k]===undefined)pl.items[k]=0;});
  const def={hp:100,maxHp:100,atk:20,def:10,spd:5,crit:5,mana:60,maxMana:60};
  Object.keys(def).forEach(k=>{if(pl.stats[k]===undefined)pl.stats[k]=def[k];});
  if(!pl.weapons.length){
    const cls=CLASSES.find(c=>c.id===pl.class)||CLASSES[0];
    pl.weapons=[{id:'starter_'+cls.sw,...WDATA[cls.sw],atkBonus:6,rarity:'common',eq:true}];
    pl.eqType=cls.sw;
  }
  pl.weapons.forEach(w=>{
    if(!w.emoji&&WDATA[w.type])w.emoji=WDATA[w.type].emoji;
    if(!w.name&&WDATA[w.type])w.name=WDATA[w.type].name;
    if(w.atkBonus===undefined)w.atkBonus=0;
    if(!w.rarity)w.rarity='common';
  });
  if(!pl.weapons.find(w=>w.eq))pl.weapons[0].eq=true;
  pl.eqType=pl.weapons.find(w=>w.eq)?.type||'sword';
  return pl;
}

function savePL(){
  if(!GS.currentUser||!GS.player)return;
  const db=dbGet();if(db.u[GS.currentUser])db.u[GS.currentUser].pl=GS.player;dbSet(db);
  // Save to MongoDB backend (fire-and-forget, localStorage is the primary local cache)
  if(typeof MongoDB!=='undefined'){
    MongoDB.savePlayer(GS.currentUser,GS.player).then(res=>{
      if(!res.ok&&!res.offline)console.warn('MongoDB save failed:',res.msg||res);
    });
  }
}
async function doLogin(){
  const u=el('lu').value.trim().toLowerCase(),p=el('lp').value;
  el('le').textContent='';
  if(!u||!p){el('le').textContent='Fill all fields';return;}
  const db=dbGet();
  let rec=null,fromMongo=false;
  // Try MongoDB backend first
  if(typeof MongoDB!=='undefined'){
    el('le').textContent='Connecting...';
    const remote=await MongoDB.login(u,p);
    el('le').textContent='';
    if(remote.ok){
      rec={pw:p,pl:remote.player||null,created:remote.createdAt,last:remote.lastLoginAt};
      fromMongo=true;
      db.u[u]=rec;dbSet(db);
    }else if(!remote.offline){
      // Online but rejected (wrong password etc) — show error immediately
      el('le').textContent=remote.msg||'Wrong username or password';return;
    }
    // offline → fall through to localStorage
  }
  if(!rec){
    rec=db.u[u];
    if(!rec||!(rec.pw===p||rec.pw===btoa(p))){el('le').textContent='Wrong username or password';return;}
  }
  GS.currentUser=u;GS.player=migratePlayer(rec.pl)||null;
  GS.adminMode=!!(GS.player?.isAdmin);
  GS.isImmortal=false;GS.noCooldown=false;GS.unlockAll=false;
  db.u[u].last=Date.now();dbSet(db);snd('menu');
  if(!GS.player){showScr('charScreen');buildClassCards();}
  else{showScr('hubScreen');hubRefresh();if(fromMongo)notify('☁️ Loaded from MongoDB');}
}
async function doReg(){
  const u=el('ru').value.trim().toLowerCase(),p=el('rp').value,p2=el('rp2').value;
  el('re').textContent='';
  if(!u||!p){el('re').textContent='Fill all fields';return;}
  if(u.length<3){el('re').textContent='Username ≥ 3 chars';return;}
  if(p.length<4){el('re').textContent='Password ≥ 4 chars';return;}
  if(p!==p2){el('re').textContent='Passwords do not match';return;}
  const db=dbGet();if(db.u[u]){el('re').textContent='Username already taken';return;}
  // Register to MongoDB backend
  if(typeof MongoDB!=='undefined'){
    el('re').textContent='Creating account...';
    const remote=await MongoDB.register(u,p);
    el('re').textContent='';
    if(!remote.ok&&!remote.offline){el('re').textContent=remote.msg||'Registration failed';return;}
  }
  db.u[u]={pw:p,pl:null,created:Date.now()};dbSet(db);
  notify('✅ Account created! Login to play.');swTab('login');el('lu').value=u;
}
function doLogout(){
  savePL();GS.currentUser=null;GS.player=null;
  GS.adminMode=false;GS.isImmortal=false;GS.noCooldown=false;GS.unlockAll=false;
  showScr('loginScreen');
}
function swTab(t){
  el('tabLogin').classList.toggle('on',t==='login');
  el('tabReg').classList.toggle('on',t==='reg');
  el('fLogin').style.display=t==='login'?'block':'none';
  el('fReg').style.display=t==='reg'?'block':'none';
}
