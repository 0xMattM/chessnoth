# Chessnoth - Contracts and NFT System Planning

## Executive Summary

This document plans the complete implementation of the NFT system, tokens, experience, and marketplace for Chessnoth. The system allows characters to be mintable NFTs, gain experience through combat, level up on-chain, and be traded on a marketplace.

## System Architecture

### General Flow

1. **Minting**: User mints character NFT from the app
2. **Combat**: User fights with their characters, earns rewards (in-game pseudocurrency)
3. **EXP Distribution**: User distributes earned experience among their characters
4. **On-Chain Upgrade**: User signs transaction to add EXP to NFT (every 100 EXP = 1 level)
5. **Stats Calculation**: Game reads class, name, and level from NFT to calculate stats
6. **CHS Token**: CHS is earned through combat, used to buy items or trade NFTs

## Required Contracts

### 1. CharacterNFT.sol (Update)

**Current Status**: Already exists with basic structure (level, EXP, class, generation)

**Required Changes**:

1. **Add `name` field**:
   ```solidity
   mapping(uint256 => string) private _names;
   ```

2. **Update `mintCharacter` function**:
   - Add `name` parameter
   - Store name in `_names[tokenId]`

3. **Implement `upgradeCharacter` function** (replaces `addExperience`):
   ```solidity
   function upgradeCharacter(uint256 tokenId, uint256 expAmount) external {
       // Validate ownership
       // Add EXP
       // Calculate new level (EXP / 100)
       // If leveled up, emit CharacterLevelUp event
       // Emit ExperienceGained event
   }
   ```

4. **`getName` function**:
   ```solidity
   function getName(uint256 tokenId) external view returns (string memory)
   ```

5. **Automatic level calculation**:
   - Level = floor(EXP / 100) + 1
   - Example: 0 EXP = Level 1, 100 EXP = Level 2, 250 EXP = Level 3

**NFT Data Structure**:
- `class`: string (e.g., "Warrior", "Mage")
- `name`: string (custom character name)
- `level`: uint256 (automatically calculated: floor(EXP / 100) + 1)
- `experience`: uint256 (total accumulated EXP)
- `generation`: uint256 (for future expansions)

**Events**:
- `CharacterMinted(tokenId, owner, class, name, generation, ipfsHash)`
- `CharacterUpgraded(tokenId, oldLevel, newLevel, expAdded, totalExp)`
- `CharacterLevelUp(tokenId, oldLevel, newLevel, totalExp)`

### 2. CHSToken.sol (New)

**Type**: Standard ERC20 with controlled minting functions

**Features**:
- Controlled minting (only authorized addresses)
- Standard ERC20 transfers
- Optional burning (to burn tokens)

**Main Functions**:
```solidity
function mint(address to, uint256 amount) external onlyAuthorized
function burn(uint256 amount) external
function setAuthorizedMinter(address minter) external onlyOwner
```

**Usage**:
- Combat rewards: `mint(playerAddress, rewardAmount)`
- ItemShop purchases: Transfer CHS to contract
- Marketplace: Pay with CHS or MNT

### 3. Marketplace.sol (New)

**Features**:
- List NFTs for sale (price in CHS or MNT)
- Buy listed NFTs
- Cancel own listings
- Optional fees (e.g., 2.5% for contract)

**Listing Structure**:
```solidity
struct Listing {
    uint256 tokenId;
    address seller;
    uint256 price;
    address paymentToken; // address(0) for MNT, CHS address for CHS
    bool active;
}
```

**Main Functions**:
```solidity
function listNFT(uint256 tokenId, uint256 price, address paymentToken) external
function buyNFT(uint256 listingId) external payable
function cancelListing(uint256 listingId) external
function getListing(uint256 listingId) external view returns (Listing memory)
```

**Flow**:
1. User approves NFT to contract (ERC721 approve)
2. User calls `listNFT` with price and payment token
3. Buyer calls `buyNFT` (pays with CHS or MNT)
4. NFT transfers to buyer, funds to seller

### 4. ItemShop.sol (New - Optional)

**Alternative**: Items can be off-chain data only, don't need to be NFTs

