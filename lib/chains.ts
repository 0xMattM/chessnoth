import { Chain } from 'wagmi'

/**
 * Conflux eSpace Testnet
 * Chain ID: 71
 * RPC: https://evmtestnet.confluxrpc.com
 */
export const confluxESpaceTestnet: Chain = {
  id: 71,
  name: 'Conflux eSpace Testnet',
  network: 'conflux-espace-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Conflux',
    symbol: 'CFX',
  },
  rpcUrls: {
    default: {
      http: ['https://evmtestnet.confluxrpc.com'],
    },
    public: {
      http: ['https://evmtestnet.confluxrpc.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ConfluxScan',
      url: 'https://evmtestnet.confluxscan.org',
    },
  },
  testnet: true,
}

