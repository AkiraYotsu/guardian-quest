// ═══════════════════════════════════════════════
// quests.js — Quest tracking and completion
// ═══════════════════════════════════════════════

function initQuests() {
  const PL = GS.player;
  if (!PL.quests) {
    PL.quests = {
      active  : [],
      done    : [],
      progress: {}
    };
    assignNewQuests();
  }
}

function assignNewQuests() {
  const PL   = GS.player;
  const done = PL.quests.done || [];
  const avail = QUEST_POOL.filter(q => !done.includes(q.id));
  PL.quests.active = avail.slice(0, 3).map(q => q.id);
}

// Called from combat / dungeon / shop etc.
function questTrack(type, val) {
  const PL = GS.player;
  if (!PL || !PL.quests) return;

  PL.quests.active.forEach(qid => {
    const q = QUEST_POOL.find(x => x.id === qid);
    if (!q || q.type !== type) return;
    if (PL.quests.done.includes(qid)) return;

    // Special case: combo uses the current combo value, not cumulative
    if (type === 'combo_check') {
      if (val >= q.target) completeQuest(qid);
      return;
    }

    const prog = PL.quests.progress;
    prog[qid]  = (prog[qid] || 0) + val;
    if (prog[qid] >= q.target) completeQuest(qid);
  });
}

function checkQuestLevel() {
  const PL = GS.player;
  if (!PL || !PL.quests) return;
  PL.quests.active.forEach(qid => {
    const q = QUEST_POOL.find(x => x.id === qid);
    if (!q || q.type !== 'level' || PL.quests.done.includes(qid)) return;
    if (PL.level >= q.target) completeQuest(qid);
  });
}

function checkQuestGold() {
  const PL = GS.player;
  if (!PL || !PL.quests) return;
  PL.quests.active.forEach(qid => {
    const q = QUEST_POOL.find(x => x.id === qid);
    if (!q || q.type !== 'gold' || PL.quests.done.includes(qid)) return;
    if (PL.gold >= q.target) completeQuest(qid);
  });
}

function completeQuest(qid) {
  const PL = GS.player;
  const q  = QUEST_POOL.find(x => x.id === qid);
  if (!q) return;

  PL.quests.done   = [...(PL.quests.done || []), qid];
  PL.quests.active = PL.quests.active.filter(id => id !== qid);

  if (q.reward.gold) PL.gold += q.reward.gold;
  if (q.reward.exp)  gainEXP(q.reward.exp);
  if (q.reward.item && PL.items)
    PL.items[q.reward.item] = (PL.items[q.reward.item] || 0) + 1;

  snd('chest');
  notify(`✅ QUEST: ${q.name} done! +${q.reward.gold||0}g +${q.reward.exp||0}EXP`);

  // Assign replacement quests after a short delay
  setTimeout(() => {
    if ((PL.quests.active || []).length < 2) assignNewQuests();
    savePL();
    hubRefresh();
  }, 600);
}

// ── Render quest panel ───────────────────────────────────────────────────────

function renderQuests() {
  const PL  = GS.player;
  const con = el('qCon');
  if (!con || !PL) return;

  initQuests();

  const prog   = PL.quests.progress || {};
  const active = (PL.quests.active || []).map(qid => QUEST_POOL.find(x => x.id === qid)).filter(Boolean);
  const done   = (PL.quests.done   || []).map(qid => QUEST_POOL.find(x => x.id === qid)).filter(Boolean);

  con.innerHTML = `
    <div style="margin-bottom:1.2rem">
      <div class="q-head">⚡ ACTIVE QUESTS (${active.length})</div>
      ${active.length
        ? active.map(q => {
            const cur = prog[q.id] || 0;
            const pct = clamp(cur / q.target * 100, 0, 100);
            return `
              <div class="q-card">
                <div class="q-top">
                  <b class="q-name">${q.name}</b>
                  <span class="q-cnt">${cur}/${q.target}</span>
                </div>
                <div class="q-desc">${q.desc}</div>
                <div class="q-bar"><div class="q-fill" style="width:${pct}%"></div></div>
                <div class="q-rew">
                  🏆 Reward:
                  ${q.reward.gold  ? `💰+${q.reward.gold}g ` : ''}
                  ${q.reward.exp   ? `⭐+${q.reward.exp}EXP ` : ''}
                  ${q.reward.item  ? `🎁 ${q.reward.item}` : ''}
                </div>
              </div>`;
          }).join('')
        : '<div class="q-empty">All current quests complete! New ones unlocking…</div>'
      }
    </div>
    <div>
      <div class="q-head" style="color:var(--green)">✅ COMPLETED (${done.length}/${QUEST_POOL.length})</div>
      <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.5rem">
        ${done.map(q => `<div class="q-done-badge">✓ ${q.name}</div>`).join('')}
      </div>
    </div>`;
}
