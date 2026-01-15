# ⚔️ Game Mechanics

Complete guide to Chessnoth's gameplay systems and mechanics.

## Core Gameplay Loop

```
1. Mint/Acquire Characters (NFTs)
         ↓
2. Build Team (up to 4 characters)
         ↓
3. Equip Items & Assign Skills
         ↓
4. Enter Combat (8x8 Grid)
         ↓
5. Win Battles → Earn Rewards
         ↓
6. Upgrade Characters On-Chain
         ↓
7. Repeat with Stronger Builds
```

---

## Character System

### Character Classes

Chessnoth features **10 unique character classes**, each with distinct playstyles:

| Class | Type | Range | Specialty |
|-------|------|-------|-----------|
| **Warrior** | Melee | 1 | High HP, balanced stats |
| **Mage** | Magic | 3 | High magic damage |
| **Archer** | Ranged | 3 | Physical ranged attacks |
| **Assassin** | Melee | 1 | High critical hits |
| **Paladin** | Tank | 1 | High defense, healing |
| **Monk** | Melee | 1 | Speed and evasion |
| **Healer** | Support | 2 | Healing and buffs |
| **Dark Mage** | Magic | 3 | Debuffs and curses |
| **Dwarf** | Tank | 1 | High HP and defense |
| **Axe Thrower** | Ranged | 3 | AOE physical damage |

### Character Stats

Each character has the following stats:

```typescript
interface CombatStats {
  hp: number      // Hit Points
  maxHp: number   // Maximum HP
  mana: number    // Mana Points
  maxMana: number // Maximum Mana
  atk: number     // Physical Attack
  mag: number     // Magic Attack
  def: number     // Physical Defense
  res: number     // Magic Resistance
  spd: number     // Speed (determines turn order)
  eva: number     // Evasion %
  crit: number    // Critical Hit %
}
```

### Stat Growth

Characters grow stronger as they level up:

**Level Calculation:**
```
Level = floor(sqrt(totalExperience / 100))
```

**Stat Growth Formula:**
```
StatValue = BaseStat + (GrowthRate × (Level - 1))
```

**Example (Warrior):**
- Base HP: 100
- HP Growth: 5 per level
- At Level 10: HP = 100 + (5 × 9) = 145

### Progression

**Earning Experience:**
- Win battles to earn EXP
- EXP stored off-chain until claimed
- Claim EXP to upgrade characters on-chain

**Level Caps:**
- Current: Level 100
- Required EXP for Level 100: 1,000,000

---

## Combat System

### Battle Grid

Combat takes place on an **8x8 tactical grid**:

```
  0 1 2 3 4 5 6 7
0 □ □ □ □ □ □ □ □
1 □ □ □ □ □ □ □ □
2 □ □ P1□ □ □ □ □
3 □ □ □ □ □ E1□ □
4 □ P2□ □ □ E2□ □
5 □ □ □ □ □ □ □ □
6 □ P3□ □ E3□ □ □
7 □ □ □ □ □ □ □ □

P = Player Character
E = Enemy Character
□ = Empty Tile
```

### Turn Order

Turns are determined by **Speed (SPD) stat**:

1. All characters sorted by SPD (highest first)
2. If SPD is equal, sort by Level
3. If Level is equal, sort alphabetically

**Turn Queue Example:**
```
1. Archer (SPD: 45)
2. Mage (SPD: 40)
3. Warrior (SPD: 35)
4. Enemy Goblin (SPD: 30)
5. Paladin (SPD: 25)
```

### Actions Per Turn

Each character can perform **two actions** per turn:

1. **Movement** - Move to adjacent tiles
2. **Action** - Attack, use skill, or wait

**Movement:**
- Movement range: 3 tiles (affected by terrain)
- Can move through allies
- Cannot move through enemies
- Cannot end turn on occupied tile

**Action Options:**
- **Attack:** Basic attack on adjacent enemy
- **Skill:** Use an equipped skill
- **Wait:** End turn and gain +10% defense

### Combat Calculations

