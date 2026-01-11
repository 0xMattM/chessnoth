# Chessnoth - NFT Game Interface

A modern React/Next.js interface for the Chessnoth NFT game, featuring character minting, management, team selection, and item previews.

## 🚀 Quick Start - Deployment Guide

### Prerequisites

1. **Node.js 18+** and npm installed
2. **Wallet with funds**:
   - Testnet: Get MNT from [Mantle Sepolia Faucet](https://faucet.testnet.mantle.xyz)
   - Mainnet: Have sufficient MNT for gas (~0.1-0.2 MNT)

### Deploy Contracts to Testnet

1. **Install dependencies and compile contracts**:
   ```bash
   npm install
   npm run compile
   ```

2. **Configure environment variables**:
   Create `.env.local` in the project root:
   ```env
   # Deployment (Hardhat)
   PRIVATE_KEY=your_private_key_here_without_0x
   
   # Frontend (after deployment)
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
   NEXT_PUBLIC_CONTRACT_ADDRESS=CharacterNFT_address_after_deploy
   NEXT_PUBLIC_CHS_TOKEN_ADDRESS=CHSToken_address_after_deploy
   NEXT_PUBLIC_MARKETPLACE_ADDRESS=Marketplace_address_after_deploy
   ```

3. **Deploy all contracts**:
   ```bash
   npm run deploy-all:testnet
   ```

   This deploys:
   - **CharacterNFT** - Main NFT contract
   - **CHSToken** - Game ERC20 token
   - **Marketplace** - Trading marketplace

4. **Configure authorized minters**:
   ```bash
   npm run set-minter:testnet
   ```

5. **Update `.env.local`** with the deployed contract addresses from the output

6. **Verify contracts** in [Mantle Sepolia Explorer](https://explorer.sepolia.mantle.xyz)

### Deploy to Mainnet

⚠️ **Before deploying to mainnet**:
- Run security audit: `slither contracts/`
- Test everything thoroughly on testnet
- Consider using multi-sig for contract ownership

```bash
# Deploy to mainnet
npm run deploy-all:mainnet
npm run set-minter:mainnet
```

### Post-Deployment

1. **Update frontend environment variables** with mainnet addresses
2. **Build and deploy frontend**:
   ```bash
   npm run build
   vercel --prod  # or your preferred platform
   ```

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## Features

- **Mint NFT**: Mint new character NFTs with custom metadata
- **Characters**: View and manage your NFT characters with equipment slots
- **Team Selection**: Build your battle team (up to 4 characters)
- **Items**: Preview equipment and consumable items
- **Battle**: Coming soon - tactical combat system

## Tech Stack

- **Next.js 14** (App Router)
- **React 18** with TypeScript
- **Wagmi & Viem** for Web3 integration
- **RainbowKit** for wallet connection
- **Tailwind CSS** for styling
- **Shadcn UI** components
- **Radix UI** primitives

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create `.env.local` file in the root directory:
   ```env
   # WalletConnect (required)
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
   
   # Contract Addresses (after deployment)
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedCharacterNFTAddress
   NEXT_PUBLIC_CHS_TOKEN_ADDRESS=0xYourDeployedCHSTokenAddress
   NEXT_PUBLIC_MARKETPLACE_ADDRESS=0xYourDeployedMarketplaceAddress
   
   # Deployment (Hardhat - optional, only for deploying contracts)
   PRIVATE_KEY=your_private_key_for_deployment
   ```
   
   **Important**: 
   - Get `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` from [WalletConnect Cloud](https://cloud.walletconnect.com)
   - Deploy contracts first (see [Deployment Guide](#-quick-start---deployment-guide) above)
   - Replace contract addresses with your deployed contract addresses on Mantle Network
   - Without contract addresses, minting and other features will not work!

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open** [http://localhost:3000](http://localhost:3000) in your browser

## Contract Integration

The app connects to three smart contracts deployed on **Mantle Network**:

1. **CharacterNFT.sol** - Main NFT contract for character NFTs
2. **CHSToken.sol** - ERC20 token for in-game rewards
3. **Marketplace.sol** - NFT trading marketplace

### Requirements

1. Contracts must be deployed to Mantle Sepolia Testnet (Chain ID: 5003) or Mantle Mainnet (Chain ID: 5000)
2. Update all contract addresses in `.env.local` with your deployed contract addresses
3. Configure authorized minters for CharacterNFT and CHSToken contracts
4. Contract ABIs must match the ones in `lib/contract.ts`

For contract setup and configuration, see [CONTRACT_SETUP.md](./CONTRACT_SETUP.md)

### Adding Authorized Minters

#### For CHSToken (Multiple Minters Supported)

CHSToken supports multiple authorized minters. To add additional minters:

**Using the script**:
```bash
# Add a new minter for CHS Token
node scripts/setCHSMinter.js <CHS_TOKEN_ADDRESS> <NEW_MINTER_ADDRESS>

# Example:
node scripts/setCHSMinter.js 0x3808b1b4D64bBbE734A91caB45CEbC359c604cd2 0xYourNewMinterAddress
```

**Or using Hardhat console**:
```bash
npx hardhat console --network mantleSepolia
```
```javascript
const CHSToken = await ethers.getContractAt('CHSToken', 'YOUR_CHS_TOKEN_ADDRESS')
const tx = await CHSToken.addAuthorizedMinter('NEW_MINTER_ADDRESS')
await tx.wait()
console.log('✅ New minter added!')
```

**To remove a minter**:
```javascript
const tx = await CHSToken.removeAuthorizedMinter('MINTER_ADDRESS_TO_REMOVE')
await tx.wait()
```

#### For CharacterNFT (Single Minter Only)

CharacterNFT only supports one authorized minter at a time. Setting a new minter will replace the previous one.

**Using the script**:
```bash
# Set authorized minter for CharacterNFT (replaces previous)
node scripts/setMinter.js <CHARACTER_NFT_ADDRESS> <NEW_MINTER_ADDRESS>

# Example:
node scripts/setMinter.js 0x0A1A35519167ba58b5b408418D97ac3eeFDDc3c1 0xYourNewMinterAddress
```

**Or using Hardhat console**:
```bash
npx hardhat console --network mantleSepolia
```
```javascript
const CharacterNFT = await ethers.getContractAt('CharacterNFT', 'YOUR_CHARACTER_NFT_ADDRESS')
const tx = await CharacterNFT.setAuthorizedMinter('NEW_MINTER_ADDRESS')
await tx.wait()
console.log('✅ Minter updated!')
```

**Note**: If you need multiple minters for CharacterNFT, consider deploying a minter contract that acts as a proxy and manages multiple addresses internally.

### Mantle Network Configuration

#### Mantle Sepolia Testnet (Recommended for Development)

- **Chain ID**: 5003
- **RPC URL**: https://rpc.sepolia.mantle.xyz
- **Explorer**: https://explorer.sepolia.mantle.xyz
- **Currency**: MNT
- **Faucet**: https://faucet.testnet.mantle.xyz

#### Mantle Mainnet

- **Chain ID**: 5000
- **RPC URL**: https://rpc.mantle.xyz
- **Explorer**: https://explorer.mantle.xyz
- **Currency**: MNT

To add Mantle Network to MetaMask:

**Mantle Sepolia Testnet:**
1. Network Name: Mantle Sepolia
2. RPC URL: https://rpc.sepolia.mantle.xyz
3. Chain ID: 5003
4. Currency Symbol: MNT
5. Block Explorer: https://explorer.sepolia.mantle.xyz

**Mantle Mainnet:**
1. Network Name: Mantle
2. RPC URL: https://rpc.mantle.xyz
3. Chain ID: 5000
4. Currency Symbol: MNT
5. Block Explorer: https://explorer.mantle.xyz

## Project Structure

```
├── app/
│   ├── page.tsx              # Mint NFT page
│   ├── characters/           # Character list and equipment
│   ├── team/                 # Team selection
│   ├── items/                # Items preview
│   ├── battle/               # Battle (coming soon)
│   ├── layout.tsx            # Root layout
│   └── providers.tsx         # Web3 providers
├── components/
│   ├── navigation.tsx        # Main navigation
│   └── ui/                   # Shadcn UI components
└── lib/
    ├── contract.ts           # Contract ABI and utilities
    └── utils.ts              # Utility functions
```

## Development

- The app uses Next.js App Router with Server Components by default
- Client components are marked with `'use client'` directive
- Web3 interactions use Wagmi hooks
- UI components follow Shadcn UI patterns

### Code Quality Tools

- **ESLint**: Configured with TypeScript rules and Next.js best practices
- **Prettier**: Consistent code formatting
- **Jest**: Unit testing framework with React Testing Library
- **TypeScript**: Strict type checking enabled

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format code with Prettier
npm run format:check # Check code formatting

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report

# Smart Contracts
npm run compile              # Compile Hardhat contracts
npm run deploy:testnet       # Deploy contracts to Mantle Sepolia Testnet
npm run deploy:mainnet       # Deploy contracts to Mantle Mainnet
npm run set-minter:testnet   # Set authorized minter on Mantle Sepolia Testnet
npm run set-minter:mainnet   # Set authorized minter on Mantle Mainnet
```

### Project Structure

- **`lib/`**: Business logic, utilities, and shared code
  - `logger.ts`: Professional logging system
  - `env.ts`: Environment variable validation
  - `constants.ts`: Application-wide constants
  - `contract.ts`: Web3 contract utilities
- **`components/`**: Reusable React components
  - `ui/`: Shadcn UI components
  - `error-boundary.tsx`: Error handling component
- **`tests/`**: Unit tests (mirrors app structure)
- **`hooks/`**: Custom React hooks

### Best Practices

1. **Logging**: Use `logger` from `lib/logger.ts` instead of `console.log`
2. **Error Handling**: Use Error Boundary and toast notifications
3. **Constants**: Use constants from `lib/constants.ts` instead of magic numbers
4. **Environment Variables**: Validate using `lib/env.ts`
5. **TypeScript**: Avoid `any`, use proper types
6. **File Size**: Keep files under 500 lines (refactor if needed)

## Wallet Connection

### Supported Wallets
- MetaMask (Recommended)
- Coinbase Wallet
- WalletConnect
- Rainbow Wallet
- Brave Wallet

### Troubleshooting Wallet Issues

If you encounter wallet connection issues, especially errors about "Multiple Ethereum providers", please see [WALLET_TROUBLESHOOTING.md](./WALLET_TROUBLESHOOTING.md) for detailed solutions.

**Quick fix**: If you have multiple wallet extensions installed (e.g., MetaMask + Coinbase Wallet), disable the ones you're not using to avoid conflicts.

## Mantle Network Integration

This project is built for the **Mantle Global Hackathon 2025** (GameFi & Social track). Mantle Network is a modular Ethereum Layer 2 that offers:

- **Low gas fees**: Cost-efficient transactions
- **High throughput**: Scalable for gaming applications
- **EVM compatibility**: Easy migration from Ethereum
- **Built-in tooling**: Mantle DA, Mantle SDK, bridges, and testnets

### Hackathon Track: GameFi & Social

This project focuses on:
- Consumer-facing apps integrating RWA or yield logic
- Token incentive design and user retention tools

## Additional Documentation

- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Complete deployment guide for contracts and frontend
- **[CONTRACT_SETUP.md](./CONTRACT_SETUP.md)** - Contract configuration and setup guide
- **[CONTRACTS_PLANNING.md](./CONTRACTS_PLANNING.md)** - Detailed planning for contracts and NFT system
- **[PLANNING.md](./PLANNING.md)** - Project architecture and development principles
- **[TASKS.md](./TASKS.md)** - Current tasks and progress tracking

## Notes

- The Characters page fetches NFTs from the deployed CharacterNFT contract
- Team selection is client-side (localStorage)
- Items are preview-only (no contract integration yet)
- Battle system is fully implemented with tactical combat

## Professional Improvements

This project includes several professional development practices:

- ✅ **Error Boundaries**: Graceful error handling for React components
- ✅ **Logging System**: Structured logging with different levels
- ✅ **Environment Validation**: Runtime validation of required env variables
- ✅ **Toast Notifications**: User-friendly error and success messages
- ✅ **TypeScript Strict Mode**: Enhanced type safety
- ✅ **Testing Infrastructure**: Jest setup with example tests
- ✅ **Code Formatting**: ESLint and Prettier configuration
- ✅ **Documentation**: PLANNING.md and TASKS.md for project management

