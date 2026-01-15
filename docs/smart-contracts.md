# 📜 Smart Contracts

Complete documentation for Chessnoth's smart contracts deployed on Mantle Network.

## Overview

Chessnoth uses three main smart contracts:

1. **CharacterNFT** (ERC721) - Character ownership and progression
2. **CHSToken** (ERC20) - In-game utility token
3. **Marketplace** - P2P NFT trading platform

All contracts are deployed on **Mantle Sepolia Testnet** and fully verified.

## Deployed Contracts

### Mantle Sepolia Testnet

| Contract | Address | Explorer |
|----------|---------|----------|
| CharacterNFT | `0x0B8F3dAe06Da38927149f1DDe728F1c781473288` | [View](https://explorer.sepolia.mantle.xyz/address/0x0B8F3dAe06Da38927149f1DDe728F1c781473288) |
| CHSToken | `0xC1b664aF3be8032a303105b2afa8257c4B61A447` | [View](https://explorer.sepolia.mantle.xyz/address/0xC1b664aF3be8032a303105b2afa8257c4B61A447) |
| Marketplace | `0xa8753b20282442c2c14ef78381644c13129Ce848` | [View](https://explorer.sepolia.mantle.xyz/address/0xa8753b20282442c2c14ef78381644c13129Ce848) |

**Network:** Mantle Sepolia Testnet (Chain ID: 5003)

---

## CharacterNFT Contract

### Overview

ERC721 NFT contract representing game characters with on-chain metadata and progression.

**Contract:** `contracts/CharacterNFT.sol`

### Key Features

- ✅ Full ERC721 implementation
- ✅ On-chain character metadata
- ✅ Level and experience tracking
- ✅ Custom character names
- ✅ Controlled minting via authorized minters
- ✅ Upgradeable character stats
- ✅ Pausable for emergency stops

### Main Functions

#### Minting

```solidity
function mintCharacter(
    address to,
    string memory characterClass,
    string memory name
) external onlyAuthorizedMinter returns (uint256)
```

Mints a new character NFT.

**Parameters:**
- `to`: Address that will receive the NFT
- `characterClass`: Class name (e.g., "warrior", "mage")
- `name`: Custom character name

**Returns:** Token ID of the minted character

**Requirements:**
- Caller must be an authorized minter
- Contract must not be paused
- Character class must be valid

#### Upgrading Characters

```solidity
function upgradeCharacter(
    uint256 tokenId,
    uint256 experienceToAdd
) external
```

Adds experience to a character and auto-levels up if threshold reached.

**Parameters:**
- `tokenId`: ID of the character to upgrade
- `experienceToAdd`: Amount of experience to add

**Requirements:**
- Caller must own the token
- Experience must be > 0

**Level Calculation:**
```solidity
// Level formula: sqrt(experience / 100)
level = sqrt(totalExperience / 100)
```

#### Reading Character Data

```solidity
function getCharacter(uint256 tokenId) 
    external 
    view 
    returns (
        string memory class,
        uint256 level,
        uint256 experience,
        string memory name
    )
```

Gets complete character data.

```solidity
function getClass(uint256 tokenId) external view returns (string memory)
function getLevel(uint256 tokenId) external view returns (uint256)
function getExperience(uint256 tokenId) external view returns (uint256)
function getName(uint256 tokenId) external view returns (string memory)
```

Individual getters for specific character properties.

### Access Control

```solidity
mapping(address => bool) public authorizedMinters;

function addAuthorizedMinter(address minter) external onlyOwner
function removeAuthorizedMinter(address minter) external onlyOwner
```

Only addresses in `authorizedMinters` can mint new characters.

### Events

```solidity
event CharacterMinted(
    uint256 indexed tokenId,
    address indexed owner,
    string characterClass,
    string name
)

event CharacterUpgraded(
    uint256 indexed tokenId,
    uint256 newLevel,
    uint256 totalExperience
)
```

---

## CHSToken Contract

### Overview

ERC20 utility token used as in-game currency.

**Contract:** `contracts/CHSToken.sol`

### Key Features

- ✅ Standard ERC20 implementation
- ✅ Controlled minting (no public mint)
- ✅ Authorized minter system
- ✅ Burnable tokens
- ✅ Pausable transfers

### Token Details

- **Name:** Chessnoth Token
- **Symbol:** CHS
- **Decimals:** 18
- **Initial Supply:** 0 (minted as needed)
- **Max Supply:** No hard cap (controlled by game economy)

### Main Functions

#### Minting

```solidity
function mint(address to, uint256 amount) external onlyAuthorizedMinter
```

Mints CHS tokens to an address.

**Parameters:**
- `to`: Recipient address
- `amount`: Amount of tokens (in wei, 18 decimals)

**Requirements:**
- Caller must be an authorized minter
- Contract must not be paused

**Example:**
```javascript
// Mint 100 CHS tokens
const amount = ethers.parseEther("100")
await chsToken.mint(userAddress, amount)
```

#### Burning

```solidity
function burn(uint256 amount) public
function burnFrom(address account, uint256 amount) public
```

Burns tokens to reduce supply.

### Access Control

```solidity
mapping(address => bool) public authorizedMinters;

function addAuthorizedMinter(address minter) external onlyOwner
function removeAuthorizedMinter(address minter) external onlyOwner
```

Multiple authorized minters can exist simultaneously.

### Events

```solidity
event TokensMinted(address indexed to, uint256 amount)
event TokensBurned(address indexed from, uint256 amount)
```

---

## Marketplace Contract

### Overview

P2P marketplace for buying and selling character NFTs with dual currency support.

**Contract:** `contracts/Marketplace.sol`

### Key Features

- ✅ List NFTs for sale
- ✅ Buy with MNT (native token)
- ✅ Buy with CHS tokens
- ✅ Cancel listings
- ✅ Platform fee system
- ✅ Secure escrow mechanism

### Main Functions

#### Listing NFTs

```solidity
function listNFT(
    address nftContract,
    uint256 tokenId,
    uint256 priceMNT,
    uint256 priceCHS
) external
```

Lists an NFT for sale.

**Parameters:**
- `nftContract`: Address of the NFT contract (CharacterNFT)
- `tokenId`: ID of the token to list
- `priceMNT`: Price in MNT (wei)
- `priceCHS`: Price in CHS tokens (wei)

**Requirements:**
- Caller must own the NFT
- NFT must be approved for marketplace
- At least one price must be set

**Example:**
```javascript
// Approve marketplace
await characterNFT.approve(MARKETPLACE_ADDRESS, tokenId)

// List for 0.1 MNT or 100 CHS
const priceMNT = ethers.parseEther("0.1")
const priceCHS = ethers.parseEther("100")
await marketplace.listNFT(
    CHARACTER_NFT_ADDRESS,
    tokenId,
    priceMNT,
    priceCHS
)
```

#### Buying with MNT

```solidity
function buyNFTWithMNT(uint256 listingId) external payable
```

Purchases an NFT using MNT.

**Parameters:**
- `listingId`: ID of the listing

**Requirements:**
- Listing must be active
- Sent MNT must match listing price
- Buyer cannot be the seller

#### Buying with CHS

```solidity
function buyNFTWithCHS(uint256 listingId) external
```

Purchases an NFT using CHS tokens.

**Parameters:**
- `listingId`: ID of the listing

**Requirements:**
- Listing must be active
- Buyer must have approved CHS tokens
- Buyer must have sufficient CHS balance
- Buyer cannot be the seller

**Example:**
```javascript
// Approve CHS tokens
await chsToken.approve(MARKETPLACE_ADDRESS, price)

// Buy with CHS
await marketplace.buyNFTWithCHS(listingId)
```

#### Canceling Listings

```solidity
function cancelListing(uint256 listingId) external
```

Removes a listing from the marketplace.

**Requirements:**
- Caller must be the seller
- Listing must be active

### Fee System

```solidity
uint256 public platformFeePercentage = 250; // 2.5%
address public feeRecipient;

function setFee(uint256 newFee) external onlyOwner
function setFeeRecipient(address newRecipient) external onlyOwner
```

Platform fee is deducted from each sale and sent to `feeRecipient`.

**Fee Calculation:**
```solidity
fee = (price * platformFeePercentage) / 10000
sellerReceives = price - fee
```

### Structs

```solidity
struct Listing {
    address seller;
    address nftContract;
    uint256 tokenId;
    uint256 priceMNT;
    uint256 priceCHS;
    bool active;
}
```

### Events

```solidity
event NFTListed(
    uint256 indexed listingId,
    address indexed seller,
    address indexed nftContract,
    uint256 tokenId,
    uint256 priceMNT,
    uint256 priceCHS
)

event NFTSold(
    uint256 indexed listingId,
    uint256 indexed tokenId,
    address seller,
    address buyer,
    uint256 price,
    string currency
)

event ListingCancelled(
    uint256 indexed listingId,
    address indexed seller
)
```

---

## Testing

### Test Coverage

```
CharacterNFT:   80+ tests
CHSToken:       64+ tests  
Marketplace:    62+ tests
─────────────────────────
Total:          270+ tests (96.3% pass rate)
```

### Running Tests

```bash
# Run all tests
npm run test

# Run specific contract tests
npx hardhat test test/CharacterNFT.test.js
npx hardhat test test/CHSToken.test.js
npx hardhat test test/Marketplace.test.js

# Run with coverage
npx hardhat coverage
```

### Security Audit

**Slither Analysis:**
- ✅ 0 critical issues
- ✅ 0 high severity issues
- ✅ Minor optimizations suggested
- ✅ All major vulnerabilities checked

```bash
# Run Slither audit
npm install -g slither-analyzer
slither contracts/
```

---

## Deployment

### Deploy to Testnet

```bash
# Set private key in .env
PRIVATE_KEY=your_private_key_without_0x

# Deploy all contracts
npm run deploy-all:testnet

# Configure minters
npm run set-minter:testnet
```

### Verify Contracts

```bash
# Verify on Mantle Explorer
npx hardhat verify --network mantleSepolia \
  CONTRACT_ADDRESS \
  "Constructor" "Arguments"
```

---

## Integration Examples

### Frontend Integration

```typescript
import { useContractRead, useContractWrite } from 'wagmi'
import { CHARACTER_NFT_ABI, CHARACTER_NFT_ADDRESS } from '@/lib/contract'

// Read character data
const { data: characterData } = useContractRead({
  address: CHARACTER_NFT_ADDRESS,
  abi: CHARACTER_NFT_ABI,
  functionName: 'getCharacter',
  args: [tokenId]
})

// Mint character
const { write: mintCharacter } = useContractWrite({
  address: CHARACTER_NFT_ADDRESS,
  abi: CHARACTER_NFT_ABI,
  functionName: 'mintCharacter',
  args: [userAddress, 'warrior', 'Aragorn']
})
```

### Backend Integration (Node.js)

```javascript
const { ethers } = require('ethers')

// Setup provider
const provider = new ethers.JsonRpcProvider(MANTLE_RPC_URL)
const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

// Contract instances
const characterNFT = new ethers.Contract(
  CHARACTER_NFT_ADDRESS,
  CHARACTER_NFT_ABI,
  wallet
)

// Mint character
const tx = await characterNFT.mintCharacter(
  userAddress,
  'mage',
  'Gandalf'
)
await tx.wait()
```

---

## Gas Costs

Estimated gas costs on Mantle Sepolia:

| Operation | Gas Used | Approx Cost (MNT) |
|-----------|----------|-------------------|
| Mint Character | ~150,000 | ~0.0001 MNT |
| Upgrade Character | ~50,000 | ~0.00003 MNT |
| List NFT | ~80,000 | ~0.00005 MNT |
| Buy NFT | ~100,000 | ~0.00007 MNT |
| Mint CHS Tokens | ~50,000 | ~0.00003 MNT |

*Costs are estimates and vary with network congestion*

---

## Security Best Practices

### For Users

- ✅ Never share your private key
- ✅ Verify contract addresses before interacting
- ✅ Review transactions before signing
- ✅ Use hardware wallets for large amounts
- ✅ Be cautious of phishing sites

### For Developers

- ✅ Always test on testnet first
- ✅ Run security audits before mainnet
- ✅ Implement circuit breakers (pause functionality)
- ✅ Use established patterns (OpenZeppelin)
- ✅ Have an emergency response plan

---

For deployment instructions, see [Deployment Guide](./deployment.md)
