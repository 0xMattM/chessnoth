# 🚀 Deployment Guide

Complete guide for deploying Chessnoth to production.

## Overview

This guide covers:
- Smart contract deployment to Mantle Network
- Frontend deployment to Vercel
- Environment configuration
- Post-deployment verification

---

## Prerequisites

### Required Tools

- **Node.js 18+** and npm
- **Git** for version control
- **Hardhat** (installed via npm)
- **Vercel CLI** (optional, for manual deploys)

### Required Accounts

- **Wallet with MNT** (Mantle Sepolia or Mainnet)
- **Vercel Account** (free tier works)
- **WalletConnect Project** (free)
- **GitHub Account** (for repository)

---

## Part 1: Smart Contract Deployment

### Step 1: Prepare Environment

Create `.env` file in project root:

```env
# Deployment wallet private key (WITHOUT 0x prefix)
PRIVATE_KEY=your_private_key_here

# Mantle RPC URLs (use defaults or your own)
MANTLE_SEPOLIA_RPC=https://rpc.sepolia.mantle.xyz
MANTLE_MAINNET_RPC=https://rpc.mantle.xyz

# Optional: Etherscan API key for verification
ETHERSCAN_API_KEY=your_api_key
```

**⚠️ IMPORTANT:**
- NEVER commit `.env` to git
- Use a separate wallet for testnet
- Keep private keys secure

### Step 2: Get Testnet MNT

For Mantle Sepolia Testnet:

