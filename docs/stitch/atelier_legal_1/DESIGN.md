---
name: Atelier Legal
colors:
  surface: '#fbf9f3'
  surface-dim: '#dcdad4'
  surface-bright: '#fbf9f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ed'
  surface-container: '#f0eee8'
  surface-container-high: '#eae8e2'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c18'
  on-surface-variant: '#43474e'
  inverse-surface: '#30312d'
  inverse-on-surface: '#f3f1eb'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f87'
  primary: '#022448'
  on-primary: '#ffffff'
  primary-container: '#1e3a5f'
  on-primary-container: '#8aa4cf'
  inverse-primary: '#adc8f5'
  secondary: '#605e5b'
  on-secondary: '#ffffff'
  secondary-container: '#e6e2de'
  on-secondary-container: '#666461'
  tertiary: '#341f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#503300'
  on-tertiary-container: '#c69b5f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#adc8f5'
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
  on-background: '#1b1c18'
  surface-variant: '#e4e2dd'
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
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  reading-width: 720px
---

## Brand & Style
The design system embodies a "digital legal atelier," specifically tailored for high-end Mexican legal practice. The brand personality is expensive, restrained, and profoundly editorial, favoring the quiet authority of a well-bound legal brief over the noisy aesthetics of modern SaaS.

The visual style is a fusion of **Minimalism** and **Modern Editorial**. It rejects generic software tropes in favor of:
- **Asymmetric Layouts:** Intentional imbalance to guide the eye through complex legal arguments.
- **Structural Hairlines:** 1px borders provide architectural definition without adding visual weight.
- **Generous Whitespace:** Utilizing "luxury of space" to reduce cognitive load during intense reading and drafting.
- **Sophisticated Restraint:** A rejection of shadows and gradients in favor of flat, tonal layering.

## Colors
The palette is inspired by traditional legal stationery and archival paper.
- **Canvas:** The primary background uses a warm "bone" (#F4F2EC) to reduce eye strain compared to pure white.
- **Reading Surface:** A dedicated tint (#FBF9F4) is reserved for document viewing areas to mimic premium paper stock.
- **Ink & Navy:** Navigation and primary actions use a deep Navy-Ink (#1E3A5F) for a sense of establishment and trust.
- **Status Tones:** Success, Danger, and Warning colors are desaturated and "burnt," ensuring they fit the historical editorial aesthetic rather than appearing like digital alerts.

## Typography
The typographic hierarchy prioritizes legibility and prestige.
- **Serif (EB Garamond):** Used for all long-form legal reading and high-level headings. It brings an authoritative, "printed" quality to the digital screen.
- **Grotesque (Hanken Grotesk):** Used for the functional UI—menus, buttons, and metadata. This creates a clear distinction between the "tool" and the "content."
- **Small-Caps Labels:** Metadata such as "FECHA DE REGISTRO" or "EXPEDIENTE" must be rendered in Hanken Grotesk Small-Caps with generous letter spacing (10%) to evoke traditional filing systems.
- **Tabular Figures:** All numerical data, particularly article numbers and dates, must use tabular figures to maintain vertical alignment in lists.

## Layout & Spacing
The layout system follows a **Fixed Grid** philosophy with asymmetric anchoring.
- **Desktop:** A 12-column grid where the primary reading column is off-center, typically occupying columns 3 through 9, leaving a wide right margin for annotations or metadata.
- **Margins:** Generous outer margins (64px) ensure the content feels framed rather than trapped.
- **Rhythm:** All vertical spacing must be a multiple of 4px. Use larger gaps (48px+) between major sections to emphasize the editorial "breathing room."
- **Mobile:** Transition to a single-column layout with 16px margins, but maintain the 1px hairline separators to preserve the structural aesthetic.

## Elevation & Depth
This design system avoids shadows entirely. Depth is communicated through **Tonal Layering** and **Line Work**:
- **Layer 0 (Canvas):** The base bone-colored background.
- **Layer 1 (Surfaces):** Ivory or White surfaces used for cards or secondary navigation.
- **Separation:** Divisions are marked strictly by 1px hairlines in `#E6E3DC`.
- **Active State:** No "lifting" effect. Active or hovered elements are indicated by a subtle fill color change (e.g., from Ivory to pure White) or a 1.5px weight increase in the hairline border.

## Shapes
The shape language is **Sharp (0px)**.
Every element—from buttons to input fields to container cards—must have 90-degree corners. This evokes the precision of legal documents and architectural plans. Circular shapes are strictly forbidden, with the exception of specific status indicators (dots) or avatars.

## Components
- **Buttons:** Rectangular with 1px borders. Primary buttons use a solid Navy-Ink (#1E3A5F) fill with White text. Ghost buttons use a 1px Hairline border with Navy text.
- **Input Fields:** Bottom-border only (border-bottom: 1px solid #E6E3DC) to mimic a physical signature line. Labels sit above in Small-Caps.
- **Cards:** No shadows. Defined by 1px Hairline borders and an Ivory background. Used sparingly for grouping related metadata.
- **Icons:** 1.5px stroke weight, sharp corners, non-rounded terminals. Use thin-line iconography that feels like architectural symbols.
- **Lists:** Traditional list items separated by full-bleed hairlines. Use "Mexican Spanish" for all labels (e.g., *Guardar*, *Cancelar*, *Borradores*).
- **Chips:** Rectangular tags with a very light tint fill (#E6E3DC) and small-caps text.