// ═══════════════════════════════════════════════════════════════
// mother_rosario.js — Mother's Rosario Ultimate Cinematic Skill
// ═══════════════════════════════════════════════════════════════
//  Self-contained module: owns its own state (MRS), update loop,
//  full-screen cinematic renderer, and SFX.
//
//  Flow: enter → windup → stabs(x9) → xslash → charge → blink → impact → outro
//  Damage: 9×25% (stab) + 1×60% (X-slash) + 1×135% (impact AoE) = 11 hits
//  Cost:   350 MP | Limit: once per dungeon floor
//
//  Damage model: the combo LOCKS onto the nearest monster (for aim/facing/
//  dash-target purposes). Damage itself is hitbox-based AoE — anyone
//  caught in a stab, the X-slash, or the final explosion takes that hit's
//  damage tier, not just the locked target.
//
//  Lock-on is ACTIVE, not fixed: if the locked target dies mid-combo, the
//  skill re-acquires the next-nearest alive monster (see _mrReacquireTarget)
//  so the closing charge+blink (hit #11) always aims at something alive.
// ═══════════════════════════════════════════════════════════════

const MRS = {
  active:false, phase:'idle', phaseTimer:0,
  baseDmg:0, totalDmg:0,
  // Camera
  camX:0, camY:0, zoom:1.0,
  camEntryX:0, camTargetX:0, camTargetY:0,
  // UI / screen fx
  uiAlpha:1.0, vigAlpha:0.0, impactFlash:0,
  // Player anim
  target:null, facingAngle:0,
  startX:0, startY:0, animOffX:0, animOffY:0, chargeGlow:0,
  // Explosion anchor (target's position — where hit #11 detonates)
  explosionX:0, explosionY:0,
  // Combo tracking
  stabCount:0, stabTimer:0, xSlashHit:false, impactHit:false,
  blinkSfxFired:false,
  // Visual fx pools
  fx:[], stabLines:[], slashArcs:[], blinkTrail:[], distortLines:[], smoke:[], hitFx:[],
  shockR:0, shockAlpha:0,
  // Floor-gated cooldown
  floorUsed:false, currentFloor:-1,
};

const MR_DUR = { enter:900, windup:650, stabs:1485, xslash:680, charge:1350, blink:220, impact:800, outro:1300 };
const MR_STAB_IV = 165;
const MR_MANA    = 350;
const MR_ENTER_ZOOM_DUR = 180; // fast zoom-punch BEFORE the left→right pan starts

// Cached DOM refs (queried once, reused every frame)
let _mrUiTop=null, _mrUiBottom=null, _mrUiHint=null, _mrDomCached=false;
function _mrCacheDom(){
  if(_mrDomCached)return;
  _mrUiTop=document.querySelector('.hud-top');
  _mrUiBottom=document.querySelector('.hud-bottom');
  _mrUiHint=document.querySelector('.ctrl-hint');
  _mrDomCached=true;
}

// ─── HIT-TEST HELPERS (AoE hitboxes, not single-target) ──────────
function _mrHitTestLine(px,py,angle,len,halfWidth,mx,my,mRadius){
  const dx=Math.cos(angle), dy=Math.sin(angle);
  const vx=mx-px, vy=my-py;
  const proj=vx*dx+vy*dy;
  if(proj<-mRadius||proj>len+mRadius)return false;
  const perp=Math.abs(vx*(-dy)+vy*dx);
  return perp<=(halfWidth+mRadius);
}
function _mrHitTestRadius(cx,cy,r,mx,my,mRadius){
  return dist(cx,cy,mx,my)<=(r+mRadius);
}

// ─── DYNAMIC TARGET LOCK ────────────────────────────────────────
// If the current lock-on is dead (or was never real), reacquire the
// nearest alive monster from the player's CURRENT position and repoint
// facingAngle at it. Called at the start of every stab, the X-slash, and
// again right before the charge phase so combo #11 never chases a corpse.
function _mrReacquireTarget(){
  const PL=GS.player;
  const cur=MRS.target;
  if(cur&&!cur.dummy&&cur.hp>0)return; // still valid, nothing to do
  let tgt=null,md=Infinity;
  GS.monsters.forEach(m=>{
    if(m.hp>0){const d=dist(m.x,m.y,PL.gx,PL.gy);if(d<md){md=d;tgt=m;}}
  });
  if(tgt){
    MRS.target=tgt;
    MRS.facingAngle=Math.atan2(tgt.y-PL.gy,tgt.x-PL.gx);
  }
  // else: nothing alive left — keep the stale reference as a positional
  // fallback so the remaining animation still has somewhere to aim.
}

// ─── ACTIVATION ─────────────────────────────────────────────────
function canUseMR(){
  const PL=GS.player;
  if(!PL||MRS.active)return false;
  if(PL.stats.mana<MR_MANA){notify('Not enough MP! (350 required)');return false;}
  if(MRS.floorUsed&&MRS.currentFloor===GS.curRoom){notify("🌺 Mother's Rosario: Once per floor!");return false;}
  return true;
}

