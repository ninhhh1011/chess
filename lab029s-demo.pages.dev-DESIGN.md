# Design System Inspired by Lab029s

## 1. Visual Theme & Atmosphere

Lab029s embodies a premium, science-forward aesthetic that balances sophisticated minimalism with immersive depth. The design system favors a dark-to-light contrast narrative, grounding itself in deep charcoal and near-black foundational tones while elevating content through crisp, luminous surfaces. This creates a contemporary virtual laboratory environment—part sleek dashboard, part interactive science studio—where precision and clarity serve educational immersion. The typography employs generous scale and breathing room, signaling confidence and accessibility. Subtle inset highlights and carefully calibrated shadows suggest depth without visual noise, reinforcing the premium positioning of this physics simulation platform.

**Key Characteristics:**
- Deep, sophisticated dark palette anchoring the visual foundation
- High-contrast luminous surfaces for content clarity
- Generous typography scale emphasizing hierarchy and legibility
- Minimal yet purposeful use of elevation and shadow
- Clean, geometric forms with refined corner radii
- Premium, spacious layout approach
- Science-forward, tech-native aesthetic

## 2. Color Palette & Roles

### Primary
- **Primary Charcoal** (`#101113`): Primary text color, dominant interface element, foundational dark tone used across most interactive states
- **Deep Navy** (`#0E1116`): Darkest accent tone for secondary hierarchy, deeper backgrounds
- **Slate Gray** (`#2B3648`): Mid-tone dark surface, containers, alternative backgrounds

### Accent Colors
- **Dark Blue-Gray** (`#343840`): Tertiary accent, subtle backgrounds, input borders
- **Muted Slate** (`#1F2430`): Card backgrounds, layered surfaces
- **Medium Gray** (`#646D79`): Secondary text, disabled states, subtle UI elements
- **Steel Blue** (`#434F63`): Intermediate accent, hover states, visual separators
- **Soft Steel** (`#576175`): Lighter accent overlay, emphasis on secondary actions

### Interactive
- **Text on Dark** (`#101113`): All interactive element text (buttons, links, inputs)
- **Border Neutral** (`#EEF0F4`): Subtle borders, dividers, input stroke color

### Neutral Scale
- **Off-White** (`#EEF0F4`): Primary neutral text, dominant light surface background
- **Pure White** (`#FCFCFD`): Card backgrounds, highest contrast surfaces
- **Snow** (`#FFFFFF`): Accent white, special emphasis surfaces
- **Light Gray** (`#F2F2F2`): Secondary light surface, subtle backgrounds
- **Sky Light** (`#F1F4F8`): Tertiary light surface, alternative card backgrounds
- **Azure Tint** (`#F5F9FF`): Minimal tint surface, rare usage
- **Soft Divider** (`#D4DAE3`): Border divider, subtle separation lines

### Surface & Borders
- **Card Surface Light** (`#FCFCFD`): Primary card background with inset highlight
- **Card Surface Alt** (`#2B3648`): Dark card variant for contrast areas
- **Border Dark** (`#0E1116`): Subtle border at 9% opacity for light surfaces
- **Border Light** (`#EEF0F4`): Subtle border for dark surfaces

## 3. Typography Rules

### Font Family
**Primary:** Geist Variable (`font-family: "Geist Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`)

**Secondary:** Same as primary for system consistency.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display / H1 | Geist Variable | 208px | 900 | 214.24px | 0 | Hero headline, maximum visual impact, rare usage |
| Heading 2 | Geist Variable | 56px | 400 | 60.48px | 0 | Major section heading, page title context |
| Heading 3 | Geist Variable | 52.48px | 400 | 57.728px | 0 | Subsection heading, secondary page divisions |
| Body / Subtitle | Geist Variable | 27.2px | 500 | 40.8px | 0 | Large body text, taglines, prominent content |
| Span / Secondary | Geist Variable | 18px | 600 | 28px | 0 | Emphasis text, secondary headings, callouts |
| Link / Navigation | Geist Variable | 16px | 400 | 24px | 0 | Navigation links, in-text links, standard body |
| Button / Input Label | Geist Variable | 14px | 500 | 20px | 0 | Button text, input labels, small text |
| Input Placeholder | Geist Variable | 14px | 400 | 20px | 0 | Input field placeholder, helper text |

