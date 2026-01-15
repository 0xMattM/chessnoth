# 🚀 Getting Started

This guide will help you set up Chessnoth for local development.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** and npm installed
- **Git** for version control
- **MetaMask** or compatible Web3 wallet
- **Mantle Sepolia Testnet** added to your wallet

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/[your-username]/Chessnoth.git
cd Chessnoth
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env.local` file in the project root:

```env
# WalletConnect Project ID (required)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Deployed Contract Addresses (Mantle Sepolia Testnet)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x0B8F3dAe06Da38927149f1DDe728F1c781473288
NEXT_PUBLIC_CHS_TOKEN_ADDRESS=0xC1b664aF3be8032a303105b2afa8257c4B61A447
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0xa8753b20282442c2c14ef78381644c13129Ce848
```

**Get WalletConnect Project ID:**
1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Create a new project
3. Copy your Project ID

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Add Mantle Sepolia Testnet

Add the following network to MetaMask:

- **Network Name:** Mantle Sepolia Testnet
- **RPC URL:** https://rpc.sepolia.mantle.xyz
- **Chain ID:** 5003
- **Currency Symbol:** MNT
- **Block Explorer:** https://explorer.sepolia.mantle.xyz

## Get Testnet MNT

1. Visit [Mantle Sepolia Faucet](https://faucet.testnet.mantle.xyz)
2. Enter your wallet address
3. Request testnet MNT tokens
4. Wait for confirmation (~30 seconds)

## First Steps

### 1. Connect Your Wallet

Click "Connect Wallet" in the navigation bar and select your wallet provider.

### 2. Mint a Character

1. Go to **Marketplace**
2. Click "Mint New Character"
3. Choose a character class (Warrior, Mage, Archer, etc.)
4. Confirm the transaction
5. Wait for your NFT to be minted

### 3. Build Your Team

1. Go to **Dashboard** to see your characters
2. Navigate to **Team** page
3. Select up to 4 characters for your battle team
4. Equip items and assign skills

### 4. Enter Combat

1. Go to **Battle** page
2. Select a stage (start with Stage 1)
3. Place your characters on the grid
4. Engage in turn-based tactical combat
5. Win battles to earn CHS tokens and experience

## Project Structure

```
Chessnoth/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Dashboard (main page)
│   ├── marketplace/       # NFT marketplace
│   ├── team/              # Team selection
│   ├── combat/            # Combat system
│   └── shop/              # Item shop
├── components/            # React components
│   ├── ui/               # UI components (shadcn)
│   └── ...               # Game-specific components
├── contracts/            # Solidity smart contracts
│   ├── CharacterNFT.sol
│   ├── CHSToken.sol
│   └── Marketplace.sol
├── data/                 # Game data (JSON)
│   ├── classes/         # Character classes
│   ├── items.json       # Items database
│   └── skills/          # Skill definitions
├── lib/                  # Utility libraries
│   ├── combat.ts        # Combat logic
│   ├── contract.ts      # Web3 utilities
│   └── ...
├── hooks/               # Custom React hooks
├── test/                # Smart contract tests
└── docs/                # Documentation
```

## Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Smart Contracts
npm run compile          # Compile contracts with Hardhat
npm run test             # Run contract tests
npm run deploy:testnet   # Deploy to Mantle Sepolia

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format with Prettier
```

## Next Steps

- **[Architecture](./architecture.md)** - Understand the system design
- **[Game Mechanics](./game-mechanics.md)** - Learn gameplay systems
- **[Smart Contracts](./smart-contracts.md)** - Explore the contracts
- **[Contributing](./contributing.md)** - Contribute to the project

## Troubleshooting

### Wallet Connection Issues

If you have multiple wallet extensions installed (MetaMask, Coinbase Wallet, etc.), disable the ones you're not using to avoid conflicts.

### Transaction Failures

- Ensure you have sufficient MNT for gas fees
- Check that you're connected to Mantle Sepolia Testnet
- Try increasing gas limit in wallet settings

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild
npm run build
```

## Support

If you encounter issues:
1. Check the [GitHub Issues](https://github.com/[your-username]/Chessnoth/issues)
2. Review relevant documentation sections
3. Create a new issue with details about your problem

---

**Ready to play?** Visit [chessnoth.vercel.app](https://chessnoth.vercel.app)
