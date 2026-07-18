// input.js — Keyboard + virtual joystick using Pointer Events (multi-touch safe)
// FIX #3: Joystick uses pointer capture scoped to itself so skill buttons
// (which use their own independent pointerdown listeners) can fire
// simultaneously while the joystick is being dragged.
// While MRS.active (Mother's Rosario cinematic) is true, ALL input is ignored.
function setupKeys(){
  document.addEventListener('keydown',e=>{
    GS.keys[e.code]=true;GS.keys[e.key]=true;
    if(!el('gameScreen').classList.contains('active'))return;
    if(GS.paused)return;
    if(MRS.active)return; // cinematic — no interaction possible
    const sids=WPN_SKILLS[GS.player.eqType]||[];
    if(e.key==='1'&&sids[0])useSk(sids[0]);
    if(e.key==='2'&&sids[1])useSk(sids[1]);
    if(e.key==='3'&&sids[2])useSk(sids[2]);
    if(e.code==='Space'||e.key==='f'||e.key==='F'){e.preventDefault();doAtk();}
    if(e.key==='e'||e.key==='E')doDodge();
    if(e.key==='q'||e.key==='Q'){
      const usable=SHOP_ITEMS.filter(s=>['hp','mp','both'].includes(s.type)&&(GS.player.items[s.id]||0)>0);
      usable.length>0?useItem(usable[0].id):notify('No consumables!');
    }
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
  });
  document.addEventListener('keyup',e=>{GS.keys[e.code]=false;GS.keys[e.key]=false;});
}

function setupJoy(){
  const outer=el('jOut'),inner=el('jIn');if(!outer||!inner)return;
  let sx=0,sy=0,activeId=null;
  const MAX=34;

  function start(e){
    if(GS.paused||MRS.active)return;
    if(activeId!==null)return; // already tracking a pointer
    activeId=e.pointerId;
    outer.setPointerCapture(activeId);
    const r=outer.getBoundingClientRect();
    sx=r.left+r.width/2;sy=r.top+r.height/2;
    GS.joyTouching=true;GS.joy.on=true;
    initAudio();
    move(e);
  }
  function move(e){
    if(e.pointerId!==activeId||!GS.joyTouching)return;
    if(MRS.active)return; // freeze joystick input during cinematic
    const dx=e.clientX-sx,dy=e.clientY-sy,d=Math.hypot(dx,dy),cl=Math.min(d,MAX);
    const nx=d>0?(dx/d)*cl:0,ny=d>0?(dy/d)*cl:0;
    inner.style.left=(50+nx/MAX*50)+'%';
    inner.style.top=(50+ny/MAX*50)+'%';
    GS.joy.dx=d>8?dx/d:0;GS.joy.dy=d>8?dy/d:0;
    if(d>5)GS.lastAngle=Math.atan2(dy,dx);
  }
  function end(e){
    if(e.pointerId!==activeId)return;
    try{outer.releasePointerCapture(activeId);}catch(err){}
    activeId=null;GS.joyTouching=false;GS.joy.on=false;GS.joy.dx=0;GS.joy.dy=0;
    inner.style.left='50%';inner.style.top='50%';
  }

  outer.style.touchAction='none';
  outer.addEventListener('pointerdown',e=>{e.preventDefault();start(e);});
  outer.addEventListener('pointermove',e=>{e.preventDefault();move(e);});
  outer.addEventListener('pointerup',end);
  outer.addEventListener('pointercancel',end);
}
