# 🎯 UI/UX + Motion Skills (Clean, Minimal, Dual Theme)

## 🎯 Objective

Build a clean, modern, and premium interface using a cool-toned palette. Focus on readability, spacing, subtle motion, and consistency. Avoid flashy visuals.

---

# 🎨 Color System (STRICT)

## Palette

- Dark Base: #212A31
- Surface: #2E3944
- Accent: #124E66
- Muted: #748D92
- Light: #D3D9D4

No gradients. No glow effects.

---

# 🌙 Dark Mode (Primary Theme)

## Colors

- Background: #212A31
- Surface: #2E3944
- Surface Hover: #374550
- Primary: #124E66
- Text Primary: #D3D9D4
- Text Secondary: #748D92
- Border: rgba(255,255,255,0.08)

## Rules

- Use layered dark tones (not pure black)
- Cards must be distinguishable from background
- Maintain strong text contrast

---

# 🌞 Light Mode (Derived Theme)

## Colors

- Background: #F5F7F6
- Surface: #FFFFFF
- Surface Alt: #EEF2F3
- Primary: #124E66
- Primary Hover: #0F3F52
- Text Primary: #212A31
- Text Secondary: #748D92
- Border: rgba(0,0,0,0.08)

## Rules

- Avoid pure white backgrounds for the entire page
- Use white only for cards
- Maintain strong readability
- Keep UI minimal and uncluttered

---

# 🧊 Surface & Depth System

- Background → base layer
- Surface → cards and containers
- Hover → slightly elevated version of surface

## Implementation

- Use subtle borders instead of heavy shadows
- Light mode: soft shadow + border
- Dark mode: border + slight brightness change

---

# 🧠 Visual Hierarchy

Use:

- spacing
- font size
- font weight

Avoid:

- too many colors
- excessive highlights

---

# 🎬 Motion System (SUBTLE ONLY)

## Rules

- Duration: 150ms – 250ms
- Use only:
  - opacity
  - transform (translate, scale)

- Avoid large or distracting animations

## Interactions

### Cards

- hover:
  - translateY(-2px)
  - slight brightness increase

### Buttons

- hover:
  - darken background

- active:
  - scale(0.97)

### Lists / Grids

- staggered fade-in (small delay between items)

### Page Load

- fade in + slight upward motion

---

# 🔘 Buttons

## Primary

- Background: #124E66
- Text: white
- Hover: darker shade
- Rounded corners
- Subtle transition

## Secondary

- Transparent background
- Border: muted color
- Text: primary text color

---

# 🧱 Cards

- Background: surface color
- Border: subtle
- Rounded corners (lg or xl)
- Padding: consistent

## Hover

- slight lift (translateY)
- small contrast increase

---

# 🔤 Typography

- Use clean sans-serif font

- Maintain hierarchy:

  Heading:
  - bold
  - high contrast

  Body:
  - readable
  - medium contrast

  Secondary:
  - muted color

- Avoid very light text

---

# 📊 Data Visualization

- Use primary color (#124E66) for main data
- Use muted color (#748D92) for secondary
- Animate charts on load (subtle)
- Add hover feedback

---

# 📱 Layout & Spacing

- Use consistent spacing scale (8px system)
- Keep sections well separated
- Avoid cramped layouts
- Use max-width containers

---

# 🌗 Theming Rules

- Maintain consistent structure across themes
- Do not invert colors blindly
- Preserve accent color across both modes
- Ensure accessibility and contrast

---

# ⚡ Performance Rules

- Use transform + opacity only
- Avoid layout-shifting animations
- Keep animations lightweight

---

# ❌ Forbidden

- gradients
- glow effects
- heavy shadows
- over-animation
- inconsistent spacing
- low-contrast text

---

# ✅ Output Expectations

Generated UI MUST:

- follow defined color system
- support both light and dark modes
- include subtle animations
- be responsive
- use reusable components
- maintain clean and modern design

---

# 🧩 Design Philosophy

- Calm over flashy
- Clarity over decoration
- Consistency over creativity
- Subtle motion over dramatic effects

The UI should feel:

- smooth
- minimal
- professional
- easy to use
