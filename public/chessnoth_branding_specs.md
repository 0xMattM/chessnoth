# Chessnoth – Branding Board & Visual Style Guide

## Brand Overview
**Chessnoth** is a tactical fantasy RPG inspired by chess-like strategy, turn-based combat, and a dark yet elegant fantasy universe.

**Core Keywords**: Strategy, Fantasy, Tactical, Arcane, Precision, Power

The brand should feel **intelligent, serious, and epic**, avoiding cartoonish or overly grim tones.

---

## Color Palette

### Primary Colors
Used for main UI elements, highlights, and brand recognition.

| Name | Usage | HEX | RGB | HSL | Tailwind Class |
|------|-------|-----|-----|-----|----------------|
| **Arcane Blue** | Primary actions, highlights, magic effects | `#3B82F6` | `rgb(59, 130, 246)` | `hsl(217, 91%, 59%)` | `blue-500` |
| **Deep Blue** | Main backgrounds, dark surfaces | `#0F172A` | `rgb(15, 23, 42)` | `hsl(222, 47%, 11%)` | `slate-900` |
| **Steel Gray** | Structural UI elements, borders | `#1F2933` | `rgb(31, 41, 51)` | `hsl(210, 24%, 20%)` | Custom |
| **Dark Background** | Global background, deepest surfaces | `#020617` | `rgb(2, 6, 23)` | `hsl(222, 84%, 5%)` | `slate-950` |

### Secondary / Accent Colors
Used for effects, rarity, feedback, and emphasis.

| Name | Usage | HEX | RGB | HSL | Tailwind Class |
|------|-------|-----|-----|-----|----------------|
| **Noble Gold** | Legendary items, rewards, premium features | `#FACC15` | `rgb(250, 204, 21)` | `hsl(48, 96%, 53%)` | `yellow-400` |
| **Arcane Purple** | Magic, skills, corruption, epic items | `#7C3AED` | `rgb(124, 58, 237)` | `hsl(258, 90%, 58%)` | `violet-600` |
| **Blood Red** | Damage, danger, enemies, destructive actions | `#DC2626` | `rgb(220, 38, 38)` | `hsl(0, 73%, 50%)` | `red-600` |
| **Emerald Green** | Healing, success, uncommon items | `#22C55E` | `rgb(34, 197, 94)` | `hsl(142, 71%, 45%)` | `green-500` |

### Neutral Colors
Used for text and surfaces.

| Name | Usage | HEX | RGB | HSL | Tailwind Class |
|------|-------|-----|-----|-----|----------------|
| **Light Text** | Primary text, headings | `#E5E7EB` | `rgb(229, 231, 235)` | `hsl(220, 13%, 91%)` | `gray-200` |
| **Muted Text** | Secondary text, descriptions | `#9CA3AF` | `rgb(156, 163, 175)` | `hsl(215, 16%, 65%)` | `gray-400` |
| **Border Gray** | Borders, dividers | `#374151` | `rgb(55, 65, 81)` | `hsl(210, 20%, 27%)` | `gray-700` |

---

## Item Rarity Colors

These colors are used consistently across the application for item rarity indicators, borders, and text.

| Rarity | Color Name | HEX | RGB | Tailwind Border/Text Classes | Usage Example |
|--------|------------|-----|-----|----------------------------|---------------|
| **Common** | Steel Gray | `#9CA3AF` | `rgb(156, 163, 175)` | `border-gray-500 text-gray-500` | Basic items, standard equipment |
| **Uncommon** | Emerald Green | `#22C55E` | `rgb(34, 197, 94)` | `border-green-500 text-green-500` | Slightly enhanced items |
| **Rare** | Arcane Blue | `#3B82F6` | `rgb(59, 130, 246)` | `border-blue-500 text-blue-500` | Powerful items with special properties |
| **Epic** | Arcane Purple | `#7C3AED` | `rgb(124, 58, 237)` | `border-purple-500 text-purple-500` | Exceptional items with unique abilities |
| **Legendary** | Noble Gold | `#FACC15` | `rgb(250, 204, 21)` | `border-yellow-500 text-yellow-500` | Ultimate items, game-changing equipment |

### Rarity Color Implementation

**For borders and text:**
```typescript
const rarityColors = {
  common: 'border-gray-500 text-gray-500',
  uncommon: 'border-green-500 text-green-500',
  rare: 'border-blue-500 text-blue-500',
  epic: 'border-purple-500 text-purple-500',
  legendary: 'border-yellow-500 text-yellow-500',
}
```

**For background gradients (optional):**
```typescript
const rarityBgColors = {
  common: 'bg-gray-500/10',
  uncommon: 'bg-green-500/10',
  rare: 'bg-blue-500/10',
  epic: 'bg-purple-500/10',
  legendary: 'bg-yellow-500/10',
}
```

---

## Typography

### Display / Titles
Used for logo, headers, zones, bosses, and major UI sections.

**Recommended fonts:**
- **Cinzel** (Primary) - Serif, elegant, high contrast, fantasy-inspired
- Trajan Pro (Alternative)
- Uncial Antiqua (Alternative)

