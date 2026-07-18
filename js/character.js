// character.js — Char creation (gender), stats, weapons, skills with limit break
let _selClass=null,_selGender='male';

function buildClassCards(){
  _selClass=null;_selGender='male';
  el('classCon').innerHTML=CLASSES.map(c=>`
    <div class="class-card" id="cc_${c.id}" onclick="pickClass('${c.id}')">
      <div class="ck">${c.emoji}</div><div class="cn">${c.name}</div>
      <div class="cd">${c.desc}</div><div class="cs">${c.cs}</div>
    </div>`).join('');
  // Gender selector
  const gCon=el('genderCon');
  if(gCon)gCon.innerHTML=GENDERS.map(g=>`
    <div class="gender-card ${g.id==='male'?'sel':''}" id="gc_${g.id}" onclick="pickGender('${g.id}')">
      <div style="font-size:1.8rem">${g.emoji}</div>
      <div style="font-weight:900;color:var(--gold);font-size:.88rem">${g.name}</div>
      <div style="font-size:.7rem;color:var(--dim)">${g.desc}</div>
    </div>`).join('');
}
function pickClass(id){
  _selClass=id;
  document.querySelectorAll('.class-card').forEach(c=>c.classList.remove('sel'));
  const cc=el('cc_'+id);if(cc)cc.classList.add('sel');snd('menu');
}
function pickGender(id){
  _selGender=id;
  document.querySelectorAll('.gender-card').forEach(c=>c.classList.remove('sel'));
  const gc=el('gc_'+id);if(gc)gc.classList.add('sel');snd('menu');
}
function createChar(){
  const name=el('cname').value.trim();el('cerr').textContent='';
  if(!_selClass){el('cerr').textContent='Select a class first';return;}
  if(name.length<2){el('cerr').textContent='Name must be ≥ 2 chars';return;}
  const cls=CLASSES.find(c=>c.id===_selClass);
  const gMod=GENDERS.find(g=>g.id===_selGender)?.mod||{hp:1,atk:1,def:1,spd:1,crit:1,mana:1};
  const base={
    hp:  Math.round(cls.base.hp   *gMod.hp),
    atk: Math.round(cls.base.atk  *gMod.atk),
    def: Math.round(cls.base.def  *gMod.def),
    spd: Math.round(cls.base.spd  *gMod.spd*10)/10,
    crit:Math.round(cls.base.crit *gMod.crit*10)/10,
    mana:Math.round(cls.base.mana *gMod.mana)
  };
  GS.player={
    name,class:cls.id,cn:cls.name,em:cls.emoji,color:cls.color,
    gender:_selGender,skinStyle:'default',
    level:1,exp:0,expNext:100,sp:5,gold:120,
    stats:{hp:base.hp,maxHp:base.hp,atk:base.atk,def:base.def,
           spd:base.spd,crit:base.crit,mana:base.mana,maxMana:base.mana},
    grow:{...cls.grow},spAlloc:{hp:0,atk:0,def:0,spd:0,crit:0,mana:0},
    weapons:[{id:'starter_'+cls.sw,...WDATA[cls.sw],atkBonus:6,rarity:'common',eq:true}],
    eqType:cls.sw,skLv:{},guild:null,dp:{},
    items:{hp_sm:2,hp_lg:0,mp_sm:1,mp_lg:0,elixir:0,revive:0,atk_gem:0,def_gem:0,spd_gem:0,crit_gem:0},
    activeRevive:false,quests:null
  };
  Object.keys(SKILLS).forEach(s=>{GS.player.skLv[s]=1;});
  savePL();showScr('hubScreen');hubRefresh();snd('lvup');
  notify(`Welcome, ${name} the ${cls.cn} (${_selGender})!`);
}

