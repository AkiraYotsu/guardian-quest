// ═══════════════════════════════════════════════
// particles.js — Particles, FX rings, damage numbers
// ═══════════════════════════════════════════════

function addParts(x, y, color, n = 8) {
  for (let i = 0; i < n; i++) {
    const a  = Math.random() * Math.PI * 2;
    const sp = rnd(55, 160);
    const life = rnd(380, 760);
    GS.parts.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, color, sz: rnd(1.5, 4), life, ml: life });
  }
}

function addFX(x, y, color, r, dur) {
  GS.fxList.push({ x, y, color, r, t: dur, mt: dur });
}

function spawnDmg(x, y, txt, color) {
  GS.dmgNums.push({ x, y, text: String(txt), color, life: 950, vy: -0.55, sz: 14 });
}

// ── Update helpers (called each frame) ──────────────────────────────────────

function updateParticles(dt) {
  GS.parts = GS.parts.filter(p => {
    p.x  += p.vx * dt;
    p.y  += p.vy * dt;
    p.vx *= 0.93;
    p.vy *= 0.93;
    p.life -= dt * 1000;
    return p.life > 0;
  });
}

function updateFX(dt) {
  GS.fxList = GS.fxList.filter(f => { f.t -= dt * 1000; return f.t > 0; });
}

function updateDmgNums(dt) {
  GS.dmgNums = GS.dmgNums.filter(d => {
    d.y    += d.vy * dt * 60;
    d.life -= dt * 1000;
    return d.life > 0;
  });
}

// ── Draw helpers (called by renderer) ──────────────────────────────────────

function drawFX(ctx) {
  GS.fxList.forEach(f => {
    const p = f.t / f.mt;
    ctx.strokeStyle  = f.color;
    ctx.lineWidth    = 2.5;
    ctx.globalAlpha  = p * 0.7;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r * (1.3 - p * 0.3), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha  = p * 0.28;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r * 0.55 * (1.4 - p * 0.4), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha  = 1;
  });
}

function drawParticles(ctx) {
  GS.parts.forEach(p => {
    const a = p.life / p.ml;
    ctx.fillStyle   = p.color;
    ctx.globalAlpha = a * 0.85;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.sz * a, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawDmgNums(ctx) {
  GS.dmgNums.forEach(d => {
    const a   = d.life / 950;
    const fsz = d.sz + Math.round((1 - a) * 5);
    ctx.globalAlpha  = a;
    ctx.font         = `bold ${fsz}px Courier New`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle  = 'rgba(0,0,0,.85)';
    ctx.lineWidth    = 3;
    ctx.strokeText(d.text, d.x, d.y);
    ctx.fillStyle    = d.color;
    ctx.fillText(d.text, d.x, d.y);
  });
  ctx.globalAlpha = 1;
}
