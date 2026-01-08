# 🚀 Deployment Guide - Chessnoth

**Date**: January 7, 2026  
**Network**: Mantle Network (Testnet and Mainnet)

---

## 📋 Prerequisites

### 1. Required Tools
```bash
# Node.js 18+
node --version

# npm
npm --version

# Hardhat (installed with npm install)
npx hardhat --version
```

### 2. Wallet and Funds

#### For Testnet (Mantle Sepolia)
1. **Create test wallet** (DO NOT use main wallet)
2. **Get testnet MNT**:
   - Faucet: https://faucet.testnet.mantle.xyz
   - You need ~0.5 MNT for complete deployment
3. **Save private key** securely

#### For Mainnet (Mantle)
1. **Use secure wallet** with real funds
2. **Have sufficient MNT** for gas (~0.1-0.2 MNT)
3. **Consider multi-sig** for owner

### 3. Configure Environment Variables

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

**⚠️ IMPORTANT**: 
- NEVER commit `.env.local` to git
- Make secure backup of private key
- Use different wallet for testnet and mainnet

---

## 🧪 Deploy to Testnet (Mantle Sepolia)

### Step 1: Preparation

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Verify compilation succeeds without errors
```

### Step 2: Deploy Contracts

```bash
# Deploy all contracts
npm run deploy-all:testnet
```

This will deploy in order:
1. **CharacterNFT** - Main NFT contract
2. **CHSToken** - Game ERC20 token
3. **Marketplace** - Trading marketplace

**Expected output**:
```
CharacterNFT deployed to: 0x1234...
CHSToken deployed to: 0x5678...
Marketplace deployed to: 0x9abc...
```

### Step 3: Configure Permissions

```bash
# Configure authorized minter
npm run set-minter:testnet
```

This configures:
- CharacterNFT: authorizedMinter → your address
- CHSToken: authorizedMinter → your address

### Step 4: Update Frontend

Copy deployment addresses to `.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x1234...  # CharacterNFT
NEXT_PUBLIC_CHS_TOKEN_ADDRESS=0x5678... # CHSToken
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x9abc... # Marketplace
```

### Step 5: Verify Contracts in Explorer

```bash
# Mantle Sepolia Explorer
https://explorer.sepolia.mantle.xyz/address/YOUR_CONTRACT_ADDRESS
```

**Verify source code** (optional but recommended):
```bash
npx hardhat verify --network mantleSepolia YOUR_CONTRACT_ADDRESS "Constructor Args"
```

### Step 6: Manual Testing

```bash
# Start frontend
npm run dev

# Open http://localhost:3000
```

**Testing Checklist**:
- [ ] Connect wallet to Mantle Sepolia
- [ ] Mint a character NFT
- [ ] Verify NFT metadata
- [ ] Upgrade character (add EXP)
- [ ] Verify level calculation
- [ ] Equip items (localStorage)
- [ ] Create team
- [ ] Play complete battle
- [ ] Verify CHS rewards
- [ ] List NFT on marketplace
- [ ] Buy NFT with MNT
- [ ] Buy NFT with CHS
- [ ] Cancel listing

---

## 🌐 Deploy to Mainnet (Mantle)

### ⚠️ CRITICAL WARNINGS

1. **Security Audit**: Run Slither before deployment
   ```bash
   pip install slither-analyzer
   slither contracts/ --filter-paths "node_modules"
   ```

2. **Exhaustive Testing**: Test EVERYTHING on testnet first

3. **Key Backup**: Save private keys securely

4. **Multi-sig**: Consider using Gnosis Safe for owner

5. **Emergency Plan**: Have plan to pause contracts if needed

### Step 1: Audit and Preparation

```bash
# 1. Run Slither
slither contracts/

# 2. Review found issues
# 3. Fix critical vulnerabilities
# 4. Re-compile
npm run compile

# 5. Run all tests
npm run test

# 6. Verify all pass
```

### Step 2: Deploy to Mainnet

```bash
# Deploy all contracts
npm run deploy-all:mainnet
```

**⏱️ Estimated time**: 5-10 minutes  
**💰 Estimated cost**: ~0.1-0.2 MNT

### Step 3: Configure Permissions

```bash
# Configure minters
npm run set-minter:mainnet
```

### Step 4: Verify Contracts

```bash
# Verify in Mantle Explorer
https://explorer.mantle.xyz/address/YOUR_CONTRACT_ADDRESS

# Verify source code
npx hardhat verify --network mantleMainnet CONTRACT_ADDRESS "Args"
```

### Step 5: Transfer Ownership to Multi-sig (Recommended)

```solidity
// From Etherscan/Explorer or script
characterNFT.transferOwnership(MULTISIG_ADDRESS);
chsToken.transferOwnership(MULTISIG_ADDRESS);
marketplace.transferOwnership(MULTISIG_ADDRESS);
```

### Step 6: Update Production Frontend

```env
# .env.local for production
NEXT_PUBLIC_CONTRACT_ADDRESS=mainnet_CharacterNFT_address
NEXT_PUBLIC_CHS_TOKEN_ADDRESS=mainnet_CHSToken_address
NEXT_PUBLIC_MARKETPLACE_ADDRESS=mainnet_Marketplace_address
```

### Step 7: Deploy Frontend

```bash
# Build for production
npm run build

