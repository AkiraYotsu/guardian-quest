// ui.js — Hub panels, radial skill bar (repositioned/larger), admin nav
function swPanel(id,btn){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('on'));
  const panel=el('p'+cap(id));if(panel)panel.classList.add('on');
  if(btn)btn.classList.add('on');
  const renders={dungeon:renderDungeons,stats:renderStats,weapons:renderWeapons,
    skills:renderSkills,guild:renderGuild,shop:renderShop,quest:()=>{initQuests();renderQuests();},
    admin:renderAdmin};
  if(renders[id])renders[id]();
  snd('menu');
}
function hubRefresh(){
  const PL=GS.player;if(!PL)return;
  txt('pAv',PL.em);txt('pName',PL.name);
  txt('pClass',`Lv.${PL.level}${PL.level>=LEVEL_CAP?' MAX':''} ${PL.cn}`);
  txt('hGold',PL.gold.toLocaleString());
  const s=PL.stats;
  pct('hHP',s.hp,s.maxHp);txt('hHPt',`${Math.ceil(s.hp)}/${s.maxHp}`);
  pct('hMP',s.mana,s.maxMana);txt('hMPt',`${Math.ceil(s.mana)}/${s.maxMana}`);
  pct('hEXP',PL.exp,PL.expNext);txt('hEXPt',PL.level>=LEVEL_CAP?'MAX':`${PL.exp}/${PL.expNext}`);
  // Show admin nav button only for admin
  const adminBtn=el('navAdmin');
  if(adminBtn)adminBtn.style.display=GS.adminMode?'inline-block':'none';
  renderDungeons();
}
function renderDungeons(){
  const PL=GS.player,con=el('dngList');if(!con||!PL)return;
  con.innerHTML=DUNGEONS.map(d=>{
    const locked=!GS.unlockAll&&PL.level<d.minLv;
    return`<div class="dng-card${locked?' locked':''}" onclick="${locked?'':`enterDng('${d.id}')`}">
      <div class="dng-icon">${d.em}</div><div class="dng-name">${d.name}</div>
      <div class="dng-info">${d.rooms} Rooms • Min Lv.${d.minLv}<br>Boss: ${MDATA[d.boss]?.name||'?'}</div>
      <div class="diff ${d.dc}">${d.dl}</div>
      ${locked?`<div style="color:var(--red);font-size:.7rem;margin-top:.4rem">⚠ Requires Lv.${d.minLv}</div>`:''}
    </div>`;
  }).join('');
}

// FIX #2: Larger, repositioned radial skills around attack button
const ATK_CX=170,ATK_CY=170,SK_R=98;
function buildSkBar(){
  const PL=GS.player;if(!PL)return;
  const sids=WPN_SKILLS[PL.eqType]||[];
  const zone=el('combatZone');if(!zone)return;
  zone.querySelectorAll('.sk-slot').forEach(s=>s.remove());
  // Angle layout per skill count, fan 270°(top) → 180°(left), staying within upper-left quadrant
  const angleSets={1:[270],2:[270,210],3:[270,235,200]};
  const angles=angleSets[sids.length]||angleSets[2];
  sids.forEach((sid,i)=>{
    const sk=SKILLS[sid];if(!sk)return;
    const deg=angles[i]??270;const rad=deg*Math.PI/180;
    const sx=ATK_CX+Math.cos(rad)*SK_R,sy=ATK_CY+Math.sin(rad)*SK_R;
    const slot=document.createElement('div');
    slot.className='sk-slot'+(sk.ultimate?' sk-ultimate':'');
    slot.id='ss_'+sid;
    slot.style.left=(sx-31)+'px';slot.style.top=(sy-31)+'px';
    const lv=PL.skLv[sid]||1;
    const mpCost=sk.cinematic?sk.mc:Math.max(1,sk.mc-Math.floor(lv/5));
    slot.innerHTML=`
      <span style="font-size:1.3rem;line-height:1">${sk.em}</span>
      <span class="sk-name-tiny">${sk.ultimate?'ULT':sk.name}</span>
      <span class="sk-key">${i+1}</span>
      <span class="sk-mp">MP:${mpCost}</span>
      <div class="cd-ov" id="cdov_${sid}"><div class="cd-txt" id="cdtxt_${sid}"></div></div>`;
    // FIX #3: pointerdown fires immediately, doesn't conflict with joystick (different DOM zone)
    slot.addEventListener('pointerdown',e=>{e.stopPropagation();useSk(sid);});
    zone.appendChild(slot);
  });
}
function buildItemBar(){
  const bar=el('itemBar');if(!bar||!GS.player)return;
  bar.querySelectorAll('.item-slot-dng,.rv-ind').forEach(o=>o.remove());
  if(!GS.player.items)return;
  const usable=SHOP_ITEMS.filter(s=>['hp','mp','both','revive'].includes(s.type)&&(GS.player.items[s.id]||0)>0);
  usable.forEach(s=>{
    const d=document.createElement('div');
    d.className='item-slot-dng';d.title=`${s.name}: ${s.desc}`;
    d.innerHTML=`${s.em}<span class="item-qty">${GS.player.items[s.id]}</span>`;
    d.onclick=()=>useItem(s.id);bar.appendChild(d);
  });
  if(GS.player.activeRevive){
    const ri=document.createElement('div');ri.className='rv-ind';ri.textContent='🪶ON';bar.appendChild(ri);
  }
}
function initStars(){
  const sc=el('starsCanvas');if(!sc)return;
  sc.width=window.innerWidth;sc.height=window.innerHeight;
  const ctx2=sc.getContext('2d');
  const stars=Array.from({length:200},()=>({x:Math.random()*sc.width,y:Math.random()*sc.height,r:0.5+Math.random()*1.5,a:Math.random(),s:0.2+Math.random()*0.5}));
  let t=0;
  (function loop(){
    ctx2.clearRect(0,0,sc.width,sc.height);t+=0.008;
    stars.forEach(s=>{
      const alpha=0.3+0.7*Math.abs(Math.sin(t*s.s+s.a*10));
      ctx2.fillStyle=`rgba(255,255,255,${alpha})`;
      ctx2.beginPath();ctx2.arc(s.x,s.y,s.r,0,Math.PI*2);ctx2.fill();
    });
    requestAnimationFrame(loop);
  })();
}