**Damage Formula:**
```javascript
// Base damage
baseDamage = attackStat × skillMultiplier

// Defense reduction (percentage-based)
damageReduction = defenseStat × 0.5
finalDamage = baseDamage × (attackStat / (attackStat + damageReduction))

// Minimum damage (always deal some damage)
minDamage = baseDamage × 0.15

// Apply evasion check
if (random(0-100) < defenderEvasion) {
  damage = 0  // Attack missed
} else {
  damage = max(minDamage, finalDamage)
}

// Critical hit
if (random(0-100) < attackerCritRate) {
  damage = damage × 2
}
```

**Key Points:**
- Defense reduces damage by percentage (never 100%)
- Evasion can make attacks miss completely
- Critical hits double final damage
- Minimum damage ensures attacks always meaningful

---

## Terrain System

Different terrain types affect combat strategy:

### Terrain Types

| Terrain | Movement Cost | Effects |
|---------|--------------|---------|
| **Grassland** | 1 | No special effects |
| **Forest** | 2 | +20% Defense, -10% Accuracy |
| **Mountain** | 2 | +20% ATK from high ground |
| **Water** | 3 | -20% Speed, -10% Evasion |

### Terrain Effects

**Forest:**
```javascript
// While on forest tile
defense += baseDefense × 0.2
eva -= baseEva × 0.1
```

**Mountain (High Ground):**
```javascript
// When attacking from mountain to lower ground
atk += baseAtk × 0.2
mag += baseMag × 0.2
```

**Water:**
```javascript
// While on water tile
spd -= baseSpd × 0.2
eva -= baseEva × 0.1
```

### Strategic Use

- **Tanks** - Position on forests for extra defense
- **Archers** - Use mountains for damage boost
- **Fast Units** - Avoid water to maintain speed
- **Melee** - Plan movement considering terrain cost

---

## Skill System

### Skill Types

Skills are special abilities with various effects:

**Damage Skills:**
- Physical damage (uses ATK)
- Magical damage (uses MAG)
- Single target or AOE

**Support Skills:**
- Healing
- Buffs (increase stats)
- Cleanse debuffs

**Debuff Skills:**
- Reduce enemy stats
- Apply status effects
- Crowd control (stun, slow)

### Skill Properties

```typescript
interface Skill {
  id: string
  name: string
  description: string
  levelReq: number      // Level required to learn
  spCost: number        // Skill Points to learn
  manaCost: number      // Mana to cast
  range: number         // Attack range
  damageType: string    // physical/magical/healing
  damageMultiplier: number  // Damage scaling
  aoeType?: string      // single/line/radius/all
  aoeRadius?: number    // Radius for AOE
  effects?: Effect[]    // Additional effects
}
```

### Skill Learning

**Skill Points (SP):**
- Earn 1 SP per character level
- Spend SP to learn skills from skill tree
- Each skill costs 1 SP to learn

**Example (Warrior Skills):**
```
Level 1: Power Strike (1 SP)
Level 3: Whirlwind (1 SP)
Level 5: Shield Bash (1 SP)
Level 10: Berserk Mode (1 SP)
```

### Skill Equipping

- Can learn many skills but only **equip 4** for combat
- Change equipped skills between battles
- Choose skills that complement your strategy

---

## Equipment System

### Equipment Slots

Each character has **6 equipment slots**:

1. **Weapon** - Increases ATK or MAG
2. **Armor** - Increases DEF or RES
3. **Helmet** - Balanced stat bonuses
4. **Boots** - Increases SPD and EVA
5. **Accessory** - Special effects
6. **Ring** - Stat bonuses

### Item Rarity

| Rarity | Color | Stat Bonus |
|--------|-------|------------|
| Common | Gray | +5% |
| Uncommon | Green | +10% |
| Rare | Blue | +15% |
| Epic | Purple | +25% |
| Legendary | Orange | +40% |

### Stat Bonuses

Equipment adds flat bonuses to base stats:

