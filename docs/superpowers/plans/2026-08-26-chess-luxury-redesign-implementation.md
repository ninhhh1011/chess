# Chess App Luxury Redesign - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the chess app UI to "Obsidian Luxury" design - dark-first, premium aesthetic inspired by Apple/Linear, with Framer Motion animations.

**Architecture:** Build a reusable design system (`src/design-system/`) with tokens, primitives, and animations. Apply progressively: setup → design system → layout shell → pages.

**Tech Stack:** React 19, Vite 8, Tailwind CSS, Framer Motion, Lucide React, clsx, tailwind-merge

**Spec:** `docs/superpowers/specs/2026-08-26-chess-luxury-redesign-design.md`

---

## Global Constraints

- Use existing `chess.js`, `react-chessboard` libraries
- Preserve all existing functionality (game logic, bot, analysis)
- Dark theme only (no light mode)
- Mobile-first responsive (but desktop-primary)
- Maintain Vietnamese language content

---

## Phase 1: Setup & Design System Foundation

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `framer-motion`, `clsx`, `tailwind-merge`, `lucide-react` available

- [ ] **Step 1: Install new dependencies**

```bash
npm install framer-motion clsx tailwind-merge lucide-react
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add design system dependencies

- framer-motion for animations
- clsx + tailwind-merge for conditional classes
- lucide-react for icons

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Configure Tailwind Design Tokens

**Files:**
- Modify: `tailwind.config.js`

**Interfaces:**
- Consumes: Design tokens from spec (Section 2.1, 2.2, 2.3)
- Produces: Tailwind extended theme with custom colors, fonts, animations

- [ ] **Step 1: Update tailwind.config.js with design tokens**

```js
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Background layers
        bg: {
          base: '#0A0A0F',
          surface: '#16161D',
          elevated: '#1E1E26',
        },
        // Borders
        border: {
          subtle: 'rgba(255, 255, 255, 0.06)',
          DEFAULT: 'rgba(255, 255, 255, 0.10)',
          strong: 'rgba(255, 255, 255, 0.16)',
        },
        // Primary (Indigo)
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
        // Accent (Amber)
        accent: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
        },
        // Semantic
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        // Text
        text: {
          primary: '#FAFAFA',
          secondary: '#A1A1AA',
          tertiary: '#71717A',
          disabled: '#52525B',
        },
      },
      fontFamily: {
        display: ['SF Pro Display', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['SF Pro Text', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.25rem' }],
        'sm': ['0.875rem', { lineHeight: '1.5rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1.1' }],
      },
      borderRadius: {
        'sm': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.4)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        'glow': '0 0 20px rgba(99, 102, 241, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
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
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      transitionDuration: {
        'instant': '0ms',
        'fast': '100ms',
        'normal': '200ms',
        'slow': '300ms',
        'slower': '400ms',
        'slowest': '500ms',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Run build to verify config works**

```bash
npm run build 2>&1 | head -50
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.js
git commit -m "feat: configure Tailwind with Obsidian Luxury design tokens

- Background layers: base, surface, elevated
- Border tokens with opacity
- Primary (indigo) and accent (amber) color scales
- Semantic colors: success, warning, error
- Typography: display, body, mono fonts
- Custom shadows and animations

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Create Utility Functions

**Files:**
- Create: `src/lib/utils.ts`

**Interfaces:**
- Consumes: `clsx`, `tailwind-merge` packages
- Produces: `cn()` function for conditional Tailwind classes

- [ ] **Step 1: Create src/lib/utils.ts**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with proper deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
npx tsc --noEmit src/lib/utils.ts 2>&1 || echo "TypeScript check complete"
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: add cn() utility for Tailwind class merging

- Combines clsx and tailwind-merge
- Enables conditional className styling

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Create Animation Variants

**Files:**
- Create: `src/design-system/animations/variants.ts`

**Interfaces:**
- Consumes: Framer Motion
- Produces: Reusable animation variants (fadeInUp, fadeIn, slideInRight, scaleIn, staggerContainer)

- [ ] **Step 1: Create src/design-system/animations/variants.ts**

```ts
import type { Variants } from 'framer-motion';

/**
 * Fade in with upward slide
 */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.33, 1, 0.68, 1] },
  },
};