### Principles
- **Scale-First Hierarchy:** Typography size is the primary differentiator; weight is used sparingly for emphasis.
- **Generous Spacing:** Large line heights create breathing room and enhance readability, especially critical for educational content.
- **Variable Weight:** Geist Variable allows single-font flexibility; use weight 400 for body/navigation, 500 for UI controls, 600 for emphasis, 900 for hero.
- **No Letter Spacing:** All text maintains natural letter spacing for clean, modern appearance.
- **Accessibility:** Large base sizes (14px minimum) ensure legibility across devices; 27.2px body text signals premium, spacious experience.

## 4. Component Stylings

### Buttons

**Primary Button (Default State)**
- Background: `rgba(0, 0, 0, 0)` (transparent)
- Text Color: `#101113`
- Font Size: `14px`
- Font Weight: `500`
- Line Height: `20px`
- Font Family: `Geist Variable`
- Padding: `6px 10px 6px 10px`
- Border Radius: `10px`
- Border: `0px solid transparent`
- Box Shadow: `none`
- Width: `115px` (auto-fit to content recommended)
- Height: `36px`
- Hover State: Opacity increase to `0.8`, background remains transparent
- Active State: Opacity `0.6`

**Secondary Button (Ghost)**
- Background: `rgba(0, 0, 0, 0)` (transparent)
- Text Color: `#101113`
- Font Size: `14px`
- Font Weight: `500`
- Line Height: `20px`
- Padding: `6px 10px 6px 10px`
- Border Radius: `10px`
- Border: `1px solid #EEF0F4`
- Box Shadow: `none`
- Height: `36px`
- Hover State: Background `#F2F2F2`, text remains `#101113`

### Cards & Containers

**Primary Card (Light Surface)**
- Background: `#FCFCFD`
- Text Color: `#101113`
- Font Size: `16px`
- Font Weight: `400`
- Line Height: `24px`
- Padding: `28.8px`
- Border Radius: `16px`
- Border: `1px solid rgba(14, 17, 22, 0.09)` (dark border at 9% opacity)
- Box Shadow: `rgba(255, 255, 255, 0.72) 0px 1px 0px 0px inset` (subtle inset highlight)
- Width: Auto
- Hover State: Increase `md` shadow to `rgba(22, 28, 39, 0.2) 0px 10px 20px 0px`

**Dark Card Variant**
- Background: `#2B3648`
- Text Color: `#EEF0F4`
- Font Size: `16px`
- Font Weight: `400`
- Line Height: `24px`
- Padding: `28.8px`
- Border Radius: `16px`
- Border: `0px solid transparent`
- Box Shadow: `rgba(22, 28, 39, 0.2) 0px 10px 20px 0px` (md elevation)
- Width: Auto

**Accent Card Icon (Small)**
- Background: `#2B3648`
- Text Color: `#EEF0F4`
- Font Size: `16px`
- Padding: `0px`
- Border Radius: `12.8px`
- Border: `0px solid transparent`
- Box Shadow: `rgba(22, 28, 39, 0.2) 0px 10px 20px 0px`
- Width: `47.1875px`
- Height: `47.1875px`
- Display: Flex center alignment

### Inputs & Forms

**Standard Input Field**
- Background: `#FFFFFF`
- Text Color: `#101113`
- Font Size: `14px`
- Font Weight: `400`
- Line Height: `20px`
- Font Family: `Geist Variable`
- Padding: `4px 12px 4px 36px` (left padding for icon space)
- Border Radius: `10px`
- Border: `1px solid #EEF0F4`
- Box Shadow: `rgba(0, 0, 0, 0.05) 0px 1px 2px 0px`
- Height: `36px`
- Width: `320px` (or `100%` for responsive)
- Placeholder Color: `#646D79`
- Focus State: Border color to `#101113`, shadow intensifies to `rgba(0, 0, 0, 0.1) 0px 2px 4px 0px`
- Disabled State: Background `#F2F2F2`, text color `#646D79`, opacity `0.5`

**Input with Leading Icon**
- Icon Area: First `36px` reserved left padding
- Text Padding: Adjusted to `4px 12px 4px 36px` to avoid overlap

### Navigation

