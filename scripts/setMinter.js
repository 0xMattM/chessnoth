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

  const tx = await CharacterNFT.setAuthorizedMinter(minterAddress)
  console.log('Transaction hash:', tx.hash)
  console.log('Waiting for confirmation...')
  
  await tx.wait()
  
  // Verify
  const authorizedMinter = await CharacterNFT.authorizedMinter()
  console.log('\n✅ Authorized minter set to:', authorizedMinter)
  console.log('🔗 View on ConfluxScan:')
  console.log(`  https://evmtestnet.confluxscan.org/tx/${tx.hash}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

