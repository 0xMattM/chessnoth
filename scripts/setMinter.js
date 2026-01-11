const hre = require('hardhat')
require('dotenv').config()

async function main() {
  // Get contract address from environment or command line
  const contractAddress = process.env.CONTRACT_ADDRESS || process.argv[2]
  const minterAddress = process.env.MINTER_ADDRESS || process.argv[3]

  if (!contractAddress || !minterAddress) {
    console.error('❌ Error: Missing required parameters')
    console.log('\nUsage:')
    console.log('  node scripts/setMinter.js <CONTRACT_ADDRESS> <MINTER_ADDRESS>')
    console.log('\nOr set in .env:')
    console.log('  CONTRACT_ADDRESS=0x...')
    console.log('  MINTER_ADDRESS=0x...')
    process.exit(1)
  }

  console.log('Setting authorized minter...')
  console.log('Contract:', contractAddress)
  console.log('Minter:', minterAddress)

  const CharacterNFT = await hre.ethers.getContractAt('CharacterNFT', contractAddress)
  
  const [deployer] = await hre.ethers.getSigners()
  console.log('Using account:', deployer.address)

  // Check if deployer is owner
  const owner = await CharacterNFT.owner()
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error('❌ Error: Deployer is not the contract owner')
    console.log('Owner:', owner)
    process.exit(1)
  }

  // Check if already authorized
  const isAlreadyAuthorized = await CharacterNFT.authorizedMinters(minterAddress)
  if (isAlreadyAuthorized) {
    console.log('ℹ️  Minter is already authorized')
    return
  }

  console.log('📤 Sending transaction...')
  const tx = await CharacterNFT.addAuthorizedMinter(minterAddress)
  console.log('Transaction hash:', tx.hash)
  console.log('⏳ Waiting for confirmation...')
  
  const receipt = await tx.wait()
  console.log('✅ Transaction confirmed in block:', receipt.blockNumber)
  
  // Verify
  const isAuthorized = await CharacterNFT.authorizedMinters(minterAddress)
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
    console.log('✅ Authorized minter added successfully!')
    console.log('   Minter address:', minterAddress)
  } else {
    console.log('❌ Failed to add authorized minter')
  }
  console.log('='.repeat(60))
  
  if (explorerUrl) {
    console.log('\n🔗 View on Mantle Explorer:')
    console.log(`   ${explorerUrl}`)
  }
  
  console.log('\n💡 Note: CharacterNFT now supports multiple minters!')
  console.log('   Use addAuthorizedMinter() to add more minters')
  console.log('   Use removeAuthorizedMinter() to remove a minter')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

