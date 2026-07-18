// Guardian Quest Google Sheets backend
// Deploy as Web App:
// Execute as: Me
// Who has access: Anyone
//
// After deploy, copy the Web App URL into js/sheets_connector.js.

const SPREADSHEET_ID = '';

const SHEETS = {
  accounts: {
    name: 'Accounts',
    headers: ['Username','Password','Status','IsAdmin','CreatedAt','LastLoginAt','LastSaveAt','CharacterName','Level','Gold','CurrentDungeon','CurrentFloor','TotalFloors','RawAccountJson']
  },
  player: {
    name: 'PlayerState',
    headers: ['Username','CharacterName','Class','Gender','Level','Exp','ExpNext','StatPoints','Gold','HP','MaxHP','MP','MaxMP','ATK','DEF','SPD','Crit','CurrentDungeonId','CurrentDungeonName','CurrentFloor','TotalFloors','RoomCleared','NoDamageRoom','ActiveRevive','GuildName','UpdatedAt','RawPlayerJson']
  },
  items: {
    name: 'Items',
    headers: ['Username','ItemId','Quantity','UpdatedAt']
  },
  weapons: {
    name: 'Weapons',
    headers: ['Username','WeaponId','Name','Type','Rarity','AtkBonus','SpdBonus','CritBonus','Equipped','UpdatedAt']
  },
  skills: {
    name: 'Skills',
    headers: ['Username','SkillId','Level','UpdatedAt']
  },
  quests: {
    name: 'Quests',
    headers: ['Username','ActiveJson','DoneJson','ProgressJson','UpdatedAt']
  },
  events: {
    name: 'Events',
    headers: ['Timestamp','Username','Action','Detail']
  }
};

function doGet(e) {
  const p = e.parameter || {};
  const action = p.action || '';
  try {
    if (action === 'register') return jsonp_(p.callback, register_(p.username, p.password));
    if (action === 'login') return jsonp_(p.callback, login_(p.username, p.password));
    if (action === 'getPlayer') return jsonp_(p.callback, getPlayer_(p.username));
    if (action === 'schema') return jsonp_(p.callback, schema_());
    return jsonp_(p.callback, { ok:false, msg:'Unknown action: ' + action });
  } catch (err) {
    return jsonp_(p.callback, { ok:false, msg:String(err && err.message || err) });
  }
}

function doPost(e) {
  const p = e.parameter || {};
  try {
    if (p.action === 'savePlayer') {
      return json_ (savePlayer_(p.username, p.playerJson, p.payloadJson));
    }
    return json_({ ok:false, msg:'Unknown action: ' + (p.action || '') });
  } catch (err) {
    return json_({ ok:false, msg:String(err && err.message || err) });
  }
}

function register_(username, password) {
  username = normUser_(username);
  if (!username || !password) return { ok:false, msg:'Username and password required' };
  const ss = getDb_();
  const sh = sheet_(ss, SHEETS.accounts);
  const row = findRow_(sh, 1, username);
  if (row > 0) return { ok:false, msg:'Username already taken' };

  const now = now_();
  appendObject_(sh, SHEETS.accounts.headers, {
    Username: username,
    Password: password,
    Status: 'registered',
    IsAdmin: false,
    CreatedAt: now,
    LastLoginAt: '',
    LastSaveAt: '',
    CharacterName: '',
    Level: 0,
    Gold: 0,
    CurrentDungeon: '',
    CurrentFloor: 0,
    TotalFloors: 0,
    RawAccountJson: JSON.stringify({ username, status:'registered', createdAt:now })
  });
  logEvent_(ss, username, 'register', 'Account created');
  return { ok:true, createdAt:now };
}

function login_(username, password) {
  username = normUser_(username);
  const ss = getDb_();
  const acc = sheet_(ss, SHEETS.accounts);
  const row = findRow_(acc, 1, username);
  if (row < 1) return { ok:false, msg:'Account not found' };
  const values = rowObject_(acc, SHEETS.accounts.headers, row);
  if (String(values.Password) !== String(password)) return { ok:false, msg:'Wrong username or password' };

  const now = now_();
  acc.getRange(row, col_(SHEETS.accounts.headers, 'LastLoginAt')).setValue(now);
  logEvent_(ss, username, 'login', 'Account login');
  const playerRes = getPlayer_(username);
  return {
    ok: true,
    username,
    status: values.Status || 'active',
    isAdmin: truthy_(values.IsAdmin),
    createdAt: values.CreatedAt || '',
    lastLoginAt: now,
    player: playerRes.player || null
  };
}

