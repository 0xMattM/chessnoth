// Skill tree definitions for each class
// Each skill tree defines branches, tiers, and prerequisites
// Maximum 3 branches per class with thematic organization

export interface SkillPrerequisite {
  skillId: string
  pointsRequired: number // Points invested in prerequisite skill
}

export interface SkillTreeNode {
  skillId: string
  branch: string // Thematic branch name (e.g., 'fire', 'ice', 'offense', 'defense')
  tier: number // 0 = base, 1+ = higher tiers
  prerequisites: SkillPrerequisite[] // Skills that must be learned first
  position?: { x: number; y: number } // Visual position in tree
}

export interface ClassSkillTree {
  [classId: string]: SkillTreeNode[]
}

export const skillTrees: ClassSkillTree = {
  // MAGE: Fire, Ice, Arcane branches
  mage: [
    // Fire Branch
    { skillId: 'fireball', branch: 'fire', tier: 0, prerequisites: [], position: { x: 0, y: 0 } },
    { skillId: 'lightning', branch: 'fire', tier: 1, prerequisites: [{ skillId: 'fireball', pointsRequired: 3 }], position: { x: 0, y: 1 } },
    { skillId: 'meteor', branch: 'fire', tier: 2, prerequisites: [{ skillId: 'lightning', pointsRequired: 2 }], position: { x: 0, y: 2 } },
    { skillId: 'apocalypse', branch: 'fire', tier: 3, prerequisites: [{ skillId: 'meteor', pointsRequired: 3 }], position: { x: 0, y: 3 } },
    // Ice Branch
    { skillId: 'ice_bolt', branch: 'ice', tier: 0, prerequisites: [], position: { x: 1, y: 0 } },
    { skillId: 'blizzard', branch: 'ice', tier: 1, prerequisites: [{ skillId: 'ice_bolt', pointsRequired: 3 }], position: { x: 1, y: 1 } },
    { skillId: 'chain_lightning', branch: 'ice', tier: 2, prerequisites: [{ skillId: 'blizzard', pointsRequired: 2 }], position: { x: 1, y: 2 } },
    // Arcane Branch
    { skillId: 'magic_shield', branch: 'arcane', tier: 0, prerequisites: [], position: { x: 2, y: 0 } },
    { skillId: 'arcane_power', branch: 'arcane', tier: 1, prerequisites: [{ skillId: 'magic_shield', pointsRequired: 2 }], position: { x: 2, y: 1 } },
    { skillId: 'teleport', branch: 'arcane', tier: 2, prerequisites: [{ skillId: 'arcane_power', pointsRequired: 3 }, { skillId: 'chain_lightning', pointsRequired: 1 }], position: { x: 1.5, y: 3 } },
  ],

  // WARRIOR: Offense, Defense branches
  warrior: [
    // Offense Branch
    { skillId: 'slash', branch: 'offense', tier: 0, prerequisites: [], position: { x: 0, y: 0 } },
    { skillId: 'power_slash', branch: 'offense', tier: 1, prerequisites: [{ skillId: 'slash', pointsRequired: 3 }], position: { x: 0, y: 1 } },
    { skillId: 'berserk', branch: 'offense', tier: 2, prerequisites: [{ skillId: 'power_slash', pointsRequired: 1 }], position: { x: 0, y: 2 } },
    { skillId: 'rage', branch: 'offense', tier: 3, prerequisites: [{ skillId: 'berserk', pointsRequired: 2 }], position: { x: 0, y: 3 } },
    { skillId: 'armor_break', branch: 'offense', tier: 4, prerequisites: [{ skillId: 'rage', pointsRequired: 2 }], position: { x: 0, y: 4 } },
    // Defense Branch
    { skillId: 'guard_stance', branch: 'defense', tier: 0, prerequisites: [], position: { x: 1, y: 0 } },
    { skillId: 'shield_bash', branch: 'defense', tier: 1, prerequisites: [{ skillId: 'guard_stance', pointsRequired: 3 }], position: { x: 1, y: 1 } },
    { skillId: 'counter', branch: 'defense', tier: 2, prerequisites: [{ skillId: 'shield_bash', pointsRequired: 1 }], position: { x: 1, y: 2 } },
    { skillId: 'whirlwind', branch: 'defense', tier: 3, prerequisites: [{ skillId: 'counter', pointsRequired: 3 }], position: { x: 1, y: 3 } },
    // Ultimate (requires both branches)
    { skillId: 'final_stand', branch: 'ultimate', tier: 4, prerequisites: [{ skillId: 'armor_break', pointsRequired: 3 }, { skillId: 'whirlwind', pointsRequired: 3 }], position: { x: 0.5, y: 5 } },
  ],

  // HEALER: Healing, Protection branches
  healer: [
    // Healing Branch
    { skillId: 'heal', branch: 'healing', tier: 0, prerequisites: [], position: { x: 0, y: 0 } },
    { skillId: 'regeneration', branch: 'healing', tier: 1, prerequisites: [{ skillId: 'heal', pointsRequired: 3 }], position: { x: 0, y: 1 } },
    { skillId: 'group_heal', branch: 'healing', tier: 2, prerequisites: [{ skillId: 'regeneration', pointsRequired: 1 }], position: { x: 0, y: 2 } },
    { skillId: 'revive', branch: 'healing', tier: 3, prerequisites: [{ skillId: 'group_heal', pointsRequired: 2 }], position: { x: 0, y: 3 } },
    { skillId: 'resurrection', branch: 'healing', tier: 4, prerequisites: [{ skillId: 'revive', pointsRequired: 3 }], position: { x: 0, y: 4 } },
    // Protection Branch
    { skillId: 'cure', branch: 'protection', tier: 0, prerequisites: [], position: { x: 1, y: 0 } },
    { skillId: 'shield', branch: 'protection', tier: 1, prerequisites: [{ skillId: 'cure', pointsRequired: 1 }], position: { x: 1, y: 1 } },
    { skillId: 'blessing', branch: 'protection', tier: 2, prerequisites: [{ skillId: 'shield', pointsRequired: 2 }], position: { x: 1, y: 2 } },
    { skillId: 'purify', branch: 'protection', tier: 3, prerequisites: [{ skillId: 'blessing', pointsRequired: 2 }], position: { x: 1, y: 3 } },
    { skillId: 'divine_protection', branch: 'protection', tier: 4, prerequisites: [{ skillId: 'purify', pointsRequired: 3 }, { skillId: 'resurrection', pointsRequired: 1 }], position: { x: 0.5, y: 5 } },
  ],

  // PALADIN: Holy, Healing, Protection branches
  paladin: [
    // Holy/Offense Branch
    { skillId: 'holy_strike', branch: 'holy', tier: 0, prerequisites: [], position: { x: 0, y: 0 } },
    { skillId: 'smite', branch: 'holy', tier: 1, prerequisites: [{ skillId: 'holy_strike', pointsRequired: 3 }], position: { x: 0, y: 1 } },
    { skillId: 'judgment', branch: 'holy', tier: 2, prerequisites: [{ skillId: 'smite', pointsRequired: 2 }], position: { x: 0, y: 2 } },
    { skillId: 'divine_wrath', branch: 'holy', tier: 3, prerequisites: [{ skillId: 'judgment', pointsRequired: 3 }], position: { x: 0, y: 3 } },
    // Healing Branch
    { skillId: 'heal', branch: 'healing', tier: 0, prerequisites: [], position: { x: 1, y: 0 } },
    { skillId: 'lay_on_hands', branch: 'healing', tier: 1, prerequisites: [{ skillId: 'heal', pointsRequired: 1 }], position: { x: 1, y: 1 } },
    { skillId: 'holy_light', branch: 'healing', tier: 2, prerequisites: [{ skillId: 'lay_on_hands', pointsRequired: 2 }], position: { x: 1, y: 2 } },
    { skillId: 'resurrection', branch: 'healing', tier: 3, prerequisites: [{ skillId: 'holy_light', pointsRequired: 3 }], position: { x: 1, y: 3 } },
    // Protection Branch
    { skillId: 'divine_shield', branch: 'protection', tier: 0, prerequisites: [], position: { x: 2, y: 0 } },
    { skillId: 'aura_of_protection', branch: 'protection', tier: 1, prerequisites: [{ skillId: 'divine_shield', pointsRequired: 1 }], position: { x: 2, y: 1 } },
  ],

  // ASSASSIN: Assassination, Poison, Stealth branches
  assassin: [
    // Assassination Branch
    { skillId: 'stab', branch: 'assassination', tier: 0, prerequisites: [], position: { x: 0, y: 0 } },
    { skillId: 'backstab', branch: 'assassination', tier: 1, prerequisites: [{ skillId: 'stab', pointsRequired: 3 }], position: { x: 0, y: 1 } },
    { skillId: 'dual_strike', branch: 'assassination', tier: 2, prerequisites: [{ skillId: 'backstab', pointsRequired: 1 }], position: { x: 0, y: 2 } },
    { skillId: 'assassinate', branch: 'assassination', tier: 3, prerequisites: [{ skillId: 'dual_strike', pointsRequired: 2 }], position: { x: 0, y: 3 } },
    { skillId: 'execute', branch: 'assassination', tier: 4, prerequisites: [{ skillId: 'assassinate', pointsRequired: 3 }], position: { x: 0, y: 4 } },
    // Poison Branch
    { skillId: 'poison_blade', branch: 'poison', tier: 0, prerequisites: [], position: { x: 1, y: 0 } },
    { skillId: 'smoke_bomb', branch: 'poison', tier: 1, prerequisites: [{ skillId: 'poison_blade', pointsRequired: 2 }], position: { x: 1, y: 1 } },
    { skillId: 'death_mark', branch: 'poison', tier: 2, prerequisites: [{ skillId: 'smoke_bomb', pointsRequired: 2 }], position: { x: 1, y: 2 } },
    // Stealth Branch
    { skillId: 'stealth', branch: 'stealth', tier: 0, prerequisites: [], position: { x: 2, y: 0 } },
    { skillId: 'shadow_step', branch: 'stealth', tier: 1, prerequisites: [{ skillId: 'stealth', pointsRequired: 2 }], position: { x: 2, y: 1 } },
  ],

  // ARCHER: Precision, Multi-shot, Utility branches
  archer: [
    // Precision Branch
    { skillId: 'quick_shot', branch: 'precision', tier: 0, prerequisites: [], position: { x: 0, y: 0 } },
    { skillId: 'snipe', branch: 'precision', tier: 1, prerequisites: [{ skillId: 'quick_shot', pointsRequired: 3 }], position: { x: 0, y: 1 } },
    { skillId: 'headshot', branch: 'precision', tier: 2, prerequisites: [{ skillId: 'snipe', pointsRequired: 2 }], position: { x: 0, y: 2 } },
    { skillId: 'piercing_shot', branch: 'precision', tier: 3, prerequisites: [{ skillId: 'headshot', pointsRequired: 2 }], position: { x: 0, y: 3 } },
    { skillId: 'eagle_eye', branch: 'precision', tier: 4, prerequisites: [{ skillId: 'piercing_shot', pointsRequired: 3 }], position: { x: 0, y: 4 } },
    // Multi-shot Branch
    { skillId: 'multi_shot', branch: 'multi_shot', tier: 0, prerequisites: [], position: { x: 1, y: 0 } },
    { skillId: 'barrage', branch: 'multi_shot', tier: 1, prerequisites: [{ skillId: 'multi_shot', pointsRequired: 3 }], position: { x: 1, y: 1 } },
    { skillId: 'rain_of_arrows', branch: 'multi_shot', tier: 2, prerequisites: [{ skillId: 'barrage', pointsRequired: 2 }], position: { x: 1, y: 2 } },
    // Utility Branch
    { skillId: 'aim', branch: 'utility', tier: 0, prerequisites: [], position: { x: 2, y: 0 } },
    { skillId: 'poison_arrow', branch: 'utility', tier: 1, prerequisites: [{ skillId: 'aim', pointsRequired: 1 }], position: { x: 2, y: 1 } },
  ],

  // MONK: Physical, Spiritual branches
  monk: [
    // Physical Branch
    { skillId: 'punch', branch: 'physical', tier: 0, prerequisites: [], position: { x: 0, y: 0 } },
    { skillId: 'ki_strike', branch: 'physical', tier: 1, prerequisites: [{ skillId: 'punch', pointsRequired: 3 }], position: { x: 0, y: 1 } },
    { skillId: 'flurry', branch: 'physical', tier: 2, prerequisites: [{ skillId: 'ki_strike', pointsRequired: 1 }], position: { x: 0, y: 2 } },
    { skillId: 'pressure_point', branch: 'physical', tier: 3, prerequisites: [{ skillId: 'flurry', pointsRequired: 2 }], position: { x: 0, y: 3 } },
    { skillId: 'whirlwind_kick', branch: 'physical', tier: 4, prerequisites: [{ skillId: 'pressure_point', pointsRequired: 2 }], position: { x: 0, y: 4 } },
    { skillId: 'ultimate_strike', branch: 'physical', tier: 5, prerequisites: [{ skillId: 'whirlwind_kick', pointsRequired: 3 }], position: { x: 0, y: 5 } },
    // Spiritual Branch
    { skillId: 'meditate', branch: 'spiritual', tier: 0, prerequisites: [], position: { x: 1, y: 0 } },
    { skillId: 'dodge', branch: 'spiritual', tier: 1, prerequisites: [{ skillId: 'meditate', pointsRequired: 1 }], position: { x: 1, y: 1 } },
    { skillId: 'chi_blast', branch: 'spiritual', tier: 2, prerequisites: [{ skillId: 'dodge', pointsRequired: 2 }], position: { x: 1, y: 2 } },
    { skillId: 'enlightenment', branch: 'spiritual', tier: 3, prerequisites: [{ skillId: 'chi_blast', pointsRequired: 3 }, { skillId: 'ultimate_strike', pointsRequired: 1 }], position: { x: 0.5, y: 6 } },
  ],

  // DARK MAGE: Dark Magic, Curse, Necromancy branches
  dark_mage: [
    // Dark Magic Branch
    { skillId: 'dark_bolt', branch: 'dark_magic', tier: 0, prerequisites: [], position: { x: 0, y: 0 } },
    { skillId: 'life_drain', branch: 'dark_magic', tier: 1, prerequisites: [{ skillId: 'dark_bolt', pointsRequired: 3 }], position: { x: 0, y: 1 } },
    { skillId: 'death_ray', branch: 'dark_magic', tier: 2, prerequisites: [{ skillId: 'life_drain', pointsRequired: 2 }], position: { x: 0, y: 2 } },
    { skillId: 'armageddon', branch: 'dark_magic', tier: 3, prerequisites: [{ skillId: 'death_ray', pointsRequired: 3 }], position: { x: 0, y: 3 } },
    // Curse Branch
    { skillId: 'curse', branch: 'curse', tier: 0, prerequisites: [], position: { x: 1, y: 0 } },
    { skillId: 'poison_cloud', branch: 'curse', tier: 1, prerequisites: [{ skillId: 'curse', pointsRequired: 1 }], position: { x: 1, y: 1 } },
    { skillId: 'fear', branch: 'curse', tier: 2, prerequisites: [{ skillId: 'poison_cloud', pointsRequired: 2 }], position: { x: 1, y: 2 } },
    { skillId: 'soul_bind', branch: 'curse', tier: 3, prerequisites: [{ skillId: 'fear', pointsRequired: 2 }], position: { x: 1, y: 3 } },
    // Necromancy Branch
    { skillId: 'necromancy', branch: 'necromancy', tier: 0, prerequisites: [], position: { x: 2, y: 0 } },
    { skillId: 'dark_ritual', branch: 'necromancy', tier: 1, prerequisites: [{ skillId: 'necromancy', pointsRequired: 2 }], position: { x: 2, y: 1 } },
  ],

  // DWARF: Offense, Defense branches
  dwarf: [
    // Offense Branch
    { skillId: 'hammer_strike', branch: 'offense', tier: 0, prerequisites: [], position: { x: 0, y: 0 } },
    { skillId: 'earthquake', branch: 'offense', tier: 1, prerequisites: [{ skillId: 'hammer_strike', pointsRequired: 3 }], position: { x: 0, y: 1 } },
    { skillId: 'mountain_charge', branch: 'offense', tier: 2, prerequisites: [{ skillId: 'earthquake', pointsRequired: 1 }], position: { x: 0, y: 2 } },
    { skillId: 'boulder_toss', branch: 'offense', tier: 3, prerequisites: [{ skillId: 'mountain_charge', pointsRequired: 2 }], position: { x: 0, y: 3 } },
    { skillId: 'mountains_wrath', branch: 'offense', tier: 4, prerequisites: [{ skillId: 'boulder_toss', pointsRequired: 3 }], position: { x: 0, y: 4 } },
    // Defense Branch
    { skillId: 'fortify', branch: 'defense', tier: 0, prerequisites: [], position: { x: 1, y: 0 } },
    { skillId: 'stone_skin', branch: 'defense', tier: 1, prerequisites: [{ skillId: 'fortify', pointsRequired: 1 }], position: { x: 1, y: 1 } },
    { skillId: 'unbreakable', branch: 'defense', tier: 2, prerequisites: [{ skillId: 'stone_skin', pointsRequired: 2 }], position: { x: 1, y: 2 } },
    { skillId: 'guardian_stance', branch: 'defense', tier: 3, prerequisites: [{ skillId: 'unbreakable', pointsRequired: 2 }], position: { x: 1, y: 3 } },
    { skillId: 'titan_form', branch: 'defense', tier: 4, prerequisites: [{ skillId: 'guardian_stance', pointsRequired: 3 }, { skillId: 'mountains_wrath', pointsRequired: 1 }], position: { x: 0.5, y: 5 } },
  ],

  // AXE THROWER: Precision, Berserker branches
  axe_thrower: [
    // Precision Branch
    { skillId: 'throw_axe', branch: 'precision', tier: 0, prerequisites: [], position: { x: 0, y: 0 } },
    { skillId: 'double_throw', branch: 'precision', tier: 1, prerequisites: [{ skillId: 'throw_axe', pointsRequired: 3 }], position: { x: 0, y: 1 } },
    { skillId: 'precise_throw', branch: 'precision', tier: 2, prerequisites: [{ skillId: 'double_throw', pointsRequired: 2 }], position: { x: 0, y: 2 } },
    { skillId: 'returning_axe', branch: 'precision', tier: 3, prerequisites: [{ skillId: 'precise_throw', pointsRequired: 2 }], position: { x: 0, y: 3 } },
    { skillId: 'avalanche', branch: 'precision', tier: 4, prerequisites: [{ skillId: 'returning_axe', pointsRequired: 3 }], position: { x: 0, y: 4 } },
    // Berserker Branch
    { skillId: 'berserker_rage', branch: 'berserker', tier: 0, prerequisites: [], position: { x: 1, y: 0 } },
    { skillId: 'spinning_axe', branch: 'berserker', tier: 1, prerequisites: [{ skillId: 'berserker_rage', pointsRequired: 1 }], position: { x: 1, y: 1 } },
    { skillId: 'axe_storm', branch: 'berserker', tier: 2, prerequisites: [{ skillId: 'spinning_axe', pointsRequired: 2 }], position: { x: 1, y: 2 } },
    { skillId: 'bleeding_strike', branch: 'berserker', tier: 3, prerequisites: [{ skillId: 'axe_storm', pointsRequired: 2 }], position: { x: 1, y: 3 } },
    { skillId: 'fury', branch: 'berserker', tier: 4, prerequisites: [{ skillId: 'bleeding_strike', pointsRequired: 3 }, { skillId: 'avalanche', pointsRequired: 1 }], position: { x: 0.5, y: 5 } },
  ],
}

export function getSkillTree(classId: string): SkillTreeNode[] {
  return skillTrees[classId] || []
}

export function getSkillNode(classId: string, skillId: string): SkillTreeNode | undefined {
  const tree = getSkillTree(classId)
  return tree.find((node) => node.skillId === skillId)
}
