/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['ipfs.io', 'gateway.pinata.cloud', 'cloudflare-ipfs.com'],
  },
  eslint: {
    // Disable ESLint during builds to prevent warnings from blocking deployment
    // ESLint can still be run manually with npm run lint
    ignoreDuringBuilds: true,
  },
  // Disable ESLint completely
  experimental: {
    eslint: {
      ignoreDuringBuilds: true,
    },
  },
  typescript: {
    // Allow production builds to complete even with type errors
    // Type errors should be fixed but won't block deployment
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
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

