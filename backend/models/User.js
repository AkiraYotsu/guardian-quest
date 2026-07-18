// models/User.js — Mongoose schema for Guardian Quest users
const mongoose = require('mongoose');

const WeaponSchema = new mongoose.Schema({
  id:        { type: String, required: true },
  name:      String,
  emoji:     String,
  type:      String,
  rarity:    { type: String, default: 'common' },
  atkBonus:  { type: Number, default: 0 },
  spdBonus:  { type: Number, default: 0 },
  critBonus: { type: Number, default: 0 },
  color:     String,
  eq:        { type: Boolean, default: false },
}, { _id: false });

const StatsSchema = new mongoose.Schema({
  hp:      { type: Number, default: 100 },
  maxHp:   { type: Number, default: 100 },
  atk:     { type: Number, default: 20 },
  def:     { type: Number, default: 10 },
  spd:     { type: Number, default: 5 },
  crit:    { type: Number, default: 5 },
  mana:    { type: Number, default: 60 },
  maxMana: { type: Number, default: 60 },
}, { _id: false });

const GrowSchema = new mongoose.Schema({
  hp:   { type: Number, default: 15 },
  atk:  { type: Number, default: 3 },
  def:  { type: Number, default: 3 },
  spd:  { type: Number, default: 0.4 },
  crit: { type: Number, default: 0.5 },
  mana: { type: Number, default: 5 },
}, { _id: false });

const SpAllocSchema = new mongoose.Schema({
  hp:   { type: Number, default: 0 },
  atk:  { type: Number, default: 0 },
  def:  { type: Number, default: 0 },
  spd:  { type: Number, default: 0 },
  crit: { type: Number, default: 0 },
  mana: { type: Number, default: 0 },
}, { _id: false });

const GuildSchema = new mongoose.Schema({
  name:    String,
  rank:    String,
  level:   Number,
  members: Number,
  leader:  String,
}, { _id: false });

const QuestsSchema = new mongoose.Schema({
  active:   [String],
  done:     [String],
  progress: { type: Map, of: Number, default: {} },
}, { _id: false });

const PlayerSchema = new mongoose.Schema({
  name:         String,
  class:        String,
  cn:           String,
  em:           String,
  color:        String,
  gender:       { type: String, default: 'male' },
  skinStyle:    { type: String, default: 'default' },
  level:        { type: Number, default: 1 },
  exp:          { type: Number, default: 0 },
  expNext:      { type: Number, default: 100 },
  sp:           { type: Number, default: 5 },
  gold:         { type: Number, default: 120 },
  stats:        { type: StatsSchema, default: () => ({}) },
  grow:         { type: GrowSchema,  default: () => ({}) },
  spAlloc:      { type: SpAllocSchema, default: () => ({}) },
  weapons:      { type: [WeaponSchema], default: [] },
  eqType:       { type: String, default: 'sword' },
  skLv:         { type: Map, of: Number, default: {} },
  guild:        { type: GuildSchema, default: null },
  items:        { type: Map, of: Number, default: {} },
  activeRevive: { type: Boolean, default: false },
  quests:       { type: QuestsSchema, default: null },
  dp:           { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  isAdmin:      { type: Boolean, default: false },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  username:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:    { type: String, required: true },  // plain text (same as original sheets version)
  player:      { type: PlayerSchema, default: null },
  isAdmin:     { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now },
  lastLoginAt: { type: Date },
  lastSaveAt:  { type: Date },
});

// Index for fast lookups
UserSchema.index({ username: 1 });

module.exports = mongoose.model('User', UserSchema);
