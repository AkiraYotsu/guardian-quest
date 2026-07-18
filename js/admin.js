// admin.js — Admin panel for Yuuki Konno account
function renderAdmin(){
  if(!GS.adminMode){el('pAdmin').innerHTML='<p style="color:var(--red)">Access Denied.</p>';return;}
  const PL=GS.player,s=PL.stats;
  el('pAdmin').innerHTML=`
  <div class="sec-head"><h2>⚙️ ADMIN PANEL</h2><div class="sec-div"></div></div>
  <div style="background:rgba(255,200,0,.06);border:1px solid var(--gold);border-radius:8px;padding:.7rem 1rem;margin-bottom:1.2rem;font-size:.8rem;color:var(--gold)">
    👑 Logged in as Admin: <b>${PL.name}</b> (${PL.class}) | Lv.${PL.level}
  </div>

  <!-- STATUS FLAGS -->
  <div class="admin-card">
    <div class="admin-card-title">⚙️ Status Flags</div>
    <div class="admin-flags">
      <label class="admin-flag-row">
        <span>☠️ Immortal Mode <span style="color:var(--dim);font-size:.7rem">(no HP loss)</span></span>
        <input type="checkbox" class="admin-toggle" ${GS.isImmortal?'checked':''} onchange="adminToggle('isImmortal',this.checked)">
      </label>
      <label class="admin-flag-row">
        <span>⚡ No Cooldown <span style="color:var(--dim);font-size:.7rem">(all skills instant)</span></span>
        <input type="checkbox" class="admin-toggle" ${GS.noCooldown?'checked':''} onchange="adminToggle('noCooldown',this.checked)">
      </label>
      <label class="admin-flag-row">
        <span>🔓 Unlock All Dungeons <span style="color:var(--dim);font-size:.7rem">(bypass level req)</span></span>
        <input type="checkbox" class="admin-toggle" ${GS.unlockAll?'checked':''} onchange="adminToggle('unlockAll',this.checked)">
      </label>
      <label class="admin-flag-row">
        <span>📊 Performance Monitor <span style="color:var(--dim);font-size:.7rem">(FPS/CPU~/GPU~/RAM overlay)</span></span>
        <input type="checkbox" class="admin-toggle" ${GS.showPerf?'checked':''} onchange="adminTogglePerf(this.checked)">
      </label>
    </div>
  </div>

  <!-- ECONOMY -->
  <div class="admin-card">
    <div class="admin-card-title">💰 Economy</div>
    <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">
      <span style="font-size:.82rem;color:var(--dim)">Current: <b style="color:var(--gold)">${PL.gold.toLocaleString()}g</b></span>
      <input id="adminGold" type="number" class="admin-inp" placeholder="Gold amount" value="${PL.gold}" min="0">
      <button class="admin-btn" onclick="adminSetGold()">Set Gold</button>
      <button class="admin-btn" onclick="adminAddGold(10000)">+10,000g</button>
      <button class="admin-btn" onclick="adminAddGold(100000)">+100,000g</button>
    </div>
  </div>

  <!-- STATS EDITOR -->
  <div class="admin-card">
    <div class="admin-card-title">📊 Stats Editor</div>
    <div class="admin-stats-grid">
      ${[['hp','❤️ Max HP',s.maxHp],['atk','⚔️ ATK',s.atk],['def','🛡️ DEF',s.def],
         ['spd','⚡ SPD',s.spd],['crit','💥 CRIT %',s.crit],['mana','🔮 Max MP',s.maxMana]].map(([k,l,v])=>`
        <div class="admin-stat-row">
          <label style="font-size:.78rem;color:var(--dim)">${l}</label>
          <input id="adStat_${k}" type="number" class="admin-inp" value="${v}">
        </div>`).join('')}
    </div>
    <button class="admin-btn" onclick="adminApplyStats()" style="margin-top:.6rem">Apply Stats</button>
    <button class="admin-btn" onclick="adminHealFull()" style="margin-top:.6rem;margin-left:.5rem">💊 Full Heal</button>
  </div>

  <!-- LEVEL EDITOR -->
  <div class="admin-card">
    <div class="admin-card-title">⭐ Level (Current: ${PL.level}/${LEVEL_CAP})</div>
    <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">
      <input id="adminLevel" type="number" class="admin-inp" placeholder="Level (1-${LEVEL_CAP})" value="${PL.level}" min="1" max="${LEVEL_CAP}">
      <button class="admin-btn" onclick="adminSetLevel()">Set Level</button>
      <button class="admin-btn" onclick="adminAddLevel(1)">+1 Lv</button>
      <button class="admin-btn" onclick="adminAddLevel(10)">+10 Lv</button>
    </div>
  </div>

  <!-- SKILL LEVELS -->
  <div class="admin-card">
    <div class="admin-card-title">✨ Skill Levels</div>
    <div class="admin-stats-grid">
      ${Object.keys(SKILLS).map(sid=>{const sk=SKILLS[sid];const lv=PL.skLv[sid]||1;return`
        <div class="admin-stat-row">
          <label style="font-size:.75rem;color:var(--dim)">${sk.em} ${sk.name}</label>
          <input id="adSkl_${sid}" type="number" class="admin-inp" value="${lv}" min="1" max="${SKILL_MAX_LV}">
        </div>`;}).join('')}
    </div>
    <button class="admin-btn" onclick="adminApplySkills()" style="margin-top:.6rem">Apply Skill Levels</button>
    <button class="admin-btn" onclick="adminMaxAllSkills()" style="margin-top:.6rem;margin-left:.5rem">Max All Skills (Lv.50)</button>
  </div>

  <!-- ADD INVENTORY -->
  <div class="admin-card">
    <div class="admin-card-title">🎒 Add to Inventory</div>
    <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">
      <select id="adminItemSel" class="admin-inp" style="min-width:160px">
        <optgroup label="── Weapons ──">
          ${WDROPS.map(w=>`<option value="weapon_${w.id}">${w.emoji} ${w.name} (+${w.atkBonus}atk)</option>`).join('')}
        </optgroup>
        <optgroup label="── Items ──">
          ${SHOP_ITEMS.map(s=>`<option value="item_${s.id}">${s.em} ${s.name}</option>`).join('')}
        </optgroup>
      </select>
      <input id="adminItemQty" type="number" class="admin-inp" value="1" min="1" max="99" style="width:60px">
      <button class="admin-btn" onclick="adminAddInventory()">Add</button>
    </div>
  </div>

  <button class="btn-main" onclick="savePL();notify('✅ Admin changes saved!')" style="margin-top:1rem">💾 Save All Changes</button>`;
}

