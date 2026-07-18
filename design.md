# SIVANAND — Portfolio Website Design System
**Codename: SILENT PREMIUM**

---

## 🎯 Design Intent

> "Impressed. Premium. Easy to understand. Silent attitude."

The site should feel like walking into a high-end studio at 2AM — dark, confident, quietly powerful. No shouting. No clutter. Just work that speaks. The visitor should feel slightly intimidated but completely drawn in.

**One word: AUTHORITY.**

---

## 🎨 Color System

### Primary Palette — Navy Mirage
```
--bg-deep:        #0B0F1A   /* Deepest background — almost black navy */
--bg-mid:         #141E30   /* Section backgrounds */
--bg-surface:     #1C2B45   /* Card surfaces */
--blue-mid:       #35577D   /* Mid blue — borders, accents */
--blue-glow:      #4A7FA5   /* Glow color, hover states */
--blue-bright:    #6BA3C8   /* Active elements, highlights */
```

### Text
```
--text-primary:   #F0F4F8   /* Main text — not pure white, softer */
--text-secondary: #8BA3BC   /* Subtext, descriptions */
--text-muted:     #4A6080   /* Labels, metadata */
```

### Accents
```
--accent-glow:    #4A7FA5   /* Blue glow on dark */
--accent-line:    #35577D   /* Decorative lines */
--accent-glass:   rgba(53, 87, 125, 0.15)   /* Glassmorphism fill */
--accent-border:  rgba(107, 163, 200, 0.2)  /* Glass borders */
```

