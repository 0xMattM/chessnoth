# Chessnoth - Project Planning & Architecture

## Project Overview

Chessnoth is a tactical RPG NFT game built on Next.js 14 with Web3 integration. Players can mint character NFTs, build teams, and engage in tactical combat battles.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI**: React 18, Tailwind CSS, Shadcn UI, Radix UI
- **Web3**: Wagmi, Viem, RainbowKit
- **Blockchain**: Conflux eSpace Testnet
- **State Management**: React Query (TanStack Query)
- **Smart Contracts**: Hardhat, Solidity

## Architecture Principles

### Code Organization

- **Maximum file size**: 500 lines of code
- **Modular structure**: Features grouped by responsibility
- **Clear separation**: UI components, business logic, utilities, and data access layers

### File Structure

```
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Mint NFT page
│   ├── characters/        # Character management
│   ├── team/              # Team selection
│   ├── battle/            # Battle selection
│   ├── combat/             # Combat system
│   └── items/             # Items preview
├── components/            # Reusable React components
│   ├── ui/               # Shadcn UI components
│   └── *.tsx             # Feature components
├── lib/                  # Business logic and utilities
│   ├── contract.ts       # Contract ABI and Web3 utilities
│   ├── logger.ts         # Logging system
│   ├── env.ts            # Environment validation
│   ├── constants.ts      # Application constants
│   └── *.ts              # Feature-specific logic
├── data/                 # Static data (JSON files)
│   ├── skills/           # Skill definitions per class
│   └── items.json        # Item definitions
└── tests/                # Unit tests (mirrors app structure)
```

### TypeScript Conventions

- **Interfaces over types**: Prefer interfaces for object shapes
- **No enums**: Use maps or const objects instead
- **Strict mode**: Always enabled
- **No `any`**: Use `unknown` or proper types
- **Functional programming**: Prefer functions over classes

### Component Patterns

- **Server Components by default**: Use RSC unless Web APIs are needed
- **Minimal `use client`**: Only for interactive components
- **Suspense boundaries**: Wrap async components
- **Error boundaries**: Catch and handle React errors gracefully

### Error Handling

- **Logger utility**: Use `logger` instead of `console.log`
- **Error boundaries**: Wrap app sections
- **User-friendly messages**: Show actionable error messages
- **Development details**: Show stack traces only in dev mode

### Environment Variables

- **Validation**: Always validate env vars at startup
- **Type safety**: Use `lib/env.ts` for type-safe access
- **Documentation**: Document all required vars in README

### Testing Strategy

- **Unit tests**: For all utility functions and business logic
- **Test location**: `/tests` folder mirroring app structure
- **Coverage**: Aim for 80%+ coverage on critical paths
- **Test cases**: Expected use, edge cases, failure cases

### Code Quality

- **ESLint**: Configured with TypeScript rules
- **Prettier**: Consistent code formatting
- **No magic numbers**: Use constants from `lib/constants.ts`
- **Documentation**: Docstrings for all functions (Google style)

## Key Features

### 1. NFT Minting
- Mint character NFTs with metadata
- IPFS integration for metadata storage
- Generation and class tracking

### 2. Character Management
- View owned NFTs
- Equipment management
- Skill trees per class

### 3. Team Building
- Select up to 4 characters
- Team validation
- Persistent team state

### 4. Combat System
- Turn-based tactical combat
- Terrain system
- Skill usage
- Item consumption

## Development Workflow

1. **Read PLANNING.md** before starting new features
2. **Check TASKS.md** for current tasks
3. **Create feature branch** from main
4. **Write tests** alongside implementation
5. **Update documentation** as needed
6. **Mark tasks complete** in TASKS.md

## Deployment

- **Environment**: Vercel (recommended) or similar
- **Build**: `npm run build`
- **Environment variables**: Set in deployment platform
- **Contract**: Deploy to Conflux eSpace Testnet (or Mainnet)

## Security Considerations

- **Private keys**: Never commit to git
- **Environment variables**: Validate at runtime
- **Contract interactions**: Validate addresses and inputs
- **User input**: Sanitize and validate all inputs
- **Error messages**: Don't expose sensitive information

## Performance

- **Image optimization**: Use Next.js Image component
- **Code splitting**: Dynamic imports for large components
- **Caching**: Use React Query for data caching
- **Bundle size**: Monitor and optimize

## Future Enhancements

- [ ] Battle history and replays
- [ ] Leaderboards
- [ ] Guild system
- [ ] Marketplace for NFTs
- [ ] Mobile app
- [ ] Multiplayer battles