1. Visit [Mantle Faucet](https://faucet.testnet.mantle.xyz)
2. Enter your wallet address
3. Request testnet MNT (~0.5 MNT needed)
4. Wait for confirmation

### Step 3: Compile Contracts

```bash
# Install dependencies
npm install

# Compile all contracts
npm run compile

# Verify compilation
ls artifacts/contracts/
```

Expected output:
```
CharacterNFT.sol/
CHSToken.sol/
Marketplace.sol/
```

### Step 4: Deploy to Testnet

```bash
# Deploy all contracts to Mantle Sepolia
npm run deploy-all:testnet
```

**Expected Output:**
```
Deploying contracts to Mantle Sepolia...

✅ CharacterNFT deployed to: 0xABC...
✅ CHSToken deployed to: 0xDEF...
✅ Marketplace deployed to: 0x123...

Total gas used: ~2,000,000
Total cost: ~0.002 MNT

Save these addresses for frontend configuration!
```

**Save these addresses** - you'll need them for frontend setup.

### Step 5: Configure Authorized Minters

```bash
# Configure minters for both contracts
npm run set-minter:testnet
```

This script:
1. Adds your wallet as authorized minter for CharacterNFT
2. Adds your wallet as authorized minter for CHSToken
3. Verifies configuration

### Step 6: Verify Contracts (Optional but Recommended)

```bash
# Verify CharacterNFT
npx hardhat verify --network mantleSepolia \
  YOUR_CHARACTER_NFT_ADDRESS

# Verify CHSToken
npx hardhat verify --network mantleSepolia \
  YOUR_CHS_TOKEN_ADDRESS

# Verify Marketplace
npx hardhat verify --network mantleSepolia \
  YOUR_MARKETPLACE_ADDRESS \
  YOUR_CHARACTER_NFT_ADDRESS \
  YOUR_CHS_TOKEN_ADDRESS
```

Verified contracts will show source code on [Mantle Explorer](https://explorer.sepolia.mantle.xyz).

---

## Part 2: Frontend Deployment

### Step 1: Configure Environment Variables

Create `.env.local` for frontend:

```env
# WalletConnect Project ID (required)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Deployed contract addresses from Step 4
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourCharacterNFTAddress
NEXT_PUBLIC_CHS_TOKEN_ADDRESS=0xYourCHSTokenAddress
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0xYourMarketplaceAddress
```

**Get WalletConnect Project ID:**
1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Create new project
3. Copy Project ID from dashboard

### Step 2: Test Locally

```bash
# Install dependencies (if not done)
npm install

# Run development server
npm run dev
```

**Test Checklist:**
- [ ] Wallet connection works
- [ ] Can view contract data
- [ ] Can mint characters (if authorized)
- [ ] Marketplace loads correctly
- [ ] Combat system works
- [ ] No console errors

### Step 3: Build for Production

```bash
# Create production build
npm run build

# Test production build locally
npm run start
```

Fix any build errors before proceeding.

### Step 4: Deploy to Vercel

#### Option A: Automatic Deployment (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to [Vercel](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Click "Deploy"

3. **Configure Environment Variables in Vercel:**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.local`
   - Save and redeploy

#### Option B: Manual Deployment with Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Step 5: Verify Deployment

Visit your deployed URL (e.g., `https://chessnoth.vercel.app`)

**Verification Checklist:**
- [ ] Site loads without errors
- [ ] Can connect wallet
- [ ] Contract data loads correctly
- [ ] All pages accessible
- [ ] No 404 errors
- [ ] Mobile responsive

---

## Part 3: Post-Deployment Configuration

### Update Contract Addresses in Code

If you haven't already, update contract addresses in:

**`lib/contract.ts`:**
```typescript
export const CHARACTER_NFT_ADDRESS = '0xYourAddress' as `0x${string}`
export const CHS_TOKEN_ADDRESS = '0xYourAddress' as `0x${string}`
export const MARKETPLACE_ADDRESS = '0xYourAddress' as `0x${string}`
```

### Configure Mantle Network

Ensure `lib/wagmi-config.ts` includes Mantle Sepolia:

```typescript
import { mantleSepoliaTestnet } from 'wagmi/chains'

export const config = createConfig({
  chains: [mantleSepoliaTestnet],
  // ... other config
})
```

### Set Up Monitoring (Optional)

**Vercel Analytics:**
- Automatically enabled for all deployments
- View at Vercel Dashboard → Analytics

**Custom Error Tracking:**
```bash
# Install Sentry (optional)
npm install @sentry/nextjs

# Configure in next.config.js
```

---

## Deployment to Mainnet

### ⚠️ Pre-Mainnet Checklist

Before deploying to Mantle Mainnet:

- [ ] All tests passing (270+ tests)
- [ ] Security audit completed (Slither)
- [ ] Extensive testnet testing
- [ ] Emergency procedures documented
- [ ] Multi-sig wallet prepared (recommended)
- [ ] Backup of all keys and configs

### Mainnet Deployment Process

**1. Prepare Mainnet Wallet:**
```bash
# Get real MNT tokens
# Recommended: ~1-2 MNT for deployment + operations

# Configure .env with mainnet wallet
PRIVATE_KEY=your_mainnet_wallet_private_key
```

**2. Deploy to Mainnet:**
```bash
# Deploy contracts to Mantle Mainnet
npm run deploy-all:mainnet

# Configure minters
npm run set-minter:mainnet
```

**3. Verify Contracts:**
```bash
# Verify on Mantle Explorer
npx hardhat verify --network mantleMainnet \
  CONTRACT_ADDRESS \
  CONSTRUCTOR_ARGS
```

**4. Transfer Ownership (Recommended):**
```javascript
// Transfer to multi-sig wallet for security
await characterNFT.transferOwnership(MULTISIG_ADDRESS)
await chsToken.transferOwnership(MULTISIG_ADDRESS)
await marketplace.transferOwnership(MULTISIG_ADDRESS)
```

**5. Update Frontend:**
```env
# Update .env.local with mainnet addresses
NEXT_PUBLIC_CONTRACT_ADDRESS=mainnet_address
NEXT_PUBLIC_CHS_TOKEN_ADDRESS=mainnet_address
NEXT_PUBLIC_MARKETPLACE_ADDRESS=mainnet_address
```

**6. Deploy Frontend:**
```bash
# Build with mainnet config
npm run build

# Deploy to production
vercel --prod
```

---

## Environment Variables Reference

### Frontend (.env.local)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | `abc123...` |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | CharacterNFT contract | `0xABC...` |
| `NEXT_PUBLIC_CHS_TOKEN_ADDRESS` | CHSToken contract | `0xDEF...` |
| `NEXT_PUBLIC_MARKETPLACE_ADDRESS` | Marketplace contract | `0x123...` |

### Smart Contracts (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `PRIVATE_KEY` | Deployer wallet key (no 0x) | `abc123...` |
| `MANTLE_SEPOLIA_RPC` | Testnet RPC URL | `https://rpc.sepolia.mantle.xyz` |
| `MANTLE_MAINNET_RPC` | Mainnet RPC URL | `https://rpc.mantle.xyz` |

---

## Troubleshooting

### Contract Deployment Fails

**Error: Insufficient funds**
```bash
# Solution: Get more MNT from faucet (testnet) or buy (mainnet)
```

**Error: Nonce too low**
```bash
# Solution: Reset nonce in MetaMask
# Settings → Advanced → Reset Account
```

**Error: Gas estimation failed**
```bash
# Solution: Increase gas limit manually
{
  gasLimit: 3000000
}
```

### Frontend Deployment Issues

**Build Error: Module not found**
```bash
# Solution: Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

**Environment Variables Not Working**
```
# Solution: Ensure variables start with NEXT_PUBLIC_
# Redeploy after adding variables in Vercel
```

**Wallet Connection Fails**
```
# Solution: Check WalletConnect Project ID
# Ensure domain is whitelisted in WalletConnect dashboard
```

---

## Rollback Procedure

If deployment fails or has critical issues:

### Frontend Rollback

**In Vercel:**
1. Go to Project → Deployments
2. Find previous working deployment
3. Click "..." → Promote to Production

**Via CLI:**
```bash
vercel rollback
```

### Smart Contract Rollback

**Important:** Smart contracts CANNOT be rolled back once deployed.

**Options:**
1. Deploy new version with fixes
2. Pause contracts (if pausable)
3. Migrate to new contracts

**Prevention:**
- Test extensively on testnet
- Use upgradeable proxy pattern (future)
- Have emergency pause mechanism

---

## Production Checklist

Before going live:

### Smart Contracts
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Contracts verified on explorer
- [ ] Authorized minters configured
- [ ] Owner set to multi-sig (mainnet)

### Frontend
- [ ] Environment variables configured
- [ ] Production build succeeds
- [ ] All features tested
- [ ] Mobile responsive verified
- [ ] No console errors
- [ ] Analytics configured

### Infrastructure
- [ ] Domain configured (if custom)
- [ ] SSL certificate active
- [ ] CDN working correctly
- [ ] Monitoring enabled
- [ ] Backup procedures documented

### Documentation
- [ ] README updated
- [ ] Contract addresses documented
- [ ] User guide available
- [ ] Support channels ready

---

## Monitoring & Maintenance

### Daily Checks
- Monitor Vercel deployment status
- Check for error logs
- Review user feedback

### Weekly Checks
- Review contract transactions
- Check gas costs
- Update documentation if needed

### Monthly Checks
- Security review
- Performance optimization
- Dependency updates

---

## Support

For deployment issues:
- Review this guide thoroughly
- Check [Mantle Documentation](https://docs.mantle.xyz)
- Check [Vercel Documentation](https://vercel.com/docs)
- Create GitHub issue with details

---

**Deployment complete!** Your game is now live on Mantle Network. 🎮🚀
