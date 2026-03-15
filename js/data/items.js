// js/data/items.js — Grove Manager item catalogue
// ~23 items across physical, magic, tank, vamp, support, utility categories.
// Each item has: id, name, cost, forRoles (array, empty=all), and stat bonuses.
// Stat keys match champion/engine state: maxHp, physResist, magicResist,
//   abilityPower, physDmg, vamp, spellVamp, moveSpeed, magicPen, physPen,
//   critChance, cooldownReduction, hpRegen, manaRegen, attackRange

'use strict';

const ITEMS = [
  // ─── Physical Damage ──────────────────────────────────────────────────────

  {
    id: 'briarwood_blade',
    name: 'Briarwood Blade',
    cost: 1100,
    forRoles: ['fighter', 'assassin', 'marksman'],
    stats: { physDmg: 30 },
    description: 'A curved blade honed from briarwood heartwood.',
  },
  {
    id: 'thornedge',
    name: 'Thornedge',
    cost: 1600,
    forRoles: ['fighter', 'assassin'],
    stats: { physDmg: 55, cooldownReduction: 0.05 },
    description: 'Serrated thorns line the blade edge.',
  },
  {
    id: 'swiftfang',
    name: 'Swiftfang',
    cost: 1300,
    forRoles: ['assassin', 'fighter'],
    stats: { physDmg: 40, moveSpeed: 8 },
    description: 'Light and lethal. Favoured by those who strike first.',
  },

  // ─── Marksman ─────────────────────────────────────────────────────────────

  {
    id: 'eagle_eye_quiver',
    name: 'Eagle Eye Quiver',
    cost: 1200,
    forRoles: ['marksman'],
    stats: { physDmg: 25, critChance: 0.12, attackRange: 40 },
    description: 'Fletched arrows that fly true at great distance.',
  },
  {
    id: 'swiftwood_quiver',
    name: 'Swiftwood Quiver',
    cost: 1500,
    forRoles: ['marksman'],
    stats: { physDmg: 35, critChance: 0.20, attackRange: 30 },
    description: 'Rapid-draw quiver for sustained ranged fire.',
  },

  // ─── Magic Damage ─────────────────────────────────────────────────────────

  {
    id: 'void_lens',
    name: 'Void Lens',
    cost: 1050,
    forRoles: ['mage', 'sentinel'],
    stats: { abilityPower: 40 },
    description: 'A lens that focuses raw magical energy.',
  },
  {
    id: 'ancient_tome',
    name: 'Ancient Tome',
    cost: 1500,
    forRoles: ['mage'],
    stats: { abilityPower: 70, cooldownReduction: 0.05 },
    description: 'Inscribed with lost grove formulae.',
  },
  {
    id: 'stormweave_staff',
    name: 'Stormweave Staff',
    cost: 1900,
    forRoles: ['mage'],
    stats: { abilityPower: 100, cooldownReduction: 0.10 },
    description: 'Staff that channels stormweave energy into devastating spells.',
  },

  // ─── Magic Penetration ────────────────────────────────────────────────────

  {
    id: 'void_fang',
    name: 'Void Fang',
    cost: 1350,
    forRoles: ['mage', 'assassin'],
    stats: { abilityPower: 35, magicPen: 15 },
    description: 'Bite through even the thickest magical barrier.',
  },

  // ─── Physical Penetration ─────────────────────────────────────────────────

  {
    id: 'sunder_spike',
    name: 'Sunder Spike',
    cost: 1350,
    forRoles: ['fighter', 'assassin', 'marksman'],
    stats: { physDmg: 30, physPen: 15 },
    description: 'Hardened spike that bypasses armour plating.',
  },

  // ─── Tank ─────────────────────────────────────────────────────────────────

  {
    id: 'iron_heartwood',
    name: 'Iron Heartwood',
    cost: 1100,
    forRoles: ['tank', 'fighter', 'sentinel'],
    stats: { maxHp: 250, physResist: 20 },
    description: 'Core of ironwood. Dense enough to stop a spear.',
  },
  {
    id: 'deepbark_shield',
    name: 'Deepbark Shield',
    cost: 1500,
    forRoles: ['tank', 'sentinel'],
    stats: { maxHp: 350, physResist: 35, magicResist: 15 },
    description: 'Shield hewn from the deepbark tree — ancient and unyielding.',
  },
  {
    id: 'verdant_plate',
    name: 'Verdant Plate',
    cost: 1800,
    forRoles: ['tank'],
    stats: { maxHp: 500, physResist: 40, hpRegen: 3 },
    description: 'Full plate grown from living verdant bark. Regrows over time.',
  },

  // ─── Magic Resist ─────────────────────────────────────────────────────────

  {
    id: 'nullbark_cloak',
    name: 'Nullbark Cloak',
    cost: 950,
    forRoles: [],
    stats: { magicResist: 35 },
    description: 'Woven from nullbark fibre. Dampens spells.',
  },
  {
    id: 'spellward_mantle',
    name: 'Spellward Mantle',
    cost: 1400,
    forRoles: ['tank', 'fighter', 'sentinel'],
    stats: { maxHp: 200, magicResist: 50 },
    description: 'A mantle threaded with spell-warding charms.',
  },

  // ─── Vamp (Physical) ──────────────────────────────────────────────────────

  {
    id: 'bloodwood_thorn',
    name: 'Bloodwood Thorn',
    cost: 1200,
    forRoles: ['fighter', 'assassin'],
    stats: { physDmg: 25, vamp: 0.10 },
    description: 'Thorn that feeds on the blood it draws.',
  },
  {
    id: 'verdant_fang',
    name: 'Verdant Fang',
    cost: 1700,
    forRoles: ['fighter', 'marksman'],
    stats: { physDmg: 45, vamp: 0.18 },
    description: 'Fang that converts wounds into vitality.',
  },

  // ─── Spell Vamp (Magic) ───────────────────────────────────────────────────

  {
    id: 'darkwood_sickle',
    name: 'Darkwood Sickle',
    cost: 1500,
    forRoles: ['mage', 'sentinel'],
    stats: { abilityPower: 55, spellVamp: 0.12 },
    description: 'Sickle carved from darkwood — spells drain life as they land.',
  },

  // ─── Support ──────────────────────────────────────────────────────────────

  {
    id: 'groves_chalice',
    name: "Grove's Chalice",
    cost: 800,
    forRoles: ['sentinel'],
    stats: { abilityPower: 20, hpRegen: 2, manaRegen: 2 },
    description: 'Chalice filled with grove-blessed water.',
  },
  {
    id: 'bloom_scepter',
    name: 'Bloom Scepter',
    cost: 1300,
    forRoles: ['sentinel'],
    stats: { abilityPower: 45, cooldownReduction: 0.08, hpRegen: 2 },
    description: 'Scepter adorned with a perpetually blooming flower.',
  },

  // ─── Mobility ─────────────────────────────────────────────────────────────

  {
    id: 'swiftwood_boots',
    name: 'Swiftwood Boots',
    cost: 700,
    forRoles: [],
    stats: { moveSpeed: 25 },
    description: 'Boots soled with springy swiftwood bark.',
  },

  // ─── Utility ──────────────────────────────────────────────────────────────

  {
    id: 'wraithstone',
    name: 'Wraithstone',
    cost: 1000,
    forRoles: ['mage', 'assassin', 'sentinel'],
    stats: { abilityPower: 30, cooldownReduction: 0.10 },
    description: 'Stone humming with wraithlike resonance.',
  },
  {
    id: 'champions_crest',
    name: "Champion's Crest",
    cost: 1200,
    forRoles: [],
    stats: { maxHp: 150, physDmg: 15, abilityPower: 15, cooldownReduction: 0.05 },
    description: 'A crested sigil worn by the Grove's most decorated combatants.',
  },
];

// ─── Item lookup map ──────────────────────────────────────────────────────────

const ITEM_MAP = Object.fromEntries(ITEMS.map(it => [it.id, it]));

// ─── Role-filtered shopping list ─────────────────────────────────────────────
// Returns items available for a given champion role (includes items with empty forRoles).

function getItemsForRole(role) {
  return ITEMS.filter(it => it.forRoles.length === 0 || it.forRoles.includes(role));
}
