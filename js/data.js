// data.js — All game constants

// ── Gender Definitions ──
const GENDERS = [
  { id:'male',   name:'Male',   emoji:'♂️',
    desc:'Higher HP, ATK & DEF',
    mod:{ hp:1.12, atk:1.10, def:1.12, spd:1.0,  crit:1.0,  mana:1.0  } },
  { id:'female', name:'Female', emoji:'♀️',
    desc:'Higher SPD, CRIT & MP',
    mod:{ hp:1.0,  atk:1.0,  def:1.0,  spd:1.15, crit:1.18, mana:1.20 } }
];

const CLASSES=[
  {id:'warrior',name:'Warrior',emoji:'🗡️',color:'#e84040',sw:'sword',
   desc:'Tank melee fighter with high HP and DEF',
   cs:'HP ★★★★★  ATK ★★★  DEF ★★★★  SPD ★★',
   base:{hp:160,maxHp:160,atk:28,def:22,spd:5,crit:5,mana:60,maxMana:60},
   grow:{hp:22,atk:4,def:5,spd:0.4,crit:0.5,mana:5}},
  {id:'archer',name:'Archer',emoji:'🏹',color:'#40cc40',sw:'bow',
   desc:'Swift ranged fighter with high CRIT & SPD',
   cs:'HP ★★★  ATK ★★★★  DEF ★★  SPD ★★★★★',
   base:{hp:110,maxHp:110,atk:24,def:12,spd:9,crit:18,mana:80,maxMana:80},
   grow:{hp:13,atk:5,def:2,spd:0.8,crit:1.5,mana:8}},
  {id:'mage',name:'Mage',emoji:'🔮',color:'#9944ff',sw:'staff',
   desc:'Arcane blaster with massive AoE spells',
   cs:'HP ★★  ATK ★★★★★  DEF ★  SPD ★★★',
   base:{hp:85,maxHp:85,atk:36,def:7,spd:6,crit:10,mana:160,maxMana:160},
   grow:{hp:8,atk:8,def:1,spd:0.3,crit:1.2,mana:18}},
  {id:'berserker',name:'Berserker',emoji:'🪓',color:'#ff7700',sw:'axe',
   desc:'Rage-fueled brawler with the highest raw ATK',
   cs:'HP ★★★★  ATK ★★★★★  DEF ★★★  SPD ★★★',
   base:{hp:130,maxHp:130,atk:40,def:16,spd:7,crit:9,mana:70,maxMana:70},
   grow:{hp:18,atk:7,def:3,spd:0.6,crit:0.9,mana:6}}
];

const WDATA={
  sword:  {name:'Iron Sword',  emoji:'⚔️',  color:'#aaaaaa',type:'sword'},
  bow:    {name:'Wood Bow',    emoji:'🏹',  color:'#8B4513',type:'bow'},
  staff:  {name:'Oak Staff',   emoji:'🔮',  color:'#9944ff',type:'staff'},
  axe:    {name:'War Axe',     emoji:'🪓',  color:'#cc4400',type:'axe'},
  zekken: {name:'Zekken',      emoji:'🗡️',  color:'#bb44ff',type:'zekken'}
};

// Limit break bonus per level (tier 0-9, every 5 levels)
const LB_BONUSES=[0.20,0.35,0.50,0.65,0.80,1.00,1.25,1.50,1.80,2.20];
const LB_COSTS=  [50,  200, 500, 1000,2000,4000,8000,15000,30000,60000];
const LB_NAMES=  ['Standard','Limit Break I ★','Limit Break II ★★','Limit Break III ★★★',
                  'Limit Break IV ★★★★','Limit Break V ★★★★★','Limit Break VI','Limit Break VII',
                  'Limit Break VIII','Limit Break IX ★MAX★'];
const SKILL_MAX_LV=50;