function getPlayer_(username) {
  username = normUser_(username);
  if (!username) return { ok:false, msg:'Username required' };
  const ss = getDb_();
  const sh = sheet_(ss, SHEETS.player);
  const row = findRow_(sh, 1, username);
  if (row < 1) return { ok:true, player:null };
  const raw = sh.getRange(row, col_(SHEETS.player.headers, 'RawPlayerJson')).getValue();
  return { ok:true, player:raw ? JSON.parse(raw) : null };
}

function savePlayer_(username, playerJson, payloadJson) {
  username = normUser_(username);
  if (!username) return { ok:false, msg:'Username required' };
  const player = playerJson ? JSON.parse(playerJson) : {};
  const payload = payloadJson ? JSON.parse(payloadJson) : {};
  const ss = getDb_();
  const now = now_();
  ensureAccount_(ss, username);
  writeAccountSummary_(ss, username, player, payload, now);
  writePlayerState_(ss, username, player, payload, now);
  replaceItems_(ss, username, player.items || {}, now);
  replaceWeapons_(ss, username, player.weapons || [], now);
  replaceSkills_(ss, username, player.skLv || {}, now);
  writeQuests_(ss, username, player.quests || null, now);
  logEvent_(ss, username, 'savePlayer', 'Player state saved');
  return { ok:true, savedAt:now };
}

function writeAccountSummary_(ss, username, player, payload, now) {
  const sh = sheet_(ss, SHEETS.accounts);
  const row = findRow_(sh, 1, username);
  const dungeon = payload.dungeon || {};
  const account = payload.account || {};
  setObjectRow_(sh, SHEETS.accounts.headers, row, {
    Username: username,
    Password: rowObject_(sh, SHEETS.accounts.headers, row).Password || '',
    Status: account.status || 'active',
    IsAdmin: !!player.isAdmin,
    LastSaveAt: now,
    CharacterName: player.name || '',
    Level: player.level || 0,
    Gold: player.gold || 0,
    CurrentDungeon: dungeon.name || '',
    CurrentFloor: dungeon.currentFloor || 0,
    TotalFloors: dungeon.totalFloors || 0,
    RawAccountJson: JSON.stringify(account)
  });
}

function writePlayerState_(ss, username, player, payload, now) {
  const sh = sheet_(ss, SHEETS.player);
  const row = findOrAppendKey_(sh, username);
  const stats = player.stats || {};
  const dungeon = payload.dungeon || {};
  setObjectRow_(sh, SHEETS.player.headers, row, {
    Username: username,
    CharacterName: player.name || '',
    Class: player.cn || player.class || '',
    Gender: player.gender || '',
    Level: player.level || 0,
    Exp: player.exp || 0,
    ExpNext: player.expNext || 0,
    StatPoints: player.sp || 0,
    Gold: player.gold || 0,
    HP: stats.hp || 0,
    MaxHP: stats.maxHp || 0,
    MP: stats.mana || 0,
    MaxMP: stats.maxMana || 0,
    ATK: stats.atk || 0,
    DEF: stats.def || 0,
    SPD: stats.spd || 0,
    Crit: stats.crit || 0,
    CurrentDungeonId: dungeon.id || '',
    CurrentDungeonName: dungeon.name || '',
    CurrentFloor: dungeon.currentFloor || 0,
    TotalFloors: dungeon.totalFloors || 0,
    RoomCleared: !!dungeon.roomCleared,
    NoDamageRoom: !!dungeon.noDamageRoom,
    ActiveRevive: !!player.activeRevive,
    GuildName: player.guild && player.guild.name || '',
    UpdatedAt: now,
    RawPlayerJson: JSON.stringify(player)
  });
}

function replaceItems_(ss, username, items, now) {
  const sh = sheet_(ss, SHEETS.items);
  deleteRowsByUser_(sh, username);
  Object.keys(items).forEach(id => appendObject_(sh, SHEETS.items.headers, {
    Username: username,
    ItemId: id,
    Quantity: Number(items[id] || 0),
    UpdatedAt: now
  }));
}

function replaceWeapons_(ss, username, weapons, now) {
  const sh = sheet_(ss, SHEETS.weapons);
  deleteRowsByUser_(sh, username);
  weapons.forEach(w => appendObject_(sh, SHEETS.weapons.headers, {
    Username: username,
    WeaponId: w.id || '',
    Name: w.name || '',
    Type: w.type || '',
    Rarity: w.rarity || '',
    AtkBonus: w.atkBonus || 0,
    SpdBonus: w.spdBonus || 0,
    CritBonus: w.critBonus || 0,
    Equipped: !!w.eq,
    UpdatedAt: now
  }));
}

