---
version: alpha
name: Craft Soft Editorial
description: A light, airy productivity system with expressive serif headlines, soft cloudlike surfaces, and restrained black accents.
colors:
  primary: "#030302"
  secondary: "#427E8A"
  tertiary: "#D7EAF0"
  neutral: "#FCF9F7"
  surface: "#FFFFFF"
  on-surface: "#030302"
  muted-surface: "#F3F1EE"
  border: "#03030217"
  error: "#D94A4A"
  accent: "#A9D8F2"
typography:
  headline-display:
    fontFamily: UntitledSerifFont
    fontSize: 74px
    fontWeight: 400
    lineHeight: 74px
    letterSpacing: -2.22px
  headline-lg:
    fontFamily: UntitledSerifFont
    fontSize: 62px
    fontWeight: 400
    lineHeight: 74px
    letterSpacing: -1.68px
  headline-md:
    fontFamily: UntitledSerifFont
    fontSize: 52px
    fontWeight: 400
    lineHeight: 61px
    letterSpacing: -1.5px
  headline-sm:
    fontFamily: UntitledSansFont
    fontSize: 43px
    fontWeight: 400
    lineHeight: 52px
    letterSpacing: 0.16px
  body-xl:
    fontFamily: UntitledSerifFont
    fontSize: 36px
    fontWeight: 400
    lineHeight: 54px
    letterSpacing: -1.44px
  body-lg:
    fontFamily: UntitledSansFont
    fontSize: 20px
    fontWeight: 400
    lineHeight: 30px
    letterSpacing: 0px
  body-md:
    fontFamily: UntitledSansFont
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  body-sm:
    fontFamily: UntitledSansFont
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  label-lg:
    fontFamily: UntitledSansFont
    fontSize: 16px
    fontWeight: 500
    lineHeight: 24px
    letterSpacing: 0px
  label-md:
    fontFamily: UntitledSansFont
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0px
  label-sm:
    fontFamily: UntitledSansFont
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0.02em
  caption:
    fontFamily: UntitledSansFont
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0px
  link:
    fontFamily: UntitledSansFont
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
rounded:
  none: 0px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  full: 9999px
spacing:
  xs: 6px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 60px
  gutter: 32px
  section: 96px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.full}"
    padding: "16px 32px"
    height: "56px"
  button-primary-hover:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.full}"
    padding: "16px 32px"
    height: "56px"
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.link}"
    rounded: "{rounded.none}"
    padding: "0px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  chip:
    backgroundColor: "{colors.muted-surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "8px 12px"
  navbar:
    backgroundColor: "rgba(255,255,255,0.78)"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.full}"
    padding: "12px 20px"
---

# Craft Soft Editorial

## Overview
Craft feels playful, calm, and premium at the same time: a productivity brand wrapped in a dreamy, sky-like atmosphere. The interface is spacious and open, with a strong editorial voice driven by oversized serif typography and soft, floating UI surfaces. It targets creative professionals and knowledge workers who want note-taking and task management to feel inspiring rather than utilitarian.