/**
 * Simple fade in
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};

/**
 * Slide in from right
 */
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.33, 1, 0.68, 1] },
  },
};

/**
 * Scale in with spring
 */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
  },
};

/**
 * Staggered children animation
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

/**
 * Page transition variants
 */
export const pageVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: [0.33, 1, 0.68, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.15, ease: [0.33, 1, 0.68, 1] },
  },
};

/**
 * Spring configurations
 */
export const springs = {
  snappy: { type: 'spring' as const, stiffness: 400, damping: 30 },
  smooth: { type: 'spring' as const, stiffness: 300, damping: 25 },
  bouncy: { type: 'spring' as const, stiffness: 200, damping: 20 },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit src/design-system/animations/variants.ts 2>&1 || echo "TypeScript check complete"
```

- [ ] **Step 3: Commit**

```bash
git add src/design-system/animations/variants.ts
git commit -m "feat: add Framer Motion animation variants

- fadeInUp, fadeIn, slideInRight, scaleIn, staggerContainer
- pageVariants for route transitions
- spring configurations

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Create Button Component

**Files:**
- Create: `src/design-system/primitives/Button.tsx`

**Interfaces:**
- Consumes: `cn()` from utils, Framer Motion, animation variants
- Produces: `Button` component with variants: primary, secondary, ghost, danger

- [ ] **Step 1: Create src/design-system/primitives/Button.tsx**

```tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        'bg-primary-600 text-white hover:bg-primary-500 active:bg-primary-700 shadow-sm',
      secondary:
        'bg-bg-elevated border border-border text-text-primary hover:bg-bg-surface hover:border-border-strong',
      ghost:
        'text-text-secondary hover:text-text-primary hover:bg-bg-elevated',
      danger:
        'bg-error text-white hover:bg-red-600 active:bg-red-700',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-10 px-4 text-base gap-2',
      lg: 'h-12 px-6 text-lg gap-2.5',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg
            className="h-4 w-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
```

- [ ] **Step 2: Create test file src/design-system/primitives/Button.test.tsx**

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary-600');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-bg-elevated');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-text-secondary');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-error');
  });

  it('applies size classes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-8', 'px-3');

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-10', 'px-4');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-12', 'px-6');
  });

  it('disables when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveClass('opacity-50');
  });

  it('shows loading state', () => {
    render(<Button isLoading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button').querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders icons', () => {
    const icon = <span data-testid="icon">🔮</span>;
    const { rerender } = render(<Button leftIcon={icon}>With Left Icon</Button>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();

    rerender(<Button rightIcon={icon}>With Right Icon</Button>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- src/design-system/primitives/Button.test.tsx --run
```

Expected: Tests should pass

- [ ] **Step 4: Commit**

```bash
git add src/design-system/primitives/Button.tsx src/design-system/primitives/Button.test.tsx
git commit -m "feat: create Button design system component

- Variants: primary, secondary, ghost, danger
- Sizes: sm, md, lg
- Loading state with spinner
- Icon support (left/right)
- Framer Motion hover/tap animations

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Create Card Component

**Files:**
- Create: `src/design-system/primitives/Card.tsx`
- Create: `src/design-system/primitives/Card.test.tsx`

**Interfaces:**
- Consumes: `cn()` from utils
- Produces: `Card` component with variants: elevated, glass, outline

- [ ] **Step 1: Create src/design-system/primitives/Card.tsx**

```tsx
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'glass' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'elevated', padding = 'md', children, ...props }, ref) => {
    const variants = {
      elevated: 'bg-bg-elevated border border-border shadow-md',
      glass: 'bg-bg-overlay backdrop-blur-md border border-border-strong',
      outline: 'bg-transparent border border-border',
    };

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-xl', variants[variant], paddings[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('mb-4 flex flex-col gap-1', className)}
      {...props}
    />
  )
);

CardHeader.displayName = 'CardHeader';

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4';
}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Comp = 'h3', ...props }, ref) => (
    <Comp
      ref={ref}
      className={cn('text-xl font-semibold text-text-primary', className)}
      {...props}
    />
  )
);

CardTitle.displayName = 'CardTitle';

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-text-secondary', className)}
      {...props}
    />
  )
);

CardDescription.displayName = 'CardDescription';

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
);

CardContent.displayName = 'CardContent';

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('mt-4 flex items-center gap-3', className)}
      {...props}
    />
  )
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
export type { CardProps };
```

- [ ] **Step 2: Create test file**

```tsx
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';

describe('Card', () => {
  it('renders with children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    const { rerender } = render(<Card variant="elevated">Elevated</Card>);
    expect(screen.getByText('Elevated').parentElement).toHaveClass('bg-bg-elevated', 'shadow-md');

    rerender(<Card variant="glass">Glass</Card>);
    expect(screen.getByText('Glass').parentElement).toHaveClass('backdrop-blur');

    rerender(<Card variant="outline">Outline</Card>);
    expect(screen.getByText('Outline').parentElement).toHaveClass('bg-transparent');
  });

  it('applies padding classes', () => {
    const { rerender } = render(<Card padding="none">None</Card>);
    expect(screen.getByText('None').parentElement).not.toHaveClass(/p-/);

    rerender(<Card padding="sm">Small</Card>);
    expect(screen.getByText('Small').parentElement).toHaveClass('p-3');

    rerender(<Card padding="md">Medium</Card>);
    expect(screen.getByText('Medium').parentElement).toHaveClass('p-5');

    rerender(<Card padding="lg">Large</Card>);
    expect(screen.getByText('Large').parentElement).toHaveClass('p-8');
  });
});

describe('Card subcomponents', () => {
  it('renders CardHeader, CardTitle, CardDescription', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- src/design-system/primitives/Card.test.tsx --run
```

- [ ] **Step 4: Commit**

```bash
git add src/design-system/primitives/Card.tsx src/design-system/primitives/Card.test.tsx
git commit -m "feat: create Card design system component

- Variants: elevated (default), glass, outline
- Padding options: none, sm, md, lg
- Subcomponents: CardHeader, CardTitle, CardDescription, CardContent, CardFooter

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Create Input Component

**Files:**
- Create: `src/design-system/primitives/Input.tsx`
- Create: `src/design-system/primitives/Input.test.tsx`

**Interfaces:**
- Consumes: `cn()` from utils
- Produces: `Input` component with label, error, icon support

- [ ] **Step 1: Create src/design-system/primitives/Input.tsx**

```tsx
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-tertiary">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'flex h-10 w-full rounded-lg border bg-bg-elevated px-4 py-2 text-base text-text-primary',
              'transition-colors',
              'placeholder:text-text-disabled',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-error focus-visible:ring-error'
                : 'border-border hover:border-border-strong',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-tertiary">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        {hint && !error && <p className="text-sm text-text-tertiary">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
```

- [ ] **Step 2: Create test file**

```tsx
import { render, screen } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Input label="Email" placeholder="Enter email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('shows hint message', () => {
    render(<Input label="Password" hint="Minimum 8 characters" />);
    expect(screen.getByText('Minimum 8 characters')).toBeInTheDocument();
  });

  it('renders with icons', () => {
    const leftIcon = <span data-testid="left-icon">🔑</span>;
    const rightIcon = <span data-testid="right-icon">👁️</span>;

    render(<Input leftIcon={leftIcon} rightIcon={rightIcon} />);
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('disables correctly', () => {
    render(<Input disabled placeholder="Disabled" />);
    expect(screen.getByPlaceholderText('Disabled')).toBeDisabled();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- src/design-system/primitives/Input.test.tsx --run
```

- [ ] **Step 4: Commit**

```bash
git add src/design-system/primitives/Input.tsx src/design-system/primitives/Input.test.tsx
git commit -m "feat: create Input design system component

- Label, error, hint support
- Left/right icon slots
- Focus states with ring
- Disabled styling

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Create Badge Component

**Files:**
- Create: `src/design-system/primitives/Badge.tsx`

**Interfaces:**
- Consumes: `cn()` from utils
- Produces: `Badge` component with variants: default, success, warning, error, primary

- [ ] **Step 1: Create src/design-system/primitives/Badge.tsx**

```tsx
import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'primary';
  size?: 'sm' | 'md';
}

function Badge({
  className,
  variant = 'default',
  size = 'md',
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-bg-elevated text-text-secondary border border-border',
    success: 'bg-success/10 text-success border border-success/20',
    warning: 'bg-warning/10 text-warning border border-warning/20',
    error: 'bg-error/10 text-error border border-error/20',
    primary: 'bg-primary-500/10 text-primary-500 border border-primary-500/20',
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
export type { BadgeProps };
```

- [ ] **Step 2: Commit**

```bash
git add src/design-system/primitives/Badge.tsx
git commit -m "feat: create Badge design system component

- Variants: default, success, warning, error, primary
- Sizes: sm, md

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Create index exports

**Files:**
- Create: `src/design-system/primitives/index.ts`
- Create: `src/design-system/animations/index.ts`

**Interfaces:**
- Consumes: Button, Card, Input, Badge components
- Produces: Barrel exports for easy imports

- [ ] **Step 1: Create src/design-system/primitives/index.ts**

```ts
export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
export type { CardProps } from './Card';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Badge } from './Badge';
export type { BadgeProps } from './Badge';
```

- [ ] **Step 2: Create src/design-system/animations/index.ts**

```ts
export {
  fadeInUp,
  fadeIn,
  slideInRight,
  scaleIn,
  staggerContainer,
  pageVariants,
  springs,
} from './variants';
```

- [ ] **Step 3: Commit**

```bash
git add src/design-system/primitives/index.ts src/design-system/animations/index.ts
git commit -m "feat: add design system barrel exports

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2: Layout Shell

### Task 10: Redesign Navigation

**Files:**
- Modify: `src/components/Navbar.jsx` → Convert to `src/components/ui/Navbar.tsx`

**Interfaces:**
- Consumes: Design system primitives (Button, Badge)
- Produces: Redesigned Navbar with new styling

- [ ] **Step 1: Read current Navbar implementation**

```bash
cat src/components/Navbar.jsx
```

- [ ] **Step 2: Create new Navbar.tsx with design system**

```tsx
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut, ChessKnight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { signOutUser } from '@/services/authService';
import { Button } from '@/design-system/primitives';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Trang chủ' },
  { to: '/learn', label: 'Học cờ' },
  { to: '/play', label: 'Chơi cờ' },
  { to: '/exercises', label: 'Bài tập' },
  { to: '/openings', label: 'Khai cuộc' },
  { to: '/training', label: 'Huấn luyện' },
];

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  async function handleLogout() {
    const result = await signOutUser();
    if (result.success) {
      setIsMobileMenuOpen(false);
      navigate('/');
    }
  }

  const accountInitial = user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg-base/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-6">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
            <ChessKnight className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-text-primary hidden sm:block">
            Ninh Lốp Trưởng
          </span>
        </NavLink>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative px-4 py-2 text-sm font-medium transition-colors rounded-lg',
                  isActive
                    ? 'text-text-primary bg-bg-elevated'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary-500"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Desktop Auth */}
        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-elevated text-sm font-semibold text-primary-500 border border-border">
                {accountInitial}
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} leftIcon={<LogOut className="h-4 w-4" />}>
                Đăng xuất
              </Button>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Đăng nhập
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/signup')}>
                Đăng ký
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-elevated md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border overflow-hidden md:hidden"
          >
            <div className="mx-auto max-w-7xl px-4 py-4">
              <div className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'px-4 py-3 text-sm font-medium transition-colors rounded-lg',
                        isActive
                          ? 'text-text-primary bg-bg-elevated'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-elevated text-sm font-semibold text-primary-500">
                        {accountInitial}
                      </div>
                      <span className="text-sm text-text-secondary">{user?.email}</span>
                    </div>
                    <Button variant="secondary" onClick={handleLogout} leftIcon={<LogOut className="h-4 w-4" />}>
                      Đăng xuất
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }}>
                      Đăng nhập
                    </Button>
                    <Button variant="primary" onClick={() => { navigate('/signup'); setIsMobileMenuOpen(false); }}>
                      Đăng ký
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | head -50
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Navbar.tsx
git commit -m "feat: redesign Navbar with design system

- New dark theme styling with bg-bg-base
- Active nav indicator with spring animation
- Mobile menu with AnimatePresence
- Lucide React icons
- Design system Button integration

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Redesign Layout Component

**Files:**
- Modify: `src/components/Layout.jsx` → Convert to `src/components/Layout.tsx`

**Interfaces:**
- Consumes: Navbar, design system
- Produces: Updated Layout with new styling and transitions

- [ ] **Step 1: Create new Layout.tsx**

```tsx
import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './ui/Navbar';
import { pageVariants } from '@/design-system/animations';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();
  const isPlayPage = pathname.startsWith('/play');

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-body">
      <Navbar />
      <main
        className={
          isPlayPage
            ? 'mx-auto w-full px-2 py-2 sm:px-3'
            : 'mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-12'
        }
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: update Layout with page transitions

- Page fade/scale transitions with AnimatePresence
- New bg-bg-base styling
- Responsive padding adjustments

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3: Core Pages

### Task 12: Redesign Home Page

**Files:**
- Modify: `src/pages/Home.jsx` → Convert to `src/pages/Home.tsx`

**Interfaces:**
- Consumes: Design system (Card, Button), animation variants
- Produces: Redesigned Home page with hero and quick actions

- [ ] **Step 1: Read current Home page**

```bash
cat src/pages/Home.jsx
```

- [ ] **Step 2: Create new Home.tsx**

```tsx
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Brain, BookOpen, Trophy, ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, Button } from '@/design-system/primitives';
import { staggerContainer, fadeInUp } from '@/design-system/animations';

const features = [
  {
    icon: Play,
    title: 'Chơi với Bot',
    description: 'Đấu với Ninh Lốp Trưởng ở nhiều cấp độ ELO khác nhau',
    to: '/play',
    color: 'text-primary-500',
    bg: 'bg-primary-500/10',
  },
  {
    icon: BookOpen,
    title: 'Học cờ',
    description: 'Các bài học từ cơ bản đến nâng cao, có hình ảnh minh họa',
    to: '/learn',
    color: 'text-accent-500',
    bg: 'bg-accent-500/10',
  },
  {
    icon: Brain,
    title: 'Bài tập',
    description: 'Luyện tập tactics để cải thiện khả năng tính toán',
    to: '/exercises',
    color: 'text-success',
    bg: 'bg-success/10',
  },
  {
    icon: Trophy,
    title: 'Khai cuộc',
    description: 'Học và luyện tập các khai cuộc phổ biến',
    to: '/openings',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-bg-elevated via-bg-surface to-bg-elevated border border-border p-8 md:p-12 lg:p-16"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.15),transparent_50%)]" />
        
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-500/10 px-4 py-2 text-sm font-medium text-primary-500"
          >
            <Sparkles className="h-4 w-4" />
            Ứng dụng cờ vua hàng đầu
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 text-4xl font-bold tracking-tight text-text-primary md:text-5xl lg:text-6xl"
          >
            Ninh Lốp Trưởng{' '}
            <span className="bg-gradient-to-r from-primary-500 to-primary-400 bg-clip-text text-transparent">
              Chess
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8 text-lg text-text-secondary md:text-xl"
          >
            Nâng cao trình độ cờ vua với Bot thông minh, bài học chi tiết và
            bài tập tactics hiệu quả
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Button
              size="lg"
              onClick={() => navigate('/play')}
              rightIcon={<ChevronRight className="h-5 w-5" />}
              className="w-full sm:w-auto"
            >
              Bắt đầu chơi
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/learn')}
              className="w-full sm:w-auto"
            >
              Khám phá
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Grid */}
      <section>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8 text-center text-2xl font-semibold text-text-primary md:text-3xl"
        >
          Khám phá tính năng
        </motion.h2>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((feature) => (
            <motion.div key={feature.to} variants={fadeInUp}>
              <Card
                variant="elevated"
                padding="none"
                className="group cursor-pointer transition-shadow hover:shadow-lg hover:shadow-black/20"
                onClick={() => navigate(feature.to)}
              >
                <div className="p-6">
                  <div
                    className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg}`}
                  >
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="mb-2 group-hover:text-primary-500 transition-colors">
                    {feature.title}
                  </CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </div>
                <div className="border-t border-border px-6 py-4">
                  <span className="flex items-center gap-1 text-sm font-medium text-primary-500 opacity-0 transition-opacity group-hover:opacity-100">
                    Khám phá <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Run build to verify**

```bash
npm run build 2>&1 | head -50
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat: redesign Home page with luxury aesthetic

- Hero section with gradient background
- Animated entrance effects
- Feature cards with hover states
- New color scheme (bg-bg-elevated, primary-500)
- Lucide React icons

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Update Play Page Styling

**Files:**
- Modify: `src/components/chess/PreGameLobby.jsx` - Apply new styling
- Modify: `src/components/chess/GameControls.jsx` - Apply new styling
- Modify: `src/components/chess/PostGameReview.jsx` - Apply new styling

**Interfaces:**
- Consumes: Design system tokens (applied via Tailwind classes)
- Produces: Updated chess components with luxury styling

**Note:** This task focuses on updating styling classes. Read each file and update Tailwind classes to use new design tokens:

- Replace `bg-slate-*` with `bg-bg-*`
- Replace `text-slate-*` with `text-text-*`
- Replace `border-slate-*` with `border-border`
- Replace `bg-emerald-*` with `bg-primary-*` (for brand accents)
- Add hover states and transitions

- [ ] **Step 1: Read and update PreGameLobby**

```bash
cat src/components/chess/PreGameLobby.jsx
```

Then update with new design tokens.

- [ ] **Step 2: Read and update GameControls**

```bash
cat src/components/chess/GameControls.jsx
```

- [ ] **Step 3: Read and update PostGameReview**

```bash
cat src/components/chess/PostGameReview.jsx
```

- [ ] **Step 4: Run build**

```bash
npm run build 2>&1 | head -50
```

- [ ] **Step 5: Commit**

```bash
git add src/components/chess/PreGameLobby.jsx src/components/chess/GameControls.jsx src/components/chess/PostGameReview.jsx
git commit -m "feat: update chess components with luxury styling

- Apply design tokens (bg-bg-*, text-text-*, border-border)
- Add hover states and transitions
- Update accent colors

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4: Supporting Pages

### Task 14: Update Auth Pages

**Files:**
- Modify: `src/pages/Login.jsx` - Apply new styling
- Modify: `src/pages/Signup.jsx` - Apply new styling

**Interfaces:**
- Consumes: Design system (Card, Button, Input)
- Produces: Luxury auth pages

- [ ] **Step 1: Read current Login page**

```bash
cat src/pages/Login.jsx
```

- [ ] **Step 2: Update Login.tsx with design system**

Apply design tokens and design system components.

- [ ] **Step 3: Do same for Signup page**

```bash
cat src/pages/Signup.jsx
```

- [ ] **Step 4: Run build and commit**

```bash
npm run build 2>&1 | head -50
git add src/pages/Login.jsx src/pages/Signup.jsx
git commit -m "feat: update auth pages with luxury styling

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Update Supporting Pages

**Files:**
- Modify: `src/pages/Learn.jsx`
- Modify: `src/pages/Exercises.jsx`
- Modify: `src/pages/Openings.jsx`
- Modify: `src/pages/Training.jsx`

**Interfaces:**
- Consumes: Design system components
- Produces: Consistent luxury styling across pages

- [ ] **Step 1: Update each page with new styling**

For each page:
1. Read the current implementation
2. Update Tailwind classes to use new design tokens
3. Optionally integrate design system components

- [ ] **Step 2: Run build and commit**

```bash
npm run build 2>&1 | head -50
git add src/pages/Learn.jsx src/pages/Exercises.jsx src/pages/Openings.jsx src/pages/Training.jsx
git commit -m "feat: update supporting pages with luxury styling

- Learn, Exercises, Openings, Training pages
- Consistent design tokens applied

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Phase 5: Polish & Final Review

### Task 16: Polish & Empty States

**Files:**
- Modify: Various components as needed

**Interfaces:**
- Consumes: Design system
- Produces: Improved empty states, loading states

- [ ] **Step 1: Run app and review all pages**

```bash
npm run dev
```

Manual review of:
- Home page
- Play flow
- Auth pages
- All supporting pages
- Mobile responsive

- [ ] **Step 2: Fix any styling issues found**

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix: polish styling and address review feedback

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| **1. Setup & Design System** | 1-9 | Dependencies, Tailwind config, utils, primitives (Button, Card, Input, Badge), animations |
| **2. Layout Shell** | 10-11 | Navbar redesign, Layout with page transitions |
| **3. Core Pages** | 12-13 | Home page redesign, Play page styling |
| **4. Supporting Pages** | 14-15 | Auth pages, Learn/Exercises/Openings/Training |
| **5. Polish** | 16 | Final review and fixes |

**Total: 16 tasks**

Each task is designed to be independently testable with `npm run build`.
