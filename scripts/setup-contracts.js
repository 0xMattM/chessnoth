const hre = require('hardhat')

/**
 * Setup contracts after deployment:
 * 1. Set authorized minter for CharacterNFT
 * 2. Verify all configurations
 */
async function main() {
  console.log('🔧 Setting up deployed contracts...\n')

  // Get contract addresses from environment or command line
  const characterNFTAddress = process.env.CHARACTER_NFT_ADDRESS || process.argv[2]
  const chsTokenAddress = process.env.CHS_TOKEN_ADDRESS || process.argv[3]
  const marketplaceAddress = process.env.MARKETPLACE_ADDRESS || process.argv[4]

  if (!characterNFTAddress || !chsTokenAddress || !marketplaceAddress) {
    console.error('❌ Error: Contract addresses required')
    console.log('Usage: node scripts/setup-contracts.js <CharacterNFT> <CHSToken> <Marketplace>')
    console.log('Or set environment variables: CHARACTER_NFT_ADDRESS, CHS_TOKEN_ADDRESS, MARKETPLACE_ADDRESS')
    process.exit(1)
  }

  const [deployer] = await hre.ethers.getSigners()
  console.log('📝 Using account:', deployer.address)
  console.log('💰 Account balance:', hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'MNT\n')

  // Get contract instances
  const CharacterNFT = await hre.ethers.getContractFactory('CharacterNFT')
  const characterNFT = CharacterNFT.attach(characterNFTAddress)

  const CHSToken = await hre.ethers.getContractFactory('CHSToken')
  const chsToken = CHSToken.attach(chsTokenAddress)

  // ============================================
  // 1. Set authorized minter for CharacterNFT
  // ============================================
  console.log('🔐 Step 1: Setting authorized minter for CharacterNFT...')
  try {
    const isMinter = await characterNFT.authorizedMinters(deployer.address)
    if (isMinter) {
      console.log('✅ Deployer is already authorized minter for CharacterNFT')
    } else {
      console.log('⚠️  Deployer is not authorized minter, adding...')
      const tx = await characterNFT.addAuthorizedMinter(deployer.address)
      console.log('⏳ Transaction sent, waiting for confirmation...')
      await tx.wait()
      console.log('✅ Deployer added as authorized minter for CharacterNFT')
    }
  } catch (error) {
    console.error('❌ Error setting authorized minter:', error.message)
    throw error
  }

  // ============================================
  // 2. Verify CHS token minter
  // ============================================
  console.log('\n🔐 Step 2: Verifying CHS token minter...')
  try {
    const isMinter = await chsToken.authorizedMinters(deployer.address)
    if (isMinter) {
      console.log('✅ Deployer is authorized minter for CHS')
    } else {
      console.log('⚠️  Deployer is not authorized minter for CHS, adding...')
      const tx = await chsToken.addAuthorizedMinter(deployer.address)
      await tx.wait()
      console.log('✅ Deployer added as authorized minter for CHS')
    }
  } catch (error) {
    console.error('❌ Error verifying CHS minter:', error.message)
    throw error
  }

  // ============================================
  // Summary
  // ============================================
  console.log('\n' + '='.repeat(60))
  console.log('✅ CONTRACT SETUP COMPLETED!')
  console.log('='.repeat(60))
  console.log('\n📋 Contract Addresses:')
  console.log('  CharacterNFT:', characterNFTAddress)
  console.log('  CHSToken:     ', chsTokenAddress)
  console.log('  Marketplace:  ', marketplaceAddress)
  console.log('\n💡 Next steps:')
  console.log('  1. Update .env.local with these addresses')
  console.log('  2. Test minting a character NFT')
  console.log('  3. Test minting CHS tokens')
  console.log('  4. Test marketplace functionality')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  })

