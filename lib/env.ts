/**
 * Environment variable validation and configuration
 * Ensures all required environment variables are present and valid
 */

interface EnvConfig {
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: string
  NEXT_PUBLIC_CONTRACT_ADDRESS: string
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  config?: EnvConfig
}

/**
 * Validates that a contract address is a valid Ethereum address
 */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Validates all required environment variables
 * @returns Validation result with errors if any
 */
export function validateEnv(): ValidationResult {
  const errors: string[] = []
  const config: Partial<EnvConfig> = {}

  // Validate WalletConnect Project ID
  const walletConnectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
  if (!walletConnectId || walletConnectId === 'default-project-id') {
    errors.push(
      'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set or is using default value. Get your project ID from https://cloud.walletconnect.com'
    )
  } else {
    config.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = walletConnectId
  }

  // Validate Contract Address
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
  if (!contractAddress) {
    errors.push(
      'NEXT_PUBLIC_CONTRACT_ADDRESS is not set. Set it in your .env.local file with your deployed contract address.'
    )
  } else if (!isValidAddress(contractAddress)) {
    errors.push(
      `NEXT_PUBLIC_CONTRACT_ADDRESS is not a valid Ethereum address: ${contractAddress}`
    )
  } else {
    config.NEXT_PUBLIC_CONTRACT_ADDRESS = contractAddress
  }

  return {
    isValid: errors.length === 0,
    errors,
    config: errors.length === 0 ? (config as EnvConfig) : undefined,
  }
}

/**
 * Gets validated environment configuration
 * Throws error if validation fails (should only be called after validateEnv)
 */
export function getEnvConfig(): EnvConfig {
  const validation = validateEnv()
  if (!validation.isValid || !validation.config) {
    throw new Error(
      `Environment validation failed:\n${validation.errors.join('\n')}`
    )
  }
  return validation.config
}

/**
 * Safe getter for environment variables with defaults
 */
export function getEnvVar(key: keyof EnvConfig, defaultValue?: string): string {
  const value = process.env[key]
  if (!value && defaultValue) {
    return defaultValue
  }
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`)
  }
  return value
}

