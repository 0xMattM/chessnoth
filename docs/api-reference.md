# 📚 API Reference

Complete technical reference for Chessnoth's contracts, functions, and utilities.

## Table of Contents

- [Smart Contract APIs](#smart-contract-apis)
- [Frontend Utilities](#frontend-utilities)
- [Game Logic APIs](#game-logic-apis)
- [Type Definitions](#type-definitions)

---

## Smart Contract APIs

### CharacterNFT Contract

**Address (Sepolia):** `0x0B8F3dAe06Da38927149f1DDe728F1c781473288`

#### Read Functions

##### `balanceOf(address owner)`
Returns the number of NFTs owned by an address.

**Parameters:**
- `owner` (address): Wallet address to query

**Returns:** `uint256` - Number of NFTs owned

**Example:**
```javascript
const balance = await characterNFT.balanceOf(userAddress)
console.log(`User owns ${balance} characters`)
```

---

##### `ownerOf(uint256 tokenId)`
Returns the owner of a specific NFT.

**Parameters:**
- `tokenId` (uint256): ID of the token

**Returns:** `address` - Owner's address

**Example:**
```javascript
const owner = await characterNFT.ownerOf(tokenId)
```

---

##### `tokenOfOwnerByIndex(address owner, uint256 index)`
Returns token ID by owner and index.

**Parameters:**
- `owner` (address): Owner's address
- `index` (uint256): Index in owner's token list

**Returns:** `uint256` - Token ID

**Example:**
```javascript
// Get first token of user
const tokenId = await characterNFT.tokenOfOwnerByIndex(userAddress, 0)
```

---

##### `getCharacter(uint256 tokenId)`
Gets complete character data.

**Parameters:**
- `tokenId` (uint256): Token ID

**Returns:**
```solidity
(
    string memory class,      // Character class
    uint256 level,           // Current level
    uint256 experience,      // Total experience
    string memory name       // Character name
)
```

**Example:**
```javascript
const [charClass, level, exp, name] = await characterNFT.getCharacter(tokenId)
```

---

##### `getClass(uint256 tokenId)`
Gets character class only.

**Returns:** `string` - Character class

---

##### `getLevel(uint256 tokenId)`
Gets character level only.

**Returns:** `uint256` - Current level

---

##### `getExperience(uint256 tokenId)`
Gets total character experience.

**Returns:** `uint256` - Total experience points

---

##### `getName(uint256 tokenId)`
Gets character name.

**Returns:** `string` - Character name

---

#### Write Functions

##### `mintCharacter(address to, string characterClass, string name)`
Mints a new character NFT.

**Parameters:**
- `to` (address): Recipient address
- `characterClass` (string): Class name (e.g., "warrior")
- `name` (string): Custom character name

**Returns:** `uint256` - Token ID of minted character

**Requirements:**
- Caller must be authorized minter
- Contract must not be paused

**Example:**
```javascript
const tx = await characterNFT.mintCharacter(
    userAddress,
    'warrior',
    'Aragorn'
)
await tx.wait()
```

---

##### `upgradeCharacter(uint256 tokenId, uint256 experienceToAdd)`
Adds experience to character and levels up if applicable.

**Parameters:**
- `tokenId` (uint256): Token ID
- `experienceToAdd` (uint256): Amount of EXP to add

**Requirements:**
- Caller must own the token
- Experience must be > 0

**Example:**
```javascript
const tx = await characterNFT.upgradeCharacter(tokenId, 1000)
await tx.wait()
```

---

### CHSToken Contract

**Address (Sepolia):** `0xC1b664aF3be8032a303105b2afa8257c4B61A447`

#### Read Functions (ERC20)

##### `balanceOf(address account)`
Returns CHS token balance.

**Returns:** `uint256` - Balance in wei (18 decimals)

**Example:**
```javascript
const balance = await chsToken.balanceOf(userAddress)
const balanceFormatted = ethers.formatEther(balance)
console.log(`Balance: ${balanceFormatted} CHS`)
```

---

##### `totalSupply()`
Returns total supply of CHS tokens.

**Returns:** `uint256` - Total supply in wei

---

##### `allowance(address owner, address spender)`
Returns remaining allowance for spender.

**Returns:** `uint256` - Allowance amount in wei

---

#### Write Functions

##### `mint(address to, uint256 amount)`
Mints CHS tokens to an address.

**Parameters:**
- `to` (address): Recipient address
- `amount` (uint256): Amount in wei (18 decimals)

**Requirements:**
- Caller must be authorized minter

**Example:**
```javascript
const amount = ethers.parseEther('100') // 100 CHS
const tx = await chsToken.mint(userAddress, amount)
await tx.wait()
```

---

##### `approve(address spender, uint256 amount)`
Approves spender to use tokens.

**Parameters:**
- `spender` (address): Address to approve
- `amount` (uint256): Amount in wei

**Example:**
```javascript
// Approve marketplace to spend CHS
const amount = ethers.parseEther('100')
await chsToken.approve(MARKETPLACE_ADDRESS, amount)
```

---

##### `transfer(address to, uint256 amount)`
Transfers tokens to another address.

**Parameters:**
- `to` (address): Recipient address
- `amount` (uint256): Amount in wei

**Example:**
```javascript
const amount = ethers.parseEther('50')
await chsToken.transfer(recipientAddress, amount)
```

---

### Marketplace Contract

**Address (Sepolia):** `0xa8753b20282442c2c14ef78381644c13129Ce848`

#### Read Functions

##### `listings(uint256 listingId)`
Gets listing details.

**Returns:**
```solidity
(
    address seller,
    address nftContract,
    uint256 tokenId,
    uint256 priceMNT,
    uint256 priceCHS,
    bool active
)
```

**Example:**
```javascript
const listing = await marketplace.listings(listingId)
if (listing.active) {
    console.log(`Price: ${ethers.formatEther(listing.priceMNT)} MNT`)
}
```

---

##### `nextListingId()`
Gets the next listing ID to be created.

**Returns:** `uint256` - Next listing ID

---

##### `platformFeePercentage()`
Gets current platform fee percentage.

**Returns:** `uint256` - Fee in basis points (250 = 2.5%)

---

#### Write Functions

##### `listNFT(address nftContract, uint256 tokenId, uint256 priceMNT, uint256 priceCHS)`
Lists an NFT for sale.

**Parameters:**
- `nftContract` (address): NFT contract address
- `tokenId` (uint256): Token ID to list
- `priceMNT` (uint256): Price in MNT (wei)
- `priceCHS` (uint256): Price in CHS (wei)

**Requirements:**
- Caller must own the NFT
- NFT must be approved for marketplace
- At least one price must be set

**Example:**
```javascript
// Approve NFT first
await characterNFT.approve(MARKETPLACE_ADDRESS, tokenId)

// List for 0.1 MNT or 100 CHS
const priceMNT = ethers.parseEther('0.1')
const priceCHS = ethers.parseEther('100')
await marketplace.listNFT(
    CHARACTER_NFT_ADDRESS,
    tokenId,
    priceMNT,
    priceCHS
)
```

---

##### `buyNFTWithMNT(uint256 listingId)`
Purchases NFT with MNT.

**Parameters:**
- `listingId` (uint256): Listing ID

**Requirements:**
- Send exact MNT amount as msg.value
- Listing must be active

**Example:**
```javascript
const listing = await marketplace.listings(listingId)
await marketplace.buyNFTWithMNT(listingId, {
    value: listing.priceMNT
})
```

---

##### `buyNFTWithCHS(uint256 listingId)`
Purchases NFT with CHS tokens.

**Parameters:**
- `listingId` (uint256): Listing ID

**Requirements:**
- Must approve CHS tokens first
- Must have sufficient balance

**Example:**
```javascript
const listing = await marketplace.listings(listingId)
await chsToken.approve(MARKETPLACE_ADDRESS, listing.priceCHS)
await marketplace.buyNFTWithCHS(listingId)
```

---

##### `cancelListing(uint256 listingId)`
Cancels an active listing.

**Parameters:**
- `listingId` (uint256): Listing ID

**Requirements:**
- Caller must be the seller

**Example:**
```javascript
await marketplace.cancelListing(listingId)
```

---

## Frontend Utilities

### Contract Utilities (`lib/contract.ts`)

#### `CHARACTER_NFT_ADDRESS`
Contract address constant.

```typescript
export const CHARACTER_NFT_ADDRESS = '0x...' as `0x${string}`
```

---

#### `CHARACTER_NFT_ABI`
Contract ABI array.

```typescript
export const CHARACTER_NFT_ABI = [...] as const
```

---

### NFT Utilities (`lib/nft.ts`)

#### `calculateLevelFromExperience(experience: bigint): number`
Calculates character level from total experience.

**Formula:** `level = floor(sqrt(experience / 100))`

**Example:**
```typescript
const level = calculateLevelFromExperience(10000n) // Returns 10
```

---

#### `getExperienceForNextLevel(currentExp: bigint): bigint`
Returns experience needed for next level.

**Example:**
```typescript
const nextLevelExp = getExperienceForNextLevel(9500n)
console.log(`Need ${nextLevelExp} EXP for next level`)
```

---

### Character Utilities (`lib/character-utils.ts`)

#### `formatClassName(className: string): string`
Formats class name for display.

**Example:**
```typescript
formatClassName('dark_mage') // Returns "Dark Mage"
```

---

#### `extractStringFromResult(result: any, fallback?: string): string`
Safely extracts string from contract result.

**Example:**
```typescript
const className = extractStringFromResult(contractResult, 'unknown')
```

---

#### `extractLevelFromResult(result: any, fallback?: number): number`
Safely extracts level from contract result.

---

## Game Logic APIs

### Combat System (`lib/combat.ts`)

#### `calculateCombatStats(character: BattleCharacter): Promise<CombatStats>`
Calculates character's combat stats with level scaling and equipment bonuses.

**Parameters:**
- `character` - Battle character object

**Returns:** `Promise<CombatStats>` - Calculated stats

**Example:**
```typescript
const stats = await calculateCombatStats(character)
console.log(`HP: ${stats.hp}, ATK: ${stats.atk}`)
```

---

#### `calculateDamage(attacker, defender, isPhysical, damageMultiplier): number`
Calculates damage dealt in combat.

**Parameters:**
- `attacker` (CombatCharacter): Attacking character
- `defender` (CombatCharacter): Defending character
- `isPhysical` (boolean): True for physical, false for magical
- `damageMultiplier` (number): Skill multiplier (default: 1.0)

**Returns:** `number` - Final damage value

**Example:**
```typescript
const damage = calculateDamage(attacker, defender, true, 1.5)
```

---

#### `calculateTurnOrder(characters: CombatCharacter[]): CombatCharacter[]`
Sorts characters by speed to determine turn order.

**Returns:** Sorted array of characters

---

#### `getValidMovePositions(character, board, terrainMap, maxDistance): Position[]`
Gets valid movement positions for a character.

**Parameters:**
- `character` (CombatCharacter): Character to move
- `board` (CombatCharacter[][]) - Current board state
- `terrainMap` (TerrainType[][]) - Terrain map
- `maxDistance` (number): Max movement range

**Returns:** Array of valid positions

---

#### `getValidAttackTargets(character, allCharacters, range?): CombatCharacter[]`
Gets valid attack targets within range.

**Parameters:**
- `character` (CombatCharacter): Attacking character
- `allCharacters` (CombatCharacter[]): All characters in battle
- `range` (number, optional): Override attack range

**Returns:** Array of valid targets

---

### Reward System (`lib/rewards.ts`)

#### `addPendingRewards(chs: number, exp: number, isBoss: boolean): void`
Adds rewards to pending rewards list.

**Parameters:**
- `chs` (number): CHS tokens earned
- `exp` (number): Experience earned
- `isBoss` (boolean): Was it a boss battle?

---

#### `getPendingRewards(): PendingReward[]`
Gets all pending rewards.

**Returns:** Array of pending rewards

---

#### `getTotalPendingCHS(): number`
Gets total pending CHS tokens.

**Returns:** Total CHS amount

---

#### `getTotalPendingEXP(): number`
Gets total pending experience.

**Returns:** Total EXP amount

---

## Type Definitions

### CombatStats
```typescript
interface CombatStats {
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  atk: number
  mag: number
  def: number
  res: number
  spd: number
  eva: number
  crit: number
}
```

### CombatCharacter
```typescript
interface CombatCharacter {
  id: string
  tokenId: string
  name: string
  class: string
  level: number
  stats: CombatStats
  baseStats: CombatStats
  position: { row: number; col: number } | null
  team: 'player' | 'enemy'
  hasMoved: boolean
  hasActed: boolean
  statusEffects: StatusEffect[]
  skills?: { [skillId: string]: number }
  equippedSkills?: string[]
}
```

### BattleCharacter
```typescript
interface BattleCharacter {
  tokenId: string
  name: string
  class: string
  level: number
  equipment: {
    weapon?: string
    armor?: string
    helmet?: string
    boots?: string
    accessory?: string
    ring?: string
  }
  skills: { [skillId: string]: number }
  equippedSkills: string[]
}
```

### PendingReward
```typescript
interface PendingReward {
  chs: number
  exp: number
  timestamp: number
  isBoss: boolean
}
```

---

## Constants

### Game Balance (`lib/constants.ts`)

```typescript
export const COMBAT_CALCULATIONS = {
  DEFENSE_FACTOR: 0.5,      // Defense reduction multiplier
  MIN_DAMAGE_FACTOR: 0.15,  // Minimum damage percentage
  CRIT_MULTIPLIER: 2.0,     // Critical hit multiplier
  BASE_MOVEMENT_RANGE: 3    // Default movement range
}

export const REWARD_CALCULATIONS = {
  BASE_EXP_PER_STAGE: 50,   // Base EXP for stage
  BASE_CHS_PER_STAGE: 10,   // Base CHS for stage
  BOSS_MULTIPLIER: 10       // Boss reward multiplier
}

export const MAX_TEAM_SIZE = 4     // Maximum team size
export const GRID_SIZE = 8         // Combat grid size
```

---

For more information, see:
- [Architecture](./architecture.md)
- [Game Mechanics](./game-mechanics.md)
- [Smart Contracts](./smart-contracts.md)
