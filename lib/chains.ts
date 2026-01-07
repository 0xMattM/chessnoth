import { Chain } from 'wagmi'

/**
 * Mantle Network Mainnet
 * Chain ID: 5000
 * RPC: https://rpc.mantle.xyz
 */
export const mantleMainnet: Chain = {
  id: 5000,
  name: 'Mantle',
  network: 'mantle',
  nativeCurrency: {
    decimals: 18,
    name: 'Mantle',
    symbol: 'MNT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.mantle.xyz'],
    },
    public: {
      http: ['https://rpc.mantle.xyz', 'https://1rpc.io/mantle'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mantle Explorer',
      url: 'https://explorer.mantle.xyz',
    },
  },
  testnet: false,
}

/**
 * Mantle Sepolia Testnet
 * Chain ID: 5003
 * RPC: https://rpc.sepolia.mantle.xyz
 */
export const mantleSepoliaTestnet: Chain = {
  id: 5003,
  name: 'Mantle Sepolia',
  network: 'mantle-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Mantle',
    symbol: 'MNT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.sepolia.mantle.xyz'],
    },
    public: {
      http: ['https://rpc.sepolia.mantle.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mantle Sepolia Explorer',
      url: 'https://explorer.sepolia.mantle.xyz',
    },
  },
  testnet: true,
}

/**
 * Default chain for the application
 * Using Mantle Sepolia Testnet for development and testing
 */
export const defaultChain = mantleSepoliaTestnet