**If implemented**:
- Items as ERC1155 NFTs (multiple copies of same item)
- Or items as simple on-chain records

**Functions**:
```solidity
function buyItem(uint256 itemId, uint256 quantity) external
function getItemPrice(uint256 itemId) external view returns (uint256)
```

**Note**: For now, items can remain as off-chain data. ItemShop can be implemented later if needed.

## Experience and Level System

### Off-Chain → On-Chain Flow

1. **Combat (Off-Chain)**:
   - User fights and earns rewards
   - Rewards stored as "in-game pseudocurrency" (off-chain)
   - User can distribute this pseudocurrency as EXP among their characters

2. **EXP Distribution (Off-Chain)**:
   - User chooses characters and EXP amount for each
   - App calculates how much EXP can be assigned

3. **On-Chain Upgrade**:
   - User signs transaction `upgradeCharacter(tokenId, expAmount)`
   - Contract:
     - Validates ownership
     - Adds EXP to NFT
     - Automatically calculates new level
     - Emits events

### Level Calculation

```
Level = floor(EXP / 100) + 1
```

**Examples**:
- 0 EXP → Level 1
- 50 EXP → Level 1
- 100 EXP → Level 2
- 150 EXP → Level 2
- 200 EXP → Level 3
- 999 EXP → Level 10
- 1000 EXP → Level 11

### Stats Bonus by Level

**Linear Formula**:
```
FinalStat = BaseStat + (GrowthRate * (Level - 1))
```

This is already implemented in the current code (`lib/combat.ts` and `components/character-inventory.tsx`).

## Stats System

### Reading from NFT

The game only needs to read from the contract:
- `class`: To load base stats and growth rates
- `name`: To display character name
- `level`: To calculate final stats (or `experience` and calculate level)

**Stats Calculation**:
1. Read `class` from NFT
2. Load `baseStats` and `growthRates` from class JSON file
3. Read `level` from NFT (or calculate from `experience`)
4. Apply formula: `Stat = BaseStat + (GrowthRate * (Level - 1))`
5. Add equipment bonuses (off-chain)

### Equipment

Items and equipment can remain off-chain for now:
- Stored in localStorage or database
- Don't need to be NFTs (unless you want an item marketplace)
- Item stats are applied after calculating base stats + level

## NFT Images

### Image Structure

Each class has a unique image in `contracts/NFTsimages/`:
- `Warrior.png`
- `Mage.png`
- `Paladin.png`
- `Archer.png`
- `Assassin.png` (Assasin.png in file)
- `Healer.png`
- `Monk.png`
- `DarkMage.png`
- `Dwarf.png`
- `AxeThower.png` (AxeThower.png in file)

### IPFS Metadata

Each NFT must have JSON metadata on IPFS with:
```json
{
  "name": "Character Name",
  "description": "Character NFT for Chessnoth",
  "image": "ipfs://Qm...", // Class image
  "attributes": [
    { "trait_type": "Class", "value": "Warrior" },
    { "trait_type": "Level", "value": 5 },
    { "trait_type": "Experience", "value": 450 }
  ]
}
```

## Game Integration

### NFT Reading Flow

1. **Load User Characters**:
   ```typescript
   // Get all user NFTs
   const balance = await contract.read.balanceOf([userAddress])
   const tokenIds = await Promise.all(
     Array.from({ length: balance }).map((_, i) =>
       contract.read.tokenOfOwnerByIndex([userAddress, i])
     )
   )
   
   // Read data from each NFT
   const characters = await Promise.all(
     tokenIds.map(async (tokenId) => {
       const [class, name, level, experience] = await Promise.all([
         contract.read.getClass([tokenId]),
         contract.read.getName([tokenId]),
         contract.read.getLevel([tokenId]),
         contract.read.getExperience([tokenId])
       ])
       return { tokenId, class, name, level, experience }
     })
   )
   ```

2. **Calculate Stats for Combat**:
   - Use `class` to load class data
   - Use `level` to calculate base stats
   - Add equipment (off-chain)

### Upgrade Flow

1. **User earns rewards** (off-chain)
2. **User distributes EXP** (off-chain, UI)
3. **User confirms upgrade**:
   ```typescript
   await contract.write.upgradeCharacter([tokenId, expAmount])
   ```