function activateMR(baseDmg){
  if(!canUseMR())return;
  initAudio();
  _mrCacheDom();
  const PL=GS.player;
  PL.stats.mana-=MR_MANA;
  let tgt=null,md=Infinity;
  GS.monsters.forEach(m=>{if(m.hp>0){const d=dist(m.x,m.y,PL.gx,PL.gy);if(d<md){md=d;tgt=m;}}});
  if(!tgt)tgt={x:PL.gx+120,y:PL.gy,hp:1,maxHp:1,sz:20,def:0,dummy:true};

  MRS.active=true; MRS.phase='enter'; MRS.phaseTimer=MR_DUR.enter;
  MRS.baseDmg=baseDmg; MRS.totalDmg=0; MRS.target=tgt;
  MRS.startX=PL.gx; MRS.startY=PL.gy;
  MRS.facingAngle=Math.atan2(tgt.y-PL.gy,tgt.x-PL.gx);
  MRS.camTargetX=PL.gx-GS.GW/2; MRS.camTargetY=PL.gy-GS.GH/2;
  MRS.camEntryX=MRS.camTargetX-GS.GW*1.6;
  MRS.camX=MRS.camEntryX; MRS.camY=MRS.camTargetY; MRS.zoom=1.0;
  MRS.uiAlpha=1.0; MRS.vigAlpha=0.0; MRS.impactFlash=0;
  MRS.explosionX=tgt.x; MRS.explosionY=tgt.y;
  MRS.stabCount=0; MRS.stabTimer=0; MRS.xSlashHit=false; MRS.impactHit=false;
  MRS.blinkSfxFired=false;
  MRS.animOffX=0; MRS.animOffY=0; MRS.chargeGlow=0;
  MRS.fx=[]; MRS.stabLines=[]; MRS.slashArcs=[]; MRS.blinkTrail=[]; MRS.distortLines=[]; MRS.smoke=[]; MRS.hitFx=[];
  MRS.shockR=0; MRS.shockAlpha=0;
  MRS.floorUsed=true; MRS.currentFloor=GS.curRoom;
  GS.skCds['motherRosario']=9999999;

  GS.joy.on=false; GS.joy.dx=0; GS.joy.dy=0;
  const jIn=el('jIn'); if(jIn){jIn.style.left='50%';jIn.style.top='50%';}

  const wrap=el('gWrap'); if(wrap)wrap.classList.add('mr-cinematic');
  updateGHUD(); _mrSfx_zing();
}

function mrResetFloorCd(){ MRS.floorUsed=false; GS.skCds['motherRosario']=0; }

// ─── UPDATE LOOP ────────────────────────────────────────────────
function mrUpdate(dt){
  if(!MRS.active)return;
  MRS.phaseTimer-=dt*1000;
  MRS.fx=MRS.fx.filter(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.92;p.vy*=0.92;p.life-=dt*1000;return p.life>0;});
  MRS.stabLines=MRS.stabLines.filter(l=>{l.life-=dt*1000;return l.life>0;});
  MRS.slashArcs=MRS.slashArcs.filter(a=>{a.life-=dt*1000;return a.life>0;});
  MRS.hitFx=MRS.hitFx.filter(h=>{h.life-=dt*1000;return h.life>0;});
  MRS.smoke=MRS.smoke.filter(s=>{
    s.x+=s.vx*dt; s.y+=s.vy*dt;
    s.vx*=0.97; s.vy-=6*dt; s.vy*=0.97;
    s.r+=s.growRate*dt;
    s.life-=dt*1000;
    return s.life>0;
  });
  if(MRS.shockR>0){
    MRS.shockR+=230*dt; MRS.shockAlpha=Math.max(0,MRS.shockAlpha-dt*2.5);
    if(MRS.shockAlpha<=0)MRS.shockR=0;
  }
  if(MRS.impactFlash>0)MRS.impactFlash=Math.max(0,MRS.impactFlash-dt*3.2);
  MRS.distortLines=MRS.distortLines.filter(l=>{l.r+=(l.maxR-l.r)*dt*5;l.life-=dt*1000;return l.life>0;});

  switch(MRS.phase){
    case'enter': _mr_enter(dt); break;
    case'windup':_mr_windup(dt);break;
    case'stabs': _mr_stabs(dt); break;
    case'xslash':_mr_xslash(dt);break;
    case'charge':_mr_charge(dt);break;
    case'blink': _mr_blink(dt); break;
    case'impact':_mr_impact(dt);break;
    case'outro': _mr_outro(dt); break;
  }
  _mrSyncUIOpacity();
}

function _mrNextPhase(p){ MRS.phase=p; MRS.phaseTimer=MR_DUR[p]||500; }

// Phase 1: zoom-in punch finishes FIRST, then (and only then) the left→right
// camera pan begins — kept sequential so they don't visually collide.
function _mr_enter(dt){
  const elapsed=MR_DUR.enter-MRS.phaseTimer;
  const zoomDur=MR_ENTER_ZOOM_DUR;
  const panDur=MR_DUR.enter-zoomDur;

  if(elapsed<zoomDur){
    const zp=elapsed/zoomDur;
    const zEase=1-Math.pow(1-zp,4);
    MRS.zoom=1.0+0.30*zEase;
    MRS.camX=MRS.camEntryX;
    MRS.camY=MRS.camTargetY;
    MRS.vigAlpha=zp*0.32;
    MRS.uiAlpha=Math.max(0,1-zp*3);
  }else{
    const pp=clamp((elapsed-zoomDur)/panDur,0,1);
    const ease=1-Math.pow(1-pp,3.4);
    MRS.camX=MRS.camEntryX+(MRS.camTargetX-MRS.camEntryX)*ease;
    MRS.camY=MRS.camTargetY;
    MRS.zoom=1.30+0.05*pp;
    MRS.vigAlpha=0.32+pp*0.43;
    MRS.uiAlpha=0;
  }
  if(MRS.phaseTimer<=0){MRS.uiAlpha=0;_mrNextPhase('windup');}
}

function _mr_windup(dt){
  const p=1-clamp(MRS.phaseTimer/MR_DUR.windup,0,1);
  MRS.zoom=1.35+0.08*Math.sin(p*Math.PI);
  MRS.vigAlpha=0.7+0.08*Math.sin(Date.now()*0.006);
  MRS.animOffX=Math.cos(MRS.facingAngle)*7*p;
  MRS.animOffY=Math.sin(MRS.facingAngle)*7*p;
  if(MRS.phaseTimer<=0){MRS.stabCount=0;MRS.stabTimer=0;_mrNextPhase('stabs');}
}

function _mr_stabs(dt){
  MRS.stabTimer-=dt*1000;
  MRS.vigAlpha=0.65+0.12*Math.sin(Date.now()*0.018);
  if(MRS.stabTimer<=0&&MRS.stabCount<9){_mrDoStab();MRS.stabCount++;MRS.stabTimer=MR_STAB_IV;}
  const frac=MRS.stabTimer/MR_STAB_IV;
  const lunge=Math.sin((1-frac)*Math.PI)*24;
  MRS.animOffX=Math.cos(MRS.facingAngle)*lunge;
  MRS.animOffY=Math.sin(MRS.facingAngle)*lunge;
  if(MRS.stabCount>=9&&MRS.stabTimer<=40){
    MRS.animOffX=0;MRS.animOffY=0;_mrNextPhase('xslash');_mrSfx_swing();
  }
}

