// sheets_connector.js - Google Sheets Web App connector.
// Replace SHEETS_WEBAPP_URL after deploying the Apps Script in google-apps-script/Code.gs.
const SHEETS_WEBAPP_URL='https://script.google.com/macros/s/AKfycbzcYr8MqedU48dcVXbWF3v4xojEjuuZgwpFb1DHZXT8GBhNTbVtoV8ORqhOcwK6QH08/exec';

const SheetsDB={
  enabled(){
    return typeof SHEETS_WEBAPP_URL==='string'&&
      SHEETS_WEBAPP_URL.startsWith('https://script.google.com/macros/s/');
  },

  jsonp(params,timeout=12000){
    if(!this.enabled())return Promise.resolve({ok:false,offline:true,msg:'Sheets URL not configured'});
    return new Promise(resolve=>{
      const cb='gqSheetsCb_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const url=new URL(SHEETS_WEBAPP_URL);
      Object.entries(params||{}).forEach(([k,v])=>url.searchParams.set(k,v==null?'':String(v)));
      url.searchParams.set('callback',cb);
      const script=document.createElement('script');
      let done=false;
      const finish=res=>{
        if(done)return;done=true;
        clearTimeout(to);
        try{delete window[cb];}catch(e){window[cb]=undefined;}
        script.remove();
        resolve(res||{ok:false,msg:'Empty Sheets response'});
      };
      const to=setTimeout(()=>finish({ok:false,timeout:true,msg:'Sheets request timed out'}),timeout);
      window[cb]=finish;
      script.onerror=()=>finish({ok:false,msg:'Sheets request failed'});
      script.src=url.toString();
      document.head.appendChild(script);
    });
  },

  postNoCors(params){
    if(!this.enabled())return Promise.resolve({ok:false,offline:true,msg:'Sheets URL not configured'});
    const body=new URLSearchParams();
    Object.entries(params||{}).forEach(([k,v])=>body.set(k,v==null?'':String(v)));
    return fetch(SHEETS_WEBAPP_URL,{method:'POST',mode:'no-cors',body})
      .then(()=>({ok:true,opaque:true}))
      .catch(err=>({ok:false,msg:err?.message||'Sheets POST failed'}));
  },

  register(username,password){
    return this.jsonp({action:'register',username,password});
  },

  login(username,password){
    return this.jsonp({action:'login',username,password});
  },

  getPlayer(username){
    return this.jsonp({action:'getPlayer',username});
  },

  savePlayer(username,player){
    const payload=this.buildPlayerPayload(username,player);
    return this.postNoCors({
      action:'savePlayer',
      username,
      playerJson:JSON.stringify(player||{}),
      payloadJson:JSON.stringify(payload)
    });
  },

  buildPlayerPayload(username,player){
    const stats=player?.stats||{};
    const dungeon=GS.dungeonState||null;
    const inGame=el('gameScreen')?.classList.contains('active');
    const inHub=el('hubScreen')?.classList.contains('active');
    const status=!player?'no_character':stats.hp<=0?'defeated':inGame?'in_dungeon':inHub?'hub':'active';
    return{
      username,
      savedAt:new Date().toISOString(),
      account:{
        username,
        status,
        isAdmin:!!player?.isAdmin
      },
      character:{
        name:player?.name||'',
        classId:player?.class||'',
        className:player?.cn||'',
        gender:player?.gender||'',
        level:player?.level||0,
        exp:player?.exp||0,
        expNext:player?.expNext||0,
        statPoints:player?.sp||0,
        gold:player?.gold||0
      },
      stats:{
        hp:stats.hp||0,
        maxHp:stats.maxHp||0,
        mana:stats.mana||0,
        maxMana:stats.maxMana||0,
        atk:stats.atk||0,
        def:stats.def||0,
        spd:stats.spd||0,
        crit:stats.crit||0
      },
      dungeon:{
        id:dungeon?.id||'',
        name:dungeon?.name||'',
        currentFloor:GS.curRoom||1,
        totalFloors:GS.totRooms||0,
        roomCleared:!!GS.roomOK,
        noDamageRoom:!!GS.noDmgRoom
      },
      inventory:{
        items:player?.items||{},
        weapons:player?.weapons||[],
        equippedType:player?.eqType||''
      },
      progression:{
        skills:player?.skLv||{},
        quests:player?.quests||null,
        guild:player?.guild||null,
        dungeonProgress:player?.dp||{}
      },
      runtime:{
        activeRevive:!!player?.activeRevive,
        adminFlags:{
          adminMode:!!GS.adminMode,
          isImmortal:!!GS.isImmortal,
          noCooldown:!!GS.noCooldown,
          unlockAll:!!GS.unlockAll
        }
      }
    };
  }
};
