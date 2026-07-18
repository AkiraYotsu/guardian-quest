// combat.js — Attack, skills, projectiles, dodge, weapon bonuses
// Mother's Rosario is fully implemented in mother_rosario.js (see activateMR()).
function getEffectiveStats(){
  const PL=GS.player,w=getEqWpn();
  return{
    atk:(PL.stats.atk+(w?.atkBonus||0))*(PL.guild?1.03:1)*(GS.berserk?2:1),
    crit:PL.stats.crit+(w?.critBonus||0),
    spd:PL.stats.spd+(w?.spdBonus||0)
  };
}
function doAtk(){
  if(MRS.active)return; // cinematic in progress — no interaction
  if(GS.atkCd>0)return;initAudio();
  const PL=GS.player,{atk:baseAtk,crit}=getEffectiveStats();
  const w=getEqWpn();

  // FIX: Zekken now uses a proper fan-shaped sword swing instead of the
  // old static circular-area hit — see weapon_visual.js.
  if(w?.type==='zekken'){
    if(WSW.active)return; // swing already in progress
    startSwordSwing(GS.lastAngle);
    snd('swordSlash');
    if(!GS.noCooldown)GS.atkCd=480;
    return;
  }

  const ranged=w?.type==='bow'||w?.type==='staff';
  const range=ranged?230:88;snd('atk');
  if(ranged){
    let tgt=null,md=Infinity;
    GS.monsters.forEach(m=>{const d=dist(m.x,m.y,PL.gx,PL.gy);if(d<range&&d<md){md=d;tgt=m;}});
    const tx=tgt?tgt.x:PL.gx+Math.cos(GS.lastAngle)*280;
    const ty=tgt?tgt.y:PL.gy+Math.sin(GS.lastAngle)*280;
    shootProj({x:PL.gx,y:PL.gy},tx,ty,false,baseAtk,'#ffff44');
  }else{
    GS.monsters.forEach(m=>{
      if(dist(m.x,m.y,PL.gx,PL.gy)<range){
        const isCrit=Math.random()*100<crit;
        hitMon(m,Math.max(1,Math.round(baseAtk*(isCrit?1.5:1)-m.def*0.28)+rndI(5)),isCrit);
      }
    });
    addFX(PL.gx,PL.gy,'#ffff44',45,180);addParts(PL.gx,PL.gy,'#ffaa00',6);
  }
  if(!GS.noCooldown){const cd={sword:580,axe:860,bow:480,staff:680,zekken:480};GS.atkCd=cd[w?.type]||580;}
}
function hitMon(m,dmg,crit=false){
  if(!m||m.hp<=0)return;
  m.hp-=dmg;GS.combo++;GS.comboTimer=2500;
  if(GS.combo>=5)questTrack('combo_check',GS.combo);
  spawnDmg(m.x,m.y-m.sz/2-8,crit?`💥${dmg}`:dmg,crit?'#ffaa00':'#ffffff');
  addParts(m.x,m.y,m.color,4);snd(crit?'crit':'atk');
  checkEnrage(m);if(m.hp<=0)onMonKill(m);
}
function onMonKill(m){
  const PL=GS.player,gE=PL.guild?1.05:1,gG=PL.guild?1.10:1;
  gainEXP(Math.round(m.exp*gE));PL.gold+=Math.round(m.gold*gG);
  addParts(m.x,m.y,m.color,14);spawnDmg(m.x,m.y,'EXP+'+m.exp,'#00ff8c');
  questTrack('kill',1);checkQuestGold();
  if(Math.random()<0.09){
    const drop=WDROPS[rndI(WDROPS.length)];
    if(!PL.weapons.find(w=>w.id===drop.id)){
      PL.weapons.push({...drop,eq:false});notify(`🎁 Dropped: ${drop.emoji} ${drop.name}!`);snd('pickup');
    }
  }
  hubRefresh();savePL();
}

