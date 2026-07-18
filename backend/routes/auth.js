// routes/auth.js — Register, Login, Logout
const express = require('express');
const router  = express.Router();
const User    = require('../models/User');

// ── POST /api/register ───────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.json({ ok: false, msg: 'Username and password required' });

    const u = username.trim().toLowerCase();
    if (u.length < 3)
      return res.json({ ok: false, msg: 'Username ≥ 3 chars' });
    if (password.length < 4)
      return res.json({ ok: false, msg: 'Password ≥ 4 chars' });

    const existing = await User.findOne({ username: u });
    if (existing)
      return res.json({ ok: false, msg: 'Username already taken' });

    const user = await User.create({
      username: u,
      password,           // plain text — same as original
      player:   null,
    });

    return res.json({ ok: true, createdAt: user.createdAt });
  } catch (err) {
    console.error('[register]', err);
    return res.json({ ok: false, msg: String(err.message || err) });
  }
});

// ── POST /api/login ──────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.json({ ok: false, msg: 'Fill all fields' });

    const u    = username.trim().toLowerCase();
    const user = await User.findOne({ username: u });
    if (!user)
      return res.json({ ok: false, msg: 'Wrong username or password' });

    if (user.password !== password)
      return res.json({ ok: false, msg: 'Wrong username or password' });

    user.lastLoginAt = new Date();
    await user.save();

    // Convert Mongoose Maps back to plain objects for the frontend
    const player = user.player ? _toPlain(user.player.toObject()) : null;

    return res.json({
      ok:          true,
      username:    user.username,
      isAdmin:     user.isAdmin,
      createdAt:   user.createdAt,
      lastLoginAt: user.lastLoginAt,
      player,
    });
  } catch (err) {
    console.error('[login]', err);
    return res.json({ ok: false, msg: String(err.message || err) });
  }
});

// ── POST /api/getPlayer ──────────────────────────────────────────
router.post('/getPlayer', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.json({ ok: false, msg: 'Username required' });

    const user = await User.findOne({ username: username.trim().toLowerCase() });
    if (!user) return res.json({ ok: true, player: null });

    const player = user.player ? _toPlain(user.player.toObject()) : null;
    return res.json({ ok: true, player });
  } catch (err) {
    console.error('[getPlayer]', err);
    return res.json({ ok: false, msg: String(err.message || err) });
  }
});

// ── POST /api/savePlayer ─────────────────────────────────────────
router.post('/savePlayer', async (req, res) => {
  try {
    const { username, playerJson } = req.body;
    if (!username) return res.json({ ok: false, msg: 'Username required' });

    const u      = username.trim().toLowerCase();
    const player = playerJson ? JSON.parse(playerJson) : null;

    const result = await User.findOneAndUpdate(
      { username: u },
      { $set: { player, lastSaveAt: new Date() } },
      { new: true, upsert: false }
    );

    if (!result) return res.json({ ok: false, msg: 'User not found' });

    return res.json({ ok: true, savedAt: new Date() });
  } catch (err) {
    console.error('[savePlayer]', err);
    return res.json({ ok: false, msg: String(err.message || err) });
  }
});

// ── Helper: convert Mongoose Maps → plain JS objects ─────────────
// Mongoose stores Map fields as ES6 Map; the frontend expects plain {}
function _toPlain(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj instanceof Map) {
    const out = {};
    obj.forEach((v, k) => { out[k] = _toPlain(v); });
    return out;
  }
  if (Array.isArray(obj)) return obj.map(_toPlain);
  const out = {};
  for (const key of Object.keys(obj)) {
    if (key === '__v' || key === '_id') continue;
    out[key] = _toPlain(obj[key]);
  }
  return out;
}

module.exports = router;
