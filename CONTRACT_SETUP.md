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

---

## Adding Multiple Authorized Minters

### For CHSToken (Multiple Minters Supported)

CHSToken supports **multiple authorized minters** simultaneously. You can add as many as needed:

**Method 1: Using the script**
```bash
# Add a new minter for CHS Token
node scripts/setCHSMinter.js <CHS_TOKEN_ADDRESS> <NEW_MINTER_ADDRESS>

# Example:
node scripts/setCHSMinter.js 0x3808b1b4D64bBbE734A91caB45CEbC359c604cd2 0xYourNewMinterAddress
```

**Method 2: Using Hardhat console**
```bash
npx hardhat console --network mantleSepolia
```
```javascript
const CHSToken = await ethers.getContractAt('CHSToken', 'YOUR_CHS_TOKEN_ADDRESS')
const tx = await CHSToken.addAuthorizedMinter('NEW_MINTER_ADDRESS')
await tx.wait()
console.log('✅ New minter added!')

// Verify it was added
const isAuthorized = await CHSToken.authorizedMinters('NEW_MINTER_ADDRESS')
console.log('Is authorized:', isAuthorized) // Should be true
```

**To remove a minter**:
```javascript
const tx = await CHSToken.removeAuthorizedMinter('MINTER_ADDRESS_TO_REMOVE')
await tx.wait()
console.log('✅ Minter removed!')
```

### For CharacterNFT (Multiple Minters Supported)

CharacterNFT now supports **multiple authorized minters** simultaneously, just like CHSToken.

**Method 1: Using the script**
```bash
# Add a new minter for CharacterNFT
node scripts/setMinter.js <CHARACTER_NFT_ADDRESS> <NEW_MINTER_ADDRESS>

# Example:
node scripts/setMinter.js 0x0A1A35519167ba58b5b408418D97ac3eeFDDc3c1 0xYourNewMinterAddress
```

**Method 2: Using Hardhat console**
```bash
npx hardhat console --network mantleSepolia
```
```javascript
const CharacterNFT = await ethers.getContractAt('CharacterNFT', 'YOUR_CHARACTER_NFT_ADDRESS')

// Add a new minter
const tx = await CharacterNFT.addAuthorizedMinter('NEW_MINTER_ADDRESS')
await tx.wait()
console.log('✅ New minter added!')

// Verify it was added
const isAuthorized = await CharacterNFT.authorizedMinters('NEW_MINTER_ADDRESS')
console.log('Is authorized:', isAuthorized) // Should be true

// Remove a minter
const tx2 = await CharacterNFT.removeAuthorizedMinter('MINTER_ADDRESS_TO_REMOVE')
await tx2.wait()
console.log('✅ Minter removed!')
```

**Important Notes**:
- ✅ CharacterNFT now supports multiple minters (updated in latest version)
- ✅ Use `addAuthorizedMinter()` to add more minters
- ✅ Use `removeAuthorizedMinter()` to remove a minter
- ⚠️ The old `setAuthorizedMinter()` function still exists for backward compatibility but is deprecated

### Common Use Cases

**Adding a backend server as minter**:
```bash
# Add your backend server address as CHS minter
node scripts/setCHSMinter.js $CHS_TOKEN_ADDRESS $BACKEND_SERVER_ADDRESS

# Add backend as CharacterNFT minter (supports multiple now)
node scripts/setMinter.js $CHARACTER_NFT_ADDRESS $BACKEND_SERVER_ADDRESS
```

**Adding a game contract as minter**:
```bash
# If you have a game contract that needs to mint rewards
node scripts/setCHSMinter.js $CHS_TOKEN_ADDRESS $GAME_CONTRACT_ADDRESS
```

**Adding multiple team members** (both contracts now support this):
```bash
# Add team member 1 to CHS Token
node scripts/setCHSMinter.js $CHS_TOKEN_ADDRESS $TEAM_MEMBER_1_ADDRESS

# Add team member 1 to CharacterNFT
node scripts/setMinter.js $CHARACTER_NFT_ADDRESS $TEAM_MEMBER_1_ADDRESS

# Add team member 2 to CHS Token
node scripts/setCHSMinter.js $CHS_TOKEN_ADDRESS $TEAM_MEMBER_2_ADDRESS

# Add team member 2 to CharacterNFT
node scripts/setMinter.js $CHARACTER_NFT_ADDRESS $TEAM_MEMBER_2_ADDRESS
```

