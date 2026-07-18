// ═══════════════════════════════════════════════════════════════
// weapon_visual.js — Zekken sword sprite + basic-attack swing system
// ═══════════════════════════════════════════════════════════════
//  Only activates when the equipped weapon type is 'zekken'. Every other
//  weapon type keeps the original emoji-based rendering + circular-area
//  basic attack untouched — this module is purely additive.
//
//  Contains:
//   • Image asset loading + a generic pivot-correct draw primitive
//     (drawZekkenSword) usable by both the normal renderer and the
//     Mother's Rosario cinematic for its own sword choreography.
//   • The new fan-shaped ("kipas") swing basic-attack: press → the blade
//     sweeps through an arc → damage lands on whoever the arc touches,
//     timed to the midpoint of the swing motion.
// ═══════════════════════════════════════════════════════════════

// ─── IMAGE ASSET ────────────────────────────────────────────────
const ZEKKEN_IMG = new Image();
let ZEKKEN_IMG_READY = false;
ZEKKEN_IMG.onload  = () => { ZEKKEN_IMG_READY = true; };
ZEKKEN_IMG.onerror = () => { ZEKKEN_IMG_READY = false; };
ZEKKEN_IMG.src = 'assets/weapons/zekken_sword.png';

// Calibration measured directly from the source asset: where the grip
// (pommel) sits within the image, the blade's own inherent diagonal angle,
// and its pommel→tip length — all in the image's unrotated pixel space.
const ZEKKEN_IMG_GRIP      = { x: 3.91, y: 3.31 };
const ZEKKEN_IMG_ANGLE     = 0.765712;   // radians (~43.9°)
const ZEKKEN_IMG_BLADE_LEN = 410.31;     // px, pommel→tip in the source image

const SWORD_DRAW_LEN = 78;               // desired rendered blade length in-game
const SWORD_SCALE    = SWORD_DRAW_LEN / ZEKKEN_IMG_BLADE_LEN;

// ─── GENERIC DRAW PRIMITIVE ─────────────────────────────────────
// Draws the sword so its GRIP sits at world (px,py) and the blade points
// along `angle` — regardless of the source image's own inherent tilt.
// Returns false (does nothing) if the image hasn't finished loading yet,
// so callers can fall back to the emoji glyph during that brief window.
function drawZekkenSword(ctx, px, py, angle, alpha){
  if(!ZEKKEN_IMG_READY) return false;
  ctx.save();
  if(alpha !== undefined) ctx.globalAlpha = alpha;
  ctx.translate(px, py);
  ctx.rotate(angle - ZEKKEN_IMG_ANGLE);
  ctx.scale(SWORD_SCALE, SWORD_SCALE);
  ctx.drawImage(ZEKKEN_IMG, -ZEKKEN_IMG_GRIP.x, -ZEKKEN_IMG_GRIP.y);
  ctx.restore();
  if(alpha !== undefined) ctx.globalAlpha = 1;
  return true;
}

// ─── IDLE / DEFAULT GRIP POSE ───────────────────────────────────
function zekkenIdlePose(PL){
  const a = GS.lastAngle || 0;
  return {
    px: PL.gx + Math.cos(a)*6 + 9,
    py: PL.gy + Math.sin(a)*6 - 3,
    angle: a - 0.30
  };
}

// ─── BASIC ATTACK: fan-shaped swing (Zekken only) ───────────────
const SWING_ARC_HALF = 55 * Math.PI/180; // ~110° total fan
const SWING_RANGE    = 95;               // reach — wider than the old 88px area-hit
const SWING_DUR       = 260;             // ms, full swing animation length
const SWING_HIT_AT    = 0.45;            // fraction through the swing when the blade "touches" targets

const WSW = { active:false, t:0, startAngle:0, endAngle:0, hitDone:false };

function startSwordSwing(facingAngle){
  WSW.active = true; WSW.t = 0; WSW.hitDone = false;
  WSW.startAngle = facingAngle - SWING_ARC_HALF;
  WSW.endAngle   = facingAngle + SWING_ARC_HALF;
}

// Called once per frame from main.js's update() loop — advances the swing
// and fires the hit at the calibrated moment (blade near the swing's middle).
function tickSwordSwing(dt){
  if(!WSW.active) return;
  WSW.t += dt*1000;
  if(!WSW.hitDone && WSW.t >= SWING_DUR*SWING_HIT_AT){
    WSW.hitDone = true;
    applySwordSwingHit();
  }
  if(WSW.t >= SWING_DUR) WSW.active = false;
}

function getSwordSwingAngle(){
  const p = clamp(WSW.t/SWING_DUR, 0, 1);
  const eased = 1 - Math.pow(1-p, 2); // fast start, settles into the end angle
  return WSW.startAngle + (WSW.endAngle - WSW.startAngle) * eased;
}

// Cone hit-test: is a monster within this swing's fan (angle window + range)?
function hitTestCone(px, py, facingAngle, arcHalf, range, mx, my, mRadius){
  const dx = mx-px, dy = my-py;
  const d  = Math.hypot(dx, dy);
  if(d > range+mRadius) return false;
  let diff = Math.atan2(dy, dx) - facingAngle;
  while(diff >  Math.PI) diff -= Math.PI*2;
  while(diff < -Math.PI) diff += Math.PI*2;
  const tolerance = d > 0 ? Math.atan2(mRadius, d) : Math.PI;
  return Math.abs(diff) <= (arcHalf + tolerance);
}

function applySwordSwingHit(){
  const PL = GS.player;
  const { atk:baseAtk, crit } = getEffectiveStats();
  const facingMid = (WSW.startAngle + WSW.endAngle) / 2;
  GS.monsters.forEach(m => {
    if(m.hp <= 0) return;
    if(hitTestCone(PL.gx, PL.gy, facingMid, SWING_ARC_HALF, SWING_RANGE, m.x, m.y, m.sz/2)){
      const isCrit = Math.random()*100 < crit;
      const dmg = Math.max(1, Math.round(baseAtk*(isCrit?1.5:1) - m.def*0.28) + rndI(5));
      hitMon(m, dmg, isCrit);
    }
  });
  addFX(PL.gx, PL.gy, '#e8e8ff', SWING_RANGE*0.55, 200);
  addParts(PL.gx, PL.gy, '#cfd6ff', 6);
}