function _mrDoStab(){
  _mrReacquireTarget(); // stay locked on someone ALIVE for facing purposes
  const PL=GS.player;
  const baseAngle=MRS.facingAngle;
  const side=(MRS.stabCount%2===0)?1:-1;
  const jitterAngle=baseAngle+side*rnd(0.08,0.18)+rnd(-0.04,0.04);
  const perp=jitterAngle+Math.PI/2;
  const perpOff=side*rnd(4,10);
  const ox=PL.gx+MRS.animOffX+Math.cos(jitterAngle)*10+Math.cos(perp)*perpOff;
  const oy=PL.gy+MRS.animOffY+Math.sin(jitterAngle)*10+Math.sin(perp)*perpOff;
  const maxLen=rnd(58,78);
  const hitHalfWidth=16;

  const dmg=Math.max(1,Math.round(MRS.baseDmg*0.25));
  GS.monsters.forEach(m=>{
    if(m.hp<=0)return;
    if(_mrHitTestLine(ox,oy,jitterAngle,maxLen,hitHalfWidth,m.x,m.y,m.sz/2)){
      const isCrit=Math.random()*100<(PL.stats.crit||5);
      const final=isCrit?Math.round(dmg*1.5):dmg;
      m.hp-=final; MRS.totalDmg+=final;
      spawnDmg(m.x,m.y-m.sz/2-8,isCrit?`💜${final}`:final,'#cc44ff');
      if(m.hp<=0)onMonKill(m);
      _mrFx(m.x,m.y,'#aa44ff',3,180);
      _mrSpawnHitCross(m.x,m.y);
    }
  });
  _mrSfx_stab();

  const advanceDist=rnd(10,16);
  const extendDur=50, advanceDur=85, fadeDur=170;
  MRS.stabLines.push({
    ox,oy,angle:jitterAngle,maxLen,advanceDist,
    extendDur,advanceDur,fadeDur,
    life:extendDur+advanceDur+fadeDur, maxLife:extendDur+advanceDur+fadeDur
  });

  const px2=PL.gx+Math.cos(MRS.facingAngle)*28;
  const py2=PL.gy+Math.sin(MRS.facingAngle)*28;
  _mrFx(px2,py2,'#cc44ff',4,200);
}

function _mr_xslash(dt){
  const p=1-MRS.phaseTimer/MR_DUR.xslash;
  if(p<0.3){
    const sp=p/0.3;
    MRS.animOffX=Math.cos(MRS.facingAngle)*20*sp;
    MRS.animOffY=Math.sin(MRS.facingAngle)*20*sp;
  }else{
    const sp=(p-0.3)/0.7;
    MRS.animOffX=-Math.cos(MRS.facingAngle)*28*sp;
    MRS.animOffY=-Math.sin(MRS.facingAngle)*28*sp;
  }
  if(p>0.22&&!MRS.xSlashHit){MRS.xSlashHit=true;_mrDoXSlash();}
  if(MRS.phaseTimer<=0){
    const PL=GS.player;
    // FIX: dash-back is now longer (real "runway" before the charge-dash-in)
    // and wall-safe — steps incrementally and stops at the first wall/edge
    // it would otherwise cross, instead of an instant unguarded position jump.
    _mrDashBack(PL,MRS.facingAngle,95);
    MRS.startX=PL.gx; MRS.startY=PL.gy;
    MRS.animOffX=0; MRS.animOffY=0;
    _mrReacquireTarget(); // guarantee combo #11 aims at something alive
    _mrNextPhase('charge'); _mrSfx_charge();
  }
}

function _mrDoXSlash(){
  _mrReacquireTarget();
  const PL=GS.player;
  const ox=PL.gx+MRS.animOffX, oy=PL.gy+MRS.animOffY;
  const maxLen=155;
  const hitR=maxLen*0.72;

  const dmg=Math.max(1,Math.round(MRS.baseDmg*0.60));
  GS.monsters.forEach(m=>{
    if(m.hp<=0)return;
    if(_mrHitTestRadius(ox,oy,hitR,m.x,m.y,m.sz/2)){
      const isCrit=Math.random()*100<(PL.stats.crit||5);
      const final=isCrit?Math.round(dmg*1.5):dmg;
      m.hp-=final; MRS.totalDmg+=final;
      spawnDmg(m.x,m.y-25,isCrit?`💜${final}`:final,'#ff44ff');
      addFX(m.x,m.y,'#bb44ff',40,380);
      _mrFx(m.x,m.y,'#cc44ff',4,350);
      _mrSpawnHitSlash(m.x,m.y,MRS.facingAngle+rnd(-0.3,0.3));
      if(m.hp<=0)onMonKill(m);
    }
  });
  addFX(ox,oy,'#bb44ff',60,400);

  MRS.slashArcs.push({
    x:ox,y:oy,ang:MRS.facingAngle,
    burstDur:70,holdDur:140,fadeDur:260,
    life:470,maxLife:470,maxLen
  });
}

// Wall-safe backward dash: steps incrementally, stops at the last valid
// position instead of tunneling through a wall or off the map edge.
function _mrDashBack(PL,angle,distance){
  const steps=14;
  const dx=-Math.cos(angle)*(distance/steps);
  const dy=-Math.sin(angle)*(distance/steps);
  const hs=13;
  for(let i=0;i<steps;i++){
    const nx=PL.gx+dx, ny=PL.gy+dy;
    const blocked=isWall(nx-hs,ny-hs)||isWall(nx+hs,ny-hs)||isWall(nx-hs,ny+hs)||isWall(nx+hs,ny+hs);
    if(blocked)break;
    PL.gx=nx; PL.gy=ny;
  }
}