// useSk can be called while joystick is active; skill buttons never block movement.
function useSk(sid){
  if(MRS.active){notify("🌺 Mother's Rosario in progress...");return;}
  const sk=SKILLS[sid];if(!sk)return;

  // ── Mother's Rosario: hand off entirely to the dedicated cinematic module ──
  if(sid==='motherRosario'){
    initAudio();
    const{atk:baseAtk}=getEffectiveStats();
    activateMR(baseAtk);
    return;
  }

  initAudio();
  const PL=GS.player;
  const lv=PL.skLv[sid]||1;
  const cd=GS.noCooldown?0:(GS.skCds[sid]||0);
  if(cd>0){notify('Skill on cooldown!');return;}
  const mc=Math.max(1,sk.mc-Math.floor(lv/5));
  if(PL.stats.mana<mc){notify('Not enough MP!');return;}
  PL.stats.mana-=mc;
  if(!GS.noCooldown)GS.skCds[sid]=sk.cd;
  snd('skill');questTrack('skill',1);

  const{atk:baseAtk,crit}=getEffectiveStats();
  const atkVal=baseAtk*getSkillDmgMult(sid,lv);
  const aoeR=(sk.ar||sk.r)+(lv-1)*4;
  if(sk.aoe){
    GS.monsters.forEach(m=>{
      if(dist(m.x,m.y,PL.gx,PL.gy)<aoeR){
        const isCrit=Math.random()*100<crit;
        hitMon(m,Math.max(1,Math.round(atkVal*(isCrit?1.5:1)-m.def*0.25)),isCrit);
        if(sk.slows)m.slowT=3200;
      }
    });
    addFX(PL.gx,PL.gy,sk.color,aoeR,550);addParts(PL.gx,PL.gy,sk.color,22);
  }else if(sk.pc){
    const cnt=sk.pc+(lv>4?Math.floor(lv/10):0),spread=20*Math.PI/180;
    for(let i=0;i<cnt;i++){
      const a=GS.lastAngle+(i-(cnt-1)/2)*spread;
      shootProj({x:PL.gx,y:PL.gy},PL.gx+Math.cos(a)*sk.r,PL.gy+Math.sin(a)*sk.r,false,atkVal,sk.color);
    }
  }else{
    let tgt=null,md=Infinity;
    GS.monsters.forEach(m=>{const d=dist(m.x,m.y,PL.gx,PL.gy);if(d<sk.r&&d<md){md=d;tgt=m;}});
    if(tgt){
      const isCrit=Math.random()*100<crit;
      hitMon(tgt,Math.max(1,Math.round(atkVal*(isCrit?1.5:1)-tgt.def*0.25)),isCrit);
      addFX(tgt.x,tgt.y,sk.color,55,320);addParts(tgt.x,tgt.y,sk.color,16);
    }else{
      shootProj({x:PL.gx,y:PL.gy},PL.gx+Math.cos(GS.lastAngle)*sk.r,PL.gy+Math.sin(GS.lastAngle)*sk.r,false,atkVal,sk.color);
    }
  }
  notify(`⚡ ${sk.name}!`);updateGHUD();
}

function shootProj(from,tx,ty,isMon=false,dmg=20,color='#ffff44'){
  const dx=tx-from.x,dy=ty-from.y,d=Math.hypot(dx,dy);if(d===0)return;
  GS.projs.push({x:from.x,y:from.y,vx:(dx/d)*310,vy:(dy/d)*310,
    dmg:Math.round(dmg+Math.random()*4),isMon,color,sz:8,life:2000,trail:[]});
}
function updProjs(dt){
  const PL=GS.player,{crit}=getEffectiveStats();
  GS.projs=GS.projs.filter(p=>{
    p.trail.push({x:p.x,y:p.y});if(p.trail.length>6)p.trail.shift();
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt*1000;
    const tx=Math.floor(p.x/TS),ty=Math.floor(p.y/TS);
    if(tx<0||ty<0||tx>=MW||ty>=MH||GS.MAP[ty]?.[tx]===T.WALL){addParts(p.x,p.y,p.color,5);return false;}
    if(p.isMon){
      if(dist(p.x,p.y,PL.gx,PL.gy)<18&&!GS.isDodging){
        const dmg=Math.max(1,p.dmg-Math.floor(PL.stats.def*0.28));
        PL.stats.hp-=dmg;GS.combo=0;GS.noDmgRoom=false;
        spawnDmg(PL.gx,PL.gy-20,dmg,'#ff4444');
        addParts(p.x,p.y,'#ff4444',5);shakeScr();snd('hit');
        if(PL.stats.hp<=0){PL.stats.hp=0;showDead();}
        updateGHUD();return false;
      }
    }else{
      for(const m of GS.monsters){
        if(dist(p.x,p.y,m.x,m.y)<m.sz/2+5){
          const isCrit=Math.random()*100<crit;
          hitMon(m,isCrit?Math.round(p.dmg*1.5):p.dmg,isCrit);
          addParts(p.x,p.y,p.color,8);return false;
        }
      }
    }
    return p.life>0;
  });
}
function doDodge(){
  if(MRS.active)return;
  if(GS.dgCd>0&&!GS.noCooldown){notify(`Dodge CD: ${(GS.dgCd/1000).toFixed(1)}s`);return;}
  GS.isDodging=true;GS.dodgeTimer=380;if(!GS.noCooldown)GS.dgCd=3000;
  GS.combo=0;addParts(GS.player.gx,GS.player.gy,'#aaddff',12);snd('dodge');notify('💨 Dodge!');
}