**Characteristics:**
- Serif font family
- Elegant and refined
- High contrast for readability
- Fantasy-inspired aesthetic
- Uppercase for titles and headers

**Implementation:**
```css
font-family: 'Cinzel', serif;
font-weight: 600-700;
letter-spacing: 0.05em;
text-transform: uppercase; /* for major titles */
```

### UI / Body Text
Used for menus, stats, descriptions, and general UI content.

**Recommended fonts:**
- **Inter** (Primary) - Modern, clean, highly readable
- Manrope (Alternative)
- Source Sans 3 (Alternative)

**Characteristics:**
- Sans-serif font family
- Clean and modern
- Excellent readability at all sizes
- Professional appearance

**Implementation:**
```css
font-family: 'Inter', sans-serif;
font-weight: 400-500; /* body */
font-weight: 600-700; /* headings */
```

### Numeric / Technical (Optional)
Used for stats, blockchain info, debugging, and technical displays.

**Recommended fonts:**
- **JetBrains Mono** (Primary)
- Space Mono (Alternative)

**Characteristics:**
- Monospace font family
- Clear number distinction
- Technical aesthetic

---

## Logo Usage

### Variants
- **Icon-only**: Sword + chessboard pattern (for favicons, small spaces)
- **Full logo**: Icon + "CHESSNOTH" wordmark (for headers, splash screens)

### Logo Description
- **Shield**: Black and white checkerboard pattern (chess-inspired)
- **Sword**: Ornate silver sword piercing vertically through shield
- **Hilt Details**: Golden hilt with glowing blue gem at crossguard
- **Wings**: Golden wings emanating from hilt sides
- **Wordmark**: "CHESSNOTH" in bold, golden, gothic-style font on banner
- **Effects**: Subtle blue particle glow around logo

### Guidelines
- Prefer dark backgrounds (Deep Blue `#0F172A` or Dark Background `#020617`)
- Subtle glow or light rim allowed (Arcane Blue `#3B82F6`)
- Never distort or rotate
- Do not apply heavy shadows or gradients
- Maintain aspect ratio
- Minimum size: 32px height for icon, 120px width for full logo

---

## Visual Style

### User Interface

**General Principles:**
- **Dark mode by default** - All UI uses dark backgrounds
- **Soft rounded corners** - 8-12px border radius (`rounded-lg` to `rounded-xl`)
- **Subtle glassmorphism** - Semi-transparent backgrounds with backdrop blur
- **Minimal glow effects** - Blue or purple glows for emphasis only
- **Consistent spacing** - 4px base unit (Tailwind spacing scale)

**Card Components:**
```css
background: rgba(15, 23, 42, 0.5); /* Deep Blue with transparency */
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 12px;
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
```

**Button Styles:**
- **Primary**: Arcane Blue background with hover glow
- **Secondary**: Transparent with border, hover fill
- **Ghost**: Transparent, hover background
- **Destructive**: Blood Red for dangerous actions

**Input Fields:**
- Dark background with subtle border
- Focus state: Arcane Blue border with glow
- Placeholder text: Muted Gray

### Characters & Units
- **Isometric perspective** - 3/4 view for depth
- **Clear silhouettes** - Prioritize shape over fine detail
- **Saturated but controlled colors** - Vibrant but not overwhelming
- **Semi-realistic fantasy style** - Between realistic and stylized

### Environments & Zones
- **Strong biome identity** - Each zone has distinct visual language
- **Stylized, not realistic** - Fantasy interpretation
- **Consistent lighting** - Unified lighting language across zones
- **Atmospheric effects** - Subtle fog, particles, lighting

---

## Visual Effects

| Effect Type | Color | Usage | Implementation |
|-------------|-------|-------|----------------|
| **Magic** | Arcane Blue `#3B82F6` / Arcane Purple `#7C3AED` | Spell effects, magical abilities | `box-shadow: 0 0 20px rgba(59, 130, 246, 0.5)` |
| **Healing** | Emerald Green `#22C55E` | Health restoration, positive effects | Soft green glow, upward particles |
| **Damage** | Blood Red `#DC2626` | Damage numbers, critical hits | Red flash, shake animation |
| **Legendary** | Noble Gold `#FACC15` | Legendary items, rare rewards | Gold shimmer, pulsing glow |
| **Hover** | Arcane Blue `#3B82F6` | Interactive elements | Subtle glow, scale transform |

**Animation Guidelines:**
- Keep animations subtle and purposeful
- Use easing functions (ease-in-out, ease-out)
- Duration: 200-300ms for interactions, 2-3s for ambient effects
- Avoid excessive particles or neon colors

---

## Iconography

### Style Guidelines
- **Clean geometric shapes** - Simple, recognizable forms
- **Inspired by runes, chess pieces, medieval symbols** - Thematic consistency
- **Consistent stroke width** - 2px for outlines, 1.5px for details
- **Designed for small sizes** - Readable at 16px minimum
- **Golden accents** - Use Noble Gold for important icons

### Core Icons
- **Sword** - Combat, attack, weapons
- **Shield** - Defense, protection, armor
- **Star/Gem** - Rewards, achievements, rarity
- **Chess Rook** - Strategy, positioning, tactics
- **Crown** - Leadership, prestige, legendary status
- **Diamond** - Currency, resources, value

