# 🤝 Contributing to Chessnoth

Thank you for considering contributing to Chessnoth! This document provides guidelines and instructions for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors.

### Expected Behavior

- **Be respectful** - Treat all contributors with respect
- **Be collaborative** - Work together to improve the project
- **Be constructive** - Provide helpful feedback
- **Be professional** - Keep discussions focused and productive

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Spam or off-topic content
- Violation of privacy

---

## Getting Started

### Prerequisites

- Node.js 18+
- Git
- Basic knowledge of TypeScript/React
- Understanding of Web3 concepts (helpful but not required)

### Fork and Clone

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Chessnoth.git
   cd Chessnoth
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/Chessnoth.git
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Create `.env.local`:**
   ```env
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourAddress
   NEXT_PUBLIC_CHS_TOKEN_ADDRESS=0xYourAddress
   NEXT_PUBLIC_MARKETPLACE_ADDRESS=0xYourAddress
   ```

6. **Run development server:**
   ```bash
   npm run dev
   ```

### Finding Issues to Work On

Look for issues labeled:
- `good first issue` - Perfect for newcomers
- `help wanted` - Contributions welcome
- `bug` - Bug fixes needed
- `enhancement` - New features

---

## Development Workflow

### 1. Create a Branch

Always create a new branch for your changes:

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 2. Make Changes

- Make your changes in the appropriate files
- Follow the [Coding Standards](#coding-standards)
- Test your changes thoroughly
- Add tests for new features

### 3. Commit Changes

Use clear, descriptive commit messages:

```bash
# Stage changes
git add .

# Commit with meaningful message
git commit -m "Add: Brief description of changes"
```

**Commit Message Format:**
```
Type: Brief description (50 chars max)

Longer description if needed (72 chars per line)

- Bullet points for details
- Why the change was made
- Any breaking changes
```

**Types:**
- `Add:` New feature
- `Fix:` Bug fix
- `Update:` Changes to existing feature
- `Refactor:` Code refactoring
- `Docs:` Documentation changes
- `Test:` Adding or updating tests
- `Chore:` Maintenance tasks

### 4. Push Changes

```bash
# Push to your fork
git push origin feature/your-feature-name
```

### 5. Create Pull Request

1. Go to your fork on GitHub
2. Click "Pull Request"
3. Fill in the PR template
4. Wait for review

---

## Coding Standards

### TypeScript/React

**General Guidelines:**
- Use TypeScript for type safety
- Use functional components (no class components)
- Use hooks for state management
- Follow existing code patterns

**Naming Conventions:**
```typescript
// Files: kebab-case
my-component.tsx
use-my-hook.ts

// Components: PascalCase
export function MyComponent() {}

// Functions: camelCase
function calculateDamage() {}

// Constants: SCREAMING_SNAKE_CASE
const MAX_TEAM_SIZE = 4

// Interfaces: PascalCase with 'I' prefix (optional)
interface ICharacterStats {}
// Or without prefix
interface CharacterStats {}
```

**Code Style:**
```typescript
// ✅ Good
function calculateDamage(
  attacker: CombatCharacter,
  defender: CombatCharacter
): number {
  const baseDamage = attacker.stats.atk
  const defense = defender.stats.def
  return Math.max(1, baseDamage - defense)
}

// ❌ Bad
function calcDmg(a,d){return a.atk-d.def;}
```

### Smart Contracts (Solidity)

**Guidelines:**
- Follow Solidity style guide
- Use OpenZeppelin contracts where possible
- Add NatSpec comments
- Include unit tests for all functions

**Example:**
```solidity
/// @notice Mints a new character NFT
/// @param to Address that will receive the NFT
/// @param characterClass Class of the character
/// @return tokenId ID of the minted token
function mintCharacter(
    address to,
    string memory characterClass
) external onlyAuthorizedMinter returns (uint256) {
    require(to != address(0), "Invalid address");
    // ... implementation
}
```

### File Organization

```
project/
├── app/                    # Next.js pages
├── components/             # React components
│   ├── ui/                # Reusable UI components
│   └── [feature]/         # Feature-specific components
├── lib/                    # Utility libraries
│   ├── combat.ts          # Combat logic
│   ├── utils.ts           # General utilities
│   └── types.ts           # Type definitions
├── hooks/                  # Custom React hooks
├── contracts/              # Solidity contracts
└── test/                   # Contract tests
```

### Component Structure

```typescript
// 1. Imports
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { calculateDamage } from '@/lib/combat'

// 2. Types/Interfaces
interface MyComponentProps {
  character: Character
  onAction: (action: Action) => void
}

// 3. Component
export function MyComponent({ character, onAction }: MyComponentProps) {
  // 4. Hooks
  const [state, setState] = useState()

  // 5. Functions
  function handleClick() {
    // ...
  }

  // 6. Render
  return (
    <div>
      {/* Component JSX */}
    </div>
  )
}
```

---

## Submitting Changes

### Pull Request Guidelines

**Before Submitting:**
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Lint check passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] All tests pass (`npm run test`)

