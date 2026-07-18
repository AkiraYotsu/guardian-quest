// dungeon.js — Map gen, chests, room flow, pause, PRE-BOSS FIX
const ROOM_LAYOUTS=[
  [[4,4],[4,10],[17,4],[17,10],[10,10],[7,7],[13,7]],
  [[5,4],[5,10],[16,4],[16,10],[7,4],[13,4],[7,10],[13,10]],
  [[4,5],[4,9],[17,5],[17,9],[10,9],[7,7],[13,7]],
  [[3,4],[3,10],[18,4],[18,10],[10,4],[10,10]],
  [[6,4],[6,10],[15,4],[15,10],[4,7],[17,7]]
];
function findSafeSpawn(anchorTx,anchorTy){
  if(!GS.MAP)return{x:MW*TS/2,y:MH*TS/2};
  const cx=anchorTx!==undefined?anchorTx:Math.floor(MW/2);
  const cy=anchorTy!==undefined?anchorTy:Math.floor(MH/2);
  for(let r=0;r<10;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    const nx=cx+dx,ny=cy+dy;
    if(nx>=2&&nx<MW-2&&ny>=2&&ny<MH-2&&GS.MAP[ny]&&GS.MAP[ny][nx]===T.FLOOR)
      return{x:nx*TS+TS/2,y:ny*TS+TS/2};
  }
  return{x:6*TS,y:6*TS};
}
function genMap(){
  GS.MAP=Array.from({length:MH},()=>Array(MW).fill(T.WALL));
  for(let y=2;y<MH-2;y++)for(let x=2;x<MW-2;x++)GS.MAP[y][x]=T.FLOOR;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)
    GS.MAP[Math.floor(MH/2)+dy][Math.floor(MW/2)+dx]=T.FLOOR;
  const layout=ROOM_LAYOUTS[GS.curRoom%ROOM_LAYOUTS.length];
  layout.forEach(([x,y])=>{if(y>=2&&y<MH-2&&x>=2&&x<MW-2)GS.MAP[y][x]=T.WALL;});
  if(GS.curRoom<GS.totRooms)GS.MAP[MH-3][MW-3]=T.STAIRS;
  genChests();spawnMons();GS.roomOK=false;GS.noDmgRoom=true;
}
const CHEST_POS=[[6,6],[14,6],[6,9],[14,9],[8,5],[12,9]];
function genChests(){
  GS.chests=[];if(GS.curRoom===GS.totRooms)return;
  const count=1+(Math.random()<0.4?1:0);
  const shuffled=[...CHEST_POS].sort(()=>Math.random()-0.5);
  for(let i=0;i<count&&i<shuffled.length;i++){
    const[cx,cy]=shuffled[i];
    if(GS.MAP[cy]&&GS.MAP[cy][cx]===T.FLOOR){
      GS.MAP[cy][cx]=T.CHEST;
      const tier=GS.curRoom>GS.totRooms*0.6?'gold':GS.curRoom>GS.totRooms*0.3?'silver':'wood';
      GS.chests.push({tx:cx,ty:cy,x:cx*TS+TS/2,y:cy*TS+TS/2,opened:false,tier});
    }
  }
}
function checkChestInteract(){
  GS.chests.forEach(ch=>{if(!ch.opened&&dist(GS.player.gx,GS.player.gy,ch.x,ch.y)<32)openChest(ch);});
}
function openChest(ch){
  if(ch.opened)return;ch.opened=true;GS.MAP[ch.ty][ch.tx]=T.FLOOR;
  snd('chest');addParts(ch.x,ch.y,'#ffd84d',18);addFX(ch.x,ch.y,'#ffd84d',50,500);
  questTrack('chest',1);
  const gr={wood:[15,40],silver:[40,100],gold:[80,200]}[ch.tier];
  const gold=gr[0]+Math.floor(Math.random()*(gr[1]-gr[0]));
  GS.player.gold+=gold;let extra='';
  const roll=Math.random();
  if(ch.tier==='gold'&&roll<0.25){
    const drop=WDROPS[rndI(WDROPS.length)];
    if(!GS.player.weapons.find(w=>w.id===drop.id)){GS.player.weapons.push({...drop,eq:false});extra=` + 🎁${drop.name}`;}
  }else if(roll<0.35){
    const pot=Math.random()<0.5?'hp_sm':'mp_sm';
    GS.player.items[pot]=(GS.player.items[pot]||0)+1;extra=' + 🧪Potion!';
  }
  spawnDmg(ch.x,ch.y-20,`💰+${gold}${extra}`,'#ffd84d');
  notify(`📦 Chest! +${gold}g${extra}`);hubRefresh();savePL();
}
function onRoomOK(){
  GS.roomOK=true;
  const gold=12+Math.floor(Math.random()*18)*GS.curRoom;
  const xp=18+GS.curRoom*6;
  GS.player.gold+=gold;gainEXP(xp);
  questTrack('room',1);
  if(GS.noDmgRoom){questTrack('nodmg',1);spawnDmg(GS.player.gx,GS.player.gy-50,'PERFECT!','#00ff8c');}
  checkQuestGold();hubRefresh();snd('chest');
  const isFinal=GS.curRoom===GS.totRooms;
  el('mClrIcon').textContent=isFinal?'🏆':'🎉';
  el('mClrTtl').textContent=isFinal?'DUNGEON CLEARED! 🏆':`Room ${GS.curRoom}/${GS.totRooms} Cleared!`;
  el('mClrRew').innerHTML=`💰 +${gold} Gold<br>⭐ +${xp} EXP`
    +(GS.noDmgRoom?'<br>🛡️ Perfect Clear!':'')
    +(isFinal?'<br>🌟 Dungeon Complete!':'<br>Walk to ▼ for next room');
  setTimeout(()=>openMod('mClear'),700);
}
function afterClear(){
  closeMod('mClear');
  if(GS.curRoom>=GS.totRooms){notify('🏆 Dungeon Complete!');setTimeout(retreatHub,1400);}
}

