# 🔧 Contract Configuration - Quick Guide

## 📋 Current Status

Based on the address you saw (`0x0010570DEd5d0be94A14Fc53B4B4411605C0d9c7`), it appears you only have **CharacterNFT** deployed.

## ✅ What You Need to Deploy:

1. **CharacterNFT** ✅ (Already deployed: `0x0010570DEd5d0be94A14Fc53B4B4411605C0d9c7`)
2. **CHSToken** ❌ (MISSING - required for claim)
3. **Marketplace** ❌ (Optional, but recommended)

## 🚀 Steps to Complete Configuration

### Step 1: Deploy CHS Token

```bash
# Make sure you're on the correct network (Mantle Sepolia)
npx hardhat run scripts/deploy-all.js --network mantleSepolia
```

Or if you only want to deploy the CHS Token:

```bash
npx hardhat run scripts/deploy.js --network mantleSepolia
```

### Step 2: Configure Environment Variables

Create or update your `.env.local` file with your contract addresses:

```env
# CharacterNFT contract (you already have this)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x0010570DEd5d0be94A14Fc53B4B4411605C0d9c7

# CHS Token contract (you need to deploy this)
NEXT_PUBLIC_CHS_TOKEN_ADDRESS=0x...YOUR_CHS_TOKEN_ADDRESS...

# Marketplace contract (optional)
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x...YOUR_MARKETPLACE_ADDRESS...

# WalletConnect (required for wallet connection)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### Step 3: Configure Authorized Minter for CHS Token

For the claim to work, you need to authorize a minter. You have two options:

#### Option A: Use your wallet as minter (for testing)

```bash
# Use this script after deploying
node scripts/setMinter.js <CHS_TOKEN_ADDRESS> <YOUR_WALLET_ADDRESS>
```

#### Option B: Create a minter contract or use a backend

The CHS Token contract has a `mint()` function that can only be called by authorized addresses.

### Step 4: Verify in Explorer

1. Go to `https://explorer.sepolia.mantle.xyz`
2. Search for your CHS Token address
3. Verify it's an ERC20 contract (should show "Token" in the explorer)
4. Verify your wallet is in the `authorizedMinters` list

## 🔍 How to Verify What Contract Type It Is

To verify what type of contract `0x0010570DEd5d0be94A14Fc53B4B4411605C0d9c7` is:

1. Go to the explorer: `https://explorer.sepolia.mantle.xyz/address/0x0010570DEd5d0be94A14Fc53B4B4411605C0d9c7`
2. Look for the "Contract" tab
3. If it's an ERC20, it should show functions like `balanceOf`, `transfer`, `totalSupply`
4. If it's an ERC721, it should show functions like `tokenURI`, `ownerOf`, `mintCharacter`

## ⚠️ Current Problem with Claim

The claim doesn't work because:

1. **CHS Token contract is missing** - There's nowhere to mint tokens
2. **Authorized minter is missing** - Even if the token exists, no one can mint
3. **The claim tries to call a backend** that probably doesn't exist

## 💡 Temporary Solution for Claim

While you configure everything, the claim is working in "simulation" mode (clears pending CHS but doesn't mint real tokens).

For it to work completely, you need:

1. ✅ Deploy CHS Token
2. ✅ Configure `NEXT_PUBLIC_CHS_TOKEN_ADDRESS` in `.env.local`
3. ✅ Authorize your wallet or a backend as minter
4. ✅ Modify the claim to call the contract directly (optional)

## 📝 Available Scripts

- `scripts/deploy-all.js` - Deploys all contracts
- `scripts/deploy.js` - Deploys a single contract
- `scripts/setMinter.js` - Configures authorized minters
- `scripts/setup-contracts.js` - Post-deploy configuration

## 🆘 If the Contract You Saw IS the CHS Token

If `0x0010570DEd5d0be94A14Fc53B4B4411605C0d9c7` is actually the CHS Token:

1. Add it to `.env.local`:
   ```env
   NEXT_PUBLIC_CHS_TOKEN_ADDRESS=0x0010570DEd5d0be94A14Fc53B4B4411605C0d9c7
   ```

2. Verify your wallet is an authorized minter:
   - Go to the contract in the explorer
   - Look for the `authorizedMinters(address)` function
   - Enter your wallet address
   - It should return `true`

3. If you're not a minter, authorize yourself:
   ```bash
   node scripts/setMinter.js 0x0010570DEd5d0be94A14Fc53B4B4411605C0d9c7 YOUR_WALLET_ADDRESS
   ```