### Never Use
- Pure white (#FFFFFF) — too harsh
- Pure black (#000000) — too flat
- Any warm tones (red, orange, yellow)
- Purple or pink — doesn't fit this palette

---

## 🔤 Typography

### Display Font — Headlines
**Font: "Bebas Neue"** (Google Fonts)
- Used for: Name, section titles, hero text
- Style: All caps, wide tracking
- Sizes: 96px hero → 48px sections → 32px subsections
- Letter spacing: 0.05em to 0.1em

### Body Font — Content
**Font: "DM Sans"** (Google Fonts)
- Used for: All body text, descriptions, nav
- Style: Clean, geometric, readable
- Sizes: 16px body → 14px secondary → 12px labels
- Weight: 300 for body, 500 for emphasis

### Accent Font — Labels & Tags
**Font: "Space Mono"** (Google Fonts)
- Used for: Tags, technical labels, code-style elements
- Style: Monospace, technical feel
- Size: 11px–13px, letter-spacing: 0.15em

---

## 🪟 Glassmorphism System

All cards and panels use this treatment:

```css
.glass-card {
  background: rgba(28, 43, 69, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(107, 163, 200, 0.15);
  border-radius: 16px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(107, 163, 200, 0.1);
}
```

**Variations:**
- `.glass-card--light` → 0.4 opacity, used for hover states
- `.glass-card--dark` → 0.8 opacity, used for nav/footer
- `.glass-pill` → border-radius: 100px, for tags and labels

---

## ✨ Visual Effects

### Noise Texture Overlay
Subtle grain over everything — adds premium tactile feel:
```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,..."); /* noise SVG */
  opacity: 0.03;
  pointer-events: none;
  z-index: 9999;
}
```

### Blue Glow Orbs
Two large blurred circles as background atmosphere:
- Orb 1: Top right — `#35577D`, 600px, blur 150px, opacity 0.3
- Orb 2: Bottom left — `#141E30`, 500px, blur 120px, opacity 0.4

### Circuit Line Decorations (from moodboard Image 1)
Thin `1px` lines with dot connectors — purely decorative, placed in corners of sections. Color: `#35577D` at 30% opacity.

### Horizontal Rule Style
```css
hr {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, #35577D, transparent);
}
```

---

## 🧱 Layout System

### Grid
- Max width: `1200px`
- Padding: `80px` desktop → `24px` mobile
- Column gap: `24px`
- Section padding: `120px` top/bottom

### Spacing Scale
```
4px / 8px / 16px / 24px / 32px / 48px / 64px / 96px / 120px
```

### Border Radius Scale
```
4px — small tags
8px — buttons
16px — cards
24px — large panels
100px — pills
```

---

## 🖱️ Interactions & Motion

### Philosophy
Slow and deliberate. Nothing bouncy. Everything slides, fades, or glows.

### Page Load
- Hero text: fade in + slide up, 0.8s ease-out, staggered 0.15s between lines
- Nav: fade in from top, 0.6s
- Background orbs: scale from 0.8 to 1, 1.2s ease-out

### Scroll Animations
- Sections: fade in + translateY(30px) → translateY(0), triggered at 80% viewport
- Cards: staggered reveal, 0.1s delay between each

### Hover States
- Cards: `border-color` brightens + subtle `box-shadow` glow in blue
- Buttons: background shifts from transparent to `--blue-mid`, 0.3s
- Nav links: underline slides in from left, color shifts to `--blue-bright`
- Images: slight scale(1.02), 0.4s ease

### Cursor
Custom cursor — small circle that follows mouse, changes to larger ring on hoverable elements.

---

## 📐 Section Structure

### 1. Navigation
- Fixed top, glass dark background
- Logo: "SIVANAND" in Bebas Neue, 20px
- Links: DM Sans 14px, muted color → bright on hover
- CTA button: Glass pill — "Let's Talk"

### 2. Hero Section
- Full viewport height
- Left-aligned text layout
- Line 1: "CREATIVE" — 96px Bebas Neue, muted
- Line 2: "DIRECTOR" — 96px Bebas Neue, bright white
- Line 3: "& VIDEO PRODUCER" — 32px DM Sans, blue-bright
- Subtext: One line tagline, muted
- CTA: Two buttons — "View Work" (filled glass) + "Download CV" (outline)
- Right side: Abstract geometric shape or headshot with glass frame
- Bottom: Scrolling marquee of skills — "VIDEO PRODUCTION · AI CONTENT · GRAPHIC DESIGN · WEB DEV · FASHION PHOTOGRAPHY ·"

### 3. About Section
- Two column — text left, visual right
- Visual: Headshot in clipped glass frame with circuit decoration
- Stats row: Years exp / Projects / Skills / Tools
- Each stat in a glass pill

### 4. Services Section
- Section label: "WHAT I DO" in Space Mono
- 6 glass cards in 3x2 grid
- Each card: Icon (line art) + Service name + Short description + Starting price
- Hover: card lifts, border glows

### 5. Work Showcase
- Section label: "SELECTED WORK"
- Featured project: Full width glass card with video embed area
- Below: 3-column grid of project cards
- Each card: Project image/video → title → tags → hover reveals description

### 6. AI Fashion Gallery
- Section label: "AI FASHION PHOTOGRAPHY"
- Masonry-style grid of 4-6 images
- Subtle caption on hover — glassmorphism tooltip

### 7. Tools & Skills
- Horizontal scrolling strip
- Each tool in a glass pill with subtle icon
- Auto-scrolling marquee, pauses on hover

### 8. Contact / CTA
- Dark full-width section
- Large: "LET'S BUILD SOMETHING." in Bebas Neue
- Email as large clickable text
- Social links as glass pills
- "Available for work" status indicator — small green dot + text

### 9. Footer
- Minimal — name, copyright, back to top button

---

## 📱 Responsive Breakpoints

```
Mobile:   < 768px   — single column, reduced font sizes
Tablet:   768–1024px — 2 columns, medium spacing
Desktop:  > 1024px  — full layout as described
```

---

## 🚫 Design Anti-Rules

Things that should NEVER appear on this site:
- Bright or warm colors
- Comic Sans or any playful font
- Centered hero text (left-aligned only)
- Stock photo backgrounds
- Gradient text effects (overused, looks cheap)
- More than 3 font weights per font
- Animations faster than 0.3s
- Anything that feels "template-ish"

---

## ✅ The Feeling Checklist

Before shipping, every section must pass this:
- [ ] Does it feel PREMIUM?
- [ ] Is it immediately UNDERSTANDABLE?
- [ ] Does it have SILENT ATTITUDE — confident, not loud?
- [ ] Would a Dubai creative agency be IMPRESSED?
- [ ] Does it load FAST and feel SMOOTH?

---

*Design system by Claude for Sivanand — Portfolio 2026*
