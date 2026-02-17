# NAVIGATOR — Landing Page Design System & Build Guide

## What is Navigator?
Navigator is a group trip facilitation app evolving into an event production platform. It helps people organize, coordinate, and experience group trips and events together. Think Partiful meets Eventbrite — built for travel-first social experiences.

---

## Brand Identity

### Voice & Personality
- **Confident, not loud.** Navigator speaks like someone who already knows the move.
- **Social-first.** Everything communicates "you're going with people you want to be around."
- **Aspirational but accessible.** Premium feel, not gatekept.
- **Action-oriented.** Every word should make someone want to tap, scroll, or RSVP.

### Brand Positioning
- Group trips → curated group experiences → event production
- Sits between casual social planning (Partiful) and professional event ticketing (Eventbrite)
- The cool friend who always knows the spot and gets everyone there

---

## Design System

### Color Palette

| Token             | Value       | Usage                                              |
|-------------------|-------------|------------------------------------------------------|
| `--nav-blue`      | `#2D31D1`  | Primary brand color. CTAs, links, key accents        |
| `--nav-white`     | `#FFFFFF`  | Page background, card backgrounds, text on dark      |
| `--nav-black`     | `#000000`  | Primary text, headings, high-contrast elements       |
| `--nav-error`     | `#E53935`  | Error states, destructive actions, alerts             |
| `--nav-gray-100`  | `#F5F5F5`  | Subtle backgrounds, section dividers                 |
| `--nav-gray-300`  | `#D4D4D4`  | Borders, disabled states                             |
| `--nav-gray-500`  | `#737373`  | Secondary text, captions, metadata                   |

### Color Rules
- **NO gradients.** Period. Solid fills only.
- **White background** is the default canvas. Sections may alternate with `--nav-gray-100`.
- `--nav-blue` should feel like a punctuation mark — used with intention, not everywhere.
- Black and white do the heavy lifting. Blue is the accent that makes it pop.
- Hover states: use opacity shifts (e.g., `opacity: 0.85`) or subtle background fills, not color changes.

### Typography

**Primary Font:** Inter — clean, geometric sans-serif. Workhorse for headings and body.
**Decorative Font:** Pacifico — cursive, used sparingly for brand personality.

**Type Scale:**
```
--text-hero:    clamp(3rem, 6vw, 5.5rem)    / 0.95 line-height / -0.03em tracking
--text-h1:      clamp(2.25rem, 4vw, 3.5rem) / 1.05 line-height / -0.02em tracking
--text-h2:      clamp(1.75rem, 3vw, 2.5rem) / 1.1 line-height  / -0.015em tracking
--text-h3:      clamp(1.25rem, 2vw, 1.75rem)/ 1.2 line-height  / -0.01em tracking
--text-body:    1rem (16px)                  / 1.6 line-height  / normal tracking
--text-small:   0.875rem (14px)              / 1.5 line-height  / 0.01em tracking
--text-caption:  0.75rem (12px)              / 1.4 line-height  / 0.02em tracking
```

**Type Rules:**
- Headings: **Black (`#000`)**, bold or semibold weight. Tight tracking.
- Body: **Dark gray or black**. Regular weight. Generous line-height for readability.
- All caps sparingly — labels, nav items, small metadata only.
- Never center-align body paragraphs. Left-align everything except hero headlines (which may center).

### Spacing System
```
--space-xs:   0.25rem   (4px)
--space-sm:   0.5rem    (8px)
--space-md:   1rem      (16px)
--space-lg:   2rem      (32px)
--space-xl:   4rem      (64px)
--space-2xl:  6rem      (96px)
--space-3xl:  8rem      (128px)
```
- Sections should breathe. Use `--space-2xl` to `--space-3xl` between major sections.
- Apple-level whitespace is the goal. When in doubt, add more space.

### Border Radius
```
--radius-none:  0
--radius-sm:    4px     (subtle, for tags/badges)
--radius-md:    8px     (cards, inputs)
--radius-lg:    12px    (larger cards, image containers)
--radius-xl:    16px    (feature cards, modals)
--radius-full:  9999px  (pills, circular buttons)
```

### Shadows & Depth
- Minimal shadow usage. Prefer **borders** (`1px solid --nav-gray-300`) or **background color shifts** for separation.
- If shadows are needed: `0 1px 3px rgba(0,0,0,0.06)` — barely there.
- Elevation through spacing and color, not drop shadows.