function getSkillDmgMult(sid,lv){
  const sk=SKILLS[sid]; if(!sk)return 1;
  let total=0;
  for(let i=1;i<lv;i++){
    const tier=Math.min(Math.floor((i-1)/5),LB_BONUSES.length-1);
    total+=LB_BONUSES[tier];
  }
  return sk.dm+total;
}
function getSkillCost(lv){
  const tier=Math.min(Math.floor((lv-1)/5),LB_COSTS.length-1);
  return LB_COSTS[tier]*lv;
}
function getSkillTier(lv){ return Math.min(Math.floor((lv-1)/5),LB_NAMES.length-1); }

const SKILLS={
  slash:      {id:'slash',     name:'Slash',       em:'💫',w:'sword',desc:'Quick slash – 150% ATK',         mc:10,cd:2000,dm:1.5,r:88, ar:88, color:'#00ffff',aoe:false,maxLv:SKILL_MAX_LV,lb:0.20,k:'1'},
  whirlwind:  {id:'whirlwind', name:'Whirlwind',   em:'🌀',w:'sword',desc:'Spin, hits all nearby – 120% ATK',mc:25,cd:5000,dm:1.2,r:105,ar:105,color:'#00ccff',aoe:true, maxLv:SKILL_MAX_LV,lb:0.25,k:'2'},
  multishot:  {id:'multishot', name:'Multi Shot',  em:'🏹',w:'bow',  desc:'3 arrows – 80% ATK each',        mc:20,cd:3000,dm:0.8,r:260,ar:80, color:'#ffff44',aoe:false,maxLv:SKILL_MAX_LV,lb:0.15,k:'1',pc:3},
  piercing:   {id:'piercing',  name:'Piercing Shot',em:'⚡',w:'bow',  desc:'Pierces enemies – 200% ATK',     mc:15,cd:4000,dm:2.0,r:320,ar:60, color:'#ff8800',aoe:false,maxLv:SKILL_MAX_LV,lb:0.30,k:'2'},
  fireball:   {id:'fireball',  name:'Fireball',    em:'🔥',w:'staff',desc:'Explosive AoE – 220% ATK',       mc:25,cd:3000,dm:2.2,r:200,ar:72, color:'#ff4400',aoe:true, maxLv:SKILL_MAX_LV,lb:0.30,k:'1'},
  blizzard:   {id:'blizzard',  name:'Blizzard',    em:'❄️',w:'staff',desc:'Ice storm, slows all – 150% ATK',mc:30,cd:7000,dm:1.5,r:175,ar:105,color:'#00ccff',aoe:true, maxLv:SKILL_MAX_LV,lb:0.20,k:'2',slows:true},
  groundslam: {id:'groundslam',name:'Ground Slam', em:'💥',w:'axe',  desc:'Shockwave AoE – 250% ATK',       mc:20,cd:4000,dm:2.5,r:100,ar:95, color:'#aa5500',aoe:true, maxLv:SKILL_MAX_LV,lb:0.30,k:'1'},
  cleave:     {id:'cleave',    name:'Cleave',      em:'🌊',w:'axe',  desc:'Wide front arc – 180% ATK',      mc:18,cd:3500,dm:1.8,r:112,ar:112,color:'#cc2200',aoe:true, maxLv:SKILL_MAX_LV,lb:0.25,k:'2'},
  // Zekken exclusive skills
  violetFlash:{id:'violetFlash',name:'Violet Flash',em:'💜',w:'zekken',desc:'Lightning purple strike – 250% ATK',mc:20,cd:2500,dm:2.5,r:100,ar:80,color:'#9944ff',aoe:false,maxLv:SKILL_MAX_LV,lb:0.25,k:'1'},
  swordDance: {id:'swordDance',name:'Sword Dance', em:'🌸',w:'zekken',desc:'Dancing blade AoE – 200% ATK', mc:30,cd:5000,dm:2.0,r:120,ar:120,color:'#cc44ff',aoe:true, maxLv:SKILL_MAX_LV,lb:0.30,k:'2'},
  motherRosario:{id:'motherRosario',name:"Mother's Rosario",em:'🌺',w:'zekken',
    desc:'11-hit cinematic ultimate — 9 stabs (25%), X-slash (60%), impact (135%)',mc:350,cd:0,dm:0.25,r:105,ar:105,
    color:'#bb44ff',aoe:false,maxLv:SKILL_MAX_LV,lb:0,k:'3',hits:11,ultimate:true,cinematic:true}
};

