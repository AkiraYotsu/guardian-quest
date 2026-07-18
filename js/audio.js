// ═══════════════════════════════════════════════
// audio.js — Synthesized sound effects engine
// ═══════════════════════════════════════════════

function initAudio() {
  if (GS.audioCtx) return;
  try {
    GS.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { /* audio not supported */ }
}

// Call on first user gesture to unlock audio context
document.addEventListener('pointerdown', () => {
  if (!GS.audioCtx) initAudio();
  if (GS.audioCtx && GS.audioCtx.state === 'suspended') GS.audioCtx.resume();
}, { once: true });

// Sound definitions: freq, duration, oscillator type, volume, optional sweep freq
const SOUNDS = {
  atk    : { f:220,  d:0.08, t:'square',   v:0.22, sw:null  },
  skill  : { f:520,  d:0.22, t:'sine',     v:0.30, sw:880   },
  hit    : { f:140,  d:0.07, t:'sawtooth', v:0.25, sw:null  },
  crit   : { f:880,  d:0.12, t:'sine',     v:0.32, sw:1200  },
  lvup   : { f:440,  d:0.60, t:'sine',     v:0.38, sw:880   },
  dead   : { f:110,  d:0.50, t:'sawtooth', v:0.32, sw:55    },
  chest  : { f:660,  d:0.25, t:'sine',     v:0.28, sw:990   },
  heal   : { f:550,  d:0.20, t:'sine',     v:0.22, sw:770   },
  dodge  : { f:300,  d:0.10, t:'square',   v:0.18, sw:null  },
  boss   : { f:80,   d:0.30, t:'sawtooth', v:0.38, sw:null  },
  pickup : { f:660,  d:0.15, t:'sine',     v:0.25, sw:990   },
  menu   : { f:440,  d:0.12, t:'sine',     v:0.20, sw:550   },
  swordSlash: { f:680, d:0.16, t:'sine', v:0.30, sw:150 }
};

function snd(type) {
  const ac = GS.audioCtx;
  if (!ac) return;
  const s = SOUNDS[type];
  if (!s) return;
  try {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = s.t;
    osc.frequency.setValueAtTime(s.f, ac.currentTime);
    if (s.sw) osc.frequency.exponentialRampToValueAtTime(s.sw, ac.currentTime + s.d);
    gain.gain.setValueAtTime(s.v, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + s.d);
    osc.start();
    osc.stop(ac.currentTime + s.d + 0.05);
  } catch (e) { /* ignore errors */ }
}