4. **App listens to events**:
   - `CharacterUpgraded`: Update UI
   - `CharacterLevelUp`: Show notification

## CHS Tokenomics

### Distribution

- **Combat Rewards**: 50-200 CHS per battle (depending on difficulty)
- **Daily Quests**: 100-500 CHS
- **Achievements**: 500-2000 CHS
- **Staking** (future): Rewards for staking NFTs

### Usage

- **Buy Items**: 50-500 CHS per item
- **Upgrade NFTs**: Gas cost + possible fee (optional)
- **Marketplace**: Buy/sell NFTs
- **Exchange**: CHS ↔ MNT (future DEX)

## Security and Considerations

### Validations

1. **CharacterNFT**:
   - Only owner can upgrade their NFT
   - Validate that EXP > 0
   - Validate that token exists

2. **CHSToken**:
   - Only authorized addresses can mint
   - Validate that amount > 0

3. **Marketplace**:
   - Validate ownership before listing
   - Validate that listing is active before buying
   - Validate that buyer has sufficient funds
   - Use ReentrancyGuard

### Gas Optimization

- Use `uint256` for EXP (since it can be large)
- Emit events only when necessary
- Batch multiple upgrades in one transaction (if possible)

## Implementation Plan

### Phase 1: Update CharacterNFT
- [ ] Add `name` field
- [ ] Implement `upgradeCharacter` with automatic level calculation
- [ ] Add `getName` function
- [ ] Update events
- [ ] Unit tests

### Phase 2: Create CHSToken
- [ ] Implement ERC20 contract
- [ ] Add controlled minting functions
- [ ] Unit tests
- [ ] Deploy to testnet

### Phase 3: Create Marketplace
- [ ] Implement listing structure
- [ ] Implement list/buy/cancel functions
- [ ] Add support for CHS and MNT
- [ ] Unit tests
- [ ] Deploy to testnet

### Phase 4: Frontend Integration
- [ ] Update ABI in `lib/contract.ts`
- [ ] Create hooks to read NFTs
- [ ] Create UI to distribute EXP
- [ ] Create UI to upgrade NFTs
- [ ] Create UI for marketplace
- [ ] Integrate with combat system

### Phase 5: Testing and Optimization
- [ ] End-to-end tests
- [ ] Gas optimization
- [ ] Security audit (optional)
- [ ] Deploy to mainnet

## Files to Create/Modify

### Contracts
- `contracts/CharacterNFT.sol` (modify)
- `contracts/CHSToken.sol` (new)
- `contracts/Marketplace.sol` (new)

### Frontend
- `lib/contract.ts` (update ABIs)
- `lib/nft.ts` (new - NFT utilities)
- `lib/chs-token.ts` (new - CHS utilities)
- `app/upgrade/page.tsx` (new - upgrade UI)
- `app/marketplace/page.tsx` (new - marketplace UI)
- `hooks/useCharacterNFT.ts` (new - hook to read NFTs)
- `hooks/useUpgrade.ts` (new - upgrade hook)

### Tests
- `contracts/test/CharacterNFT.test.js` (update)
- `contracts/test/CHSToken.test.js` (new)
- `contracts/test/Marketplace.test.js` (new)

## Questions and Pending Decisions

1. **ItemShop**: Implement now or later?
   - **Decision**: Implement later, items can be off-chain for now

2. **Marketplace Fees**: What percentage?
   - **Suggestion**: 2.5% for contract, 0% for seller (or configurable)

3. **EXP Limit per Transaction**: Is there a limit?
   - **Suggestion**: No limit, but validate that it doesn't cause overflow

4. **IPFS Images**: Who uploads the images?
   - **Suggestion**: Backend or pinning service (Pinata, NFT.Storage)

5. **Minting Price**: Free or with cost?
   - **Suggestion**: Free for users, gas cost covered by game (or user pays gas)

## Additional Notes

- Base stats and growth rates remain off-chain (JSON files)
- Equipment remains off-chain (localStorage or database)
- Only class, name, level, and EXP are on-chain
- Final stats calculation is done in frontend using on-chain + off-chain data
