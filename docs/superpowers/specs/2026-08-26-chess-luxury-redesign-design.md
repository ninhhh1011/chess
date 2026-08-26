# Chess App Luxury Redesign - Design Specification

**Version:** 1.0  
**Date:** 2026-08-26  
**Status:** Draft  
**Author:** Claude (via brainstorming with user)

---

## 1. Overview

### 1.1 Project Context

This is a full redesign of the "Ninh Lốp Trưởng Chess" web application. The goal is to transform the current UI into a premium, luxury experience inspired by Apple's design language while maintaining the existing React + Vite + Tailwind tech stack.

### 1.2 Design Philosophy

> "Less, but better" — Dieter Rams

The new design prioritizes:
- **Depth through layers** — Multiple surface elevations create hierarchy without visual noise
- **Motion with purpose** — Every animation communicates state, never decorates
- **Typography as architecture** — Clear hierarchy guides the eye naturally
- **Sparse color usage** — Color is precious, used only for emphasis

### 1.3 Design Direction: "Obsidian Luxury"

A dark-first, premium aesthetic that feels like a high-end chess application. Think Apple Cards meets Linear meets Raycast.

---

## 2. Design Tokens

### 2.1 Color System

```css
/* Background Layers */
--color-bg-base:       #0A0A0F;    /* Deepest background */
--color-bg-surface:    #16161D;    /* Elevated surfaces */
--color-bg-elevated:   #1E1E26;    /* Cards, modals */
--color-bg-overlay:    rgba(22, 22, 29, 0.8);  /* Overlays with blur */

/* Borders & Dividers */
--color-border-subtle: rgba(255, 255, 255, 0.06);
--color-border-default: rgba(255, 255, 255, 0.10);
--color-border-strong: rgba(255, 255, 255, 0.16);

/* Primary (Indigo - trust, premium) */
--color-primary-50:  #EEF2FF;
--color-primary-100: #E0E7FF;
--color-primary-500: #6366F1;
--color-primary-600: #4F46E5;
--color-primary-700: #4338CA;

/* Accent (Amber - highlights, important) */
--color-accent-50:   #FFFBEB;
--color-accent-100:  #FEF3C7;
--color-accent-500:  #F59E0B;
--color-accent-600:  #D97706;

/* Success / Error */
--color-success:     #10B981;
--color-error:       #EF4444;
--color-warning:     #F59E0B;

/* Text */
--color-text-primary:   #FAFAFA;
--color-text-secondary: #A1A1AA;
--color-text-tertiary:  #71717A;
--color-text-disabled:  #52525B;

/* Chess-specific */
--color-piece-white:  #FAFAFA;
--color-piece-black:  #18181B;
--color-square-light: #E5E7EB;
--color-square-dark:  #4B5563;
--color-highlight-move: rgba(234, 179, 8, 0.4);
--color-highlight-check: rgba(239, 68, 68, 0.5);
```

### 2.2 Typography

```css
/* Font Families */
--font-display: 'SF Pro Display', system-ui, -apple-system, sans-serif;
--font-body: 'SF Pro Text', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;

/* Font Sizes */
--text-xs:   0.75rem;   /* 12px */
--text-sm:   0.875rem;  /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg:   1.125rem;  /* 18px */
--text-xl:   1.25rem;   /* 20px */
--text-2xl:  1.5rem;    /* 24px */
--text-3xl:  1.875rem;  /* 30px */
--text-4xl:  2.25rem;   /* 36px */
--text-5xl:  3rem;      /* 48px */

/* Font Weights */
--font-normal:    400;
--font-medium:    500;
--font-semibold:  600;
--font-bold:      700;

/* Line Heights */
--leading-tight:  1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;

/* Letter Spacing */
--tracking-tight:  -0.025em;
--tracking-normal: 0;
--tracking-wide:   0.025em;
```

### 2.3 Spacing System

