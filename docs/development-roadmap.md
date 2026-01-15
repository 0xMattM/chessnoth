# 🗺️ Development Roadmap

This document outlines the development roadmap for Chessnoth, including completed features, in-progress work, and future plans.

## Table of Contents

- [Current Status](#current-status)
- [Completed Features](#completed-features)
- [In Progress](#in-progress)
- [Short-Term Goals](#short-term-goals-q1-2026)
- [Mid-Term Goals](#mid-term-goals-q2-q3-2026)
- [Long-Term Vision](#long-term-vision-2027)
- [Technical Debt & Improvements](#technical-debt--improvements)

---

## Current Status

**Version:** 1.0 (MVP)  
**Status:** ✅ Fully playable on Mantle Sepolia Testnet  
**Deployment:** Live at [chessnoth.vercel.app](https://chessnoth.vercel.app)

**Key Metrics:**
- ✅ 270+ unit tests (96.3% pass rate)
- ✅ Perfect Slither security audit (10/10)
- ✅ 15,000+ lines of production code
- ✅ 3 smart contracts deployed and verified
- ✅ Full game loop implemented

---

## Completed Features

### Core Gameplay ✅

- [x] **Turn-based Combat System**
  - 8x8 tactical grid
  - Turn order based on speed
  - Deterministic combat calculations
  - Victory/defeat conditions

- [x] **Character Classes** (10 total)
  - Warrior, Mage, Archer, Assassin
  - Paladin, Monk, Healer, Dark Mage
  - Dwarf, Axe Thrower

- [x] **Progression System**
  - Level 1-100 scaling
  - Experience points system
  - On-chain character upgrades
  - Stat growth per level

- [x] **Equipment System**
  - 6 equipment slots per character
  - 5 item rarities (Common to Legendary)
  - Stat bonuses from equipment
  - Equipment management UI

- [x] **Skill System**
  - Skill trees per class
  - 4 equipped skills in combat
  - Skill points (1 per level)
  - Variety of skill types (damage, heal, buff, debuff)

- [x] **Terrain System**
  - Forest, Mountain, Water terrains
  - Movement cost modifiers
  - Stat bonuses from terrain
  - Strategic positioning mechanics

### Smart Contracts ✅

- [x] **CharacterNFT (ERC721)**
  - Full on-chain metadata
  - Level and experience tracking
  - Character progression
  - 80+ unit tests

- [x] **CHSToken (ERC20)**
  - Utility token implementation
  - Controlled minting system
  - Multiple authorized minters
  - 80+ unit tests

- [x] **Marketplace**
  - List/buy/cancel NFTs
  - Dual currency support (MNT/CHS)
  - Platform fee system
  - 100+ unit tests

### Web3 Integration ✅

- [x] Wallet connection (RainbowKit)
- [x] Mantle Network integration
- [x] Contract interaction via Wagmi
- [x] Transaction handling
- [x] Error handling and user feedback

### UI/UX ✅

- [x] Responsive design (mobile, tablet, desktop)
- [x] Modern UI with Tailwind CSS
- [x] Component library (Shadcn UI)
- [x] Loading states and error boundaries
- [x] Toast notifications

### Social Features ✅

- [x] **Friend System** (90% complete)
  - Add/remove friends
  - Friend requests (send, accept, reject)
  - Friend list display
  - Friend stats tracking

- [x] **User Profiles** (90% complete)
  - Public profile pages
  - Profile editing
  - Stats tracking (level, battles, CHS)
  - Privacy settings
  - Referral codes

- [x] **Guild System** (100% complete)
  - Create/join guilds
  - Guild management
  - Guild leaderboards
  - **Guild bonuses** (10-15% rewards)
  - Auto-update guild stats after battles
  - Guild detail pages

### Content ✅

- [x] 30+ PvE stages
- [x] Boss battles every 10 stages
- [x] Progressive difficulty scaling
- [x] Enemy variety (Goblins, Undead, Beasts, Dark Cultists)

### Retention Systems ✅

- [x] Daily quests
- [x] Daily rewards with streaks
- [x] Global leaderboards
- [x] Achievement system basics

---

## In Progress

### Testing & Quality

- [ ] **Frontend Test Coverage** (Target: 60-80%)
  - [ ] Combat system tests
  - [ ] Skill system tests
  - [ ] Reward system tests
  - Current: 34+ tests passing

- [ ] **Documentation Completion**
  - [x] Architecture documentation
  - [x] API reference
  - [x] Game mechanics guide
  - [x] Smart contract docs
  - [x] Deployment guide
  - [x] Contributing guide
  - [ ] Video tutorials

### Polish

- [ ] **UI Improvements**
  - [ ] Battle win animations
  - [ ] Level up celebrations
  - [ ] Improved transitions
  - [ ] Enhanced loading states

- [ ] **Onboarding**
  - [ ] Interactive tutorial
  - [ ] Tooltips for new users
  - [ ] Help/FAQ section

---

## Short-Term Goals (Q1 2026)

### PvP System

**Priority:** 🔥🔥🔥 Critical

- [ ] **Matchmaking System**
  - [ ] ELO-based ranking
  - [ ] Queue system
  - [ ] Match history

- [ ] **PvP Combat**
  - [ ] Turn-based PvP battles
  - [ ] Team validation
  - [ ] Reward distribution

- [ ] **Ranking System**
  - [ ] Global leaderboard
  - [ ] Seasonal rankings
  - [ ] Rank tiers (Bronze to Diamond)

**Timeline:** 2-3 months  
**Estimated Effort:** High

### Enhanced Token Economy

**Priority:** 🔥🔥 High

- [ ] **Referral System**
  - [ ] Generate referral codes
  - [ ] Track referrals
  - [ ] Reward distribution (5% CHS bonus)

- [ ] **Milestone Rewards**
  - [ ] Achievement-based bonuses
  - [ ] First-time rewards
  - [ ] Streak bonuses

- [ ] **Community Events**
  - [ ] Seasonal events
  - [ ] Special boss battles
  - [ ] Limited-time rewards

**Timeline:** 1 month  
**Estimated Effort:** Medium

### Bug Fixes & Optimization

**Priority:** 🔥 Medium

- [ ] Fix known minor bugs
- [ ] Performance optimizations
- [ ] Gas cost optimization
- [ ] Mobile UX improvements

---

## Mid-Term Goals (Q2-Q3 2026)

### Game Engine Migration

**Priority:** 🔥🔥 High

- [ ] **Select Engine**
  - Evaluate: Phaser.js, Unity WebGL, Godot
  - Decision based on: Performance, Web3 support, Learning curve

- [ ] **Migration Plan**
  - [ ] Migrate combat system
  - [ ] Add character animations
  - [ ] Implement skill VFX
  - [ ] Add sound effects and music

- [ ] **Enhanced Visuals**
  - [ ] Character sprites with animations
  - [ ] Skill effect animations
  - [ ] Environmental effects
  - [ ] UI polish

**Timeline:** 3-4 months  
**Estimated Effort:** Very High

### Mobile App Development

**Priority:** 🔥🔥 High

**Approach:** React Native (code reuse) or Native (better performance)

- [ ] **Mobile UI Design**
  - [ ] Touch-optimized controls
  - [ ] Mobile-first layouts
  - [ ] Gesture support

- [ ] **Platform Development**
  - [ ] iOS app
  - [ ] Android app
  - [ ] App store submission

- [ ] **Features**
  - [ ] Full feature parity with web
  - [ ] Offline mode (limited)
  - [ ] Push notifications

**Timeline:** 3-4 months  
**Estimated Effort:** Very High

### Scholarship System (RWA Integration)

**Priority:** 🔥 Medium-High

- [ ] **Smart Contract Development**
  - [ ] NFT lending contract
  - [ ] Revenue sharing logic
  - [ ] Escrow mechanism

- [ ] **Frontend**
  - [ ] Scholar marketplace
  - [ ] Guild owner dashboard
  - [ ] Earnings tracking

- [ ] **Features**
  - [ ] Lend character NFTs
  - [ ] Automated revenue split
  - [ ] Performance tracking
  - [ ] Contract termination

**Timeline:** 2 months  
**Estimated Effort:** High

### Account Abstraction

**Priority:** 🔥🔥 High

**Goal:** Remove Web3 friction for new players

- [ ] **Implementation**
  - [ ] Social login (Google, Twitter)
  - [ ] Sponsored transactions
  - [ ] Progressive ownership

- [ ] **User Flow**
  - [ ] Play without wallet first
  - [ ] Earn NFTs/tokens
  - [ ] Claim ownership later

**Timeline:** 2-3 months  
**Estimated Effort:** High

---

## Long-Term Vision (2027+)

### Advanced Features

- [ ] **Guild Tournaments**
  - Team-based competitions
  - Guild vs Guild battles
  - Seasonal championships
  - Prize pools

- [ ] **Expanded Content**
  - 100+ PvE stages
  - New character classes
  - New enemy types
  - Story campaign mode

- [ ] **Cosmetic NFTs**
  - Character skins
  - Custom animations
  - UI themes
  - Profile customization

- [ ] **Seasonal Content**
  - Limited-time events
  - Seasonal rankings
  - Exclusive rewards
  - New mechanics

### Governance

- [ ] **DAO Implementation**
  - Governance token
  - Proposal system
  - Community voting
  - Treasury management

- [ ] **Community Features**
  - User-created content
  - Custom tournaments
  - Community moderators

### Scaling

- [ ] **Backend Infrastructure**
  - Node.js API server
  - PostgreSQL database
  - Redis caching
  - WebSocket for real-time

- [ ] **Cross-Chain**
  - Deploy to multiple L2s
  - Bridge infrastructure
  - Multi-chain support

- [ ] **Performance**
  - Event indexing (The Graph)
  - Optimized queries
  - CDN optimization

---

## Technical Debt & Improvements

### Critical

- [ ] **Code Quality**
  - [ ] Fix ESLint warnings progressively
  - [ ] Replace `any` types with proper interfaces
  - [ ] Add docstrings to all functions
  - [ ] Refactor large components (>500 lines)

- [ ] **Error Handling**
  - [ ] Robust error handling in async functions
  - [ ] Better error messages for users
  - [ ] Logging and monitoring (Sentry)

- [ ] **Testing**
  - [ ] Increase frontend test coverage
  - [ ] Add E2E tests (Playwright/Cypress)
  - [ ] Integration tests for contracts

### Important

- [ ] **Performance**
  - [ ] Add useMemo/useCallback where needed
  - [ ] Implement code splitting
  - [ ] Optimize bundle size
  - [ ] Virtual scrolling for long lists

- [ ] **Documentation**
  - [ ] Document all custom hooks
  - [ ] Add code examples to docs
  - [ ] Create video tutorials
  - [ ] API documentation

- [ ] **CI/CD**
  - [ ] GitHub Actions workflows
  - [ ] Automated testing
  - [ ] Automated deployment
  - [ ] Code quality checks

### Low Priority

- [ ] Refactor LogLevel enum to const object
- [ ] Improve address validation with viem.isAddress
- [ ] Optimize Marketplace.sol emergencyRecoverNFT
- [ ] Bundle analyzer integration

---

## Task Tracking

### Current Sprint

Focus areas for this development cycle:

1. **Complete Social Features** (90% → 100%)
   - Finish profile features
   - Polish friend system
   - Add friend activity feed

2. **Documentation** (80% → 100%)
   - Complete video tutorials
   - Add more code examples
   - Create troubleshooting guide

3. **Bug Fixes**
   - Address known minor issues
   - Improve mobile experience
   - Fix edge cases

### Next Sprint

1. PvP System foundation
2. Enhanced token economy
3. Mobile optimization

---

## Contributing

Want to help with development? See our [Contributing Guide](./contributing.md) for:
- How to pick up tasks
- Development workflow
- Code standards
- Pull request process

---

## Notes

- Priorities may shift based on user feedback
- Timeline estimates are approximate
- Features may be added or removed based on technical feasibility
- Community input is welcome via GitHub Discussions

---

**Last Updated:** January 2026

For detailed task tracking, see `TASKS.md` in the project root.