# Deploy to Vercel (recommended)
vercel --prod

# Or your preferred platform
```

---

## 🔧 Post-Deployment Configuration

### 1. Configure Marketplace Fees

```solidity
// From owner address
marketplace.setFee(250); // 2.5%
marketplace.setFeeRecipient(FEE_RECIPIENT_ADDRESS);
```

### 2. Configure CHS Max Supply (Optional)

```solidity
// From owner address
chsToken.setMaxSupply(10000000 * 10**18); // 10M tokens
```

### 3. Add Additional Minters

```solidity
// Backend or game server
chsToken.addAuthorizedMinter(BACKEND_ADDRESS);
characterNFT.setAuthorizedMinter(BACKEND_ADDRESS);
```

---

## 📊 Post-Deployment Monitoring

### 1. Monitor Events

```javascript
// Listen to important events
characterNFT.on("CharacterMinted", (tokenId, owner, class, name) => {
  console.log(`New character minted: ${name} (${class})`);
});

marketplace.on("NFTSold", (listingId, tokenId, seller, buyer, price) => {
  console.log(`NFT sold: ${tokenId} for ${price}`);
});
```

### 2. Verify Gas Costs

```bash
# Analyze transaction costs
# In Mantle Explorer
https://explorer.mantle.xyz/address/YOUR_CONTRACT/transactions
```

### 3. Security Alerts

- Monitor unusual transactions
- Alerts if contract balance changes unexpectedly
- Error logs in frontend

---

## 🚨 Emergency Plan

### If You Discover a Vulnerability

1. **Pause Contracts Immediately**
   ```solidity
   characterNFT.pause();
   // Marketplace doesn't have pause, consider adding
   ```

2. **Notify Users**
   - Message in frontend
   - Social media announcement
   - Email if you have mailing list

3. **Analyze Problem**
   - Review suspicious transactions
   - Identify exploit
   - Calculate damage

4. **Deploy Fix**
   - Fix vulnerability
   - Re-audit
   - Deploy new contract
   - Migrate data if necessary

5. **Unpause**
   ```solidity
   characterNFT.unpause();
   ```

### Emergency Contacts

- **Owner Address**: [Your address]
- **Multi-sig Signers**: [Addresses]
- **Auditor**: [Contact]
- **Community**: [Discord/Telegram]

---

## 📝 Final Pre-Mainnet Checklist

### Contracts
- [ ] All tests pass (90+ tests)
- [ ] Slither run without critical issues
- [ ] Contracts compiled without warnings
- [ ] ABIs updated in frontend
- [ ] Pausable implemented
- [ ] Rate limiting configured

### Frontend
- [ ] `.env.local` configured correctly
- [ ] Production build successful
- [ ] Complete testnet testing
- [ ] Robust error handling
- [ ] Loading states for all actions

### Documentation
- [ ] README updated with addresses
- [ ] TASKS.md updated
- [ ] User guide created
- [ ] Demo video recorded (for hackathon)

### Security
- [ ] Private keys backed up
- [ ] Multi-sig configured (recommended)
- [ ] Emergency plan documented
- [ ] Team notified of deployment

### Post-Deploy
- [ ] Contracts verified in explorer
- [ ] Ownership transferred to multi-sig
- [ ] Monitoring configured
- [ ] Social media announcement

---

## 💡 Tips and Best Practices

### 1. Incremental Testing
- Deploy one contract at a time
- Verify each before continuing
- Test interactions between contracts

### 2. Gas Optimization
- Use `calldata` instead of `memory` when possible
- Batch operations when possible
- Monitor costs on testnet

### 3. Upgradability (Future)
- Consider proxy pattern for upgrades
- OpenZeppelin UUPS or Transparent Proxy
- Plan from the start

### 4. Backup and Recovery
- Save compiled ABIs
- Save contract addresses
- Document constructor args
- Backup deployment scripts

---

## 📞 Support and Resources

### Official Documentation
- **Mantle Docs**: https://docs.mantle.xyz
- **Hardhat Docs**: https://hardhat.org/docs
- **OpenZeppelin**: https://docs.openzeppelin.com

### Explorers
- **Testnet**: https://explorer.sepolia.mantle.xyz
- **Mainnet**: https://explorer.mantle.xyz

### Faucets
- **Mantle Sepolia**: https://faucet.testnet.mantle.xyz

### Community
- **Mantle Discord**: [Link]
- **Project Discord**: [Your link]
- **Telegram**: [Your link]

---

## 🎉 After Deployment

### 1. Announcement
- Tweet with contract addresses
- Post on Discord/Telegram
- Update README.md

### 2. Monitoring
- Setup analytics
- Monitor transactions
- Track gas costs
- User feedback

### 3. Iteration
- Collect user feedback
- Plan improvements
- Consider additional features
- Optimizations based on real usage

---

**Good luck with the deployment!** 🚀

**Last updated**: January 7, 2026

