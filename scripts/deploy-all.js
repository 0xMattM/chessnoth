const hre = require('hardhat')

/**
 * Deploy all contracts in the correct order:
 * 1. CharacterNFT
 * 2. CHSToken
 * 3. Marketplace (depends on CharacterNFT and CHSToken)
 */
async function main() {
  console.log('🚀 Deploying all Chessnoth contracts...\n')

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners()
  console.log('📝 Deploying contracts with account:', deployer.address)
  console.log('💰 Account balance:', hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'MNT\n')

  const network = await hre.ethers.provider.getNetwork()
  const isTestnet = network.chainId === 5003n

  // ============================================
  // 1. Deploy CharacterNFT
  // ============================================
  console.log('📦 Step 1: Deploying CharacterNFT...')
  const CharacterNFT = await hre.ethers.getContractFactory('CharacterNFT')
  const characterNFT = await CharacterNFT.deploy(
    'Chessnoth Character',
    'CHESS',
    '' // Base URI - can be set later
  )
  await characterNFT.waitForDeployment()
  const characterNFTAddress = await characterNFT.getAddress()
  console.log('✅ CharacterNFT deployed to:', characterNFTAddress)

  // ============================================
  // 2. Deploy CHSToken
  // ============================================
  console.log('\n📦 Step 2: Deploying CHSToken...')
  const CHSToken = await hre.ethers.getContractFactory('CHSToken')
  const chsToken = await CHSToken.deploy(
    'Chessnoth Token',
    'CHS',
    hre.ethers.parseEther('0'), // Initial supply (0, will be minted as needed)
    0 // Max supply (0 = unlimited)
  )
  await chsToken.waitForDeployment()
  const chsTokenAddress = await chsToken.getAddress()
  console.log('✅ CHSToken deployed to:', chsTokenAddress)

  // Add deployer as authorized minter for CHS
  console.log('🔐 Setting deployer as authorized minter for CHS...')
  const addMinterTx = await chsToken.addAuthorizedMinter(deployer.address)
  await addMinterTx.wait()
  console.log('✅ Deployer added as authorized minter')

  // ============================================
  // 3. Deploy Marketplace
  // ============================================
  console.log('\n📦 Step 3: Deploying Marketplace...')
  const Marketplace = await hre.ethers.getContractFactory('Marketplace')
  const marketplace = await Marketplace.deploy(
    characterNFTAddress,
    chsTokenAddress,
    250, // Fee: 2.5% (250 basis points)
    deployer.address // Fee recipient
  )
  await marketplace.waitForDeployment()
  const marketplaceAddress = await marketplace.getAddress()
  console.log('✅ Marketplace deployed to:', marketplaceAddress)

  // ============================================
  // 4. Set authorized minter for CharacterNFT
  // ============================================
  console.log('\n🔐 Setting deployer as authorized minter for CharacterNFT...')
  const addMinterNFTTx = await characterNFT.addAuthorizedMinter(deployer.address)
  await addMinterNFTTx.wait()
  console.log('✅ Deployer added as authorized minter for CharacterNFT')

  // ============================================
  // Summary
  // ============================================
  const explorerBase = isTestnet
    ? 'https://explorer.sepolia.mantle.xyz'
    : 'https://explorer.mantle.xyz'

  console.log('\n' + '='.repeat(60))
  console.log('✅ ALL CONTRACTS DEPLOYED SUCCESSFULLY!')
  console.log('='.repeat(60))
  console.log('\n📋 Contract Addresses:')
  console.log('  CharacterNFT:', characterNFTAddress)
  console.log('  CHSToken:     ', chsTokenAddress)
  console.log('  Marketplace:  ', marketplaceAddress)
  console.log('\n🔗 View on Explorer:')
  console.log(`  CharacterNFT: ${explorerBase}/address/${characterNFTAddress}`)
  console.log(`  CHSToken:     ${explorerBase}/address/${chsTokenAddress}`)
  console.log(`  Marketplace:  ${explorerBase}/address/${marketplaceAddress}`)
  console.log('\n⚠️  IMPORTANT: Update your .env.local file:')
  console.log(`  NEXT_PUBLIC_CONTRACT_ADDRESS=${characterNFTAddress}`)
  console.log(`  NEXT_PUBLIC_CHS_TOKEN_ADDRESS=${chsTokenAddress}`)
  console.log(`  NEXT_PUBLIC_MARKETPLACE_ADDRESS=${marketplaceAddress}`)
  console.log('\n💡 Next steps:')
  console.log('  1. Copy all contract addresses above')
  console.log('  2. Update environment variables in .env.local')
  console.log('  3. Test the contracts on the explorer')
  console.log('  4. Add more authorized minters if needed')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error)
    process.exit(1)
  })

