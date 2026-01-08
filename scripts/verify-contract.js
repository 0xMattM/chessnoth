const hre = require('hardhat')
require('dotenv').config()

/**
 * Script to verify contract type and check minter status
 * Usage: npx hardhat run scripts/verify-contract.js --network mantleSepolia [--address 0x...] [--wallet 0x...]
 */
async function main() {
  // Get contract address from env (set CONTRACT_ADDRESS=0x... before running)
  const contractAddress = process.env.CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_CHS_TOKEN_ADDRESS || '0x0010570DEd5d0be94A14Fc53B4B4411605C0d9c7'
  const walletAddress = process.env.WALLET_ADDRESS || process.env.NEXT_PUBLIC_WALLET_ADDRESS

  if (!contractAddress) {
    console.error('❌ Error: Contract address required')
    console.log('\nUsage:')
    console.log('  CONTRACT_ADDRESS=0x... npx hardhat run scripts/verify-contract.js --network mantleSepolia')
    console.log('  Or set NEXT_PUBLIC_CHS_TOKEN_ADDRESS in .env.local')
    process.exit(1)
  }

  const network = await hre.ethers.provider.getNetwork()
  console.log('🔍 Verifying contract:', contractAddress)
  console.log('📝 Network:', network.name, `(Chain ID: ${network.chainId})`)
  console.log('')

  try {
    // Try to get contract as CHS Token
    console.log('1️⃣ Checking if contract is CHS Token (ERC20)...')
    try {
      const CHSToken = await hre.ethers.getContractAt('CHSToken', contractAddress)
      
      // Check basic ERC20 functions
      const name = await CHSToken.name()
      const symbol = await CHSToken.symbol()
      const totalSupply = await CHSToken.totalSupply()
      const owner = await CHSToken.owner()
      
      console.log('   ✅ Contract is CHS Token!')
      console.log('   Name:', name)
      console.log('   Symbol:', symbol)
      console.log('   Total Supply:', hre.ethers.formatEther(totalSupply), symbol)
      console.log('   Owner:', owner)
      console.log('')

      // Check authorized minters if wallet provided
      if (walletAddress) {
        console.log('2️⃣ Checking minter authorization...')
        const isAuthorized = await CHSToken.authorizedMinters(walletAddress)
        console.log(`   Wallet: ${walletAddress}`)
        console.log(`   Is Authorized Minter: ${isAuthorized ? '✅ YES' : '❌ NO'}`)
        console.log('')

        if (!isAuthorized) {
          console.log('⚠️  Wallet is NOT authorized as minter!')
          console.log('   To authorize, run:')
          console.log(`   node scripts/setCHSMinter.js ${contractAddress} ${walletAddress}`)
          console.log('   (Note: You must be the contract owner)')
        }
      } else {
        console.log('2️⃣ No wallet address provided to check minter status')
        console.log('   To check, run:')
        console.log(`   node scripts/verify-contract.js ${contractAddress} <YOUR_WALLET_ADDRESS>`)
      }

      // Get all events to see if there are authorized minters
      console.log('3️⃣ Checking contract events...')
      const filter = CHSToken.filters.AuthorizedMinterAdded()
      const events = await CHSToken.queryFilter(filter)
      console.log(`   Found ${events.length} authorized minter addition event(s)`)
      if (events.length > 0) {
        console.log('   Authorized minters (from events):')
        events.forEach((event, i) => {
          console.log(`     ${i + 1}. ${event.args.minter}`)
        })
      }
      console.log('')

    } catch (error) {
      console.log('   ❌ Contract is NOT a CHS Token or not verified')
      console.log('   Error:', error.message)
      console.log('')
      console.log('   This might mean:')
      console.log('   1. The contract is not the CHS Token')
      console.log('   2. The contract code is not verified on the explorer')
      console.log('   3. The contract address is incorrect')
    }

    // Try to get contract as CharacterNFT
    console.log('4️⃣ Checking if contract is CharacterNFT (ERC721)...')
    try {
      const CharacterNFT = await hre.ethers.getContractAt('CharacterNFT', contractAddress)
      const name = await CharacterNFT.name()
      const symbol = await CharacterNFT.symbol()
      console.log('   ✅ Contract is CharacterNFT!')
      console.log('   Name:', name)
      console.log('   Symbol:', symbol)
      console.log('')
      console.log('   ⚠️  WARNING: This is NOT the CHS Token!')
      console.log('   You need to deploy the CHS Token separately.')
    } catch (error) {
      console.log('   ℹ️  Contract is not CharacterNFT')
    }

    const network = await hre.ethers.provider.getNetwork()
    const explorerBase = network.chainId === 5003n
      ? 'https://explorer.sepolia.mantle.xyz'
      : 'https://explorer.mantle.xyz'
    
    console.log('')
    console.log('🔗 View on Explorer:')
    console.log(`   ${explorerBase}/address/${contractAddress}`)

  } catch (error) {
    console.error('❌ Error verifying contract:', error)
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

