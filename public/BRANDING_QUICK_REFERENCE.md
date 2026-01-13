# Chessnoth Branding - Quick Reference

> **Full documentation**: See `chessnoth_branding_specs.md` for complete details.

## 🎨 Color Palette

### Primary Colors
- **Arcane Blue** `#3B82F6` - Primary actions, highlights
- **Deep Blue** `#0F172A` - Main backgrounds
- **Dark Background** `#020617` - Global background

### Accent Colors
- **Noble Gold** `#FACC15` - Legendary items, rewards
- **Arcane Purple** `#7C3AED` - Magic, skills, epic items
- **Blood Red** `#DC2626` - Damage, danger, enemies
- **Emerald Green** `#22C55E` - Healing, success, uncommon items

## 🏆 Item Rarity Colors

| Rarity | Color | HEX | Tailwind Class |
|--------|-------|-----|----------------|
| Common | Gray | `#9CA3AF` | `border-gray-500 text-gray-500` |
| Uncommon | Green | `#22C55E` | `border-green-500 text-green-500` |
| Rare | Blue | `#3B82F6` | `border-blue-500 text-blue-500` |
| Epic | Purple | `#7C3AED` | `border-purple-500 text-purple-500` |
| Legendary | Gold | `#FACC15` | `border-yellow-500 text-yellow-500` |

**Usage in code:**
```typescript
import { rarityColors, rarityBgColors } from '@/lib/constants'

// For borders and text
className={rarityColors[item.rarity] || rarityColors.common}

// For backgrounds
className={rarityBgColors[item.rarity] || rarityBgColors.common}
```

## ✍️ Typography

- **Titles**: Cinzel (serif, uppercase)
- **Body**: Inter (sans-serif)

## 🎭 Visual Effects

- **Magic**: Blue/Purple glow (`#3B82F6` / `#7C3AED`)
- **Healing**: Green glow (`#22C55E`)
- **Damage**: Red flash (`#DC2626`)
- **Legendary**: Gold shimmer (`#FACC15`)

## 🎯 UI Guidelines

- **Dark mode by default**
- **Rounded corners**: 8-12px (`rounded-lg` to `rounded-xl`)
- **Glassmorphism**: Semi-transparent with backdrop blur
- **Minimal glow effects**: Blue or purple only
- **Consistent spacing**: 4px base unit

## 📐 Component Examples

### Button (Primary)
```tsx
<Button className="bg-blue-500 hover:bg-blue-600 text-white">
  Action
</Button>
```

### Item Card
```tsx
<Card className={`
  bg-slate-900/50 backdrop-blur-xl
  border ${rarityColors[item.rarity]}
  rounded-xl
`}>
  {/* Item content */}
</Card>
```

### Stat Display
```tsx
<div className="bg-slate-900/50 border border-yellow-500/30 rounded-lg px-3 py-2">
  <span className="text-yellow-400 font-bold">750</span>
  <span className="text-gray-300"> - </span>
  <span className="text-gray-200">120 ATK</span>
</div>
```

---

**For complete specifications, see `chessnoth_branding_specs.md`**