function _mr_charge(dt){
  const p=1-MRS.phaseTimer/MR_DUR.charge;
  MRS.chargeGlow=p;
  MRS.vigAlpha=0.65+0.22*Math.sin(Date.now()*0.024*p);
  MRS.zoom=1.35+0.25*p;
  const PL=GS.player;
  const tcx=PL.gx-GS.GW/2, tcy=PL.gy-GS.GH/2;
  MRS.camX+=(tcx-MRS.camX)*dt*2.2;
  MRS.camY+=(tcy-MRS.camY)*dt*2.2;
  if(Math.random()<0.45){
    const a=Math.random()*Math.PI*2, r=30+Math.random()*55;
    _mrFx(PL.gx+Math.cos(a)*r,PL.gy+Math.sin(a)*r,'#cc44ff',2+Math.random()*3,
      300+Math.random()*400,-Math.cos(a)*70,-Math.sin(a)*70);
  }
  if(!MRS.blinkSfxFired && MRS.phaseTimer<=MR_DUR.charge-350){
    MRS.blinkSfxFired=true;
    _mrSfx_blink();
  }
  if(MRS.phaseTimer<=0){
    _mrReacquireTarget(); // final safety check right before the dash itself
    _mrNextPhase('blink'); _mrSfx_swing();
  }
}

// FIX: resolves the blink's final landing spot only — passes through
// anything between the player and the target (intentional, "menembus"),
// but if the intended overshoot point itself is inside a wall or past the
// map border, walks the distance back toward the target until it finds
// solid ground instead of leaving the player stuck/out of bounds.
function _mrResolveBlinkLanding(tx, ty, angle, maxOvershoot){
  const hs=13;
  const isValid=(x,y)=>!isWall(x-hs,y-hs)&&!isWall(x+hs,y-hs)&&!isWall(x-hs,y+hs)&&!isWall(x+hs,y+hs);
  const steps=12;
  for(let i=steps;i>=0;i--){
    const d=maxOvershoot*(i/steps);
    const x=tx+Math.cos(angle)*d, y=ty+Math.sin(angle)*d;
    if(isValid(x,y))return{x,y};
  }
  return{x:tx,y:ty}; // fallback: land exactly on the target itself
}

function _mr_blink(dt){
  const PL=GS.player;
  MRS.blinkTrail.push({x:PL.gx+MRS.animOffX,y:PL.gy+MRS.animOffY});
  if(!MRS.impactHit&&MRS.target&&MRS.target.x!==undefined){
    const overshoot=38;
    const land=_mrResolveBlinkLanding(MRS.target.x,MRS.target.y,MRS.facingAngle,overshoot);
    PL.gx=land.x; PL.gy=land.y;
    MRS.camX=PL.gx-GS.GW/2; MRS.camY=PL.gy-GS.GH/2;
  }
  if(MRS.phaseTimer<=0){_mrNextPhase('impact');_mrDoImpact();}
}

function _mr_impact(dt){
  const p=1-MRS.phaseTimer/MR_DUR.impact;
  MRS.zoom=Math.max(1.15,1.55-p*0.45);
  MRS.vigAlpha=Math.max(0,0.7*(1-p));
  if(MRS.phaseTimer<=0)_mrNextPhase('outro');
}

function _mrDoImpact(){
  const PL=GS.player, tgt=MRS.target;
  const ex=tgt.x, ey=tgt.y;
  MRS.explosionX=ex; MRS.explosionY=ey;

  const dmg=Math.max(1,Math.round(MRS.baseDmg*1.35));
  const hitR=120;
  GS.monsters.forEach(m=>{
    if(m.hp<=0)return;
    if(_mrHitTestRadius(ex,ey,hitR,m.x,m.y,m.sz/2)){
      const isCrit=Math.random()*100<(PL.stats.crit||5);
      const final=isCrit?Math.round(dmg*1.5):dmg;
      m.hp-=final; MRS.totalDmg+=final;
      spawnDmg(m.x,m.y-m.sz/2-10,isCrit?`🌺 CRIT! ${final}`:`🌺 ${final}`,'#ff44ff');
      _mrSpawnHitGlow(m.x,m.y);
      if(m.hp<=0)onMonKill(m);
    }
  });

  MRS.impactHit=true;
  MRS.impactFlash=1.0;
  MRS.shockR=15; MRS.shockAlpha=1.0;
  for(let i=0;i<10;i++){const a=(i/10)*Math.PI*2;MRS.distortLines.push({a,r:15,maxR:90+Math.random()*60,life:650});}
  _mrFx(ex,ey,'#cc44ff',5,600);
  for(let i=0;i<14;i++)_mrFx(ex,ey,i%2===0?'#dd44ff':'#ffffff',3+Math.random()*4,400+Math.random()*450);
  addFX(ex,ey,'#bb44ff',130,900);
  _mrSpawnSmoke(ex,ey,26); // doubled+ (was 12)
  shakeScr(); _mrSfx_boom();
}

function _mr_outro(dt){
  const p=1-MRS.phaseTimer/MR_DUR.outro;
  MRS.zoom=Math.max(1.0,1.15-p*0.15);
  MRS.uiAlpha=clamp(p*1.5,0,1);
  MRS.vigAlpha=Math.max(0,0.25*(1-p));
  const PL=GS.player;
  const tcx=PL.gx-GS.GW/2, tcy=PL.gy-GS.GH/2;
  MRS.camX+=(tcx-MRS.camX)*dt*2.5;
  MRS.camY+=(tcy-MRS.camY)*dt*2.5;
  GS.camX=MRS.camX; GS.camY=MRS.camY;
  if(MRS.phaseTimer<=0){
    MRS.active=false; MRS.phase='idle';
    GS.camX=tcx; GS.camY=tcy;
    GS.skCds['motherRosario']=0;
    const wrap=el('gWrap'); if(wrap)wrap.classList.remove('mr-cinematic');
    _mrClearUIOpacity();
    notify(`🌺 Mother's Rosario — ${MRS.totalDmg.toLocaleString()} total damage!`,'#cc44ff');
    snd('lvup');
  }
}

// ─── DOM UI fade sync (cached refs) ────────────────────────────
function _mrSyncUIOpacity(){
  const a=MRS.uiAlpha;
  if(_mrUiTop)_mrUiTop.style.opacity=a;
  if(_mrUiBottom)_mrUiBottom.style.opacity=a;
  if(_mrUiHint)_mrUiHint.style.opacity=a*0.6;
}
function _mrClearUIOpacity(){
  if(_mrUiTop)_mrUiTop.style.opacity='';
  if(_mrUiBottom)_mrUiBottom.style.opacity='';
  if(_mrUiHint)_mrUiHint.style.opacity='';
}

