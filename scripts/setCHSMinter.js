const hre = require('hardhat')
require('dotenv').config()

/**
 * Script to set authorized minter for CHS Token
 * Usage: node scripts/setCHSMinter.js <CHS_TOKEN_ADDRESS> <MINTER_ADDRESS>
 */
async function main() {
  // Get contract address from environment or command line
  const chsTokenAddress = process.env.CHS_TOKEN_ADDRESS || process.argv[2]
  const minterAddress = process.env.MINTER_ADDRESS || process.argv[3]

  if (!chsTokenAddress || !minterAddress) {
    console.error('❌ Error: Missing required parameters')
    console.log('\nUsage:')
    console.log('  node scripts/setCHSMinter.js <CHS_TOKEN_ADDRESS> <MINTER_ADDRESS>')
    console.log('\nOr set in .env:')
    console.log('  CHS_TOKEN_ADDRESS=0x...')
    console.log('  MINTER_ADDRESS=0x...')
    process.exit(1)
  }

  console.log('🔐 Setting authorized minter for CHS Token...')
  console.log('CHS Token:', chsTokenAddress)
  console.log('Minter:', minterAddress)

  const CHSToken = await hre.ethers.getContractAt('CHSToken', chsTokenAddress)
  
  const [deployer] = await hre.ethers.getSigners()
  console.log('📝 Using account:', deployer.address)
  console.log('💰 Account balance:', hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'MNT\n')

  // Check if deployer is owner
  const owner = await CHSToken.owner()
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error('❌ Error: Deployer is not the contract owner')
    console.log('Owner:', owner)
    console.log('Deployer:', deployer.address)
    process.exit(1)
  }

  // Check if already authorized
  const isAlreadyAuthorized = await CHSToken.authorizedMinters(minterAddress)
  if (isAlreadyAuthorized) {
    console.log('ℹ️  Minter is already authorized')
    return
  }

  console.log('📤 Sending transaction...')
  const tx = await CHSToken.addAuthorizedMinter(minterAddress)
  console.log('Transaction hash:', tx.hash)
  console.log('⏳ Waiting for confirmation...')
  
  const receipt = await tx.wait()
  console.log('✅ Transaction confirmed in block:', receipt.blockNumber)
  
  // Verify
  const isAuthorized = await CHSToken.authorizedMinters(minterAddress)
  const network = await hre.ethers.provider.getNetwork()
  
  // Determine explorer URL based on network
  let explorerUrl = ''
  if (network.chainId === 5003n) {
    // Mantle Sepolia Testnet
    explorerUrl = `https://explorer.sepolia.mantle.xyz/tx/${tx.hash}`
  } else if (network.chainId === 5000n) {
    // Mantle Mainnet
    explorerUrl = `https://explorer.mantle.xyz/tx/${tx.hash}`
  }
  
  console.log('\n' + '='.repeat(60))
  if (isAuthorized) {
    console.log('✅ Authorized minter set successfully!')
    console.log('   Minter address:', minterAddress)
  } else {
    console.log('❌ Failed to set authorized minter')
  }
  console.log('='.repeat(60))
  
  if (explorerUrl) {
    console.log('\n🔗 View on Mantle Explorer:')
    console.log(`   ${explorerUrl}`)
  }
  
  console.log('\n💡 Next steps:')
  console.log('   1. Update .env.local with CHS_TOKEN_ADDRESS if not already set')
  console.log('   2. Test minting tokens from the authorized minter address')
  console.log('   3. Update claim functionality to use contract minting')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

