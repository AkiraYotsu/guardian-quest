// ═══════════════════════════════════════════════
// perf.js — Lightweight performance monitor
// ═══════════════════════════════════════════════
//  Browsers don't expose real hardware CPU/GPU usage to JS for security
//  reasons, so "CPU~"/"GPU~" here are approximations derived from frame
//  timing (how much of the 16.67ms/frame budget the JS thread / the
//  render calls actually used) — clearly labeled with a "~" as estimates,
//  not real hardware telemetry. RAM uses performance.memory (Chrome-only
//  non-standard API); falls back to "n/a" elsewhere.
//  Toggle via the Admin Panel → Performance Monitor checkbox.
// ═══════════════════════════════════════════════

const PERF = {
  frames:[],        // rolling buffer of frame end-timestamps (ms)
  fps:0,
  frameTimeMs:0,     // total JS time for the last full frame (update+render)
  renderTimeMs:0,    // time spent specifically inside render()/mrRender()
  _fStart:0,
  _rStart:0,
};

function perfFrameStart(){ PERF._fStart = performance.now(); }
function perfFrameEnd(){
  const now = performance.now();
  PERF.frameTimeMs = now - PERF._fStart;
  PERF.frames.push(now);
  while(PERF.frames.length>30) PERF.frames.shift();
  if(PERF.frames.length>=2){
    const span = PERF.frames[PERF.frames.length-1]-PERF.frames[0];
    PERF.fps = span>0 ? Math.round((PERF.frames.length-1)*1000/span) : 0;
  }
}
function perfRenderStart(){ PERF._rStart = performance.now(); }
function perfRenderEnd(){ PERF.renderTimeMs = performance.now()-PERF._rStart; }

function perfGetHeapMB(){
  if(performance.memory){
    return{
      used:(performance.memory.usedJSHeapSize/1048576).toFixed(1),
      total:(performance.memory.totalJSHeapSize/1048576).toFixed(1),
      supported:true
    };
  }
  return{used:'-',total:'-',supported:false};
}

function togglePerfOverlay(show){
  GS.showPerf=show;
  const box=el('perfOverlay');
  if(box)box.style.display=show?'block':'none';
}

function updatePerfOverlay(){
  if(!GS.showPerf)return;
  const box=el('perfOverlay');
  if(!box)return;
  const mem=perfGetHeapMB();
  const cpuPct=Math.min(100,Math.round((PERF.frameTimeMs/16.67)*100));
  const gpuPct=Math.min(100,Math.round((PERF.renderTimeMs/16.67)*100));
  const fpsColor=PERF.fps>=50?'#5f5':PERF.fps>=30?'#fd5':'#f55';
  box.innerHTML=
    `<span style="color:${fpsColor}">FPS ${PERF.fps}</span>  `+
    `Frame ${PERF.frameTimeMs.toFixed(1)}ms<br>`+
    `CPU~ ${cpuPct}%  GPU~ ${gpuPct}%<br>`+
    `RAM ${mem.supported?mem.used+'/'+mem.total+'MB':'n/a'}`;
}