**PR Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All existing tests pass
- [ ] New tests added
- [ ] Tested on browser: [Chrome/Firefox/Safari]
- [ ] Mobile tested: [Yes/No]

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Commented complex code
- [ ] Documentation updated
- [ ] No new warnings
```

### Review Process

1. **Automated Checks** - CI runs linting and tests
2. **Code Review** - Maintainer reviews code
3. **Feedback** - Address review comments
4. **Approval** - PR approved by maintainer
5. **Merge** - PR merged to main branch

### After Merge

- Delete your feature branch
- Update your fork's main branch
- Close related issues

---

## Testing Guidelines

### Frontend Tests

**Unit Tests:**
```typescript
// Example: lib/combat.test.ts
import { calculateDamage } from './combat'

describe('calculateDamage', () => {
  it('should calculate basic damage correctly', () => {
    const attacker = { stats: { atk: 50 } }
    const defender = { stats: { def: 20 } }
    const damage = calculateDamage(attacker, defender)
    expect(damage).toBeGreaterThan(0)
  })

  it('should apply minimum damage', () => {
    const attacker = { stats: { atk: 10 } }
    const defender = { stats: { def: 100 } }
    const damage = calculateDamage(attacker, defender)
    expect(damage).toBeGreaterThanOrEqual(1)
  })
})
```

**Run Tests:**
```bash
# Run all tests
npm run test

# Run specific test file
npm run test combat.test.ts

# Run with coverage
npm run test:coverage
```

### Smart Contract Tests

**Test Structure:**
```javascript
const { expect } = require('chai')

describe('CharacterNFT', function () {
  let characterNFT
  let owner, addr1

  beforeEach(async function () {
    // Setup
    [owner, addr1] = await ethers.getSigners()
    const CharacterNFT = await ethers.getContractFactory('CharacterNFT')
    characterNFT = await CharacterNFT.deploy()
  })

  it('Should mint a character', async function () {
    await characterNFT.mintCharacter(addr1.address, 'warrior', 'Test')
    const balance = await characterNFT.balanceOf(addr1.address)
    expect(balance).to.equal(1)
  })
})
```

**Run Contract Tests:**
```bash
# Run all contract tests
npm run test

# Run specific test
npx hardhat test test/CharacterNFT.test.js

# With gas reporting
REPORT_GAS=true npm run test
```

---

## Documentation

### Code Documentation

**TypeScript Functions:**
```typescript
/**
 * Calculates damage dealt by attacker to defender
 * 
 * @param attacker - Character dealing damage
 * @param defender - Character receiving damage
 * @param damageMultiplier - Skill damage multiplier (default: 1.0)
 * @returns Final damage value after calculations
 */
export function calculateDamage(
  attacker: CombatCharacter,
  defender: CombatCharacter,
  damageMultiplier: number = 1.0
): number {
  // Implementation
}
```

**Solidity Contracts:**
```solidity
/// @title Character NFT Contract
/// @author Your Name
/// @notice This contract manages character NFTs with on-chain progression
/// @dev Implements ERC721 with custom metadata
contract CharacterNFT is ERC721, Ownable {
    // Implementation
}
```

### Documentation Files

When adding features, update relevant docs:
- `README.md` - If feature affects setup
- `docs/architecture.md` - If structure changes
- `docs/game-mechanics.md` - If gameplay changes
- `docs/api-reference.md` - If API changes

---

## Common Tasks

### Adding a New Character Class

1. Create class data file: `data/classes/my-class.json`
2. Create skills file: `data/skills/my-class.json`
3. Add class to `lib/constants.ts`
4. Add unit tests
5. Update documentation

### Adding a New Skill

1. Add skill definition to `data/skills/[class].json`
2. Update skill processing in `lib/combat.ts` (if special effect)
3. Add tests for skill
4. Update `docs/game-mechanics.md`

### Adding a New Component

1. Create component file: `components/my-component.tsx`
2. Add TypeScript types
3. Add to appropriate page/parent component
4. Test on different screen sizes
5. Add to component documentation

---

## Getting Help

### Resources

- **Documentation:** See `docs/` folder
- **GitHub Issues:** Search existing issues
- **Discussions:** GitHub Discussions tab

### Questions?

- Open a GitHub Discussion
- Tag maintainers in issues
- Be patient and respectful

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation (for major contributions)

---

**Thank you for contributing to Chessnoth!** 🎮⚔️

Your contributions help make blockchain gaming better for everyone.