function replaceSkills_(ss, username, skills, now) {
  const sh = sheet_(ss, SHEETS.skills);
  deleteRowsByUser_(sh, username);
  Object.keys(skills).forEach(id => appendObject_(sh, SHEETS.skills.headers, {
    Username: username,
    SkillId: id,
    Level: Number(skills[id] || 1),
    UpdatedAt: now
  }));
}

function writeQuests_(ss, username, quests, now) {
  const sh = sheet_(ss, SHEETS.quests);
  const row = findOrAppendKey_(sh, username);
  setObjectRow_(sh, SHEETS.quests.headers, row, {
    Username: username,
    ActiveJson: JSON.stringify(quests && quests.active || []),
    DoneJson: JSON.stringify(quests && quests.done || []),
    ProgressJson: JSON.stringify(quests && quests.progress || {}),
    UpdatedAt: now
  });
}

function schema_() {
  const result = {};
  Object.keys(SHEETS).forEach(k => result[SHEETS[k].name] = SHEETS[k].headers);
  return { ok:true, sheets:result };
}

function getDb_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('GQ_SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  const ss = SpreadsheetApp.create('Guardian Quest Database');
  props.setProperty('GQ_SHEET_ID', ss.getId());
  Object.keys(SHEETS).forEach(k => sheet_(ss, SHEETS[k]));
  return ss;
}

function sheet_(ss, spec) {
  let sh = ss.getSheetByName(spec.name);
  if (!sh) sh = ss.insertSheet(spec.name);
  const first = sh.getRange(1, 1, 1, spec.headers.length).getValues()[0];
  const needsHeader = first.join('') === '' || spec.headers.some((h, i) => first[i] !== h);
  if (needsHeader) {
    sh.clear();
    sh.getRange(1, 1, 1, spec.headers.length).setValues([spec.headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function ensureAccount_(ss, username) {
  const sh = sheet_(ss, SHEETS.accounts);
  if (findRow_(sh, 1, username) > 0) return;
  appendObject_(sh, SHEETS.accounts.headers, {
    Username: username,
    Password: '',
    Status: 'imported',
    IsAdmin: false,
    CreatedAt: now_()
  });
}

function appendObject_(sh, headers, obj) {
  sh.appendRow(headers.map(h => obj[h] !== undefined ? obj[h] : ''));
}

function setObjectRow_(sh, headers, row, obj) {
  const current = rowObject_(sh, headers, row);
  const next = headers.map(h => obj[h] !== undefined ? obj[h] : current[h] || '');
  sh.getRange(row, 1, 1, headers.length).setValues([next]);
}

function rowObject_(sh, headers, row) {
  if (!row || row < 2) return {};
  const vals = sh.getRange(row, 1, 1, headers.length).getValues()[0];
  const out = {};
  headers.forEach((h, i) => out[h] = vals[i]);
  return out;
}

function findOrAppendKey_(sh, key) {
  const row = findRow_(sh, 1, key);
  if (row > 0) return row;
  sh.appendRow([key]);
  return sh.getLastRow();
}

function findRow_(sh, col, value) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const vals = sh.getRange(2, col, last - 1, 1).getValues();
  const target = String(value).toLowerCase();
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).toLowerCase() === target) return i + 2;
  }
  return -1;
}

function deleteRowsByUser_(sh, username) {
  const last = sh.getLastRow();
  if (last < 2) return;
  const vals = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][0]).toLowerCase() === username) sh.deleteRow(i + 2);
  }
}

function logEvent_(ss, username, action, detail) {
  appendObject_(sheet_(ss, SHEETS.events), SHEETS.events.headers, {
    Timestamp: now_(),
    Username: username || '',
    Action: action || '',
    Detail: detail || ''
  });
}

function col_(headers, name) {
  return headers.indexOf(name) + 1;
}

function normUser_(username) {
  return String(username || '').trim().toLowerCase();
}

function now_() {
  return new Date().toISOString();
}

function truthy_(v) {
  return v === true || String(v).toLowerCase() === 'true';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonp_(callback, obj) {
  const cb = callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback) ? callback : 'callback';
  return ContentService.createTextOutput(cb + '(' + JSON.stringify(obj) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