```css
/* 4px base unit */
--space-0:  0;
--space-1:  0.25rem;   /* 4px */
--space-2:  0.5rem;    /* 8px */
--space-3:  0.75rem;   /* 12px */
--space-4:  1rem;      /* 16px */
--space-5:  1.25rem;   /* 20px */
--space-6:  1.5rem;    /* 24px */
--space-8:  2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */
--space-24: 6rem;      /* 96px */

/* Border Radius */
--radius-sm:   0.375rem;  /* 6px */
--radius-md:   0.5rem;    /* 8px */
--radius-lg:   0.75rem;   /* 12px */
--radius-xl:   1rem;      /* 16px */
--radius-2xl:  1.5rem;   /* 24px */
--radius-full: 9999px;

/* Shadows */
--shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.4);
--shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3);
--shadow-lg:  0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
--shadow-xl:  0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
--shadow-glow: 0 0 20px rgba(99, 102, 241, 0.3);
```

### 2.4 Animation Tokens

```css
/* Durations */
--duration-instant:  0ms;
--duration-fast:      100ms;
--duration-normal:    200ms;
--duration-slow:      300ms;
--duration-slower:    400ms;
--duration-slowest:   500ms;

/* Easings */
--ease-out:    cubic-bezier(0.33, 1, 0.68, 1);
--ease-in:     cubic-bezier(0.32, 0, 0.67, 0);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Spring Configurations */
--spring-snappy:  { type: "spring", stiffness: 400, damping: 30 };
--spring-smooth:  { type: "spring", stiffness: 300, damping: 25 };
--spring-bouncy:  { type: "spring", stiffness: 200, damping: 20 };
```

---

## 3. Component System

### 3.1 Design System Primitives

New directory structure:
```
src/design-system/
├── tokens/              # CSS custom properties
│   ├── colors.css
│   ├── typography.css
│   ├── spacing.css
│   └── motion.css
├── primitives/          # Base components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── Drawer.tsx
│   └── Badge.tsx
└── animations/          # Shared animation variants
    └── variants.ts
```

### 3.2 Component Specifications

#### 3.2.1 Button

**Variants:**
- `primary` — Solid indigo background, white text
- `secondary` — Subtle background with border
- `ghost` — No background, subtle hover
- `danger` — Red for destructive actions

**States:**
- Default, Hover (scale 1.02, brightness +10%), Active (scale 0.98), Disabled (opacity 0.5), Loading (spinner)

**Sizes:** sm (32px), md (40px), lg (48px)

```tsx
// Example usage
<Button variant="primary" size="md">
  Start Game
</Button>
```

#### 3.2.2 Card

**Variants:**
- `elevated` — Subtle shadow, border
- `glass` — Glassmorphism effect with backdrop blur
- `outline` — Border only, no shadow

**Anatomy:**
- Optional header with title + actions
- Content area with consistent padding
- Optional footer

#### 3.2.3 Modal

- Centered overlay with backdrop blur
- Slide + fade entrance animation
- Focus trap enabled
- Escape key closes
- Optional header, body, footer

#### 3.2.4 Drawer

- Slide-in from edges (right for nav, bottom for mobile menus)
- Backdrop with blur
- Spring animation for natural feel

### 3.3 Chess-Specific Components

#### 3.3.1 ChessBoard

**Board Appearance:**
- Subtle rounded corners (--radius-lg)
- Soft shadow for depth
- Optional coordinate labels (toggleable)
- Piece set: High-quality SVG or custom design

**Interactions:**
- Click to select, click to move
- Drag and drop with ghost piece
- Legal move hints (subtle dots)
- Last move highlight (amber tint)
- Check highlight (red tint on king square)

**Animations:**
- Piece movement: 200ms ease-out slide
- Capture: Subtle scale + fade
- Promotion: Modal with piece selection

#### 3.3.2 Evaluation Bar

- Vertical bar next to board
- Gradient fill based on evaluation
- Animated transitions
- Subtle glow effect at extremes

#### 3.3.3 Move History Panel

- Scrollable move list
- Click to jump to position
- Current move highlighted
- Annotations displayed inline
- Clean monospace typography

#### 3.3.4 Game Controls

**Layout:** Horizontal or floating action bar

**Controls:**
- Undo (with animation feedback)
- Flip board (rotation animation)
- Offer draw
- Resign (with confirmation)
- Analysis mode toggle

**Style:** Icon buttons with tooltips, subtle backgrounds

---

## 4. Page Redesign Specifications

### 4.1 Layout System

