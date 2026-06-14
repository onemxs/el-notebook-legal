---
name: Lex Lux Intelligencia
colors:
  surface: '#fbf9f3'
  surface-dim: '#dcdad4'
  surface-bright: '#fbf9f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ee'
  surface-container: '#f0eee8'
  surface-container-high: '#eae8e2'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c19'
  on-surface-variant: '#43474e'
  inverse-surface: '#30312d'
  inverse-on-surface: '#f2f1eb'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f86'
  primary: '#000e24'
  on-primary: '#ffffff'
  primary-container: '#022448'
  on-primary-container: '#728cb6'
  inverse-primary: '#adc8f4'
  secondary: '#605e5b'
  on-secondary: '#ffffff'
  secondary-container: '#e3dfdb'
  on-secondary-container: '#64625f'
  tertiary: '#180c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#342000'
  on-tertiary-container: '#ac844b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#adc8f4'
  on-primary-fixed: '#001c3b'
  on-primary-fixed-variant: '#2d486d'
  secondary-fixed: '#e6e2de'
  secondary-fixed-dim: '#cac6c2'
  on-secondary-fixed: '#1c1b19'
  on-secondary-fixed-variant: '#484644'
  tertiary-fixed: '#ffddb2'
  tertiary-fixed-dim: '#edbf7f'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#60410c'
  background: '#fbf9f3'
  on-background: '#1b1c19'
  surface-variant: '#e4e2dd'
  surface-paper: '#fbf9f3'
  surface-card: '#ffffff'
  border-subtle: '#e4e2dd'
  status-critical: '#ba1a1a'
  status-active: '#22c55e'
  ink-deep: '#1b1c18'
typography:
  display-xl:
    fontFamily: EB Garamond
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: EB Garamond
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
  headline-md:
    fontFamily: EB Garamond
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-reading:
    fontFamily: EB Garamond
    fontSize: 19px
    fontWeight: '400'
    lineHeight: 32px
  ui-medium:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  ui-small:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
  data-tabular:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 16px
  reading-width: 720px
  sidebar-width: 256px
---

## Brand & Style

The brand identity is rooted in **Academic Luxury and Legal Authority**. It targets high-end legal professionals who require a tool that feels as established as a physical law library but as sharp as modern AI. 

The design style is a hybrid of **Modern Corporate** and **Editorial Minimalism**. It utilizes a "light mode" parchment-inspired foundation to evoke the feel of high-quality legal bond paper, paired with precision-engineered UI elements. The emotional response is one of calm, focused intelligence, reliability, and institutional prestige. Visuals are characterized by generous whitespace, asymmetric grid layouts, and a sophisticated mix of serif and sans-serif typography.

## Colors

The palette is anchored by **Deep Midnight Blue (#022448)**, representing stability and legal tradition. This is supported by a range of warm neutrals that move away from cold digital grays toward "Paper" and "Parchment" tones.

- **Primary**: Used for core branding, active navigation states, and primary action buttons.
- **Secondary**: A muted graphite used for body text and metadata to maintain high legibility without overwhelming the primary brand color.
- **Surface**: The background uses a creamy off-white (#fbf9f3) to reduce eye strain during long reading sessions.
- **Accent/Status**: Critical alerts use a sophisticated brick red (#ba1a1a), while active indicators use a vibrant emerald to denote real-time data updates.

## Typography

The typographic system relies on a high-contrast pairing:
1. **EB Garamond (Serif)**: Used for all "content" roles—headlines, hero statements, and long-form reading. It provides the authoritative, scholarly tone essential for legal work.
2. **Hanken Grotesk (Sans-Serif)**: Used for all "functional" roles—labels, navigation, buttons, and data tables. It ensures clarity and modern precision.

**Scaling**: For mobile devices, `display-xl` should scale down to `32px` with a `40px` line height to maintain readability without excessive wrapping. All `label-caps` must be rendered in uppercase with the specified letter spacing for a premium, architectural feel.

## Layout & Spacing

The layout utilizes a **Fixed Sidebar with a Fluid Content Area**. 

- **Grid**: A 12-column grid is employed for the main content area, but it is often used asymmetrically (e.g., a 7-column main span paired with a 5-column utility span).
- **Rhythm**: A 4px baseline grid ensures vertical consistency.
- **Margins**: Generous 64px desktop margins create an editorial feel, while mobile margins compress to 16px.
- **Constraints**: Reading-heavy content (text blocks) should be constrained to a max-width of 720px to ensure optimal line length (CPL).

## Elevation & Depth

Depth is achieved through **Tonal Layering and Subtle Tactility** rather than aggressive shadows.

1. **The Canvas**: The base level is the `background` (#fbf9f3).
2. **The Containers**: Cards and sidebars use `surface-card` (#ffffff) with a 1px border (#e4e2dd) to distinguish themselves.
3. **The Shadows**: When elevation is needed (e.g., hover states), use an extremely diffused ambient shadow: `0 10px 25px -5px rgba(0,0,0,0.05)`.
4. **Tactile Insets**: Interactive elements like buttons use a subtle `inset 1px 0 rgba(255,255,255,0.8)` to create a pressed or "stamped" physical effect.

## Shapes

The shape language is "Variably Rounded":
- **Standard Cards**: Use a `rounded-3xl` (1.5rem / 24px) corner radius to soften the high-density data.
- **Action Buttons & Chips**: Use a full `rounded-full` (pill) shape to distinguish them as highly interactive, "touchable" elements.
- **Inputs & Smaller Containers**: Adhere to the base `roundedness: 2` (0.5rem) for a crisp, professional look.
- **Upload Zones**: Use specialized `2rem` rounding to emphasize their distinct functional role.

## Components

### Buttons
- **Tactile Primary**: Deep blue background, white Hanken Grotesk caps, pill-shaped. Must include a subtle inset top-shadow to feel "physical."
- **Ghost/Outline**: Transparent background with a 1px border. Used for secondary actions in the sidebar or footer.

### Cards (Luxury Variant)
- White background, 1px subtle border, high corner radius (24px).
- Internal padding should be a minimum of 24px.
- Hover state: Border shifts to Primary Blue, and the card lifts slightly using the ambient shadow defined in Elevation.

### Chips
- Small, pill-shaped containers with 1px borders. 
- Used for categorization (e.g., Law branches like "Civil" or "Penal").
- Interaction: Fill with Primary Blue on hover.

### Navigation Sidebar
- Light gray/parchment background (#f5f3ee).
- Active state: White background with a 4px Primary Blue left-border accent.
- Icons: Use Material Symbols Outlined with a weight of 300 for a delicate, premium look.

### Input Fields / Upload Zones
- Use dashed borders for drop zones to indicate "empty state" or "utility."
- Group-hover transitions should be smooth (300ms) to reinforce the high-end feel.