// ── Stats Panel ──
function renderStats(){
  const PL=GS.player;if(!PL)return;
  const s=PL.stats;
  txt('lvDisp',PL.level+(PL.level>=LEVEL_CAP?' MAX':''));
  txt('expDisp',PL.level>=LEVEL_CAP?'MAX LEVEL':`${PL.exp} / ${PL.expNext} EXP`);
  txt('expLeft',PL.level>=LEVEL_CAP?0:PL.expNext-PL.exp);
  el('expBig').style.width=(PL.level>=LEVEL_CAP?100:PL.exp/PL.expNext*100)+'%';
  txt('spDisp',PL.sp);
  const gn=GENDERS.find(g=>g.id===PL.gender);
  const gEl=el('statGender');if(gEl)gEl.textContent=gn?`${gn.emoji} ${gn.name}`:'';
  const defs=[{k:'maxHp',l:'❤️ MAX HP'},{k:'atk',l:'⚔️ ATK'},{k:'def',l:'🛡️ DEF'},
              {k:'spd',l:'⚡ SPD'},{k:'crit',l:'💥 CRIT %'},{k:'maxMana',l:'🔮 MAX MP'}];
  el('statsGrid').innerHTML=defs.map(d=>`
    <div class="stat-card"><div class="sn">${d.l}</div>
    <div class="sv">${typeof s[d.k]==='number'?s[d.k].toFixed(1):s[d.k]}</div></div>`).join('');
  const alloc=[
    {k:'hp',l:'❤️ MAX HP (+10)',sk:'maxHp',v:10},{k:'atk',l:'⚔️ ATK (+3)',sk:'atk',v:3},
    {k:'def',l:'🛡️ DEF (+2)',sk:'def',v:2},{k:'spd',l:'⚡ SPD (+1)',sk:'spd',v:1},
    {k:'crit',l:'💥 CRIT (+1%)',sk:'crit',v:1},{k:'mana',l:'🔮 MAX MP (+25)',sk:'maxMana',v:25}
  ];
  el('statRows').innerHTML=alloc.map(a=>`
    <div class="sr"><span class="sr-n">${a.l}</span>
    <span class="sr-v">+${(PL.spAlloc[a.k]||0)*a.v}</span>
    <button class="add-btn" onclick="addStat('${a.k}',${a.v},'${a.sk}')"
      ${PL.sp<=0?'disabled':''}>+ ADD</button></div>`).join('');
}
function addStat(k,v,sk){
  const PL=GS.player;if(!PL||PL.sp<=0)return;
  PL.sp--;PL.spAlloc[k]=(PL.spAlloc[k]||0)+1;PL.stats[sk]=(PL.stats[sk]||0)+v;
  if(sk==='maxHp')PL.stats.hp=Math.min(PL.stats.hp+v,PL.stats.maxHp);
  if(sk==='maxMana')PL.stats.mana=Math.min(PL.stats.mana+v,PL.stats.maxMana);
  renderStats();savePL();notify(`+${v} ${sk.replace('max','')} added!`);snd('menu');
}

// ── Weapons Panel ──
function renderWeapons(){
  const PL=GS.player;if(!PL)return;
  el('wpnGrid').innerHTML=PL.weapons.map(w=>`
    <div class="wpn-card ${w.rarity||'common'} ${w.eq?'eq':''}">
      ${w.eq?'<div class="eq-badge">EQUIPPED</div>':''}
      <div class="wpn-icon">${w.emoji}</div>
      <div class="wpn-rare" style="color:${RARITY_COLORS[w.rarity||'common']}">${(w.rarity||'common').toUpperCase()}</div>
      <div class="wpn-name" style="color:${RARITY_COLORS[w.rarity||'common']}">${w.name}</div>
      <div class="wpn-stats">
        ATK: <b style="color:var(--cyan)">+${w.atkBonus||0}</b>
        ${w.spdBonus?`<br>SPD: <b style="color:var(--green)">+${w.spdBonus}</b>`:''}
        ${w.critBonus?`<br>CRIT: <b style="color:var(--gold)">+${w.critBonus}%</b>`:''}
        <br>Type: ${(w.type||'').toUpperCase()}
        <br>Skills: ${(WPN_SKILLS[w.type]||[]).map(s=>SKILLS[s]?.name||s).join(', ')}
      </div>
      ${!w.eq?`<button class="eq-btn" onclick="eqWpn('${w.id}')">EQUIP</button>`:''}
    </div>`).join('');
}
function eqWpn(id){
  const PL=GS.player,w=PL.weapons.find(x=>x.id===id);
  if(!w||w.eq)return;
  PL.weapons.forEach(x=>x.eq=false);w.eq=true;PL.eqType=w.type;
  savePL();renderWeapons();notify(`Equipped ${w.name}!`);snd('menu');hubRefresh();
}
function getEqWpn(){const PL=GS.player;return PL.weapons.find(w=>w.eq)||PL.weapons[0];}