**Shell:**
```
┌─────────────────────────────────────────────────────┐
│  [Logo]          Nav Items              [Profile]   │  <- Top bar
├─────────────────────────────────────────────────────┤
│                                                     │
│                   Main Content                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Responsive Breakpoints:**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### 4.2 Navigation

**Desktop:** Horizontal top bar with logo, nav items, profile

**Mobile:** Bottom tab bar for primary destinations, hamburger for secondary

**Nav Items:**
- Home
- Play
- Learn
- Openings
- Training
- (Profile/Login as dropdown or icon)

**Animation:**
- Active state: Subtle underline with spring animation
- Hover: Background fade in

### 4.3 Page: Home (/)

**Hero Section:**
- Large display typography with brand name
- Subtle animated gradient background
- Primary CTA: "Play Now" button
- Secondary: "Learn More"

**Quick Actions:**
- Grid of 4 cards: Play vs Bot, Play Local, Opening Trainer, Exercises
- Each card: Icon, title, brief description
- Hover: Subtle lift + glow

**Stats/Progress (if logged in):**
- Recent games summary
- Learning progress
- Clean data visualization

### 4.4 Page: Play (/play)

**Layout Options:**

*Desktop (side-by-side):*
```
┌────────────────────┬─────────────────────┐
│                    │                     │
│    Lobby/Setup     │     Game Board       │
│    (collapsible)   │                     │
│                    ├─────────────────────┤
│                    │   Controls/Moves    │
└────────────────────┴─────────────────────┘
```

*Mobile (stacked):*
```
┌─────────────────────┐
│     Game Board      │
│                     │
├─────────────────────┤
│    Tabbed Panel:    │
│    [Lobby|Board|    │
│     Moves|Info]     │
└─────────────────────┘
```

**Pre-Game Lobby:**
- Bot ELO selector (slider or presets)
- Color selection (White/Black/Random)
- Time control dropdown
- "Start Game" primary button
- Clean, minimal form layout

**In-Game:**
- Board takes primary focus
- Subtle, non-intrusive controls
- Move history sidebar (collapsible)
- Engine evaluation bar (optional)
- AI Coach panel (toggleable)

**Post-Game:**
- Result announcement with animation
- Game summary (moves, time, evaluation)
- "Play Again" / "Review Game" / "Go Home" actions
- Recommendation panel for improvement

### 4.5 Page: Learn (/learn)

**Layout:**
- Header with page title
- Filter/sort controls
- Grid of lesson cards
- Progress indicators

**Lesson Card:**
- Thumbnail or icon
- Title and difficulty
- Progress bar
- Completion status badge

**Lesson Detail:**
- Clean content layout
- Example boards inline
- Progress tracking
- "Mark Complete" action

### 4.6 Page: Openings (/openings)

**List View:**
- Grid of opening cards
- Thumbnail with move tree preview
- Name and popularity indicator
- Completion status

**Opening Trainer:**
- Full board focus
- Move sequence display
- Feedback on correct/incorrect
- Progress indicator
- "Next Variation" navigation

### 4.7 Page: Training (/training)

**Dashboard Layout:**
- Overview cards at top
- Strength/weakness analysis
- Recommended exercises
- Daily training plan

**Visualization:**
- Radar chart for skill breakdown
- Progress over time (line chart)
- Clear, minimal data viz

### 4.8 Page: Auth (/login, /signup)

**Design:**
- Centered card layout
- Minimal branding
- Form with clear labels
- Social login options (if applicable)
- Smooth form validation feedback

**Animation:**
- Subtle page transition
- Form field focus animations
- Success/error state feedback

---

## 5. Animation Specifications

### 5.1 Global Transitions

**Page Transitions:**
- Exit: Fade out + slight scale down (opacity 1→0, scale 1→0.98), 200ms
- Enter: Fade in + slide up (opacity 0→1, translateY 20px→0), 300ms

**Modal/Drawer:**
- Backdrop: Fade in 200ms
- Content: Slide + fade from direction, 300ms, spring easing

**Hover States:**
- Cards: translateY -2px, shadow increase, 200ms
- Buttons: scale 1.02, 100ms
- Links: Color transition, 150ms

### 5.2 Chess-Specific Animations

**Piece Movement:**
- Duration: 200ms
- Easing: ease-out
- Animation: Transform translate to target square

**Move Highlight:**
- Fade in 100ms, stay for 300ms, fade out 200ms

**Check Indicator:**
- Subtle pulse animation on king square

**Board Flip:**
- 3D rotation effect (perspective), 400ms

**Promotion Modal:**
- Scale from 0.9→1, fade in, 200ms

### 5.3 Motion Variants (Framer Motion)

```tsx
// Shared animation variants
export const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: [0.33, 1, 0.68, 1] }
  }
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } }
};