// FIX #1: Show boss warning BEFORE entering boss room
function checkStairsInteract(){
  const PL=GS.player;
  const tx=Math.floor(PL.gx/TS),ty=Math.floor(PL.gy/TS);
  if(GS.MAP[ty]&&GS.MAP[ty][tx]===T.STAIRS&&GS.roomOK){
    const nextIsBoss=(GS.curRoom+1)===GS.totRooms;
    if(nextIsBoss&&!GS.preBossShown){
      GS.preBossShown=true;
      showPreBossWarning();
    }else if(!nextIsBoss){
      nextRoom();
    }
  }
}
function showPreBossWarning(){
  GS.paused=true;
  const boss=MDATA[GS.dungeonState?.boss];
  el('preBossName').textContent=boss?.name||'Boss';
  el('preBossHP').textContent=(boss?.hp||'???').toLocaleString();
  el('preBossAtk').textContent=boss?.atk||'???';
  openMod('mPreBoss');
}
function confirmEnterBoss(){
  closeMod('mPreBoss');GS.paused=false;GS.preBossShown=false;nextRoom();
}
function declineEnterBoss(){
  closeMod('mPreBoss');GS.paused=false;GS.preBossShown=false;
  notify('Retreat from the boss door...');
  // Push player back slightly
  const PL=GS.player;PL.gx=MW*TS/2;PL.gy=MH*TS/2-TS*2;
}
// Boss-room intro: camera previews the boss for a moment, then pans back
// to the player. Boss stays frozen throughout + a short grace period after.
const BOSS_INTRO_SHOW_DUR=1700;
const BOSS_INTRO_RETURN_DUR=1100;
const BOSS_INTRO_FREEZE_EXTRA=500;

function startBossIntro(){
  const boss=GS.monsters.find(m=>m.boss);
  if(!boss)return;
  boss.introFrozen=true;
  GS.bossIntro={active:true,timer:BOSS_INTRO_SHOW_DUR,phase:'show',bossX:boss.x,bossY:boss.y};
}