**Primary Navigation**
- Background: `rgba(0, 0, 0, 0)` (transparent)
- Text Color: `#101113`
- Font Size: `16px`
- Font Weight: `400`
- Line Height: `24px`
- Font Family: `Geist Variable`
- Padding: `0px` (spacing handled by layout gap)
- Border Radius: `0px` (underline style)
- Border: `0px solid transparent`
- Box Shadow: `none`
- Width: Auto
- Height: `36px`
- Active Link: Text color `#101113`, underline `2px solid #101113`
- Hover State: Text opacity `0.7`, underline appears

**Navigation Link**
- Background: `rgba(0, 0, 0, 0)`
- Text Color: `#101113`
- Font Size: `16px`
- Font Weight: `400`
- Line Height: `24px`
- Padding: `0px`
- Border Radius: `0px`
- Border: `0px solid transparent`
- Box Shadow: `none`
- Hover State: Opacity `0.7`, text-decoration `underline`

### Links

**Standard Link**
- Background: `rgba(0, 0, 0, 0)` (transparent)
- Text Color: `#101113`
- Font Size: `16px`
- Font Weight: `400`
- Line Height: `24px`
- Padding: `0px`
- Border Radius: `0px`
- Border: `0px solid transparent`
- Box Shadow: `none`
- Hover State: Text color `#343840`, text-decoration `underline`
- Active State: Text color `#646D79`

**Button-Style Link**
- Background: `rgba(0, 0, 0, 0)` (transparent)
- Text Color: `#101113`
- Font Size: `14px`
- Font Weight: `500`
- Line Height: `20px`
- Padding: `6px 10px 6px 10px`
- Border Radius: `10px`
- Border: `0px solid transparent`
- Box Shadow: `none`
- Height: `36px`
- Hover State: Background `#F2F2F2`, text remains `#101113`

## 5. Layout Principles

### Spacing System

**Base Unit:** `4px`

**Spacing Scale:**
- **xs:** `4px` – microspacing, tight gaps between icon/text pairs
- **sm:** `8px` – small spacing, component internal gaps
- **md:** `12px` – medium spacing, standard component padding
- **lg:** `16px` – large spacing, button padding, form field padding
- **xl:** `20px` – extra-large spacing, section gaps, card margins
- **2xl:** `28px` – double-large, card internal padding, container padding
- **3xl:** `36px` – triple-large, section margins, layout divisions
- **4xl:** `48px` – quadruple-large, major section gaps
- **5xl:** `56px` – spacing for major layout sections, large container padding
- **6xl:** `64px` – hero spacing, large margins between page sections
- **7xl:** `72px` – extra-large hero padding
- **8xl:** `80px` – maximum spacing, page-level separation

**Usage Context:**
- Component gaps: `4px`, `8px`, `12px`
- Button/input padding: `16px`
- Card internal padding: `28px` to `72px` depending on card type
- Section margins: `36px` to `80px` depending on visual weight

### Grid & Container

**Max Width:** `1400px` (inferred for dashboard/content container)

**Column Strategy:** 12-column grid system
- Mobile: Single column with `16px` margins
- Tablet: 6-column with `20px` margins
- Desktop: 12-column with `36px` margins

**Section Patterns:**
- Hero Section: Full-width, centered content, `80px` vertical padding
- Content Section: Max-width container, `64px` vertical spacing between sections
- Card Grid: 4 columns desktop, 2 columns tablet, 1 column mobile, `20px` gap between cards
- Navigation Bar: Full-width sticky, `16px` horizontal padding

### Whitespace Philosophy

Lab029s embraces generous whitespace as a sign of premium, premium experience. Ample vertical and horizontal breathing room reduces cognitive load, drawing focus to content hierarchy. Large typography naturally enforces spacing; minimal visual density signals confidence and clarity. Between major sections, use `64px` to `80px` gaps. Between component groups, use `36px` to `48px`. Never compress spacing below the semantic minimum; air matters as much as content.

### Border Radius Scale

- **0px:** Inputs, navigation dividers, raw data displays
- **10px:** Buttons, small interactive elements, compact inputs
- **12.8px:** Accent cards, icon containers, medium-scale components
- **16px:** Primary cards, large containers, standard modal windows

### Border Widths

