// main.js — Game loop, init, movement, camera
// Mother's Rosario cinematic (MRS) fully takes over update+render while active.
// Boss-room intro (GS.bossIntro) takes over the CAMERA only during its
// 'show'/'return' sub-phases; its final 'freeze' sub-phase runs inside the
// normal update() loop (player can act, only the boss AI stays suppressed).
function initGame(){
  GS.canvas=el('gameCanvas');GS.ctx=GS.canvas.getContext('2d');
  GS.GW=GS.canvas.width=window.innerWidth;
  GS.GH=GS.canvas.height=window.innerHeight;
  if(!GS.resizeAdded){
    window.addEventListener('resize',()=>{GS.GW=GS.canvas.width=window.innerWidth;GS.GH=GS.canvas.height=window.innerHeight;});
    window.addEventListener('orientationchange',()=>setTimeout(()=>{GS.GW=GS.canvas.width=window.innerWidth;GS.GH=GS.canvas.height=window.innerHeight;},200));
    GS.resizeAdded=true;
  }
  const PL=GS.player;
  GS.monsters=[];GS.projs=[];GS.parts=[];GS.fxList=[];GS.dmgNums=[];GS.chests=[];
  GS.skCds={};GS.atkCd=0;GS.dgCd=0;GS.isDodging=false;GS.dodgeTimer=0;
  GS.berserk=false;GS.berserkT=0;GS.combo=0;GS.comboTimer=0;
  GS.camX=0;GS.camY=0;GS.paused=false;GS.preBossShown=false;
  GS.lvupAnim={active:false,timer:0,level:0};
  GS.bossIntro={active:false,timer:0,phase:'show',bossX:0,bossY:0};
  mrResetFloorCd(); // fresh dungeon run = Mother's Rosario usable again
  PL.gx=Math.floor(MW/2)*TS+TS/2;PL.gy=Math.floor(MH/2)*TS+TS/2;
  genMap();
  const safe=findSafeSpawn();PL.gx=safe.x;PL.gy=safe.y;
  GS.camX=clamp(PL.gx-GS.GW/2,0,MW*TS-GS.GW);
  GS.camY=clamp(PL.gy-GS.GH/2,0,MH*TS-GS.GH);
  buildSkBar();buildItemBar();updateGHUD();updateFloorLbl();
  setupKeys();setupJoy();
  if(GS.RAF)cancelAnimationFrame(GS.RAF);
  GS.lastT=performance.now();GS.RAF=requestAnimationFrame(gFrame);
}

function gFrame(t){
  perfFrameStart();
  const dt=Math.min((t-GS.lastT)/1000,0.08);GS.lastT=t;
  if(el('gameScreen').classList.contains('active')){
    if(MRS.active){
      // Cinematic owns the whole frame: no normal update/render/pause logic runs.
      mrUpdate(dt);
      perfRenderStart();mrRender(GS.ctx);perfRenderEnd();
    }else if(GS.bossIntro.active&&GS.bossIntro.phase!=='freeze'){
      // Camera-preview sub-phases: gameplay fully frozen, only the camera pans.
      updateBossIntroCamera(dt);
      perfRenderStart();render();perfRenderEnd();
    }else if(!GS.paused){
      update(dt);
      perfRenderStart();render();perfRenderEnd();
    }else{
      perfRenderStart();render();perfRenderEnd(); // frozen frame while paused
    }
  }
  perfFrameEnd();
  updatePerfOverlay();
  GS.RAF=requestAnimationFrame(gFrame);
}

// Camera-only sub-phases of the boss intro: pan to the boss, hold, pan back.
function updateBossIntroCamera(dt){
  const bi=GS.bossIntro;
  bi.timer-=dt*1000;
  if(bi.phase==='show'){
    const tcx=bi.bossX-GS.GW/2, tcy=bi.bossY-GS.GH/2;
    GS.camX+=(tcx-GS.camX)*dt*4;
    GS.camY+=(tcy-GS.camY)*dt*4;
    if(bi.timer<=0){bi.phase='return';bi.timer=BOSS_INTRO_RETURN_DUR;}
  }else if(bi.phase==='return'){
    const PL=GS.player;
    const tcx=PL.gx-GS.GW/2, tcy=PL.gy-GS.GH/2;
    GS.camX+=(tcx-GS.camX)*dt*2.2;
    GS.camY+=(tcy-GS.camY)*dt*2.2;
    if(bi.timer<=0){
      bi.phase='freeze'; bi.timer=BOSS_INTRO_FREEZE_EXTRA;
      GS.camX=tcx; GS.camY=tcy;
    }
  }
  GS.camX=clamp(GS.camX,0,Math.max(0,MW*TS-GS.GW));
  GS.camY=clamp(GS.camY,0,Math.max(0,MH*TS-GS.GH));
}