### Icon Usage
- **16px**: Inline with text, small buttons
- **24px**: Standard UI icons, menu items
- **32px**: Card headers, section icons
- **48px+**: Feature highlights, hero sections

---

## UI Component Examples

### Button Styles

**Primary Button:**
```
Background: Arcane Blue (#3B82F6)
Text: White (#FFFFFF)
Border: None
Hover: Lighter blue with glow
Padding: 12px 24px
Border Radius: 8px
```

**Secondary Button:**
```
Background: Transparent
Text: Arcane Blue (#3B82F6)
Border: 1px solid Arcane Blue (#3B82F6)
Hover: Arcane Blue background
```

**Ghost Button:**
```
Background: Transparent
Text: Light Text (#E5E7EB)
Border: None
Hover: Subtle background (rgba(255, 255, 255, 0.1))
```

### Stat Display

**Format:**
```
[Icon] [Value] - [Stat Name]
Example: 💎 750 - 120 ATK
```

**Styling:**
- Dark background box with golden border
- Icon: 20px, colored by stat type
- Text: Light Text (#E5E7EB), bold for values
- Border: 1px solid, subtle glow

### Item Card

**Structure:**
```
┌─────────────────────┐
│ [Rarity Badge]      │
│                     │
│   [Item Image]      │
│                     │
│  Item Name          │
│  +Stat Bonus        │
│  Description        │
└─────────────────────┘
```

**Styling:**
- Background: Dark with glassmorphism
- Border: Colored by rarity (1px)
- Rarity Badge: Top-right corner, small, colored border
- Image: Aspect ratio 1:1, rounded corners
- Hover: Scale up (1.05), glow effect matching rarity

---

## Brand Voice

### Tone
- **Confident** - Assured and decisive
- **Strategic** - Thoughtful and calculated
- **Mysterious** - Intriguing but not cryptic
- **Respectful** - Treats players as intelligent

### Writing Style
- Clear and concise
- Avoid humor that breaks immersion
- Use fantasy terminology appropriately
- Maintain consistency in naming conventions

### Example Copy
- ✅ "Your tactical prowess will be tested."
- ✅ "The ancient blade hums with arcane energy."
- ❌ "LOL, you got rekt!" (too casual)
- ❌ "Click here for free stuff!" (breaks immersion)

---

## Brand Statement

> *Chessnoth is a dark fantasy tactical experience where every move matters. Master the art of strategic combat, collect legendary artifacts, and prove your dominance on the battlefield.*

---

## Implementation Checklist

### Colors
- [ ] Update CSS variables in `globals.css` to match palette
- [ ] Update Tailwind config with custom colors
- [ ] Create rarity color constants in shared file
- [ ] Apply colors consistently across components

### Typography
- [ ] Import Cinzel font for titles
- [ ] Import Inter font for body text
- [ ] Set up font families in CSS
- [ ] Apply typography classes consistently

### Components
- [ ] Update button variants with new colors
- [ ] Style cards with glassmorphism
- [ ] Apply rarity colors to item displays
- [ ] Add hover effects and animations

### Visual Effects
- [ ] Implement glow utilities
- [ ] Add animation classes
- [ ] Create effect components (damage, healing, etc.)
- [ ] Style stat displays

---

## Asset Organization (Recommended)

```
/public
  /branding
    /logo
      - logo-full.svg
      - logo-icon.svg
      - logo-favicon.ico
    /colors
      - color-palette.png
      - rarity-colors.png
    /fonts
      - cinzel-*.woff2
      - inter-*.woff2
    /ui
      - button-examples.png
      - card-examples.png
    /icons
      - sword.svg
      - shield.svg
      - star.svg
      - rook.svg
      - crown.svg
      - diamond.svg
```

---

## Color Accessibility

### Contrast Ratios (WCAG AA Minimum)
- **Light Text on Dark Background**: 4.5:1 ✅
- **Arcane Blue on Dark Background**: 4.5:1 ✅
- **Muted Text on Dark Background**: 4.5:1 ✅

### Color Blindness Considerations
- Rarity colors are distinguishable by brightness and pattern
- Icons supplement color coding
- Text labels accompany color indicators

---

**This document defines the visual and stylistic foundation of the Chessnoth universe. All design decisions should reference this guide for consistency.**

---

## Quick Reference

### Primary Colors
- Arcane Blue: `#3B82F6` (blue-500)
- Deep Blue: `#0F172A` (slate-900)
- Dark Background: `#020617` (slate-950)

### Rarity Colors
- Common: Gray `#9CA3AF` (gray-500)
- Uncommon: Green `#22C55E` (green-500)
- Rare: Blue `#3B82F6` (blue-500)
- Epic: Purple `#7C3AED` (violet-600)
- Legendary: Gold `#FACC15` (yellow-400)

### Typography
- Titles: Cinzel (serif, uppercase)
- Body: Inter (sans-serif)

### Effects
- Magic: Blue/Purple glow
- Healing: Green glow
- Damage: Red flash
- Legendary: Gold shimmer