```javascript
// Example: Legendary Iron Sword
{
  name: "Legendary Iron Sword",
  rarity: "legendary",
  type: "weapon",
  slot: "weapon",
  statBonuses: {
    atk: 40,  // +40 ATK
    crit: 10  // +10% Crit
  }
}
```

**Total Stats:**
```
finalATK = baseATK + weaponBonus + armorBonus + ...
```

---

## Enemy System

### Enemy Types

**Regular Enemies:**
- Goblins (Early game)
- Undead (Mid game)
- Beasts (All stages)
- Dark Cultists (Late game)

**Boss Enemies:**
- Appear every 10 stages
- Significantly stronger (2.5x HP, 2x ATK)
- Higher level than stage number
- Special boss sprites

### Enemy AI

Enemies use simple but effective AI:

**Strategy:**
1. Find closest player character
2. If in attack range → Attack
3. If can use skill → Use skill
4. Otherwise → Move closer

**Difficulty Scaling:**
- Enemy level increases with stage
- More enemies spawn at higher stages
- Boss battles test strategy and builds

---

## Rewards System

### Battle Rewards

Win battles to earn:

- **Experience (EXP)** - Upgrade characters
- **CHS Tokens** - In-game currency

**Reward Calculation:**
```javascript
// Base rewards
baseEXP = stage × 50
baseCHS = stage × 10

// Boss bonus (10x rewards)
if (isBossStage) {
  exp = baseEXP × 10
  chs = baseCHS × 10
}

// Team size bonus (fewer characters = more rewards per character)
expPerChar = exp / teamSize
chsPerChar = chs / teamSize
```

### Claiming Rewards

Rewards are stored off-chain and claimed on-chain:

1. Win battles → Rewards stored in localStorage
2. Click "Claim Rewards" → Mint CHS to wallet
3. Use CHS to upgrade characters on-chain

---

## Progression Strategy

### Early Game (Levels 1-20)

**Focus:**
- Learn basic skills
- Equip common/uncommon items
- Build balanced team (tank + damage + support)

**Tips:**
- Don't upgrade all characters - focus on main team
- Save CHS for important upgrades
- Complete stages 1-10 to learn mechanics

### Mid Game (Levels 20-50)

**Focus:**
- Specialize character builds
- Farm stages for better equipment
- Unlock advanced skills

**Tips:**
- Start building class-specific teams
- Use terrain strategically
- Challenge boss stages for big EXP boost

### Late Game (Levels 50-100)

**Focus:**
- Min-max character stats
- Perfect equipment loadouts
- Optimize skill rotations

**Tips:**
- Farm highest stages you can beat
- Trade for legendary equipment
- Experiment with advanced team compositions

---

## Team Composition

### Balanced Team (Recommended for beginners)

```
Tank (Warrior/Paladin)
Damage (Mage/Archer)
Damage (Assassin/Warrior)
Support (Healer)
```

### Aggressive Team (High risk, high reward)

```
Damage (Mage)
Damage (Archer)
Damage (Assassin)
Damage (Dark Mage)
```

### Defensive Team (Slow but safe)

```
Tank (Paladin)
Tank (Dwarf)
Healer (Healer)
Damage (Mage)
```

### Tactical Team (Advanced)

```
Speed (Monk) - Scout and disrupt
Ranged (Archer) - Safe damage
Control (Dark Mage) - Debuffs
Tank (Paladin) - Protect backline
```

---

## Advanced Tactics

### Positioning

- **Frontline** - Tanks absorb damage
- **Backline** - Ranged units stay safe
- **Flanking** - Attack from sides to avoid tanks

### Resource Management

- **Mana** - Don't waste on weak enemies
- **Skills** - Save for dangerous foes
- **Movement** - Don't overextend

### Terrain Control

- **High Ground** - Ranged units get damage boost
- **Forests** - Tanks become harder to kill
- **Choke Points** - Control enemy movement

---

For technical implementation details, see:
- [Architecture](./architecture.md)
- [Smart Contracts](./smart-contracts.md)
- [API Reference](./api-reference.md)