export const slideInRight = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: [0.33, 1, 0.68, 1] }
  }
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 25 }
  }
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};
```

---

## 6. Technical Implementation

### 6.1 Required Dependencies

```bash
npm install framer-motion clsx tailwind-merge lucide-react
```

### 6.2 Tailwind Configuration

```js
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Map design tokens to Tailwind
        bg: {
          base: '#0A0A0F',
          surface: '#16161D',
          elevated: '#1E1E26',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.06)',
          DEFAULT: 'rgba(255, 255, 255, 0.10)',
          strong: 'rgba(255, 255, 255, 0.16)',
        },
        primary: {
          50: '#EEF2FF',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
        accent: {
          500: '#F59E0B',
          600: '#D97706',
        },
      },
      fontFamily: {
        display: ['SF Pro Display', 'system-ui', 'sans-serif'],
        body: ['SF Pro Text', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
```

### 6.3 Utility Functions

```ts
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 6.4 Design System Component Example

```tsx
// src/design-system/primitives/Button.tsx
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-500 active:bg-primary-700',
    secondary: 'bg-bg-elevated border border-border text-text-primary hover:bg-bg-surface',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated',
    danger: 'bg-error text-white hover:bg-red-600',
  };

  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-base',
    lg: 'h-12 px-6 text-lg',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Spinner />}
      {children}
    </motion.button>
  );
}
```

---

## 7. Implementation Phases

### Phase 1: Design System Foundation
- Set up CSS tokens as CSS variables
- Configure Tailwind with design tokens
- Create utility functions (cn)
- Build primitive components: Button, Card, Input, Badge
- Create animation variants

### Phase 2: Layout Shell
- Implement new navigation
- Create responsive layout wrapper
- Add page transition animations
- Integrate design system into existing app

### Phase 3: Play Page (Core Experience)
- Redesign lobby/selection
- New board styling with animations
- Game controls redesign
- Post-game review polish
- AI Coach panel integration

### Phase 4: Supporting Pages
- Home page redesign
- Learn page with lesson cards
- Openings page and trainer
- Training dashboard
- Auth screens

### Phase 5: Polish & Optimization
- Micro-interactions review
- Loading states
- Error states
- Empty states
- Performance optimization

---

## 8. Success Criteria

### Visual Quality
- [ ] Consistent spacing using 4px grid
- [ ] Typography hierarchy is clear
- [ ] Animations feel natural and purposeful
- [ ] Dark theme is cohesive, not harsh
- [ ] Interactive elements have clear affordances

### UX Quality
- [ ] Navigation is intuitive
- [ ] Core flows (play, review) are seamless
- [ ] Responsive on all target breakpoints
- [ ] Loading and error states are handled
- [ ] Accessibility: keyboard navigation, focus states

### Technical Quality
- [ ] No layout shifts during load
- [ ] Animations run at 60fps
- [ ] Design system is reusable
- [ ] Components are composable
- [ ] Code is maintainable and well-organized

---

## 9. Future Considerations (Out of Scope)

- Light mode (future enhancement)
- Theming/customization
- Mobile native app
- Offline support
- Multiplayer features beyond current scope

---

## Appendix: Reference Designs

**Inspiration Sources:**
- Apple Human Interface Guidelines (hig.sphx-gld)
- Linear App (linear.app)
- Raycast (raycast.com)
- Apple Cards app
- Notion

**Color Palette Tools:**
- coolors.co for initial exploration
- Hand-crafted for final tokens

**Typography Resources:**
- SF Pro (system font on Apple devices)
- Inter (web fallback)
- JetBrains Mono (chess notation)
