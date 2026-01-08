# Chessnoth - Tasks & Progress

## Migration to Mantle Network for Hackathon (2025-01-XX)

### Current Sprint: Mantle Migration

- [x] Create TASKS.md file to track migration tasks
- [x] Add Mantle Network chain configurations (mainnet and testnet) to lib/chains.ts
- [x] Update hardhat.config.js to support Mantle networks
- [x] Update app/providers.tsx to use Mantle instead of Conflux
- [x] Update lib/contract.ts to use Mantle chain
- [x] Update package.json scripts for Mantle deployment
- [x] Update README.md with Mantle Network information
- [x] Update PLANNING.md with Mantle Network details
- [x] Update deployment scripts (deploy.js, setMinter.js) for Mantle
- [ ] Test contract deployment on Mantle Testnet
- [ ] Update environment variable documentation

### Hackathon Requirements (GameFi & Social Track)

- [ ] Integrate RWA or yield logic into the game
- [ ] Design token incentive system for user retention
- [ ] Implement user retention tools (leaderboards, achievements, etc.)
- [ ] Create demo video (3-5 minutes)
- [ ] Prepare one-pager pitch document
- [ ] Update GitHub repository with deployment instructions
- [ ] Prepare team bios and contact info

### Contracts and NFTs System (2025-01-XX)

- [ ] Update CharacterNFT.sol: add name field and getName function
- [ ] Implement upgradeCharacter in CharacterNFT.sol with automatic level calculation
- [ ] Create CHSToken.sol (ERC20) with controlled minting functions
- [ ] Create Marketplace.sol with list/buy/cancel NFT functions
- [ ] Write unit tests for all contracts
- [ ] Update lib/contract.ts with new ABIs
- [ ] Create frontend hooks to read NFTs and perform upgrades
- [ ] Create UI to distribute EXP and perform upgrades
- [ ] Create UI for marketplace
- [ ] Integrate CHS rewards system with combat

**See CONTRACTS_PLANNING.md for complete details**

### Discovered During Work

_Add any new tasks discovered during development here_

## Complete Code Review (2025-01-07)

### Critical Findings (High Priority)

- [ ] Create unit tests for smart contracts
  - [ ] CharacterNFT.sol: 10+ tests (mint, upgrade, level calculation, events)
  - [ ] CHSToken.sol: 8+ tests (mint, burn, authorization, max supply)
  - [ ] Marketplace.sol: 12+ tests (list, buy, cancel, fees, security)
- [ ] Enable ESLint rules progressively
  - [ ] Change rules to "warn" in .eslintrc.json
  - [ ] Fix @typescript-eslint/no-unused-vars warnings
  - [ ] Fix @typescript-eslint/no-explicit-any warnings
  - [ ] Enable prefer-const and fix
- [ ] Refactor LogLevel enum to const object (according to style guide)
- [ ] Add robust error handling in async functions
  - [ ] lib/combat.ts: calculateCombatStats
  - [ ] lib/skills.ts: data loading functions
  - [ ] All contract calls
- [ ] Security audit of contracts with Slither
- [ ] Optimize Marketplace.sol emergencyRecoverNFT (avoid expensive loop)

### Important Improvements (Medium Priority)

- [ ] Improve frontend test coverage (target: 60-80%)
  - [ ] Tests for lib/combat.ts
  - [ ] Tests for lib/contract.ts
  - [ ] Tests for lib/skills.ts
  - [ ] Tests for components/combat-board.tsx
- [ ] Replace `any` with appropriate interfaces
  - [ ] lib/combat.ts: define ItemData interface
  - [ ] Review all uses of any in the project
- [ ] Improve address validation using viem.isAddress
- [ ] Add additional error boundaries in critical components
- [ ] Document all functions with docstrings (Google style)
- [ ] Implement CI/CD with GitHub Actions
- [ ] Add monitoring and alerts (Sentry, structured logs)

### Performance Optimizations (Low Priority)

- [ ] Add useMemo and useCallback in heavy components
- [ ] Implement code splitting with dynamic imports
- [ ] Optimize bundle size with @next/bundle-analyzer
- [ ] Implement virtual scrolling for long NFT lists
- [ ] Refactor combat-board.tsx if it exceeds 500 lines

### Documentation

- [ ] Create API.md with contract documentation
- [ ] Document custom hooks
- [ ] Add usage examples in README
- [ ] Create contribution guide (CONTRIBUTING.md)