function update(dt){
  const PL=GS.player;if(!PL)return;
  GS.atkCd=Math.max(0,GS.atkCd-dt*1000);
  GS.dgCd=Math.max(0,GS.dgCd-dt*1000);
  GS.comboTimer=Math.max(0,GS.comboTimer-dt*1000);
  if(GS.comboTimer===0)GS.combo=0;
  Object.keys(GS.skCds).forEach(k=>{GS.skCds[k]=Math.max(0,GS.skCds[k]-dt*1000);});
  if(GS.isDodging){GS.dodgeTimer-=dt*1000;if(GS.dodgeTimer<=0)GS.isDodging=false;}
  if(GS.berserk){GS.berserkT-=dt*1000;if(GS.berserkT<=0){GS.berserk=false;notify('Berserk ended!');}}
  if(GS.lvupAnim.active){GS.lvupAnim.timer-=dt*1000;if(GS.lvupAnim.timer<=0)GS.lvupAnim.active=false;}
  // Boss intro's final "freeze extra" grace period: player can act normally,
  // but the boss stays suppressed (see updMons' introFrozen guard) until this ends.
  if(GS.bossIntro.active&&GS.bossIntro.phase==='freeze'){
    GS.bossIntro.timer-=dt*1000;
    if(GS.bossIntro.timer<=0){
      GS.bossIntro.active=false;
      const boss=GS.monsters.find(m=>m.boss);
      if(boss)boss.introFrozen=false;
    }
  }
  movePL(dt);
  checkChestInteract();
  checkStairsInteract();
  tickSwordSwing(dt);
  updMons(dt);updProjs(dt);
  updateParticles(dt);updateFX(dt);updateDmgNums(dt);
  if(PL.stats.mana<PL.stats.maxMana)PL.stats.mana=Math.min(PL.stats.maxMana,PL.stats.mana+6*dt);
  updCam();updCdUI();updateGHUD();
  if(!GS.roomOK&&GS.monsters.length===0)onRoomOK();
}

function movePL(dt){
  const PL=GS.player;
  const spd=(PL.stats.spd||5)*18;
  let dx=0,dy=0;
  if(GS.keys['ArrowLeft']||GS.keys['KeyA']||GS.keys['a'])dx-=1;
  if(GS.keys['ArrowRight']||GS.keys['KeyD']||GS.keys['d'])dx+=1;
  if(GS.keys['ArrowUp']||GS.keys['KeyW']||GS.keys['w'])dy-=1;
  if(GS.keys['ArrowDown']||GS.keys['KeyS']||GS.keys['s'])dy+=1;
  if(GS.joy.on){dx+=GS.joy.dx;dy+=GS.joy.dy;}
  const mag=Math.hypot(dx,dy);if(mag>0){dx/=mag;dy/=mag;}
  if(dx!==0||dy!==0)GS.lastAngle=Math.atan2(dy,dx);
  const sp=spd*(GS.isDodging?3.2:1);
  const nx=PL.gx+dx*sp*dt,ny=PL.gy+dy*sp*dt,hs=13;
  if(!isWall(nx-hs,PL.gy-hs)&&!isWall(nx+hs,PL.gy-hs)&&!isWall(nx-hs,PL.gy+hs)&&!isWall(nx+hs,PL.gy+hs))PL.gx=nx;
  if(!isWall(PL.gx-hs,ny-hs)&&!isWall(PL.gx+hs,ny-hs)&&!isWall(PL.gx-hs,ny+hs)&&!isWall(PL.gx+hs,ny+hs))PL.gy=ny;
}
function isWall(wx,wy){
  const tx=Math.floor(wx/TS),ty=Math.floor(wy/TS);
  if(tx<0||ty<0||tx>=MW||ty>=MH)return true;
  const row=GS.MAP[ty];return!row||row[tx]===T.WALL;
}
function updCam(){
  const PL=GS.player;
  GS.camX+=(PL.gx-GS.GW/2-GS.camX)*0.12;
  GS.camY+=(PL.gy-GS.GH/2-GS.camY)*0.12;
  GS.camX=clamp(GS.camX,0,Math.max(0,MW*TS-GS.GW));
  GS.camY=clamp(GS.camY,0,Math.max(0,MH*TS-GS.GH));
}
function showDead(){
  const PL=GS.player;
  if(PL.activeRevive){
    PL.activeRevive=false;PL.stats.hp=Math.round(PL.stats.maxHp*0.6);
    notify('🪶 Phoenix Feather! Revived!');
    addParts(PL.gx,PL.gy,'#ffaa00',25);updateGHUD();buildItemBar();return;
  }
  el('mDeadTxt').textContent=`Defeated at Floor ${GS.curRoom}/${GS.totRooms} — ${GS.dungeonState?.name||''}`;
  savePL();
  openMod('mDead');
}
function respawn(){
  closeMod('mDead');
  const PL=GS.player;PL.stats.hp=PL.stats.maxHp*0.8;PL.activeRevive=false;
  GS.monsters=[];GS.combo=0;
  PL.gx=MW*TS/2;PL.gy=MH*TS/2;genMap();
  const safe=findSafeSpawn();PL.gx=safe.x;PL.gy=safe.y;
  GS.roomOK=false;notify('Respawned!');updateGHUD();buildItemBar();
  savePL();
}
window.addEventListener('load',()=>{
  initStars();notify('⚔️ Welcome to Guardian Quest RPG!');
  document.addEventListener('keypress',e=>{
    if(e.key!=='Enter')return;
    if(el('loginScreen').classList.contains('active'))
      el('fLogin').style.display!=='none'?doLogin():doReg();
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&el('gameScreen').classList.contains('active')){
      if(MRS.active)return; // cinematic blocks pause entirely
      if(GS.bossIntro.active)return; // boss intro blocks pause entirely
      GS.paused?resumeGame():openPause();
    }
  });
});