const WPN_SKILLS={
  sword:  ['slash','whirlwind'],
  bow:    ['multishot','piercing'],
  staff:  ['fireball','blizzard'],
  axe:    ['groundslam','cleave'],
  zekken: ['motherRosario','violetFlash','swordDance']
};

const DUNGEONS=[
  {id:'cave',  name:'Dark Cave',     em:'🕳️',diff:'easy',dl:'EASY',  dc:'d-easy',rooms:6, minLv:1, mons:['goblin','bat','slime'],    boss:'golem', colors:{fl:'#2a2a3a',fl2:'#252535',wall:'#1a1a2a',wt:'#303358'}},
  {id:'forest',name:'Shadow Forest', em:'🌲',diff:'norm',dl:'NORMAL',dc:'d-norm',rooms:8, minLv:5, mons:['goblin','skeleton','orc'],  boss:'golem', colors:{fl:'#2a3a2a',fl2:'#253025',wall:'#1a2a1a',wt:'#334433'}},
  {id:'temple',name:'Ancient Temple',em:'🏛️',diff:'hard',dl:'HARD',  dc:'d-hard',rooms:10,minLv:15,mons:['skeleton','orc','bat'],    boss:'dragon',colors:{fl:'#3a2a1a',fl2:'#302518',wall:'#2a1a0a',wt:'#554433'}},
  {id:'void',  name:'Void Realm',    em:'🌑',diff:'ext', dl:'EXTREME',dc:'d-ext', rooms:15,minLv:30,mons:['orc','skeleton','bat'],   boss:'dragon',colors:{fl:'#1a0a2a',fl2:'#150818',wall:'#100020',wt:'#220044'}}
];

// FIX #4: Reduced boss damage significantly
const MDATA={
  goblin:  {name:'Goblin',        color:'#33aa33',sz:22,hp:45,  atk:9, def:3, spd:115,exp:15, gold:5,  ai:'agg'},
  orc:     {name:'Orc',           color:'#557722',sz:32,hp:130, atk:22,def:13,spd:68, exp:40, gold:15, ai:'tank'},
  bat:     {name:'Bat',           color:'#882288',sz:18,hp:32,  atk:8, def:1, spd:165,exp:12, gold:4,  ai:'err'},
  skeleton:{name:'Skeleton',      color:'#cccccc',sz:26,hp:75,  atk:16,def:6, spd:88, exp:28, gold:10, ai:'agg'},
  slime:   {name:'Slime',         color:'#00ffaa',sz:20,hp:55,  atk:5, def:2, spd:48, exp:9,  gold:5,  ai:'pass'},
  golem:   {name:'Stone Golem',   color:'#889999',sz:42,hp:600, atk:22,def:28,spd:42, exp:220,gold:85, ai:'boss',boss:true},
  dragon:  {name:'Ancient Dragon',color:'#ff2200',sz:46,hp:1200,atk:30,def:18,spd:63, exp:550,gold:220,ai:'boss',boss:true}
};

const WDROPS=[
  {id:'steel_sword',  name:'Steel Sword',  emoji:'⚔️',  type:'sword',rarity:'uncommon',atkBonus:22,price:320},
  {id:'flame_sword',  name:'Flame Sword',  emoji:'🔥⚔', type:'sword',rarity:'rare',    atkBonus:48,price:900},
  {id:'shadow_blade', name:'Shadow Blade', emoji:'🌑⚔', type:'sword',rarity:'epic',    atkBonus:80,price:2200},
  {id:'hunter_bow',   name:'Hunter Bow',   emoji:'🏹',  type:'bow',  rarity:'uncommon',atkBonus:20,price:300},
  {id:'eagle_bow',    name:'Eagle Bow',    emoji:'🦅',  type:'bow',  rarity:'rare',    atkBonus:44,price:850},
  {id:'void_bow',     name:'Void Bow',     emoji:'🌑🏹',type:'bow',  rarity:'epic',    atkBonus:75,price:2100},
  {id:'magic_staff',  name:'Magic Staff',  emoji:'🔮',  type:'staff',rarity:'uncommon',atkBonus:25,price:360},
  {id:'arcane_staff', name:'Arcane Staff', emoji:'✨🔮',type:'staff',rarity:'rare',    atkBonus:55,price:950},
  {id:'war_axe',      name:'War Axe',      emoji:'🪓',  type:'axe',  rarity:'uncommon',atkBonus:28,price:340},
  {id:'dragon_axe',   name:'Dragon Axe',   emoji:'🐉🪓',type:'axe',  rarity:'rare',    atkBonus:58,price:1000}
];

