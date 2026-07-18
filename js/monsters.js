// monsters.js — Monster factory, AI (FIX #4: reduced boss damage+tick)
function mkMon(type,x,y,sc=1){
  const t=MDATA[type];if(!t)return null;
  const hp=Math.round(t.hp*sc);
  return{id:Math.random().toString(36).substr(2,8),type,name:t.name,x,y,sz:t.sz,
    color:t.color,hp,maxHp:hp,atk:Math.round(t.atk*sc),def:t.def,spd:t.spd,
    exp:Math.round(t.exp*sc),gold:Math.round(t.gold*sc),
    ai:t.ai,boss:t.boss||false,enraged:false,atkCd:0,aiT:0,slowT:0,phase:'norm',erDx:0,erDy:0};
}
function spawnMons(){
  GS.monsters=[];const DS=GS.dungeonState;if(!DS)return;
  const isBoss=GS.curRoom===GS.totRooms;
  const scale=1+(GS.curRoom-1)*0.18;
  if(isBoss){
    const bt=MDATA[DS.boss];if(!bt)return;
    GS.monsters.push(mkMon(DS.boss,MW*TS/2,MH*TS*0.22,scale));return;
  }
  const cnt=3+rndI(4);const px=GS.player.gx,py=GS.player.gy;
  for(let i=0;i<cnt;i++){
    const mt=DS.mons[rndI(DS.mons.length)];
    let mx,my,att=0;
    do{mx=TS*(3+Math.random()*(MW-6));my=TS*(3+Math.random()*(MH-6));att++;}
    while((dist(mx,my,px,py)<160||isWallXY(mx,my))&&att<40);
    if(isWallXY(mx,my)){mx=TS*8;my=TS*4;}
    const m=mkMon(mt,mx,my,scale);if(m)GS.monsters.push(m);
  }
}
function isWallXY(wx,wy){
  const tx=Math.floor(wx/TS),ty=Math.floor(wy/TS);
  if(tx<0||ty<0||tx>=MW||ty>=MH)return true;
  return!GS.MAP[ty]||GS.MAP[ty][tx]===T.WALL;
}
function updMons(dt){
  const PL=GS.player;
  GS.monsters.forEach(m=>{
    if(!m||m.hp<=0)return;
    if(m.introFrozen)return; // boss-room intro grace period — no AI yet
    const d=dist(m.x,m.y,PL.gx,PL.gy);
    m.atkCd=Math.max(0,m.atkCd-dt*1000);
    m.aiT=Math.max(0,m.aiT-dt*1000);
    if(m.slowT>0)m.slowT-=dt*1000;
    const sp=m.spd*(m.slowT>0?0.28:1);
    switch(m.ai){
      case'agg':if(d<380){_mvTow(m,PL.gx,PL.gy,sp,dt);if(d<m.sz/2+16&&m.atkCd<=0)monAtk(m);}break;
      case'tank':if(d<300){_mvTow(m,PL.gx,PL.gy,sp*0.6,dt);if(d<m.sz/2+18&&m.atkCd<=0)monAtk(m);}break;
      case'err':
        if(d<420){
          if(m.aiT<=0){m.erDx=(Math.random()-.5)*2;m.erDy=(Math.random()-.5)*2;m.aiT=rnd(350,750);}
          const edx=m.erDx+(PL.gx-m.x)*0.004,edy=m.erDy+(PL.gy-m.y)*0.004,em=Math.hypot(edx,edy);
          if(em>0){m.x+=(edx/em)*sp*dt;m.y+=(edy/em)*sp*dt;}
          if(d<m.sz/2+14&&m.atkCd<=0)monAtk(m);
        }break;
      case'pass':if(d<180)_mvTow(m,PL.gx*2-m.x,PL.gy*2-m.y,sp*0.5,dt);break;
      case'boss':
        if(m.aiT<=0){m.phase=Math.random()<0.35?'charge':'norm';m.aiT=m.phase==='charge'?1400:2600;}
        _mvTow(m,PL.gx,PL.gy,sp*(m.phase==='charge'?2.5:1),dt);
        if(d<m.sz/2+18&&m.atkCd<=0)monAtk(m);
        // Boss ranged attack (less frequent)
        if(d<360&&m.atkCd<=0&&Math.random()<0.015)
          shootProj({x:m.x,y:m.y},PL.gx,PL.gy,true,m.atk*0.5,m.color);
        break;
    }
    m.x=clamp(m.x,TS*2,MW*TS-TS*2);m.y=clamp(m.y,TS*2,MH*TS-TS*2);
  });
  GS.monsters=GS.monsters.filter(m=>m.hp>0);
}
function _mvTow(e,tx,ty,sp,dt){
  const dx=tx-e.x,dy=ty-e.y,d=Math.hypot(dx,dy);
  if(d>0){e.x+=(dx/d)*sp*dt;e.y+=(dy/d)*sp*dt;}
}
function monAtk(m){
  const PL=GS.player;
  // FIX #4: Boss attacks slower (longer cooldown)
  m.atkCd=m.boss?2200:1700;
  if(GS.isDodging){spawnDmg(PL.gx,PL.gy-20,'DODGE!','#00ccff');snd('dodge');return;}
  if(GS.isImmortal){spawnDmg(PL.gx,PL.gy-20,'IMMUNE','#ffd84d');return;}
  GS.combo=0;GS.noDmgRoom=false;
  const base=Math.max(1,m.atk-Math.floor(PL.stats.def*0.55))*(PL.guild?1.05:1);
  const dmg=Math.max(1,Math.round(base+Math.random()*4));
  PL.stats.hp-=dmg;
  spawnDmg(PL.gx,PL.gy-22,dmg,'#ff4444');
  addParts(PL.gx,PL.gy,'#ff4444',5);shakeScr();snd('hit');
  if(PL.stats.hp<=0){PL.stats.hp=0;showDead();}
  updateGHUD();
}
function checkEnrage(m){
  if(m.boss&&!m.enraged&&m.hp<=m.maxHp*0.5){
    m.enraged=true;m.spd=Math.round(m.spd*1.5);m.atk=Math.round(m.atk*1.3);
    addFX(m.x,m.y,'#ff2200',65,800);addParts(m.x,m.y,'#ff2200',22);
    notify(`⚠️ ${m.name} ENRAGED!`);snd('boss');
  }
}
