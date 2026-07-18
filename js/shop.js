// ═══════════════════════════════════════════════
// shop.js — Shop, inventory, and item usage
// ═══════════════════════════════════════════════

// ── Shop Panel ──────────────────────────────────────────────────────────────

function renderShop() {
  const PL = GS.player;
  if (!PL) return;

  txt('shopGoldDisp', PL.gold);

  // Owned items row
  const inv = el('invDisplay');
  if (inv) {
    const owned = SHOP_ITEMS.filter(s => (PL.items[s.id] || 0) > 0);
    inv.innerHTML = owned.length
      ? owned.map(s => `
          <div class="inv-badge">
            ${s.em}
            <span class="inv-name">${s.name}</span>
            <span class="inv-qty">x${PL.items[s.id]}</span>
          </div>`).join('')
      : '<span style="color:var(--dim);font-size:.78rem">No items. Buy some below!</span>';
  }

  // Shop grid
  const sg = el('shopGrid');
  if (!sg) return;
  sg.innerHTML = SHOP_ITEMS.map(s => {
    const owned    = PL.items[s.id] || 0;
    const permDone = s.type === 'perm' && owned > 0;
    const maxed    = owned >= s.max && s.type !== 'perm';
    const canBuy   = PL.gold >= s.cost && !permDone && !maxed;
    const tagClr   = { hp:'#ff4444', mp:'#4488ff', both:'#aa44ff', revive:'#ffaa00', perm:'#00ff8c' }[s.type] || '#888';

    return `
      <div class="shop-card">
        <div class="shop-em">${s.em}</div>
        <div class="shop-name" style="color:${tagClr}">${s.name}</div>
        <div class="shop-desc">${s.desc}</div>
        ${s.max > 1 ? `<div class="shop-stock">Owned: ${owned}/${s.max}</div>` : ''}
        ${s.type === 'perm' ? '<div class="shop-stock" style="color:var(--cyan)">One-time only</div>' : ''}
        <button class="buy-btn" onclick="buyItem('${s.id}')"
          style="border-color:${canBuy?'var(--gold)':'var(--border)'};
                 color:${canBuy?'var(--gold)':'var(--dim)'};"
          ${!canBuy ? 'disabled' : ''}>
          💰 ${s.cost}g ${permDone?'✅ PURCHASED':maxed?'(MAX)':'BUY'}
        </button>
      </div>`;
  }).join('');
}

function buyItem(id) {
  const PL  = GS.player;
  const s   = SHOP_ITEMS.find(x => x.id === id);
  if (!s) return;

  const owned = PL.items[id] || 0;
  if (s.type === 'perm' && owned > 0)    { notify('Already purchased!');           return; }
  if (owned >= s.max && s.type !== 'perm'){ notify('Item at max capacity!');        return; }
  if (PL.gold < s.cost)                  { notify(`Need ${s.cost} gold!`);         return; }

  PL.gold -= s.cost;

  if (s.type === 'perm') {
    PL.stats[s.stat] = (PL.stats[s.stat] || 0) + s.val;
    PL.items[id]     = (PL.items[id] || 0) + 1;
    notify(`${s.em} +${s.val} ${s.stat.toUpperCase()} permanently!`);
  } else {
    PL.items[id] = (PL.items[id] || 0) + 1;
    notify(`${s.em} ${s.name} purchased!`);
  }

  snd('pickup');
  savePL();
  renderShop();
  hubRefresh();
}

// ── In-dungeon item usage ────────────────────────────────────────────────────

function useItem(id) {
  const PL = GS.player;
  const s  = SHOP_ITEMS.find(x => x.id === id);
  if (!s || !(PL.items[id] > 0)) { notify('No items!'); return; }

  const st  = PL.stats;
  let used  = false;

  if (s.type === 'hp') {
    if (st.hp >= st.maxHp) { notify('HP already full!'); return; }
    st.hp = Math.min(st.maxHp, st.hp + s.val);
    spawnDmg(PL.gx, PL.gy - 30, `+${s.val}HP`, '#ff6b6b');
    snd('heal'); used = true;

  } else if (s.type === 'mp') {
    if (st.mana >= st.maxMana) { notify('MP already full!'); return; }
    st.mana = Math.min(st.maxMana, st.mana + s.val);
    spawnDmg(PL.gx, PL.gy - 30, `+${s.val}MP`, '#4488ff');
    snd('heal'); used = true;

  } else if (s.type === 'both') {
    st.hp   = Math.min(st.maxHp,   st.hp   + s.val);
    st.mana = Math.min(st.maxMana, st.mana + (s.val2 || 100));
    spawnDmg(PL.gx, PL.gy - 30, 'ELIXIR!', '#aa44ff');
    snd('heal'); used = true;

  } else if (s.type === 'revive') {
    if (PL.activeRevive) { notify('Phoenix already active!'); return; }
    PL.activeRevive = true;
    spawnDmg(PL.gx, PL.gy - 30, '🪶 REVIVE READY', '#ffaa00');
    addParts(PL.gx, PL.gy, '#ffaa00', 18);
    notify('🪶 Phoenix Feather active — will auto-revive!');
    used = true;
  }

  if (used) {
    PL.items[id] = Math.max(0, (PL.items[id] || 0) - 1);
    const pColor = { hp:'#ff6b6b', mp:'#4488ff', both:'#aa44ff', revive:'#ffaa00' }[s.type] || '#fff';
    addParts(PL.gx, PL.gy, pColor, 12);
    updateGHUD();
    buildItemBar();
    savePL();
  }
}

// ── In-dungeon item bar ──────────────────────────────────────────────────────

function buildItemBar() {
  const bar = el('itemBar');
  if (!bar || !GS.player) return;

  // Remove old slots (keep the label)
  bar.querySelectorAll('.item-slot-dng').forEach(o => o.remove());
  bar.querySelectorAll('.rv-ind').forEach(o => o.remove());

  const usable = SHOP_ITEMS.filter(s =>
    ['hp','mp','both','revive'].includes(s.type) &&
    (GS.player.items[s.id] || 0) > 0
  );

  usable.forEach(s => {
    const d = document.createElement('div');
    d.className  = 'item-slot-dng';
    d.innerHTML  = `${s.em}<span class="item-qty">${GS.player.items[s.id]}</span>`;
    d.title      = `${s.name}: ${s.desc}`;
    d.onclick    = () => useItem(s.id);
    bar.appendChild(d);
  });

  if (GS.player.activeRevive) {
    const ri       = document.createElement('div');
    ri.className   = 'rv-ind';
    ri.textContent = '🪶ON';
    bar.appendChild(ri);
  }
}
