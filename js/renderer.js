// renderer.js — Canvas drawing, HUD, MR ultimate visuals, purple admin skin
function resizeCanvas(){
  const c=GS.canvas;if(!c)return;
  GS.GW=c.width=window.innerWidth;GS.GH=c.height=window.innerHeight;
}
function render(){
  const ctx=GS.ctx;if(!ctx||!GS.canvas)return;
  if(GS.GW===0||GS.GH===0)resizeCanvas();
  ctx.clearRect(0,0,GS.GW,GS.GH);
  ctx.save();ctx.translate(-GS.camX,-GS.camY);
  drawMap(ctx);drawChests(ctx);drawFX(ctx);
  drawProjectiles(ctx);drawMonsters(ctx);drawPlayer(ctx);
  drawParticles(ctx);drawDmgNums(ctx);
  ctx.restore();
  drawCombo(ctx);drawLvUpAnim(ctx);drawMiniMap();
}
function drawMap(ctx){
  const DS=GS.dungeonState;if(!DS||!GS.MAP)return;
  const cl=DS.colors;
  const sx=Math.max(0,Math.floor(GS.camX/TS)),ex=Math.min(MW,Math.ceil((GS.camX+GS.GW)/TS)+1);
  const sy=Math.max(0,Math.floor(GS.camY/TS)),ey=Math.min(MH,Math.ceil((GS.camY+GS.GH)/TS)+1);
  for(let ty=sy;ty<ey;ty++)for(let tx=sx;tx<ex;tx++){
    const tile=GS.MAP[ty][tx],px=tx*TS,py=ty*TS;
    if(tile===T.WALL){
      ctx.fillStyle=cl.wall;ctx.fillRect(px,py,TS,TS);
      ctx.fillStyle=cl.wt;ctx.fillRect(px,py,TS,TS*0.28);
      ctx.fillStyle='rgba(0,0,0,.2)';
      ctx.fillRect(px,py+TS*0.33,TS,1.5);ctx.fillRect(px,py+TS*0.66,TS,1.5);
      ctx.fillRect(px+TS*0.5,py,1.5,TS*0.33);
    }else if(tile===T.FLOOR||tile===T.CHEST){
      ctx.fillStyle=(tx+ty)%2===0?cl.fl:cl.fl2;ctx.fillRect(px,py,TS,TS);
      ctx.strokeStyle='rgba(0,0,0,.1)';ctx.lineWidth=0.5;ctx.strokeRect(px,py,TS,TS);
    }else if(tile===T.STAIRS){
      ctx.fillStyle=cl.fl;ctx.fillRect(px,py,TS,TS);
      const gc=GS.roomOK?'#00ff8c':'#555577';
      ctx.fillStyle=gc;ctx.globalAlpha=0.3+Math.sin(Date.now()/280)*0.12;
      ctx.fillRect(px+4,py+4,TS-8,TS-8);ctx.globalAlpha=1;
      ctx.fillStyle=GS.roomOK?'#00ff8c':'#555577';
      ctx.font=`${TS*0.72}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('▼',px+TS/2,py+TS/2);
      if(GS.roomOK){ctx.font='bold 8px Courier New';ctx.fillStyle='#00ff8c';ctx.fillText('NEXT',px+TS/2,py+TS*0.84);}
    }
  }
}
function drawChests(ctx){
  GS.chests.forEach(ch=>{
    if(ch.opened)return;
    const sz=20,glow=ch.tier==='gold'?'#ffd84d':ch.tier==='silver'?'#cccccc':'#8B5A2B';
    ctx.shadowColor=glow;ctx.shadowBlur=10+Math.sin(Date.now()*0.003)*5;
    ctx.fillStyle=ch.tier==='gold'?'#8B6914':ch.tier==='silver'?'#666688':'#5C3A1E';
    ctx.fillRect(ch.x-sz/2,ch.y-sz/2,sz,sz);
    ctx.fillStyle=glow;ctx.fillRect(ch.x-sz/2,ch.y-sz*0.1,sz,sz*0.18);
    ctx.fillStyle='rgba(255,255,255,.65)';ctx.beginPath();
    ctx.arc(ch.x,ch.y-sz*0.06,sz*0.12,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    if(dist(GS.player.gx,GS.player.gy,ch.x,ch.y)<60){
      ctx.fillStyle='rgba(255,215,0,.92)';ctx.font='bold 9px Courier New';
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('TOUCH',ch.x,ch.y-sz-8);
    }
  });
}
// FIX #7 gender + admin purple/red skin
function drawPlayer(ctx){
  const PL=GS.player,px=PL.gx,py=PL.gy,sz=26;
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();
  ctx.ellipse(px,py+sz/2-1,sz/2,sz/4,0,0,Math.PI*2);ctx.fill();
  if(GS.isDodging)ctx.globalAlpha=0.45;
  if(GS.berserk){ctx.shadowColor='#ff0000';ctx.shadowBlur=18;}
  if(GS.lvupAnim.active){ctx.shadowColor='#ffd84d';ctx.shadowBlur=22+Math.sin(Date.now()*0.012)*8;}
  if(GS.isImmortal){ctx.shadowColor='#ffd84d';ctx.shadowBlur=16;}
  // Admin special purple/red skin
  const isSpecialSkin=PL.skinStyle==='purple_red';
  const bodyColor=isSpecialSkin?'#9944ff':(PL.color||'#e84040');
  ctx.fillStyle=bodyColor;ctx.fillRect(px-sz/2,py-sz/2,sz,sz);
  if(isSpecialSkin){
    // red trim accents
    ctx.fillStyle='#ff2244';
    ctx.fillRect(px-sz/2,py+sz*0.28,sz,sz*0.1);
    ctx.fillRect(px-sz/2,py-sz/2,sz*0.12,sz);
  }
  ctx.fillStyle='rgba(255,255,255,.14)';ctx.fillRect(px-sz/2,py-sz/2,sz,sz*0.30);
  ctx.fillStyle='#fff';
  ctx.fillRect(px-sz*0.22,py-sz*0.18,sz*0.16,sz*0.16);
  ctx.fillRect(px+sz*0.06,py-sz*0.18,sz*0.16,sz*0.16);
  ctx.fillStyle='#000';
  ctx.fillRect(px-sz*0.16,py-sz*0.13,sz*0.09,sz*0.09);
  ctx.fillRect(px+sz*0.10,py-sz*0.13,sz*0.09,sz*0.09);
  ctx.globalAlpha=1;ctx.shadowBlur=0;
  const w=getEqWpn();
  if(w?.type==='zekken'){
    let pose;
    if(WSW.active){
      const ang=getSwordSwingAngle();
      pose={px:px+Math.cos(ang)*10,py:py+Math.sin(ang)*10,angle:ang};
    }else{
      pose=zekkenIdlePose(PL);
    }
    if(!drawZekkenSword(ctx,pose.px,pose.py,pose.angle)){
      ctx.font='13px serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(w?.emoji||'⚔️',px+sz/2+4,py-sz/2+2);
    }
  }else{
    ctx.font='13px serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(w?.emoji||'⚔️',px+sz/2+4,py-sz/2+2);
  }
}
function drawMonsters(ctx){
  GS.monsters.forEach(m=>{
    if(m.hp<=0)return;
    const sz=m.sz;
    ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();
    ctx.ellipse(m.x,m.y+sz/2,sz/2,sz/4,0,0,Math.PI*2);ctx.fill();
    if(m.boss){ctx.shadowColor=m.enraged?'#ff0000':m.color;ctx.shadowBlur=22;}
    if(m.ai==='err'){
      ctx.fillStyle=m.color;ctx.beginPath();
      ctx.moveTo(m.x,m.y-sz/2);ctx.lineTo(m.x-sz/2,m.y+sz*0.3);ctx.lineTo(m.x+sz/2,m.y+sz*0.3);
      ctx.closePath();ctx.fill();
      ctx.globalAlpha=0.6;
      ctx.fillRect(m.x-sz*0.8,m.y-sz*0.1,sz*0.6,sz*0.25);
      ctx.fillRect(m.x+sz*0.2,m.y-sz*0.1,sz*0.6,sz*0.25);
      ctx.globalAlpha=1;
    }else if(m.ai==='pass'){
      ctx.fillStyle=m.color;ctx.beginPath();
      ctx.ellipse(m.x,m.y,sz/2,sz*0.38,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.5)';
      ctx.fillRect(m.x-6,m.y-5,5,5);ctx.fillRect(m.x+2,m.y-5,5,5);
    }else{
      ctx.fillStyle=m.color;ctx.fillRect(m.x-sz/2,m.y-sz/2,sz,sz);
      ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(m.x-sz/2,m.y-sz/2,sz,sz*0.32);
      ctx.fillStyle=m.enraged?'#ff8800':'#ff2222';
      ctx.fillRect(m.x-sz*0.22,m.y-sz*0.20,sz*0.17,sz*0.17);
      ctx.fillRect(m.x+sz*0.06,m.y-sz*0.20,sz*0.17,sz*0.17);
    }
    ctx.shadowBlur=0;
    const bw=sz+10,bh=5,bx=m.x-bw/2,by=m.y-sz/2-12,hp=m.hp/m.maxHp;
    ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(bx,by,bw,bh);
    ctx.fillStyle=hp>0.5?'#00cc55':hp>0.25?'#ffaa00':'#ff2222';
    ctx.fillRect(bx,by,bw*hp,bh);
    if(m.boss){
      ctx.fillStyle='#fff';ctx.font='bold 10px Courier New';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.strokeStyle='rgba(0,0,0,.8)';ctx.lineWidth=2;
      ctx.strokeText(m.name,m.x,by-9);ctx.fillText(m.name,m.x,by-9);
    }
  });
}
function drawProjectiles(ctx){
  GS.projs.forEach(p=>{
    p.trail.forEach((t,i)=>{
      ctx.fillStyle=p.color;ctx.globalAlpha=(i/p.trail.length)*0.55;
      ctx.beginPath();ctx.arc(t.x,t.y,p.sz*0.65*(i/p.trail.length),0,Math.PI*2);ctx.fill();
    });
    ctx.globalAlpha=1;ctx.shadowColor=p.color;ctx.shadowBlur=12;
    ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
  });
}
function drawCombo(ctx){
  if(GS.combo<2)return;
  const cx=GS.GW/2,cy=GS.GH-200;
  const alpha=Math.min(1,GS.comboTimer/500);
  const scale=1+Math.min(GS.combo*0.05,0.6);
  const cols=['#ffff00','#ff8800','#ff4400','#ff00ff','#00ffff'];
  const col=cols[Math.min(Math.floor(GS.combo/3),cols.length-1)];
  ctx.globalAlpha=alpha;ctx.font=`bold ${Math.round(20*scale)}px Courier New`;
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor=col;ctx.shadowBlur=15;
  ctx.strokeStyle='rgba(0,0,0,.8)';ctx.lineWidth=3;
  ctx.strokeText(`${GS.combo} COMBO!`,cx,cy);
  ctx.fillStyle=col;ctx.fillText(`${GS.combo} COMBO!`,cx,cy);
  ctx.shadowBlur=0;ctx.globalAlpha=1;
}
function drawLvUpAnim(ctx){
  const la=GS.lvupAnim;if(!la.active)return;
  const PL=GS.player;
  const alpha=Math.min(1,la.timer/500);
  const px=PL.gx-GS.camX,py=PL.gy-GS.camY;
  const t=la.timer/3000,y=py-40-80*(1-t);
  ctx.globalAlpha=alpha*0.65;
  ctx.strokeStyle='#ffd84d';ctx.lineWidth=3;
  ctx.shadowColor='#ffd84d';ctx.shadowBlur=20;
  ctx.beginPath();ctx.arc(px,py,28+10*(1-t),0,Math.PI*2);ctx.stroke();
  ctx.shadowBlur=0;
  ctx.globalAlpha=alpha;
  ctx.font=`bold ${Math.round(18+(1-t)*6)}px Courier New`;
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor='#ffd84d';ctx.shadowBlur=12;
  ctx.strokeStyle='rgba(0,0,0,.8)';ctx.lineWidth=3;
  ctx.strokeText(`⭐ LV.${la.level} UP!`,px,y);
  ctx.fillStyle='#ffd84d';ctx.fillText(`⭐ LV.${la.level} UP!`,px,y);
  ctx.shadowBlur=0;ctx.globalAlpha=1;
}
function drawMiniMap(){
  const mc=el('mmCanvas');if(!mc||!GS.MAP)return;
  const ctx2=mc.getContext('2d');const W=mc.width,H=mc.height;
  ctx2.clearRect(0,0,W,H);ctx2.fillStyle='rgba(0,0,0,.8)';ctx2.fillRect(0,0,W,H);
  const cw=W/MW,ch=H/MH;
  for(let ty=0;ty<MH;ty++)for(let tx=0;tx<MW;tx++){
    const tile=GS.MAP[ty][tx];
    ctx2.fillStyle=tile===T.WALL?'#1e1e3e':tile===T.STAIRS?(GS.roomOK?'#00ff8c':'#444466'):tile===T.CHEST?'#ffd84d':'#3a3a5a';
    ctx2.fillRect(tx*cw+0.5,ty*ch+0.5,cw-1,ch-1);
  }
  const PL=GS.player;
  ctx2.fillStyle='#ffffff';ctx2.beginPath();
  ctx2.arc((PL.gx/TS)*cw,(PL.gy/TS)*ch,2.5,0,Math.PI*2);ctx2.fill();
  GS.monsters.forEach(m=>{
    ctx2.fillStyle=m.boss?'#ff4400':'#ff3333';ctx2.beginPath();
    ctx2.arc((m.x/TS)*cw,(m.y/TS)*ch,m.boss?3:1.8,0,Math.PI*2);ctx2.fill();
  });
}
function updateGHUD(){
  const PL=GS.player;if(!PL)return;
  const s=PL.stats;
  pct('gHP',s.hp,s.maxHp);txt('gHPt',`${Math.ceil(s.hp)}/${s.maxHp}`);
  pct('gMP',s.mana,s.maxMana);txt('gMPt',`${Math.ceil(s.mana)}/${s.maxMana}`);
  pct('gEXP',PL.exp,PL.expNext);
  txt('gLv',`Lv.${PL.level}${PL.level>=LEVEL_CAP?' MAX':''}`);
}
function updCdUI(){
  const sids=WPN_SKILLS[GS.player.eqType]||[];
  sids.forEach(sid=>{
    const ov=el('cdov_'+sid),tx2=el('cdtxt_'+sid);if(!ov)return;
    if(sid==='motherRosario'){
      const used=typeof MRS!=='undefined'&&MRS.floorUsed&&MRS.currentFloor===GS.curRoom;
      if(used){ov.style.display='flex';if(tx2)tx2.textContent='USED';}
      else ov.style.display='none';
      return;
    }
    const cd=GS.noCooldown?0:(GS.skCds[sid]||0);
    if(cd>0){ov.style.display='flex';if(tx2)tx2.textContent=(cd/1000).toFixed(1)+'s';}
    else ov.style.display='none';
  });
}
