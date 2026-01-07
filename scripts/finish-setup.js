const hre = require('hardhat')
require('dotenv').config()

async function main() {
  console.log('🔧 Finishing contract setup...\n')

  // Contract addresses from the deployment output
  const characterNFTAddress = '0x0A1A35519167ba58b5b408418D97ac3eeFDDc3c1'
  const chsTokenAddress = '0x3808b1b4D64bBbE734A91caB45CEbC359c604cd2'
  const marketplaceAddress = '0x92764DE0A458Fc99561928dd3DF0e46DbD7b0C64'
  const deployerAddress = '0x25b97597Abc826e41A1B889CD0fa6536CDe336A9'

  const [deployer] = await hre.ethers.getSigners()
  console.log('📝 Using account:', deployer.address)
  console.log('💰 Account balance:', hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'MNT\n')

  // Get contract instances
  const CharacterNFT = await hre.ethers.getContractFactory('CharacterNFT')
  const characterNFT = CharacterNFT.attach(characterNFTAddress)

  // Set authorized minter
  console.log('🔐 Setting authorized minter for CharacterNFT...')
  try {
    const tx = await characterNFT.setAuthorizedMinter(deployerAddress)
    console.log('⏳ Transaction sent:', tx.hash)
    console.log('⏳ Waiting for confirmation...')
    await tx.wait()
    console.log('✅ Authorized minter set successfully!')
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.message.includes('nonce')) {
      console.log('⚠️  Nonce error - transaction may have already been sent. Checking current minter...')
      try {
        const currentMinter = await characterNFT.authorizedMinter()
        console.log('✅ Current authorized minter:', currentMinter)
        if (currentMinter.toLowerCase() === deployerAddress.toLowerCase()) {
          console.log('✅ Minter already configured correctly!')
        }
      } catch (e) {
        console.error('Could not read current minter:', e.message)
      }
    }
  }

  const network = await hre.ethers.provider.getNetwork()
  const explorerBase = network.chainId === 5003n
    ? 'https://explorer.sepolia.mantle.xyz'
    : 'https://explorer.mantle.xyz'

  console.log('\n' + '='.repeat(60))
  console.log('✅ SETUP COMPLETE!')
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  })