function adminToggle(flag,val){
  GS[flag]=val;
  const labels={isImmortal:'☠️ Immortal',noCooldown:'⚡ No Cooldown',unlockAll:'🔓 Unlock All'};
  notify(`${labels[flag]}: ${val?'ON':'OFF'}`);
}
function adminTogglePerf(val){
  togglePerfOverlay(val);
  notify(`📊 Performance Monitor: ${val?'ON':'OFF'}`);
}
function adminSetGold(){
  const v=parseInt(el('adminGold')?.value)||0;
  GS.player.gold=Math.max(0,v);hubRefresh();savePL();
  notify(`💰 Gold set to ${v.toLocaleString()}`);renderAdmin();
}
function adminAddGold(amt){
  GS.player.gold+=amt;hubRefresh();savePL();
  notify(`💰 +${amt.toLocaleString()} gold added!`);renderAdmin();
}
function adminApplyStats(){
  const PL=GS.player,s=PL.stats;
  const keys=[['hp','maxHp'],['atk','atk'],['def','def'],['spd','spd'],['crit','crit'],['mana','maxMana']];
  keys.forEach(([k,sk])=>{
    const v=parseFloat(el('adStat_'+k)?.value);
    if(!isNaN(v)&&v>0){
      s[sk]=v;
      if(sk==='maxHp')s.hp=v;
      if(sk==='maxMana')s.mana=v;
    }
  });
  savePL();hubRefresh();notify('✅ Stats applied!');renderAdmin();
}
function adminHealFull(){
  const s=GS.player.stats;s.hp=s.maxHp;s.mana=s.maxMana;
  updateGHUD();hubRefresh();savePL();notify('💊 Fully healed!');
}
function adminSetLevel(){
  const v=parseInt(el('adminLevel')?.value)||1;
  const lv=clamp(v,1,LEVEL_CAP);
  GS.player.level=lv;savePL();hubRefresh();
  notify(`⭐ Level set to ${lv}`);renderAdmin();
}
function adminAddLevel(n){
  GS.player.level=clamp(GS.player.level+n,1,LEVEL_CAP);
  savePL();hubRefresh();notify(`⭐ Level → ${GS.player.level}`);renderAdmin();
}
function adminApplySkills(){
  Object.keys(SKILLS).forEach(sid=>{
    const v=parseInt(el('adSkl_'+sid)?.value)||1;
    GS.player.skLv[sid]=clamp(v,1,SKILL_MAX_LV);
  });
  savePL();notify('✅ Skill levels applied!');renderAdmin();
}
function adminMaxAllSkills(){
  Object.keys(SKILLS).forEach(s=>{GS.player.skLv[s]=SKILL_MAX_LV;});
  savePL();notify(`✅ All skills maxed to Lv.${SKILL_MAX_LV}!`);renderAdmin();
}
function adminAddInventory(){
  const sel=el('adminItemSel')?.value||'';
  const qty=parseInt(el('adminItemQty')?.value)||1;
  if(!sel)return;
  if(sel.startsWith('weapon_')){
    const id=sel.replace('weapon_','');
    const drop=WDROPS.find(w=>w.id===id);
    if(drop&&!GS.player.weapons.find(w=>w.id===id)){
      GS.player.weapons.push({...drop,eq:false});
      notify(`🎁 Added ${drop.name} to weapons!`);
    }else if(GS.player.weapons.find(w=>w.id===id)){
      notify('Weapon already in inventory!');
    }
  }else if(sel.startsWith('item_')){
    const id=sel.replace('item_','');
    GS.player.items[id]=(GS.player.items[id]||0)+qty;
    const itm=SHOP_ITEMS.find(s=>s.id===id);
    notify(`🎒 Added ${qty}× ${itm?.em||''} ${itm?.name||id}`);
  }
  savePL();hubRefresh();renderAdmin();
}