// ─── RENDER (full cinematic frame — replaces normal render()) ──
function mrRender(ctx){
  ctx.clearRect(0,0,GS.GW,GS.GH);
  ctx.save();
  const cx=GS.GW/2, cy=GS.GH/2;
  ctx.translate(cx,cy); ctx.scale(MRS.zoom,MRS.zoom); ctx.translate(-cx,-cy);
  ctx.translate(-MRS.camX,-MRS.camY);

  drawMap(ctx);
  drawChests(ctx);
  drawFX(ctx);
  drawProjectiles(ctx);
  drawMonsters(ctx);
  _mrDrawHitFx(ctx);
  _mrDrawPlayer(ctx);
  _mrDrawLocalFx(ctx);
  _mrDrawStabLines(ctx);
  _mrDrawSlashArcs(ctx);
  _mrDrawBlinkTrail(ctx);
  _mrDrawShockwave(ctx);
  _mrDrawSmoke(ctx);
  _mrDrawChargeGlow(ctx);
  drawParticles(ctx);
  drawDmgNums(ctx);

  ctx.restore();

  _mrDrawVignette(ctx);
  _mrDrawImpactFlash(ctx);
  _mrDrawDistortSpokes(ctx);
  _mrDrawTitle(ctx);
}

// ─── SHARED SHAPE HELPERS ───────────────────────────────────────
function _mrLensPath(ctx, angleLocal, len, width){
  const dx=Math.cos(angleLocal), dy=Math.sin(angleLocal);
  const px=-dy, py=dx;
  const hl=len/2;
  ctx.beginPath();
  ctx.moveTo(-dx*hl,-dy*hl);
  ctx.lineTo(px*width,py*width);
  ctx.lineTo(dx*hl,dy*hl);
  ctx.lineTo(-px*width,-py*width);
  ctx.closePath();
}
function _mrSpikePath(ctx, angleLocal, len, baseWidth){
  const dx=Math.cos(angleLocal), dy=Math.sin(angleLocal);
  const px=-dy, py=dx;
  ctx.beginPath();
  ctx.moveTo(px*baseWidth*0.4, py*baseWidth*0.4);
  ctx.lineTo(dx*len*0.15+px*baseWidth, dy*len*0.15+py*baseWidth);
  ctx.lineTo(dx*len, dy*len);
  ctx.lineTo(dx*len*0.15-px*baseWidth, dy*len*0.15-py*baseWidth);
  ctx.lineTo(-px*baseWidth*0.4, -py*baseWidth*0.4);
  ctx.closePath();
}