---

## Component Patterns

### Buttons
```
Primary:    bg: --nav-blue    | text: white     | radius: --radius-full | padding: 14px 32px
Secondary:  bg: --nav-black   | text: white     | radius: --radius-full | padding: 14px 32px
Outline:    bg: transparent   | border: 1.5px --nav-black | text: black | radius: --radius-full
Ghost:      bg: transparent   | text: --nav-blue | underline on hover
```
- Buttons are **pill-shaped** (full radius) by default.
- Minimum touch target: 48px height.
- Hover: subtle scale (`transform: scale(1.02)`) + slight opacity shift. No color swaps.
- Transition: `all 0.2s ease`

### Cards
- White background with `1px solid #E5E5E5` border OR no border on `--nav-gray-100` background.
- `--radius-lg` or `--radius-xl`.
- Generous internal padding (`--space-lg` to `--space-xl`).
- Image-to-text ratio should favor visuals on event/trip cards.

### Navigation
- Fixed top nav, white background (or transparent on hero), subtle bottom border.
- Logo left, links center or right, CTA button far right.
- Mobile: hamburger menu or bottom sheet.
- Nav should feel invisible until needed.

### Event/Trip Cards (Key Component)
- Large hero image (aspect ratio 16:9 or 4:3).
- Event title in bold, large type.
- Date + location as secondary info.
- Attendee avatars (stacked circles) as social proof.
- Clear CTA: "Join" or "RSVP" in `--nav-blue`.

---

## Landing Page Structure

### Section Flow
1. **Hero** — Video background + bold headline + subtext + primary CTA
2. **Social Proof Bar** — Stats or "Trusted by X groups"
3. **Feature Showcase** — 3-4 key features with Unsplash imagery, alternating layout
4. **How It Works** — 3-step process, clean and visual
5. **Event/Trip Gallery** — Sample events as cards (Partiful-style)
6. **Testimonials** — User quotes with photos
7. **CTA Section** — Final push on solid `--nav-black` background
8. **Footer** — Links, social icons, legal

### Layout Rules
- **Max content width:** 1200px, centered.
- **Full-bleed sections** OK for backgrounds, content stays within max-width.
- Mobile-first responsive design. Breakpoints: 640px, 768px, 1024px, 1280px.

---

## Visual Language

### Photography & Imagery
- Real people. Real trips. Diverse groups having genuine fun.
- High contrast, saturated but natural color grading.
- No stock-photo energy. Use Unsplash travel/event imagery.

### Iconography
- Line icons, 1.5px-2px stroke weight.
- Consistent style — don't mix filled and outlined.

### Motion & Animation
- **Page load:** Staggered fade-up reveals.
- **Scroll:** Elements fade/slide in on scroll.
- **Hover:** Micro-scale on cards (`1.01-1.03`), underline slides on links.
- **Transitions:** `0.2s-0.3s ease` for interactions. `0.5s-0.8s ease-out` for scroll reveals.
- No bouncy or playful springs — keep it smooth and refined.

### Do's and Don'ts

**DO:** Use generous whitespace, let photography anchor visuals, keep UI minimal, make CTAs unmissable with `--nav-blue`, think Apple product page meets Partiful event page.

**DON'T:** Use gradients (ever), add decorative clutter, use more than 2 font weights on screen, make sections cramped, over-animate.

---

## Technical Notes

### Existing Stack
- React 18 + TypeScript + Vite
- Tailwind CSS with shadcn/ui components
- Framer Motion available for animations
- Lucide React for icons
- wouter for routing
- Inter (Google Fonts) + Pacifico (Google Fonts)

### CSS Variables
```css
:root {
  --nav-blue: #2D31D1;
  --nav-white: #FFFFFF;
  --nav-black: #000000;
  --nav-error: #E53935;
  --nav-gray-100: #F5F5F5;
  --nav-gray-300: #D4D4D4;
  --nav-gray-500: #737373;
}
```

### Key File Paths
- Landing page: `client/src/pages/landing.tsx`
- CSS variables: `client/src/index.css`
- Tailwind config: `tailwind.config.ts`
- App router: `client/src/App.tsx`
- UI components: `client/src/components/ui/`
- Assets: `client/src/assets/`

---

*This document is the single source of truth for the Navigator landing page design system.*