## Colors
- **Primary (#030302):** A near-black ink used for core text, key UI chrome, and the strongest call-to-action buttons. It gives the system its contrast and editorial seriousness.
- **Secondary (#427E8A):** A muted teal accent that can support secondary emphasis, links, and subtle branded details without overpowering the scene.
- **Tertiary (#D7EAF0):** A pale blue support tone that fits the cloudlike background and can be used for soft panels or gentle hover states.
- **Neutral (#FCF9F7):** The warm off-white page background that keeps the whole system light, airy, and tactile.
- **Surface (#FFFFFF):** Pure white for cards, windows, and elevated containers that need to feel crisp against the pastel backdrop.
- **On-surface (#030302):** The default text and icon color on light surfaces, ensuring high legibility with the same ink-like tone as primary.
- **Muted-surface (#F3F1EE):** A quiet warm gray for secondary surfaces, disabled states, and low-priority UI backgrounds.
- **Border (#03030217):** A very faint translucent border tone for outlines and dividers; it keeps structure visible without feeling hard.
- **Accent (#A9D8F2):** A brighter sky-blue accent that supports the cloud motif and decorative highlights.
- **Error (#D94A4A):** Reserved for destructive states and validation, kept distinct from the otherwise tranquil palette.

## Typography
The system uses two voices: UntitledSerifFont for expressive editorial content and UntitledSansFont for interface text. Headlines are intentionally large, light in weight, and tightly tracked to create a refined magazine-like presence; the main hero style is the strongest example of this treatment. Body copy uses the serif font for long-form storytelling and the sans font for UI labels, navigation, and controls where clarity matters more than drama.

Use the serif family for large narrative moments such as landing-page headlines and promotional copy. Use the sans family for buttons, navigation, metadata, card labels, and compact content summaries. Uppercase styling is not a core pattern in the screenshot; instead, the system relies on size, spacing, and weight for hierarchy. Letter spacing is slightly negative in the largest serif styles, which helps the oversized titles feel elegant rather than loose.

## Layout & Spacing
The layout is centered and presentation-led, with a wide hero area and a single dominant focal point. A large, fluid canvas sits behind a floating navigation pill and a centered hero content block, while the lower section introduces overlapping cards and illustrated elements for depth and motion. Spacing is generous and breathable, with the scale in 6px, 16px, 24px, 40px, and 60px increments to preserve the soft rhythm of the page.

Use wide horizontal padding for major sections and keep containers visually centered rather than edge-to-edge dense. Cards and modals should use internal padding around 24px, while primary actions often use 16px vertical and 32px horizontal padding. Section spacing should feel expansive, with large gaps between the header, hero copy, CTA, and supporting visuals.

## Elevation & Depth
Depth is achieved with soft shadows, translucency, and layering rather than hard borders or dramatic z-axis contrast. Navigation and cards float above the background with subtle blur-like lightness, and outlines remain faint so the interface never feels heavy. The visual language is more “hovering paper” than “stacked material.”

Use shadow sparingly and keep it diffuse; the goal is a gentle lift, not a dense drop shadow. Surfaces should remain mostly flat, with elevation communicated through white fill, soft border tint, and overlap. Avoid dark, harsh, or highly directional shadows unless a component needs a special emphasis state.

## Shapes
The corner radius language is rounded and friendly, with a strong preference for pill shapes on buttons and the top navigation. Cards and panels use generous rounding that softens the overall composition and echoes the cloud imagery. The result is approachable and tactile, not rigid or architectural.

Use `rounded.full` for major CTAs and floating pills, `rounded.lg` for cards, and `rounded.md` for inputs or smaller controls. Sharp corners should be reserved for structural edges only when needed. Overall, shapes should feel soft, buoyant, and lightly inflated.

## Components
Buttons are highly polished and minimal. Primary buttons (`button-primary`) use a solid black fill, white text, full rounding, and a 56px height; this is the dominant call-to-action treatment. Secondary buttons (`button-secondary`) use a white or transparent surface with dark text and the same pill shape, keeping them prominent but quieter than primary actions. Tertiary actions (`button-tertiary`) should read like links or lightweight text controls with no fill and no visual heaviness. Button states should preserve the same rounded geometry and rely on subtle color shifts rather than aggressive animation.

Cards should be white, softly rounded, and lightly shadowed, with `card` padding around 24px. They should feel like floating notebooks or window panes, not rigid containers. Keep internal spacing consistent and avoid cluttering card surfaces with too many competing accents.

Inputs should mirror the card language: light background, subtle border, rounded corners, and compact sans typography. Focus states can use the secondary teal or a slightly stronger border tint, but they should remain understated. Placeholder and helper text should remain quiet and legible.

The top navigation behaves like a floating toolbar: translucent, pill-shaped, and horizontally centered. Links are simple and text-forward, with the brand mark on the left and a primary CTA on the right. Chips, tags, and small labels should use muted fills and medium-weight sans text to stay readable without dominating the page. Lists and sidebar items should remain compact, icon-led, and lightly separated rather than boxed.

## Do's and Don'ts
- Do keep the interface airy, centered, and editorial, with generous whitespace around major messages.
- Do use the serif font for hero headlines and the sans font for controls, navigation, and metadata.
- Do keep buttons pill-shaped and restrained, with black primary actions and quiet secondary alternatives.
- Do use soft shadows and faint borders to suggest floating layers instead of heavy elevation.
- Don't introduce sharp corners or angular component styling that fights the soft cloud-like mood.
- Don't overuse saturated colors; the palette should stay mostly light with black used for contrast.
- Don't turn body text into the serif display style when the content is functional or dense.
- Don't make cards or panels visually heavy; they should feel light, translucent, and calmly stacked.