// ─── PLAYER + WEAPON FX DRAW ────────────────────────────────────
function _mrDrawPlayer(ctx){
  const PL=GS.player;
  const px=PL.gx+MRS.animOffX, py=PL.gy+MRS.animOffY, sz=26;
  if(MRS.phase==='charge')_mrDrawSpinningX(ctx,px,py,MRS.chargeGlow);
  if(MRS.phase==='blink')ctx.globalAlpha=0.6;
  ctx.fillStyle='rgba(0,0,0,.28)'; ctx.beginPath();
  ctx.ellipse(px,py+sz/2-1,sz/2,sz/4,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=PL.color||'#9944ff'; ctx.fillRect(px-sz/2,py-sz/2,sz,sz);
  if(PL.skinStyle==='purple_red'){
    ctx.fillStyle='#ff2244';
    ctx.fillRect(px-sz/2,py+sz*0.28,sz,sz*0.1);
    ctx.fillRect(px-sz/2,py-sz/2,sz*0.12,sz);
  }
  ctx.fillStyle='rgba(255,255,255,.14)'; ctx.fillRect(px-sz/2,py-sz/2,sz,sz*0.3);
  ctx.fillStyle='#fff';
  ctx.fillRect(px-sz*0.22,py-sz*0.18,sz*0.16,sz*0.16);
  ctx.fillRect(px+sz*0.06,py-sz*0.18,sz*0.16,sz*0.16);
  ctx.fillStyle='#000';
  ctx.fillRect(px-sz*0.16,py-sz*0.13,sz*0.09,sz*0.09);
  ctx.fillRect(px+sz*0.10,py-sz*0.13,sz*0.09,sz*0.09);
  ctx.globalAlpha=1;
  const w=getEqWpn();
  if(w?.type==='zekken'){
    const pose=_mrGetSwordPose(PL);
    if(!drawZekkenSword(ctx,pose.px,pose.py,pose.angle)){
      ctx.font='13px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('🗡️',px+sz/2+4,py-sz/2+2);
    }
  }else{
    ctx.font='13px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(w?.emoji||'🗡️',px+sz/2+4,py-sz/2+2);
  }
}

// Full sword choreography across the MR cinematic (Zekken only):
//  windup — drawn back behind the shoulder, blade parallel to the thrust
//           line, poised to lunge ("siap menghunus").
//  stabs  — pommel-to-tip pivot slides between a retracted (behind) and
//           extended (in front) position IN SYNC with the same lunge
//           curve that already drives the player's own forward/back
//           nudge and the stab-line VFX, so the blade visually leads
//           each of the 9 thrusts.
//  xslash — a single fast left→right sweep while stepping back.
//  charge — held up at the back-right shoulder, ready to thrust.
//  blink  — thrust straight out ahead of the dash.
//  impact/outro — eases back to the default idle grip.
function _mrGetSwordPose(PL){
  const facing=MRS.facingAngle;
  const baseX=PL.gx+MRS.animOffX, baseY=PL.gy+MRS.animOffY;

  switch(MRS.phase){
    case'windup':{
      const backOff=15;
      return{px:baseX-Math.cos(facing)*backOff,py:baseY-Math.sin(facing)*backOff,angle:facing};
    }
    case'stabs':{
      const frac=MRS.stabTimer/MR_STAB_IV;
      const lunge=Math.sin((1-frac)*Math.PI); // same curve driving animOffX/Y
      const off=-14+(32-(-14))*lunge; // -14 behind .. +32 thrust out front
      return{px:baseX+Math.cos(facing)*off,py:baseY+Math.sin(facing)*off,angle:facing};
    }
    case'xslash':{
      const p=clamp((MR_DUR.xslash-MRS.phaseTimer)/MR_DUR.xslash,0,1);
      const sweepT=clamp(p*2.4,0,1); // fast left→right sweep in the first ~40%
      const a0=facing-Math.PI/2.3, a1=facing+Math.PI/2.3;
      return{px:baseX+Math.cos(facing)*13,py:baseY+Math.sin(facing)*13,angle:a0+(a1-a0)*sweepT};
    }
    case'charge':{
      const readyAngle=facing-Math.PI*0.62;
      const dirAng=facing+Math.PI*0.78, off=15;
      return{px:baseX+Math.cos(dirAng)*off,py:baseY+Math.sin(dirAng)*off,angle:readyAngle};
    }
    case'blink':{
      return{px:baseX+Math.cos(facing)*30,py:baseY+Math.sin(facing)*30,angle:facing};
    }
    case'impact':{
      return{px:baseX+Math.cos(facing)*30,py:baseY+Math.sin(facing)*30,angle:facing};
    }
    case'outro':{
      const p=clamp((MR_DUR.outro-MRS.phaseTimer)/MR_DUR.outro,0,1);
      const thrust={px:baseX+Math.cos(facing)*30,py:baseY+Math.sin(facing)*30,angle:facing};
      const idle=zekkenIdlePose(PL);
      return{
        px:thrust.px+(idle.px-thrust.px)*p,
        py:thrust.py+(idle.py-thrust.py)*p,
        angle:thrust.angle+(idle.angle-thrust.angle)*p
      };
    }
    default:
      return zekkenIdlePose(PL);
  }
}

function _mrDrawSpinningX(ctx,px,py,glow){
  const t=Date.now()*0.001;
  const cx=px+Math.cos(MRS.facingAngle)*24, cy=py+Math.sin(MRS.facingAngle)*24;

  const haloR=20+glow*13;
  const grad=ctx.createRadialGradient(cx,cy,0,cx,cy,haloR);
  grad.addColorStop(0,`rgba(220,140,255,${0.45*glow+0.12})`);
  grad.addColorStop(1,'rgba(220,140,255,0)');
  ctx.fillStyle=grad;
  ctx.beginPath(); ctx.arc(cx,cy,haloR,0,Math.PI*2); ctx.fill();

  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(t*6.5);
  ctx.globalAlpha=0.6+glow*0.4;
  ctx.fillStyle='#e055ff';
  const len=30, width=2.3;
  _mrLensPath(ctx,Math.PI/4,len,width); ctx.fill();
  _mrLensPath(ctx,-Math.PI/4,len,width); ctx.fill();
  ctx.restore();

  ctx.globalAlpha=1;
  const dotCount=5;
  for(let i=0;i<dotCount;i++){
    const phase=(i/dotCount)*Math.PI*2;
    const orbitR=18+7*Math.sin(t*1.5+i*1.3);
    const ang=t*(2.0+(i%2)*0.5)+phase;
    const dx=cx+Math.cos(ang)*orbitR, dy=cy+Math.sin(ang)*orbitR;
    const twinkle=0.3+0.7*Math.abs(Math.sin(t*3.5+i*1.9));
    ctx.globalAlpha=twinkle*(0.45+glow*0.55);
    ctx.fillStyle='#ffffff';
    ctx.beginPath(); ctx.arc(dx,dy,1.4+twinkle*1.3,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;
}

function _mrDrawStabLines(ctx){
  MRS.stabLines.forEach(l=>{
    const elapsed=l.maxLife-l.life;
    let curLen,offset,alpha;
    if(elapsed<l.extendDur){
      const p=elapsed/l.extendDur;
      curLen=l.maxLen*(1-Math.pow(1-p,2));
      offset=0; alpha=1;
    }else if(elapsed<l.extendDur+l.advanceDur){
      curLen=l.maxLen;
      offset=l.advanceDist*((elapsed-l.extendDur)/l.advanceDur);
      alpha=1;
    }else{
      curLen=l.maxLen; offset=l.advanceDist;
      const fp=(elapsed-l.extendDur-l.advanceDur)/l.fadeDur;
      alpha=Math.max(0,1-fp);
    }
    if(curLen<1||alpha<=0)return;
    const x1=l.ox+Math.cos(l.angle)*offset, y1=l.oy+Math.sin(l.angle)*offset;
    ctx.save();
    ctx.translate(x1,y1);
    ctx.rotate(l.angle);
    ctx.globalAlpha=alpha*0.92;
    ctx.fillStyle='#e055ff';
    ctx.shadowColor='#cc44ff'; ctx.shadowBlur=6;
    _mrSpikePath(ctx,0,curLen,3.4); ctx.fill();
    ctx.shadowBlur=0;
    ctx.globalAlpha=alpha*0.85;
    ctx.strokeStyle='#ffffff'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(curLen*0.92,0); ctx.stroke();
    ctx.restore();
  });
  ctx.globalAlpha=1;
}

function _mrDrawSlashArcs(ctx){
  MRS.slashArcs.forEach(arc=>{
    const elapsed=arc.maxLife-arc.life;
    let lenT,alpha;
    if(elapsed<arc.burstDur){
      const p=elapsed/arc.burstDur;
      lenT=1-Math.pow(1-p,3);
      alpha=Math.min(1,p*2.2);
    }else if(elapsed<arc.burstDur+arc.holdDur){
      lenT=1; alpha=1;
    }else{
      lenT=1;
      const fp=(elapsed-arc.burstDur-arc.holdDur)/arc.fadeDur;
      alpha=Math.max(0,1-fp);
    }
    if(alpha<=0)return;
    const curLen=arc.maxLen*lenT;
    ctx.save();
    ctx.translate(arc.x,arc.y);
    ctx.rotate(arc.ang);
    ctx.globalAlpha=alpha*0.88;
    ctx.fillStyle='#e055ff';
    ctx.shadowColor='#cc44ff'; ctx.shadowBlur=9;
    const armAngles=[Math.PI/4,-Math.PI/4,Math.PI/4+Math.PI,-Math.PI/4+Math.PI];
    armAngles.forEach(aAng=>{ _mrSpikePath(ctx,aAng,curLen,7); ctx.fill(); });
    ctx.shadowBlur=0;
    ctx.globalAlpha=alpha*0.92;
    ctx.strokeStyle='#ffffff'; ctx.lineWidth=1.3;
    ctx.beginPath();
    armAngles.forEach(aAng=>{
      ctx.moveTo(0,0);
      ctx.lineTo(Math.cos(aAng)*curLen*0.94,Math.sin(aAng)*curLen*0.94);
    });
    ctx.stroke();
    ctx.restore();
  });
  ctx.globalAlpha=1;
}
function _mrDrawBlinkTrail(ctx){
  MRS.blinkTrail.forEach((p,i)=>{
    ctx.fillStyle='#cc44ff';
    ctx.globalAlpha=(i/MRS.blinkTrail.length)*0.55;
    ctx.beginPath(); ctx.arc(p.x,p.y,10*(i/MRS.blinkTrail.length),0,Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha=1;
}
function _mrDrawShockwave(ctx){
  if(!MRS.shockR||MRS.shockAlpha<=0)return;
  ctx.strokeStyle='#cc44ff'; ctx.lineWidth=4;
  ctx.globalAlpha=MRS.shockAlpha*0.85;
  ctx.shadowColor='#cc44ff'; ctx.shadowBlur=8;
  ctx.beginPath(); ctx.arc(MRS.explosionX,MRS.explosionY,MRS.shockR,0,Math.PI*2); ctx.stroke();
  ctx.globalAlpha=1; ctx.shadowBlur=0;
}
function _mrDrawSmoke(ctx){
  MRS.smoke.forEach(s=>{
    const a=s.life/s.ml;
    ctx.globalAlpha=a*0.36;
    ctx.fillStyle='#7a3aa8';
    ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha=1;
}
function _mrDrawChargeGlow(ctx){
  if(MRS.phase!=='charge')return;
  const PL=GS.player, g=MRS.chargeGlow;
  const grad=ctx.createRadialGradient(PL.gx,PL.gy,0,PL.gx,PL.gy,55+g*40);
  grad.addColorStop(0,`rgba(187,68,255,${g*0.52})`);
  grad.addColorStop(1,'rgba(187,68,255,0)');
  ctx.fillStyle=grad;
  ctx.beginPath(); ctx.arc(PL.gx,PL.gy,55+g*40,0,Math.PI*2); ctx.fill();
}
function _mrDrawLocalFx(ctx){
  MRS.fx.forEach(p=>{
    ctx.fillStyle=p.color; ctx.globalAlpha=(p.life/p.ml)*0.88;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.sz*(p.life/p.ml),0,Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha=1;
}

// FIX: per-monster hit-reaction flashes — cross-blink for stabs, a single
// slash-cut for the X-slash, and a brief glow-pulse for the explosion.
function _mrDrawHitFx(ctx){
  MRS.hitFx.forEach(h=>{
    const a=h.life/h.ml;
    if(h.type==='cross'){
      const alpha=Math.pow(a,0.6);
      ctx.globalAlpha=alpha;
      ctx.strokeStyle='#e055ff'; ctx.lineWidth=2.5;
      ctx.shadowColor='#cc44ff'; ctx.shadowBlur=6;
      const r=9;
      ctx.beginPath();
      ctx.moveTo(h.x-r,h.y); ctx.lineTo(h.x+r,h.y);
      ctx.moveTo(h.x,h.y-r); ctx.lineTo(h.x,h.y+r);
      ctx.stroke();
      ctx.shadowBlur=0;
    }else if(h.type==='slash'){
      const alpha=Math.pow(a,0.7);
      ctx.globalAlpha=alpha;
      ctx.strokeStyle='#f0aaff'; ctx.lineWidth=2.8;
      ctx.shadowColor='#cc44ff'; ctx.shadowBlur=6;
      const len=16;
      const dx=Math.cos(h.angle)*len, dy=Math.sin(h.angle)*len;
      ctx.beginPath();
      ctx.moveTo(h.x-dx,h.y-dy); ctx.lineTo(h.x+dx,h.y+dy);
      ctx.stroke();
      ctx.shadowBlur=0;
    }else if(h.type==='glow'){
      const t=1-a;
      const pulse=t<0.3?(t/0.3):Math.max(0,1-(t-0.3)/0.7);
      ctx.globalAlpha=pulse*0.8;
      const grad=ctx.createRadialGradient(h.x,h.y,0,h.x,h.y,16);
      grad.addColorStop(0,'rgba(220,140,255,0.9)');
      grad.addColorStop(1,'rgba(220,140,255,0)');
      ctx.fillStyle=grad;
      ctx.beginPath(); ctx.arc(h.x,h.y,16,0,Math.PI*2); ctx.fill();
    }
  });
  ctx.globalAlpha=1;
}

// ─── SCREEN-SPACE OVERLAYS ──────────────────────────────────────
function _mrDrawVignette(ctx){
  const va=MRS.vigAlpha+Math.sin(Date.now()*0.006)*0.06;
  if(va<=0.01)return;
  const W=GS.GW,H=GS.GH,v=clamp(va,0,1);
  const grad=ctx.createRadialGradient(W/2,H/2,H*0.24,W/2,H/2,W*0.78);
  grad.addColorStop(0,'rgba(60,0,100,0)');
  grad.addColorStop(0.7,`rgba(90,0,160,${v*0.55})`);
  grad.addColorStop(1,`rgba(140,20,220,${v})`);
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
}
function _mrDrawImpactFlash(ctx){
  if(MRS.impactFlash<=0)return;
  if(MRS.impactFlash>0.55){
    ctx.fillStyle=`rgba(255,255,255,${(MRS.impactFlash-0.55)*2.2})`;
    ctx.fillRect(0,0,GS.GW,GS.GH);
  }else{
    const g=MRS.impactFlash;
    ctx.fillStyle=`rgba(110,100,120,${g*0.5})`;
    ctx.fillRect(0,0,GS.GW,GS.GH);
  }
}
function _mrDrawDistortSpokes(ctx){
  if(!MRS.distortLines.length)return;
  const cx=GS.GW/2, cy=GS.GH/2;
  const scx=cx+MRS.zoom*(MRS.explosionX-MRS.camX-cx);
  const scy=cy+MRS.zoom*(MRS.explosionY-MRS.camY-cy);
  MRS.distortLines.forEach(l=>{
    const a=l.life/650;
    ctx.strokeStyle='rgba(200,80,255,0.55)';
    ctx.lineWidth=2.5; ctx.globalAlpha=a*0.6;
    ctx.beginPath();
    ctx.moveTo(scx+Math.cos(l.a)*(l.r-8), scy+Math.sin(l.a)*(l.r-8));
    ctx.lineTo(scx+Math.cos(l.a)*l.r, scy+Math.sin(l.a)*l.r);
    ctx.stroke();
  });
  ctx.globalAlpha=1;
}
function _mrDrawTitle(ctx){
  if(!['charge','blink','impact'].includes(MRS.phase))return;
  const a=MRS.phase==='impact'?clamp(MRS.phaseTimer/MR_DUR.impact*1.5,0,1):0.92;
  ctx.globalAlpha=a;
  ctx.font='bold 26px Courier New';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor='#bb44ff'; ctx.shadowBlur=10;
  ctx.strokeStyle='rgba(0,0,0,.92)'; ctx.lineWidth=5;
  ctx.strokeText("🌺 MOTHER'S ROSARIO 🌺",GS.GW/2,78);
  ctx.fillStyle='#e055ff';
  ctx.fillText("🌺 MOTHER'S ROSARIO 🌺",GS.GW/2,78);
  if(MRS.phase==='impact'){
    ctx.shadowBlur=0;
    ctx.font='bold 15px Courier New'; ctx.fillStyle='#ffffff';
    ctx.fillText(`${MRS.totalDmg.toLocaleString()} DAMAGE`,GS.GW/2,108);
  }
  ctx.shadowBlur=0; ctx.globalAlpha=1;
}

// ─── PARTICLE / HIT-FX HELPERS ──────────────────────────────────
function _mrFx(x,y,color,sz,life,vx,vy){
  MRS.fx.push({x,y,color,sz,life,ml:life,
    vx:vx!==undefined?vx:rnd(-45,45), vy:vy!==undefined?vy:rnd(-65,-15)});
}
function _mrSpawnSmoke(x,y,count){
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2, sp=rnd(10,34);
    const life=rnd(800,1300);
    MRS.smoke.push({
      x:x+rnd(-16,16), y:y+rnd(-16,16),
      vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*0.5-rnd(6,18),
      r:rnd(11,20), growRate:rnd(14,26),
      life, ml:life
    });
  }
}
function _mrSpawnHitCross(x,y){ MRS.hitFx.push({type:'cross',x,y,life:180,ml:180}); }
function _mrSpawnHitSlash(x,y,angle){ MRS.hitFx.push({type:'slash',x,y,angle,life:220,ml:220}); }
function _mrSpawnHitGlow(x,y){ MRS.hitFx.push({type:'glow',x,y,life:260,ml:260}); }

// ─── AUDIO ───────────────────────────────────────────────────────
function _mrSfx_zing(){
  const ac=GS.audioCtx; if(!ac)return;
  try{
    const o=ac.createOscillator(),g=ac.createGain();
    o.connect(g);g.connect(ac.destination);o.type='sine';
    o.frequency.setValueAtTime(180,ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(2200,ac.currentTime+0.28);
    g.gain.setValueAtTime(0.55,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.34);
    o.start();o.stop(ac.currentTime+0.38);
  }catch(e){}
}
function _mrSfx_stab(){
  const ac=GS.audioCtx; if(!ac)return;
  try{
    const o=ac.createOscillator(),g=ac.createGain();
    o.connect(g);g.connect(ac.destination);o.type='sawtooth';
    o.frequency.setValueAtTime(950,ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(260,ac.currentTime+0.065);
    g.gain.setValueAtTime(0.38,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.09);
    o.start();o.stop(ac.currentTime+0.1);
  }catch(e){}
}
function _mrSfx_swing(){
  const ac=GS.audioCtx; if(!ac)return;
  try{
    const o=ac.createOscillator(),g=ac.createGain();
    o.connect(g);g.connect(ac.destination);o.type='sine';
    o.frequency.setValueAtTime(720,ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(140,ac.currentTime+0.28);
    g.gain.setValueAtTime(0.5,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.32);
    o.start();o.stop(ac.currentTime+0.36);
  }catch(e){}
}
function _mrSfx_charge(){
  const ac=GS.audioCtx; if(!ac)return;
  try{
    const o=ac.createOscillator(),g=ac.createGain();
    o.connect(g);g.connect(ac.destination);o.type='sine';
    const dur=MR_DUR.charge/1000;
    o.frequency.setValueAtTime(170,ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(1050,ac.currentTime+dur*0.88);
    g.gain.setValueAtTime(0.22,ac.currentTime);
    g.gain.linearRampToValueAtTime(0.5,ac.currentTime+dur*0.75);
    g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+dur);
    o.start();o.stop(ac.currentTime+dur+0.05);
  }catch(e){}
}
function _mrSfx_blink(){
  try{
    const a=new Audio('audio/mother_rosario.mp3');
    a.volume=0.85;
    a.play().catch(()=>_mrSfx_blink_synth());
  }catch(e){_mrSfx_blink_synth();}
}
function _mrSfx_blink_synth(){
  const ac=GS.audioCtx; if(!ac)return;
  try{
    const o=ac.createOscillator(),g=ac.createGain();
    o.connect(g);g.connect(ac.destination);o.type='square';
    o.frequency.setValueAtTime(1400,ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(280,ac.currentTime+0.12);
    g.gain.setValueAtTime(0.6,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.18);
    o.start();o.stop(ac.currentTime+0.22);
  }catch(e){}
}
function _mrSfx_boom(){
  const ac=GS.audioCtx; if(!ac)return;
  try{
    const sr=ac.sampleRate, sz=Math.floor(sr*0.55);
    const buf=ac.createBuffer(1,sz,sr), d=buf.getChannelData(0);
    for(let i=0;i<sz;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/sz,1.4);
    const src=ac.createBufferSource(), f=ac.createBiquadFilter(), g=ac.createGain();
    src.buffer=buf; f.type='lowpass'; f.frequency.value=280;
    src.connect(f); f.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(1.1,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.65);
    src.start(); src.stop(ac.currentTime+0.7);
  }catch(e){}
}
