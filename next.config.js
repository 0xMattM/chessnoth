/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['ipfs.io', 'gateway.pinata.cloud', 'cloudflare-ipfs.com'],
  },
  experimental: {
    esmExternals: true,
  },
  // ESLint removido completamente del proyecto
  eslint: {
    // Allow production builds to complete even with ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to complete even with type errors
    ignoreBuildErrors: true,
  },
  // Override webpack to skip ESLint loader and handle pino-pretty
  webpack: (config, { isServer }) => {
    // Remove ESLint loader from webpack
    if (config.module && config.module.rules) {
      config.module.rules = config.module.rules.filter(
        (rule) => !(rule.use && rule.use.some && rule.use.some((use) => use.loader && use.loader.includes('eslint-loader')))
      )
    }
    
    // Ignore optional dependencies that are not needed in the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'pino-pretty': false,
      }
    }
    
    // Ignore pino-pretty module resolution warnings
    config.resolve.alias = {
      ...config.resolve.alias,
      'pino-pretty': false,
    }
    
    return config
  },
}

module.exports = nextConfig