// ── Skills Panel (Limit Break) ──
function renderSkills(){
  const PL=GS.player;if(!PL)return;
  const wt=PL.eqType,sids=WPN_SKILLS[wt]||[];
  el('skCon').innerHTML=`
    <div class="sk-cat">
      <h3>${WDATA[wt]?.emoji||''} ${WDATA[wt]?.name||''} Skills</h3>
      <div class="sk-grid">
        ${sids.map(sid=>{
          const sk=SKILLS[sid];
          if(sk.cinematic)return _renderCinematicSkillCard(sid,sk);
          const lv=PL.skLv[sid]||1;
          const tier=getSkillTier(lv);
          const isMax=lv>=SKILL_MAX_LV;
          const cost=isMax?0:getSkillCost(lv);
          const canLB=!isMax&&lv%5===0&&PL.gold>=cost;
          const canUpg=!isMax&&lv%5!==0&&PL.gold>=cost;
          const canUpgrade=canLB||canUpg;
          const dmg=(getSkillDmgMult(sid,lv)*100).toFixed(0);
          const nextDmg=isMax?dmg:(getSkillDmgMult(sid,lv+1)*100).toFixed(0);
          const lbName=LB_NAMES[tier];
          const isLBGate=lv%5===0&&!isMax;
          return`<div class="sk-card ${isLBGate?'lb-gate':''}">
            <div class="sk-icon" style="background:${sk.color}22;border-color:${sk.color}">${sk.em}</div>
            <div class="sk-name" style="color:${sk.color}">${sk.name}${sk.ultimate?'<span class="ult-badge">ULTIMATE</span>':''}</div>
            <div class="sk-desc">${sk.desc}</div>
            <div class="sk-tier ${isLBGate?'lb-ready':''}">${lbName}</div>
            <div class="sk-lv">Lv.<b>${lv}</b> / ${SKILL_MAX_LV}</div>
            <div class="sk-stats">
              DMG: <b style="color:var(--gold)">${dmg}%</b> → ${isMax?'MAX':nextDmg+'%'}
              | CD: ${(sk.cd/1000).toFixed(1)}s | MP: ${Math.max(1,sk.mc-(Math.floor(lv/5)))}
            </div>
            ${isLBGate&&!isMax?`<div class="lb-notice">⚡ LIMIT BREAK AVAILABLE</div>`:''}
            <button class="upg-btn ${isLBGate?'lb-btn':''}" onclick="upgSk('${sid}')" ${!canUpgrade?'disabled':''}>
              ${isMax?'✅ MAX LV.50':isLBGate?`🔓 LIMIT BREAK (💰${cost.toLocaleString()}g)`:`UPGRADE (💰${cost.toLocaleString()}g)`}
            </button>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="sk-cat" style="margin-top:1rem">
      <h3>📖 Limit Break System</h3>
      <div style="font-size:.78rem;color:var(--dim);line-height:2">
        ${LB_BONUSES.map((b,i)=>`<span style="color:${i===getSkillTier(PL.skLv[sids[0]]||1)?'var(--gold)':'var(--dim)'}">
          Tier ${i+1} (Lv.${i*5+1}-${(i+1)*5}): +${(b*100).toFixed(0)}% per level | Cost: ${LB_COSTS[i].toLocaleString()}g×lv
        </span><br>`).join('')}
        <div style="margin-top:.4rem;color:var(--cyan)">💡 Max level = 50 | At every Lv.5 milestone = Limit Break!</div>
      </div>
    </div>`;
}

// Dedicated card for scripted cinematic ultimates (e.g. Mother's Rosario) —
// these don't use the generic limit-break dmg%/level system.
function _renderCinematicSkillCard(sid,sk){
  const floorGated=typeof MRS!=='undefined'&&MRS.floorUsed&&MRS.currentFloor===GS.curRoom;
  return`<div class="sk-card sk-cinematic-card">
    <div class="sk-icon" style="background:${sk.color}22;border-color:${sk.color}">${sk.em}</div>
    <div class="sk-name" style="color:${sk.color}">${sk.name}<span class="ult-badge">CINEMATIC</span></div>
    <div class="sk-desc">${sk.desc}</div>
    <div class="sk-stats" style="text-align:left;line-height:1.7">
      💜 9× Stab — 25% each<br>
      💜 X-Slash — 60%<br>
      💜 Impact AoE — 135%
    </div>
    <div class="sk-stats">MP: <b style="color:var(--blue)">${sk.mc}</b> | Limit: <b style="color:var(--gold)">1× per floor</b></div>
    ${floorGated?`<div class="lb-notice" style="color:var(--red2)">⛔ ALREADY USED THIS FLOOR</div>`
                :`<div class="lb-notice" style="color:var(--green)">✅ READY — use from the skill wheel in-dungeon</div>`}
  </div>`;
}

function upgSk(sid){
  const PL=GS.player,sk=SKILLS[sid];if(!sk)return;
  if(sk.cinematic){notify("🌺 This ultimate can't be leveled — it's a fixed cinematic combo!");return;}
  const lv=PL.skLv[sid]||1;
  if(lv>=SKILL_MAX_LV){notify('Already MAX level 50!');return;}
  const cost=getSkillCost(lv);
  if(PL.gold<cost){notify(`Need ${cost.toLocaleString()} gold!`);return;}
  PL.gold-=cost;PL.skLv[sid]++;
  const newLv=PL.skLv[sid];
  const isNewLB=newLv%5===0;
  savePL();renderSkills();hubRefresh();snd(isNewLB?'lvup':'chest');
  notify(isNewLB?`🔓 LIMIT BREAK! ${sk.name} → Lv.${newLv}!`:`${sk.name} → Lv.${newLv}!`);
}
