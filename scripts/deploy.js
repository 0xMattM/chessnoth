const hre = require('hardhat')

async function main() {
  console.log('Deploying CharacterNFT contract...')

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners()
  console.log('Deploying contracts with account:', deployer.address)
  console.log('Account balance:', (await deployer.provider.getBalance(deployer.address)).toString())

  // Contract parameters
  const name = 'Chessnoth Character'
  const symbol = 'CHESS'
  const baseTokenURI = '' // You can set a base URI if needed, e.g., 'https://ipfs.io/ipfs/'

  // Deploy the contract
  const CharacterNFT = await hre.ethers.getContractFactory('CharacterNFT')
  const characterNFT = await CharacterNFT.deploy(name, symbol, baseTokenURI)

  await characterNFT.waitForDeployment()

  const address = await characterNFT.getAddress()
  const network = await hre.ethers.provider.getNetwork()
  
  // Determine explorer URL based on network
  let explorerUrl = ''
  if (network.chainId === 5003n) {
    // Mantle Sepolia Testnet
    explorerUrl = `https://explorer.sepolia.mantle.xyz/address/${address}`
  } else if (network.chainId === 5000n) {
    // Mantle Mainnet
    explorerUrl = `https://explorer.mantle.xyz/address/${address}`
  }
  
  console.log('\n✅ CharacterNFT deployed to:', address)
  console.log('\n📋 Contract Details:')
  console.log('  Name:', name)
  console.log('  Symbol:', symbol)
  console.log('  Base URI:', baseTokenURI || '(empty)')
  console.log('  Network:', network.name, `(Chain ID: ${network.chainId})`)
  if (explorerUrl) {
    console.log('\n🔗 View on Mantle Explorer:')
    console.log(`  ${explorerUrl}`)
  }
  console.log('\n⚠️  IMPORTANT: Update your .env.local file:')
  console.log(`  NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`)
  console.log('\n💡 Next steps:')
  console.log('  1. Copy the contract address above')
  console.log('  2. Update NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local')
  console.log('  3. Set yourself as authorizedMinter using setAuthorizedMinter()')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

