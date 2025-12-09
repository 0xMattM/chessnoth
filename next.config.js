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
  typescript: {
    // Allow production builds to complete even with type errors
    // Type errors should be fixed but won't block deployment
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig

