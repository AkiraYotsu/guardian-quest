// routes/admin.js — Admin seed endpoint
const express = require('express');
const router  = express.Router();
const User    = require('../models/User');

// ── POST /api/admin/seed ─────────────────────────────────────────
// Creates the default Yuuki Konno admin account (safe to call multiple times)
router.post('/seed', async (req, res) => {
  try {
    const username = 'yuuki konno';
    const existing = await User.findOne({ username });
    if (existing) return res.json({ ok: true, msg: 'Admin already seeded' });

    // Compute expNext for level 87
    let xn = 100;
    for (let i = 1; i < 87; i++) xn = Math.round(xn * 1.55);

    const SKILL_IDS = [
      'slash','whirlwind','multishot','piercing','fireball','blizzard',
      'groundslam','cleave','violetFlash','swordDance','motherRosario'
    ];
    const skLv = {};
    SKILL_IDS.forEach(s => { skLv[s] = 1; });
    skLv['violetFlash']    = 50;
    skLv['swordDance']     = 50;
    skLv['motherRosario']  = 50;

    const adminPlayer = {
      name: 'Yuuki', class: 'warrior', cn: 'Swordman', em: '🗡️',
      color: '#9944ff', gender: 'female', skinStyle: 'purple_red',
      level: 87, exp: 0, expNext: xn, sp: 0, gold: 314453,
      stats: { hp:7484, maxHp:7484, atk:617, def:876, spd:64, crit:72, mana:1478, maxMana:1478 },
      grow:  { hp:22, atk:4, def:5, spd:0.4, crit:0.5, mana:5 },
      spAlloc: { hp:0, atk:0, def:0, spd:0, crit:0, mana:0 },
      weapons: [{
        id: 'zekken_blade', name: 'Zekken', emoji: '🗡️', type: 'zekken',
        rarity: 'legendary', atkBonus: 300, spdBonus: 25, critBonus: 10,
        color: '#bb44ff', eq: true
      }],
      eqType: 'zekken', skLv,
      guild: { name: 'Sleeping Knight', rank: 'Legendary', level: 10, members: 7, leader: 'Yuuki' },
      items: {
        hp_sm:2, hp_lg:5, mp_sm:10, mp_lg:5, elixir:3, revive:2,
        atk_gem:1, def_gem:1, spd_gem:1, crit_gem:1
      },
      activeRevive: false, quests: null, dp: {}, isAdmin: true
    };

    await User.create({
      username,
      password: 'Zekken',
      isAdmin:  true,
      player:   adminPlayer,
    });

    return res.json({ ok: true, msg: 'Admin account seeded!' });
  } catch (err) {
    console.error('[admin/seed]', err);
    return res.json({ ok: false, msg: String(err.message || err) });
  }
});

module.exports = router;
