# Parc Fermé Design System

> A comprehensive guide to the visual language and component patterns used across Parc Fermé.

## Table of Contents

1. [Brand Identity](#brand-identity)
2. [Colors](#colors)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Components](#components)
6. [Accessibility](#accessibility)
7. [Dark Mode](#dark-mode)

---

## Brand Identity

Parc Fermé draws its visual identity from motorsport culture:

- **Signal Green** (`#00FF7F`): The primary brand color, inspired by pit lane signals
- **Safety Car Yellow** (`#FFD700`): Accent color for warnings and premium features
- **Red Flag** (`#FF4444`): Used sparingly for errors and critical actions
- **Dark Track Surface**: The app uses a dark-first design inspired by nighttime racing

### Logo Usage

The logo should always appear with sufficient contrast against its background. Use the brand gradient for headings and the solid green for interactive elements.

```css
.brand-logo {
  background: linear-gradient(135deg, #00FF7F 0%, #00CC66 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 20px rgba(0, 255, 127, 0.2));
}
```

---

## Colors

### Brand Colors

| Name | Hex | Usage |
|------|-----|-------|
| **PF Green** | `#00FF7F` | Primary actions, active states, success |
| **PF Yellow** | `#FFD700` | Warnings, premium features, attended logs |
| **PF Red** | `#FF4444` | Errors, destructive actions, red flags |

### Green Scale (Primary)

| Token | Hex | Usage |
|-------|-----|-------|
| `pf-green-50` | `#E6FFF2` | Subtle backgrounds |
| `pf-green-100` | `#B3FFD9` | Light highlights |
| `pf-green-200` | `#80FFC0` | Hover states on light bg |
| `pf-green-300` | `#4DFFA6` | Active indicators |
| `pf-green-400` | `#1AFF8D` | Button hover |
| `pf-green-500` | `#00FF7F` | **Primary brand color** |
| `pf-green-600` | `#00CC66` | Dark hover states |
| `pf-green-700` | `#00994C` | Links on light bg |
| `pf-green-800` | `#006633` | Dark accents |
| `pf-green-900` | `#003319` | Very dark accents |

### Yellow Scale (Secondary)

| Token | Hex | Usage |
|-------|-----|-------|
| `pf-yellow-50` | `#FFFBEB` | Warning backgrounds |
| `pf-yellow-100` | `#FEF3C7` | Light warning highlights |
| `pf-yellow-500` | `#FFD700` | **Safety car yellow** |
| `pf-yellow-600` | `#D97706` | Warning text on light bg |

### Neutral Scale (Built-in Tailwind)

Use Tailwind's neutral scale for text, borders, and backgrounds:

| Token | Hex | Usage |
|-------|-----|-------|
| `neutral-50` | `#fafafa` | Light mode backgrounds |
| `neutral-100` | `#f5f5f5` | Light borders |
| `neutral-200` | `#e5e5e5` | Light dividers |
| `neutral-300` | `#d4d4d4` | Secondary text (light mode) |
| `neutral-400` | `#a3a3a3` | Placeholder text |
| `neutral-500` | `#737373` | Muted text |
| `neutral-600` | `#525252` | Secondary text |
| `neutral-700` | `#404040` | Primary text (light mode) |
| `neutral-800` | `#262626` | Borders (dark mode) |
| `neutral-900` | `#171717` | Card backgrounds |
| `neutral-950` | `#0a0a0a` | **App background** |

### Semantic Colors

```css
/* Success */
.text-accent-green { color: #00FF7F; text-shadow: 0 0 30px rgba(0, 255, 127, 0.2); }

/* Warning / Attended */
.text-accent-yellow { color: #FFD700; text-shadow: 0 0 30px rgba(255, 215, 0, 0.2); }

/* Error / Red Flag */
.text-accent-red { color: #FF4444; text-shadow: 0 0 30px rgba(255, 68, 68, 0.4); }
```

---

## Typography

### Font Families

| Family | Usage | Fallbacks |
|--------|-------|-----------|
| **Inter** | Body text, UI elements | `system-ui`, `sans-serif` |
| **Unbounded** | Brand logo, headings | `Inter`, `sans-serif` |
| **JetBrains Mono** | Code, data tables | `monospace` |

### Font Sizes (Tailwind Scale)

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 12px | 16px | Captions, timestamps |
| `text-sm` | 14px | 20px | Secondary text, labels |
| `text-base` | 16px | 24px | Body text |
| `text-lg` | 18px | 28px | Lead paragraphs |
| `text-xl` | 20px | 28px | Section headings |
| `text-2xl` | 24px | 32px | Page headings |
| `text-3xl` | 30px | 36px | Large headings |
| `text-4xl` | 36px | 40px | Hero subheadings |
| `text-5xl` | 48px | 48px | Hero headings (mobile) |
| `text-7xl` | 72px | 72px | Hero headings (desktop) |

### Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Labels, buttons |
| `font-semibold` | 600 | Emphasis, subheadings |
| `font-bold` | 700 | Headings |

### Racing Typography

The `.font-racing` class applies the Unbounded font with slight letter spacing for a motorsport feel:

```css
.font-racing {
  font-family: 'Unbounded', Inter, system-ui, sans-serif;
  letter-spacing: 0.02em;
}
```

---

## Spacing & Layout

### Spacing Scale

Use Tailwind's default spacing scale (based on 4px increments):

| Token | Value | Common Usage |
|-------|-------|--------------|
| `0.5` | 2px | Micro spacing |
| `1` | 4px | Tight gaps |
| `2` | 8px | Small padding |
| `3` | 12px | Medium gaps |
| `4` | 16px | Standard padding |
| `6` | 24px | Section gaps |
| `8` | 32px | Large gaps |
| `12` | 48px | Section padding |
| `16` | 64px | Page margins |
| `20` | 80px | Hero spacing |

### Container Widths

| Breakpoint | Max Width | Usage |
|------------|-----------|-------|
| `max-w-sm` | 384px | Modals, cards |
| `max-w-md` | 448px | Forms |
| `max-w-lg` | 512px | Content cards |
| `max-w-2xl` | 672px | Narrow content |
| `max-w-4xl` | 896px | Content pages |
| `max-w-7xl` | 1280px | Full-width layouts |

### Breakpoints

| Name | Min Width | Usage |
|------|-----------|-------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small desktops |
| `xl` | 1280px | Large desktops |
| `2xl` | 1536px | Extra large screens |

---

## Components

### Button

Three variants with consistent sizing:

```tsx
<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="ghost">Ghost Button</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium (default)</Button>
<Button size="lg">Large</Button>

// States
<Button isLoading>Loading...</Button>
<Button disabled>Disabled</Button>
```

#### Button Styles

| Variant | Background | Text | Border | Hover |
|---------|------------|------|--------|-------|
| `primary` | `pf-green` | `neutral-950` | none | `pf-green-400` |
| `secondary` | `neutral-800` | `neutral-100` | `neutral-700` | `neutral-700` |
| `ghost` | transparent | `neutral-300` | none | `neutral-800` |

### Input

Form inputs with dark theme styling:

```tsx
<Input
  label="Email"
  type="email"
  placeholder="you@example.com"
  error="Please enter a valid email"
/>
```

### Cards

Standard card pattern:

```css
/* Card base */
.card {
  @apply bg-neutral-900 border border-neutral-800 rounded-lg p-4;
}

/* Card with hover effect */
.card-interactive {
  @apply bg-neutral-900 border border-neutral-800 rounded-lg p-4
         hover:bg-neutral-800 hover:border-neutral-700 transition-colors;
}
```

### Spoiler Shield Components

Special components for hiding race results:

```tsx
// Blur effect for spoilerable content
<SpoilerBlur revealOnClick>
  <RaceResults />
</SpoilerBlur>

// Mask to completely hide content
<SpoilerMask placeholder="🏁 Results hidden">
  <RaceResults />
</SpoilerMask>
```

---

## Accessibility

### WCAG 2.1 AA Compliance

All components are designed to meet WCAG 2.1 AA standards:

1. **Color Contrast**: All text meets minimum contrast ratios
   - Large text (18px+): 3:1 ratio
   - Normal text: 4.5:1 ratio

2. **Focus Indicators**: Visible focus rings on all interactive elements
   ```css
   focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-950 focus:ring-pf-green
   ```

3. **Screen Reader Support**: 
   - Semantic HTML structure
   - ARIA labels where needed
   - `aria-busy` and `aria-disabled` states

4. **Motion**: Reduced motion support via `prefers-reduced-motion`

### Keyboard Navigation

- All interactive elements are focusable via Tab
- Dropdown menus support arrow key navigation
- Escape closes modals and menus
- Enter/Space activates buttons

---

## Dark Mode

Parc Fermé is designed dark-first, matching the motorsport aesthetic of nighttime racing.

### Background Gradient

The app uses a subtle gradient background that mimics track surface:

```css
.app-background {
  background: 
    radial-gradient(ellipse 100% 80% at 50% -30%, rgba(0, 255, 127, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse 80% 60% at 100% 100%, rgba(0, 153, 76, 0.08) 0%, transparent 45%),
    radial-gradient(ellipse 50% 40% at 80% 20%, rgba(0, 255, 127, 0.04) 0%, transparent 35%),
    linear-gradient(180deg, #0a0a0a 0%, #0d0d0d 50%, #0a0a0a 100%);
  background-attachment: fixed;
}
```

### Text Glow Effects

Brand colors include subtle glow effects for emphasis:

```css
.text-accent-green {
  color: #00FF7F;
  text-shadow: 0 0 30px rgba(0, 255, 127, 0.2);
}
```

### Glass/Blur Effects

Use backdrop blur for overlays and headers:

```css
.glass {
  @apply bg-neutral-950/80 backdrop-blur-md;
}
```

---

## Usage Examples

### Page Header

```tsx
<header className="fixed top-0 left-0 right-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between h-16">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2">
        <img src="/logo.png" alt="Parc Fermé" className="h-8 w-8" />
        <span className="text-xl font-bold brand-logo">Parc Fermé</span>
      </Link>
      {/* Navigation */}
    </div>
  </div>
</header>
```

### Hero Section

```tsx
<section className="relative pt-32 pb-20 px-4 overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-b from-pf-green/5 via-transparent to-transparent" />
  <div className="relative max-w-4xl mx-auto text-center">
    <h1 className="text-5xl md:text-7xl font-bold mb-6">
      <span className="brand-logo">Parc Fermé</span>
    </h1>
    <p className="text-xl text-neutral-300 mb-8">
      The social cataloging platform for motorsport fans
    </p>
  </div>
</section>
```

### Feature Card

```tsx
<div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-colors">
  <span className="text-4xl mb-4 block">{icon}</span>
  <h3 className="text-xl font-semibold text-neutral-100 mb-2">{title}</h3>
  <p className="text-neutral-400">{description}</p>
</div>
```

---

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Inter Font](https://rsms.me/inter/)
- [Unbounded Font](https://fonts.google.com/specimen/Unbounded)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
