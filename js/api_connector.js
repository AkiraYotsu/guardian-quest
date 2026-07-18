// ═══════════════════════════════════════════════════════════════
// api_connector.js — MongoDB REST API connector
// Replaces sheets_connector.js — same interface, faster & reliable
// Backend: Express + Mongoose running on localhost:3000
// ═══════════════════════════════════════════════════════════════

const API_BASE_URL = 'https://gq-backend.vercel.app/api';

const MongoDB = {
  // ── Check if backend is reachable ──────────────────────────
  async enabled() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
      const data = await res.json();
      return data.ok && data.status === 'connected';
    } catch {
      return false;
    }
  },

  // ── POST helper ─────────────────────────────────────────────
  async _post(endpoint, body) {
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
      return await res.json();
    } catch (err) {
      console.warn(`[MongoDB] POST ${endpoint} failed:`, err.message);
      return { ok: false, offline: true, msg: err.message || 'Network error' };
    }
  },

  // ── Auth ────────────────────────────────────────────────────
  register(username, password) {
    return this._post('/register', { username, password });
  },

  login(username, password) {
    return this._post('/login', { username, password });
  },

  getPlayer(username) {
    return this._post('/getPlayer', { username });
  },

  // ── Save ────────────────────────────────────────────────────
  savePlayer(username, player) {
    return this._post('/savePlayer', {
      username,
      playerJson: JSON.stringify(player || {}),
    });
  },
};