- **Thin (1px):** Input fields, light card borders, subtle dividers
- **Medium (2px):** Active link underlines, focus states, emphasis borders
- **Thick (4px):** Primary CTA borders (if not transparent), accent separators

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Base (0) | No shadow | Text, flat backgrounds, icons |
| Raised (sm) | `rgba(255, 255, 255, 0.72) 0px 1px 0px 0px inset` | Light cards, subtle inset highlight |
| Floating (md) | `rgba(22, 28, 39, 0.2) 0px 10px 20px 0px` | Dark cards, hover states, floating containers |
| Overlay (lg) | `rgba(0, 0, 0, 0.05) 0px 1px 2px 0px` | Input fields, subtle overlay depth |

**Shadow Philosophy:**

Lab029s shadows are minimal and purposeful. Rather than stacking multiple shadows, the system uses single, precise shadow values tied to semantic elevation levels. Light surfaces use inset highlights (`sm`) to suggest subtle separation from the white background. Dark cards employ a single, soft drop shadow (`md`) to float above the page. Input fields receive minimal overlay depth (`lg`) to indicate interactivity without visual noise. This restrained approach reinforces the premium, science-forward aesthetic.

### Opacity Levels

- **Full (1.0):** All primary content, interactive elements
- **Hover (0.8):** Buttons, links on hover state
- **Active (0.6):** Buttons, links in pressed state
- **Disabled (0.5):** Inactive buttons, disabled inputs
- **Placeholder (0.4):** Input placeholder text, secondary hints
- **Border (0.09):** Subtle dark borders on light cards
- **Overlay (0.05):** Minimal shadow overlay depth

### Z-index / Layering

- **Base Content:** `z-index: 1` (standard page content, cards)
- **Sticky/Fixed:** `z-index: 2` (sticky navigation, fixed sidebars)
- **Floating Elements:** `z-index: 3` (floating action buttons, anchored tooltips)
- **Dropdown/Popover:** `z-index: 10` (dropdown menus, select boxes, popovers)
- **Modal/Dialog:** `z-index: 50` (modal windows, full-screen overlays)

## 7. Do's and Don'ts

### Do

- **Use the spacing scale consistently.** Always reach for values from the 8px base unit scale; never create arbitrary spacing.
- **Maintain high contrast ratios.** Dark text on light surfaces and light text on dark surfaces. Test at WCAG AA minimum.
- **Respect typography hierarchy.** Let size do the work; avoid mixing multiple font sizes in a single component.
- **Leverage generous padding.** Cards, inputs, and buttons should feel spacious; aim for at least `16px` internal padding.
- **Apply shadows sparingly.** Use `sm` for light cards, `md` for dark cards, `lg` for inputs. Do not layer multiple shadows.
- **Keep border radius consistent.** Use `10px` for buttons and small inputs, `16px` for large cards and modals.
- **Test component states.** Define hover, active, focus, and disabled states for all interactive elements.
- **Prioritize accessibility.** Color alone should never convey meaning; pair with text, icons, or patterns.

### Don't

- **Don't mix font weights casually.** Stick to 400 for body, 500 for buttons, 600 for emphasis, 900 only for hero display.
- **Don't compress spacing below the semantic minimum.** If it feels cramped, it probably is; default to generous spacing.
- **Don't create custom colors.** Use only the defined palette; this ensures cohesion and maintainability.
- **Don't use full black (`#000000`) for text.** Use `#101113` instead; it's softer and more refined.
- **Don't apply multiple box-shadows.** Each component has one shadow value; layering creates visual noise.
- **Don't ignore border radii.** Rounded corners are a key part of Lab029s identity; apply them consistently.
- **Don't hardcode pixel values outside the spacing/radius scales.** Future designers and developers need predictability.
- **Don't forget disabled states.** Every interactive element must have a clear, distinct disabled appearance.

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile (xs) | 320px – 479px | Single column, `16px` margins, 1-column card grid |
| Mobile (sm) | 480px – 639px | Still single column, `16px` margins, touch target `44px` minimum |
| Tablet (md) | 640px – 1023px | 2-column card grid, `20px` margins, navigation wraps to mobile menu |
| Laptop (lg) | 1024px – 1279px | 3–4 column card grid, `28px` margins, full navigation visible |
| Desktop (xl) | 1280px – 1919px | 4-column card grid, `36px` margins, max-width container active |
| Ultra-wide (2xl) | 1920px+ | 4-column card grid capped at `1400px`, `36px` outer margins |

