# 🏗️ Architecture

This document describes the technical architecture of Chessnoth.

## System Overview

Chessnoth is built with a modern Web3 gaming architecture that separates concerns between gameplay, blockchain, and presentation layers.

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Dashboard  │  │   Combat    │  │ Marketplace │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│         │                │                  │            │
│         └────────────────┴──────────────────┘            │
│                          │                                │
│                  ┌───────▼────────┐                      │
│                  │  Game Engine   │                      │
│                  │   (lib/)       │                      │
│                  └───────┬────────┘                      │
└──────────────────────────┼──────────────────────────────┘
                           │
                  ┌────────▼────────┐
                  │   Web3 Layer    │
                  │  (Wagmi/Viem)   │
                  └────────┬────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
┌────────▼─────────┐              ┌─────────▼─────────┐
│ Mantle Sepolia   │              │  Local Storage    │
│   Testnet        │              │  (Game State)     │
│                  │              │                   │
│ • CharacterNFT   │              │ • Equipment       │
│ • CHSToken       │              │ • Skills          │
│ • Marketplace    │              │ • Team Config     │
└──────────────────┘              └───────────────────┘
```

## Core Components

### Frontend Layer

**Technology:** Next.js 14 (App Router), React 18, TypeScript

The frontend is built with modern React patterns:

- **Server Components** for static content
- **Client Components** for interactive features
- **Suspense boundaries** for loading states
- **Error boundaries** for graceful error handling

**Key Pages:**
- `/` - Dashboard (character management)
- `/marketplace` - NFT minting and trading
- `/team` - Team selection and configuration
- `/combat` - Turn-based battle interface
- `/shop` - Item and equipment shop

### Game Engine Layer

**Location:** `lib/` directory

Core game logic implemented in TypeScript:

```typescript
lib/
├── combat.ts           # Combat calculations and logic
├── battle.ts           # Battle management
├── terrain.ts          # Terrain effects system
├── character-utils.ts  # Character stat calculations
├── nft.ts             # NFT metadata handling
├── rewards.ts         # Reward distribution
└── constants.ts       # Game balance constants
```

**Key Features:**
- Deterministic combat calculations
- Stat-based character progression
- Terrain effect system
- Turn order management
- Damage calculations with defense scaling

### Web3 Integration Layer

**Technology:** Wagmi, Viem, RainbowKit

**Smart Contracts:**
```solidity
contracts/
├── CharacterNFT.sol    # ERC721 with on-chain progression
├── CHSToken.sol        # ERC20 utility token
└── Marketplace.sol     # P2P NFT trading
```

**Connection Flow:**
1. User connects wallet via RainbowKit
2. Frontend reads blockchain state via Wagmi hooks
3. User actions trigger contract calls
4. Transactions confirmed on Mantle Network
5. UI updates to reflect new state

### Data Layer

**On-Chain Data:**
- Character ownership (NFT)
- Character metadata (class, level, EXP)
- Token balances (CHS)
- Marketplace listings

**Off-Chain Data:**
- Equipment configuration (localStorage)
- Skill assignments (localStorage)
- Team composition (localStorage)
- UI preferences (localStorage)

## Data Flow

### Character Minting Flow

```
User clicks "Mint Character"
         │
         ▼
Frontend validates input
         │
         ▼
Contract call: CharacterNFT.mintCharacter()
         │
         ▼
Mantle Network processes transaction
         │
         ▼
Event emitted: CharacterMinted
         │
         ▼
Frontend updates UI with new NFT
         │
         ▼
User sees new character in dashboard
```

### Combat Flow

```
User selects team → Places characters on grid
         │
         ▼
Combat initialized (lib/combat.ts)
         │
         ▼
Turn order calculated (based on speed)
         │
         ▼
For each turn:
  │
  ├─ User/AI selects action
  │
  ├─ Combat engine calculates result
  │
  └─ UI updates with animation
         │
         ▼
Battle ends (victory or defeat)
         │
         ▼
Rewards calculated and stored
         │
         ▼
User can claim rewards on-chain
```

### Reward Claiming Flow

```
User wins battles → Rewards stored in localStorage
         │
         ▼
User clicks "Claim Rewards"
         │
         ├─ If user is authorized minter:
         │    │
         │    └─ Direct mint via CHSToken.mint()
         │
         └─ Otherwise:
              │
              └─ Call backend API (future implementation)
         │
         ▼
CHS tokens minted to user's wallet
         │
         ▼
