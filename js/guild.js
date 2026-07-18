// guild.js — Guild system (custom dialogs, supports admin pre-set guild)
function renderGuild(){
  const PL=GS.player,g=PL.guild,con=el('guildCon');if(!con)return;
  if(g){
    con.innerHTML=`
      <div class="g-card">
        <h3 style="color:var(--gold);margin-bottom:.5rem">🛡️ ${g.name} ${g.level?`<span style="font-size:.7rem;color:var(--cyan)">Lv.${g.level}</span>`:''}</h3>
        <p style="color:var(--dim);font-size:.82rem">Rank: ${g.rank} | Members: ${g.members}</p>
        ${g.leader===PL.name?'<p style="font-size:.72rem;color:var(--cyan);margin-top:.3rem">👑 Guild Leader</p>':''}
      </div>
      <div style="font-size:.82rem;color:var(--dim);margin-bottom:1rem;
        background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:.9rem">
        <div style="color:var(--green);margin-bottom:.5rem;font-weight:900">✅ Active Bonuses</div>
        <div>❤️ +5% HP | ⚔️ +3% ATK | 💰 +10% Gold | ⭐ +5% EXP</div>
      </div>
      ${g.leader!=='Yuuki'||!GS.adminMode?`<button class="btn-sec btn-red" onclick="confirmLeaveGuild()" style="max-width:180px">Leave Guild</button>`:''}`;
  }else{
    con.innerHTML=`
      <div class="guild-empty">
        <div class="gi">🛡️</div>
        <p style="margin-bottom:1.5rem">You are not in a guild.<br>Join one to gain powerful bonuses!</p>
        <div style="display:flex;gap:.8rem;justify-content:center;flex-wrap:wrap">
          <button class="btn-main" style="max-width:170px" onclick="promptGuildName()">⚔️ CREATE GUILD</button>
          <button class="btn-sec"  style="max-width:170px" onclick="joinGuild()">🤝 JOIN GUILD</button>
        </div>
      </div>
      <div style="margin-top:1.5rem;background:var(--bg3);border:1px solid var(--border2);
        border-radius:8px;padding:.9rem;font-size:.8rem;color:var(--dim)">
        <div style="color:var(--gold);margin-bottom:.4rem;font-weight:900">⚡ Guild Bonuses</div>
        <div>❤️ +5% HP | ⚔️ +3% ATK | 💰 +10% Gold | ⭐ +5% EXP</div>
      </div>`;
  }
}
function promptGuildName(){
  showPrompt('Create Guild','Enter guild name (min 3 chars)',function(name){
    if(!name||name.length<3){notify('Guild name must be ≥ 3 chars');return;}
    GS.player.guild={name:name.trim(),rank:'Bronze',members:1,leader:GS.player.name};
    savePL();renderGuild();snd('lvup');notify(`Guild "${GS.player.guild.name}" created!`);
  });
}
function confirmLeaveGuild(){
  showConfirm('Leave Guild','Are you sure you want to leave your guild?','LEAVE','CANCEL',
    function(){GS.player.guild=null;savePL();renderGuild();notify('Left the guild.');},null);
}
const GUILD_NAMES=['Dragon Slayers','Shadow Knights','Holy Guards','Steel Blades','Iron Fist','Sky Wardens','Crimson Tide'];
function joinGuild(){
  const name=GUILD_NAMES[rndI(GUILD_NAMES.length)];
  GS.player.guild={name,rank:'Silver',members:rndI(25)+8};
  savePL();renderGuild();snd('menu');notify(`Joined "${name}"!`);
}