### Touch Targets

- **Minimum Size:** `44px × 44px` for all interactive elements (buttons, links, form controls)
- **Recommended Size:** `48px × 48px` or larger for high-traffic interaction points
- **Spacing Between Targets:** Minimum `8px` gap to avoid accidental taps
- **Button Padding:** Current `6px 10px` produces `36px` height; increase padding on mobile if needed to reach `44px`

### Collapsing Strategy

- **Typography:** Scale headings down by 20–30% on tablet; by 30–40% on mobile. Maintain minimum `16px` for body text.
- **Spacing:** Reduce padding/margin by 1 step (e.g., from `28px` to `20px`) on tablet; by 2 steps on mobile.
- **Cards:** On mobile, reduce internal padding from `28.8px` to `16px`. Stack columns vertically.
- **Navigation:** Hide secondary nav on tablet; collapse into hamburger menu. Show full nav only on desktop.
- **Inputs:** Reduce width from `320px` to `100%` on mobile. Maintain `14px` font size for legibility.
- **Buttons:** Allow buttons to expand to `100%` width on mobile if full-width CTA; shrink to `auto` on desktop.

## 9. Agent Prompt Guide

### Quick Color Reference

- **Primary CTA / Buttons:** Text on Dark (`#101113`)
- **Primary Surface / Card Background:** Pure White (`#FCFCFD`)
- **Alternative Card Surface:** Slate Gray (`#2B3648`) with light text (`#EEF0F4`)
- **Heading / Primary Text:** Primary Charcoal (`#101113`)
- **Body / Secondary Text:** Off-White (`#EEF0F4`) on dark, Primary Charcoal (`#101113`) on light
- **Input Background:** Pure White (`#FFFFFF`)
- **Input Border:** Border Neutral (`#EEF0F4`)
- **Disabled / Tertiary Text:** Medium Gray (`#646D79`)
- **Card Border:** Dark border at 9% opacity (`rgba(14, 17, 22, 0.09)`)
- **Navigation / Link Text:** Primary Charcoal (`#101113`)

### Iteration Guide

1. **Color Foundation:** All interactive text defaults to `#101113`; all light surfaces default to `#FCFCFD`; all dark surfaces default to `#2B3648`. No exceptions without design sign-off.

2. **Spacing Discipline:** Every margin, padding, and gap must come from the `4px` base scale. Permitted values: `4px`, `8px`, `12px`, `16px`, `20px`, `28px`, `36px`, `48px`, `56px`, `64px`, `72px`, `80px` only.

3. **Typography Precision:** Geist Variable at exact sizes: `14px` (buttons/inputs), `16px` (nav/links), `18px` (emphasis), `27.2px` (body), `52.48px` (H3), `56px` (H2), `208px` (H1). No interpolation or custom sizes.

4. **Border Radius Consistency:** Apply `10px` to all buttons and small inputs, `12.8px` to accent icon cards, `16px` to standard cards and modals, `0px` to navigation and raw displays.

5. **Shadow Precision:** Use only three shadow levels: `sm` (inset highlight on light cards), `md` (drop shadow on dark cards/hovers), `lg` (minimal overlay on inputs). Never layer or customize shadows.

6. **Component State Coverage:** Every button, input, link, and interactive element must define hover, active, focus, and disabled states. Hover always increases opacity or applies background change; disabled always dims to `0.5` opacity or `#646D79` text.

7. **Accessibility Priority:** Ensure 4.5:1 contrast ratio minimum on all text. Color alone must never convey state; pair with text labels, icons, or explicit visual indicators (underlines, borders, badges).

8. **Responsive Breakpoints:** Use the defined `xs`, `sm`, `md`, `lg`, `xl`, `2xl` breakpoints only. Adjust typography by 20–40%, spacing by 1–2 steps, grid from 4 columns → 2 columns → 1 column as screen shrinks.

9. **Premium Whitespace Philosophy:** Generous padding, wide line heights, and ample section gaps signal quality. Never compress components; air is as important as content. When in doubt, add spacing, not remove it.

10. **Shadow & Elevation Restraint:** Lab029s eschews complex, multi-layered shadows. Each elevation level has one precise shadow value. Dark cards float with `md`; light cards define depth with inset `sm` highlights. Inputs receive minimal `lg` overlay only.