function nextRoom(){
  if(GS.curRoom>=GS.totRooms)return;
  GS.curRoom++;GS.preBossShown=false;
  mrResetFloorCd(); // new floor = Mother's Rosario usable again
  const PL=GS.player;
  PL.stats.hp=Math.min(PL.stats.maxHp,PL.stats.hp+PL.stats.maxHp*0.22);
  PL.stats.mana=Math.min(PL.stats.maxMana,PL.stats.mana+PL.stats.maxMana*0.30);
  const isBossRoom=GS.curRoom===GS.totRooms;
  PL.gx=MW*TS/2;PL.gy=MH*TS/2;
  genMap();
  // FIX: boss room spawns player near the bottom (boss spawns near the top
  // via monsters.js) so there's no immediate point-blank attack exposure.
  const safe=isBossRoom
    ? findSafeSpawn(Math.floor(MW/2),Math.floor(MH*0.82))
    : findSafeSpawn();
  PL.gx=safe.x;PL.gy=safe.y;
  updateFloorLbl();updateGHUD();
  notify(`Room ${GS.curRoom}/${GS.totRooms}${isBossRoom?' — ⚠️ BOSS!':''}`);
  if(isBossRoom)startBossIntro();
  savePL();
}
function updateFloorLbl(){
  const isBoss=GS.curRoom===GS.totRooms;
  const lb=el('floorLbl');if(!lb)return;
  lb.textContent=`${GS.dungeonState?.name||'Dungeon'} — ${isBoss?'⚠️ BOSS ROOM':`Floor ${GS.curRoom}/${GS.totRooms}`}`;
  lb.style.color=isBoss?'#ff6b6b':'var(--cyan)';
  lb.style.borderColor=isBoss?'rgba(255,0,0,.35)':'rgba(0,229,255,.28)';
}
function enterDng(id){
  const DS=DUNGEONS.find(d=>d.id===id);if(!DS)return;
  const PL=GS.player;
  if(!GS.unlockAll&&PL.level<DS.minLv){notify(`Need Level ${DS.minLv}!`);return;}
  GS.dungeonState=DS;GS.curRoom=1;GS.totRooms=DS.rooms;
  GS.paused=false;GS.preBossShown=false;
  PL.stats.hp=PL.stats.maxHp;PL.stats.mana=PL.stats.maxMana;
  showScr('gameScreen');
  savePL();
  requestAnimationFrame(()=>requestAnimationFrame(()=>initGame()));
}
function openPause(){
  GS.paused=true;
  const PL=GS.player,s=PL.stats;
  txt('pauseDungeonName',GS.dungeonState?.name||'Dungeon');
  txt('pauseFloor',`Floor ${GS.curRoom} / ${GS.totRooms}`);
  txt('pauseHP',`${Math.ceil(s.hp)} / ${s.maxHp}`);
  txt('pauseMP',`${Math.ceil(s.mana)} / ${s.maxMana}`);
  txt('pauseLv',`${PL.em||'⚔️'} Lv.${PL.level}  ${PL.name}`);
  pct('pauseHPBar',s.hp,s.maxHp);pct('pauseMPBar',s.mana,s.maxMana);
  openMod('mPause');
}
function resumeGame(){GS.paused=false;closeMod('mPause');}
function retreatFromPause(){GS.paused=false;closeMod('mPause');retreatHub();}
function retreatHub(){
  closeMod('mDead');closeMod('mClear');closeMod('mBoss');closeMod('mPause');closeMod('mPreBoss');
  const PL=GS.player;
  PL.stats.hp=Math.max(1,PL.stats.maxHp*0.5);PL.activeRevive=false;
  GS.monsters=[];GS.projs=[];GS.parts=[];GS.fxList=[];GS.dmgNums=[];GS.paused=false;
  savePL();showScr('hubScreen');hubRefresh();
}
function backHub(){openPause();}