localStorage rewards cleared
```

## State Management

### On-Chain State

**CharacterNFT Contract:**
```solidity
struct Character {
    string class;        // Warrior, Mage, etc.
    uint256 level;       // Current level
    uint256 experience;  // Total EXP earned
    string name;         // Custom name
}
```

**Accessed via:**
```typescript
// Wagmi hooks
const { data: characters } = useContractRead({
  address: CHARACTER_NFT_ADDRESS,
  abi: CHARACTER_NFT_ABI,
  functionName: 'tokenOfOwnerByIndex',
  args: [userAddress, index]
})
```

### Off-Chain State

**Equipment System:**
```typescript
// Stored in localStorage
interface CharacterEquipment {
  weapon?: string
  armor?: string
  accessory?: string
  helmet?: string
  boots?: string
  ring?: string
}
```

**Why Off-Chain?**
- Frequent changes (no gas fees)
- Flexible system (easy to modify)
- Fast UX (instant updates)
- Plan to move on-chain in future versions

## Security Architecture

### Smart Contract Security

**Testing:**
- 270+ unit tests
- 96.3% test coverage
- Slither static analysis (0 critical issues)

**Access Control:**
```solidity
// Only authorized minter can mint
modifier onlyAuthorizedMinter() {
    require(authorizedMinters[msg.sender], "Not authorized");
    _;
}

// Only owner can modify settings
modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _;
}
```

**Key Security Features:**
- Reentrancy guards on critical functions
- SafeMath for all arithmetic operations
- Pausable contracts for emergency stops
- Ownable pattern for admin functions

### Frontend Security

**Wallet Safety:**
- All transactions require user confirmation
- Clear transaction previews before signing
- No storage of private keys
- Read-only operations don't require signatures

**Data Validation:**
- Input sanitization on all user inputs
- Type checking with TypeScript
- Schema validation for game data
- Error boundaries prevent crashes

## Performance Optimizations

### Frontend Performance

**Code Splitting:**
```typescript
// Dynamic imports for heavy components
const CombatBoard = dynamic(() => import('@/components/combat-board'))
```

**Image Optimization:**
- Next.js Image component for automatic optimization
- WebP format with fallbacks
- Lazy loading for off-screen images
- Proper sizing to avoid layout shifts

**Caching:**
- React Query for API caching
- LocalStorage for game state
- Service Worker for offline support (future)

### Blockchain Performance

**Batch Operations:**
```typescript
// Read multiple contracts in parallel
const { data } = useContractReads({
  contracts: [
    { ...contract1 },
    { ...contract2 },
    { ...contract3 }
  ]
})
```

**Gas Optimization:**
- Efficient storage patterns
- Minimal on-chain computation
- Batch minting support
- Optimized contract bytecode

## Scalability Considerations

### Current Limitations

- Equipment stored off-chain (plan to move on-chain)
- No backend API (all client-side)
- Single-player only (PvP planned)

### Future Improvements

**Backend Infrastructure:**
- Node.js API for complex operations
- PostgreSQL for analytics
- Redis for caching
- WebSocket for real-time PvP

**Blockchain Scaling:**
- Layer 2 batch transactions
- Meta-transactions for gasless UX
- Optimistic updates in UI
- Event indexing for fast queries

## Technology Stack

### Core Technologies

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 | React framework |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Utility-first CSS |
| UI Components | Shadcn UI | Component library |
| Web3 | Wagmi + Viem | Ethereum interactions |
| Wallet | RainbowKit | Wallet connection |
| Blockchain | Mantle Network | L2 scaling solution |
| Smart Contracts | Solidity 0.8.20 | Contract language |
| Testing | Hardhat | Contract testing |
| Deployment | Vercel | Hosting platform |

### Dependencies

**Frontend:**
```json
{
  "next": "14.x",
  "react": "18.x",
  "typescript": "5.x",
  "wagmi": "latest",
  "viem": "latest",
  "@rainbow-me/rainbowkit": "latest",
  "tailwindcss": "latest"
}
```

**Smart Contracts:**
```json
{
  "hardhat": "latest",
  "@openzeppelin/contracts": "5.0.x",
  "@nomicfoundation/hardhat-toolbox": "latest"
}
```

## Deployment Architecture

### Frontend Deployment

**Platform:** Vercel

**Deployment Flow:**
```
Git push to main
     │
     ▼
Vercel detects change
     │
     ▼
Build Next.js application
     │
     ▼
Run production optimizations
     │
     ▼
Deploy to global CDN
     │
     ▼
Update DNS (instant)
```

**Environment Variables:**
- Configured in Vercel dashboard
- Separate values for preview/production
- Automatically injected at build time

### Smart Contract Deployment

**Network:** Mantle Sepolia Testnet

**Deployment Process:**
```bash
# 1. Compile contracts
npm run compile

# 2. Deploy to testnet
npx hardhat run scripts/deploy-all.js --network mantleSepolia

# 3. Verify on explorer
npx hardhat verify --network mantleSepolia [CONTRACT_ADDRESS]

# 4. Update frontend env variables
```

## Monitoring & Analytics

### Current Monitoring

- Vercel Analytics for page views
- Console logging for errors
- LocalStorage for user data

### Planned Monitoring

- Sentry for error tracking
- Mixpanel for user analytics
- The Graph for blockchain indexing
- Custom dashboard for game metrics

---

For implementation details, see:
- [Smart Contracts](./smart-contracts.md)
- [Game Mechanics](./game-mechanics.md)
- [API Reference](./api-reference.md)
