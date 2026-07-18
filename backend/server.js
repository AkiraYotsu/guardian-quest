// server.js — Guardian Quest RPG Backend (Express + MongoDB/Mongoose)
require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');

const authRoutes  = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const User        = require('./models/User');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Routes ───────────────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    ok:     true,
    status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    db:     mongoose.connection.name || 'unknown',
    time:   new Date().toISOString(),
  });
});

// ── Auto-seed admin on first startup ────────────────────────────
async function seedAdminIfNeeded() {
  const exists = await User.findOne({ username: 'yuuki konno' });
  if (exists) return;

  let xn = 100;
  for (let i = 1; i < 87; i++) xn = Math.round(xn * 1.55);

  const SKILL_IDS = [
    'slash','whirlwind','multishot','piercing','fireball','blizzard',
    'groundslam','cleave','violetFlash','swordDance','motherRosario'
  ];
  const skLv = {};
  SKILL_IDS.forEach(s => { skLv[s] = 1; });
  skLv['violetFlash']   = 50;
  skLv['swordDance']    = 50;
  skLv['motherRosario'] = 50;

  await User.create({
    username: 'yuuki konno',
    password: 'Zekken',
    isAdmin:  true,
    player: {
      name:'Yuuki', class:'warrior', cn:'Swordman', em:'🗡️',
      color:'#9944ff', gender:'female', skinStyle:'purple_red',
      level:87, exp:0, expNext:xn, sp:0, gold:314453,
      stats:{ hp:7484, maxHp:7484, atk:617, def:876, spd:64, crit:72, mana:1478, maxMana:1478 },
      grow:{ hp:22, atk:4, def:5, spd:0.4, crit:0.5, mana:5 },
      spAlloc:{ hp:0, atk:0, def:0, spd:0, crit:0, mana:0 },
      weapons:[{
        id:'zekken_blade', name:'Zekken', emoji:'🗡️', type:'zekken',
        rarity:'legendary', atkBonus:300, spdBonus:25, critBonus:10, color:'#bb44ff', eq:true
      }],
      eqType:'zekken', skLv,
      guild:{ name:'Sleeping Knight', rank:'Legendary', level:10, members:7, leader:'Yuuki' },
      items:{ hp_sm:2, hp_lg:5, mp_sm:10, mp_lg:5, elixir:3, revive:2,
              atk_gem:1, def_gem:1, spd_gem:1, crit_gem:1 },
      activeRevive:false, quests:null, dp:{}, isAdmin:true
    },
  });
  console.log('✅ Admin "yuuki konno" seeded (pw: Zekken)');
}

// ── Start ────────────────────────────────────────────────────────
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB connected → ${mongoose.connection.name}`);

    await seedAdminIfNeeded();

    app.listen(PORT, () => {
      console.log(`🚀 Guardian Quest Backend  →  http://localhost:${PORT}`);
      console.log(`   Health check            →  http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  }
}

start();
