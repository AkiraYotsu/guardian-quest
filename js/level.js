// level.js — EXP, level up (cap 100), limit break system
function gainEXP(amt){
  const PL=GS.player;if(!PL)return;
  if(PL.level>=LEVEL_CAP)return;
  if(PL.guild)amt=Math.round(amt*1.05);
  PL.exp+=amt;
  while(PL.exp>=PL.expNext&&PL.level<LEVEL_CAP){PL.exp-=PL.expNext;doLvUp();}
  if(PL.level>=LEVEL_CAP)PL.exp=0;
}
function doLvUp(){
  const PL=GS.player;
  if(PL.level>=LEVEL_CAP){PL.exp=0;return;}
  PL.level++;PL.sp+=3;
  PL.expNext=Math.round(PL.expNext*1.55);
  const g=PL.grow;
  PL.stats.maxHp+=g.hp;PL.stats.hp=PL.stats.maxHp;
  PL.stats.atk+=g.atk;PL.stats.def+=g.def;
  PL.stats.spd+=g.spd;PL.stats.crit+=g.crit;
  PL.stats.maxMana+=g.mana;PL.stats.mana=PL.stats.maxMana;
  checkQuestLevel();snd('lvup');
  triggerLvUpAnim(PL.level);
  notify(`🌟 LEVEL UP! Now Lv.${PL.level}${PL.level>=LEVEL_CAP?' (MAX)':''}! +3 Stat Points`,'#ffd84d');
  savePL();
}
function triggerLvUpAnim(level){
  const PL=GS.player;
  GS.lvupAnim={active:true,timer:3000,level};
  for(let i=0;i<35;i++){
    const a=Math.random()*Math.PI*2,sp=rnd(60,200),life=rnd(600,1200);
    GS.parts.push({x:PL.gx,y:PL.gy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
      color:i%3===0?'#ffd84d':i%3===1?'#ffffff':'#cc44ff',sz:rnd(2,5),life,ml:life});
  }
  addFX(PL.gx,PL.gy,'#ffd84d',70,800);addFX(PL.gx,PL.gy,'#ffffff',50,600);
}
