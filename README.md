# Chessnoth - NFT Game Interface

A modern React/Next.js interface for the Chessnoth NFT game, featuring character minting, management, team selection, and item previews.

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

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in your values:
```bash
cp .env.example .env.local
```

3. Create `.env.local` file in the root directory and add:
   ```env
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedContractAddress
   ```
   
   **Important**: 
   - Get `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` from [WalletConnect Cloud](https://cloud.walletconnect.com)
   - Replace `0xYourDeployedContractAddress` with your actual deployed CharacterNFT contract address on Conflux eSpace Testnet
   - Without the contract address, minting will not work!

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Contract Integration

The app connects to the `CharacterNFT.sol` contract deployed on **Conflux eSpace Testnet**. Make sure:

1. The contract is deployed to Conflux eSpace Testnet (Chain ID: 71)
2. Update `NEXT_PUBLIC_CONTRACT_ADDRESS` in `.env.local` with your deployed contract address
3. The contract ABI matches the one in `lib/contract.ts`

### Conflux eSpace Testnet Configuration

- **Chain ID**: 71
- **RPC URL**: https://evmtestnet.confluxrpc.com
- **Explorer**: https://evmtestnet.confluxscan.org
- **Currency**: CFX

To add Conflux eSpace Testnet to MetaMask:
1. Network Name: Conflux eSpace (Testnet)
2. RPC URL: https://evmtestnet.confluxrpc.com
3. Chain ID: 71
4. Currency Symbol: CFX
5. Block Explorer: https://evmtestnet.confluxscan.org

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
npm run compile      # Compile Hardhat contracts
npm run deploy       # Deploy contracts
npm run set-minter   # Set authorized minter
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

## Notes

- The Characters page currently uses placeholder data. You'll need to implement proper contract calls to fetch user's NFTs
- Team selection is client-side only (no contract integration yet)
- Items are preview-only (no contract integration yet)
- Battle system is coming soon

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