const SHOP_ITEMS=[
  {id:'hp_sm',   name:'HP Potion S',    em:'🧪',desc:'Restore 60 HP',            cost:30, type:'hp',    val:60,  max:10},
  {id:'hp_lg',   name:'HP Potion L',    em:'❤️', desc:'Restore 200 HP',           cost:90, type:'hp',    val:200, max:5},
  {id:'mp_sm',   name:'MP Potion S',    em:'💧', desc:'Restore 50 MP',            cost:25, type:'mp',    val:50,  max:10},
  {id:'mp_lg',   name:'MP Potion L',    em:'🔮', desc:'Restore 160 MP',           cost:75, type:'mp',    val:160, max:5},
  {id:'elixir',  name:'Elixir',         em:'✨', desc:'Restore 120 HP & 100 MP',  cost:130,type:'both',  val:120, val2:100,max:3},
  {id:'revive',  name:'Phoenix Feather',em:'🪶', desc:'Auto-revive once',          cost:220,type:'revive',max:2},
  {id:'atk_gem', name:'Attack Gem',     em:'💎', desc:'Permanently +5 ATK',        cost:500,type:'perm',  stat:'atk', val:5,max:1},
  {id:'def_gem', name:'Defense Gem',    em:'🔵', desc:'Permanently +5 DEF',        cost:400,type:'perm',  stat:'def', val:5,max:1},
  {id:'spd_gem', name:'Speed Gem',      em:'💚', desc:'Permanently +2 SPD',        cost:350,type:'perm',  stat:'spd', val:2,max:1},
  {id:'crit_gem',name:'Crit Gem',       em:'🔴', desc:'Permanently +5% CRIT',      cost:450,type:'perm',  stat:'crit',val:5,max:1}
];

const QUEST_POOL=[
  {id:'q_kill10', name:'Monster Hunter', desc:'Kill 10 monsters',          type:'kill', target:10, reward:{gold:80,exp:50}},
  {id:'q_kill25', name:'Slayer',         desc:'Kill 25 monsters',          type:'kill', target:25, reward:{gold:200,exp:120}},
  {id:'q_chest3', name:'Treasure Seeker',desc:'Open 3 chests',             type:'chest',target:3,  reward:{gold:150,exp:60}},
  {id:'q_skill5', name:'Skill User',     desc:'Use skills 5 times',        type:'skill',target:5,  reward:{gold:60,exp:40}},
  {id:'q_lv5',    name:'Growing Strong', desc:'Reach Level 5',             type:'level',target:5,  reward:{gold:300,exp:0}},
  {id:'q_room1',  name:'Dungeon Diver',  desc:'Clear a dungeon room',      type:'room', target:1,  reward:{gold:100,exp:80}},
  {id:'q_room5',  name:'Adventurer',     desc:'Clear 5 dungeon rooms',     type:'room', target:5,  reward:{gold:350,exp:200}},
  {id:'q_nodmg',  name:'Untouchable',    desc:'Clear a room without damage',type:'nodmg',target:1, reward:{gold:250,exp:100}},
  {id:'q_combo5', name:'Combo King',     desc:'Get a 5-hit combo',         type:'combo',target:5,  reward:{gold:120,exp:70}},
  {id:'q_gold500',name:'Wealthy',        desc:'Accumulate 500 gold',       type:'gold', target:500,reward:{exp:150,item:'elixir'}}
];

const RARITY_COLORS={common:'#8a8aaa',uncommon:'#44cc44',rare:'#4488ff',epic:'#aa44ff',legendary:'#ffd700'};
const LEVEL_CAP=100;
