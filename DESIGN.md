---
version: "alpha"
name: Chatbot Template
description: >-
  Calm, single-accent chat interface on warm neutrals, built from Material UI
  with Geist type, in matching light and dark schemes.
colors:
  primary: "#256352"
  on-primary: "#ffffff"
  background: "#f7f7f2"
  surface: "#ffffff"
  surface-hover: "#edede8"
  text: "#242923"
  text-secondary: "#646b62"
  divider: "#dedfd7"
  error: "#d32f2f"
  code-background: "#f6f8fa"
  code-text: "#24292e"
  code-border: "#d8dfda"
  inline-code-background: "#f5f5f5"
  dark-primary: "#a6d7be"
  dark-on-primary: "#17271f"
  dark-background: "#171b18"
  dark-surface: "#202621"
  dark-surface-hover: "#2a2d2a"
  dark-text: "#edf0e8"
  dark-text-secondary: "#adb6a9"
  dark-divider: "#3b443c"
  dark-error: "#ff7a6e"
  dark-code-background: "#1e1e1e"
  dark-code-text: "#c9d1d9"
  dark-code-border: "#353d39"
  dark-inline-code-background: "#2d2d2d"
typography:
  display:
    fontFamily: Geist
    fontSize: 3.75rem
    fontWeight: 450
    lineHeight: 1.1
    letterSpacing: -0.055em
  display-mobile:
    fontFamily: Geist
    fontSize: 2.5rem
    fontWeight: 450
    lineHeight: 1.1
    letterSpacing: -0.055em
  title:
    fontFamily: Geist
    fontSize: 0.95rem
    fontWeight: 600
    letterSpacing: -0.025em
  body:
    fontFamily: Geist
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.75
  body-small:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: 400
  label:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: 500
  caption:
    fontFamily: Geist
    fontSize: 0.75rem
    fontWeight: 400
  overline:
    fontFamily: Geist
    fontSize: 0.75rem
    fontWeight: 400
    letterSpacing: 0.16em
  code:
    fontFamily: Geist Mono
    fontSize: 0.875rem
rounded:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 24px
  pill: 96px
spacing:
  unit: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  touch-target: 44px
  content-max-width: 920px
components:
  page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
  composer:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: 16px
  button-send:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    size: 44px
  button-suggestion:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 16px
  button-suggestion-hover:
    backgroundColor: "{colors.surface-hover}"
  button-jump-to-latest:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: 44px
  user-message:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    padding: 12px 20px
  assistant-label:
    textColor: "{colors.primary}"
    typography: "{typography.caption}"
  code-block:
    backgroundColor: "{colors.code-background}"
    textColor: "{colors.code-text}"
    typography: "{typography.code}"
    rounded: "{rounded.sm}"
    padding: 16px
  inline-code:
    backgroundColor: "{colors.inline-code-background}"
    textColor: "{colors.text}"
    typography: "{typography.code}"
    rounded: "{rounded.xs}"
    padding: 2px 4px
  helper-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.caption}"
  validation-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.error}"
    typography: "{typography.caption}"
  dark-page:
    backgroundColor: "{colors.dark-background}"
    textColor: "{colors.dark-text}"
  dark-user-message:
    backgroundColor: "{colors.dark-surface-hover}"
    textColor: "{colors.dark-text}"
  dark-helper-text:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text-secondary}"
  dark-validation-error:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-error}"
  dark-composer:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-text}"
  dark-button-send:
    backgroundColor: "{colors.dark-primary}"
    textColor: "{colors.dark-on-primary}"
  dark-code-block:
    backgroundColor: "{colors.dark-code-background}"
    textColor: "{colors.dark-code-text}"
  dark-inline-code:
    backgroundColor: "{colors.dark-inline-code-background}"
    textColor: "{colors.dark-text}"
---

## Overview

A quiet workspace for thinking out loud ("Space to think."). One green accent,
warm off-white and green-tinted charcoal neutrals, generous line height, and
hairline borders keep attention on the conversation rather than the chrome.

The tokens above document the implementation; the source of truth is code:

| Concern                           | Source                                                       |
| --------------------------------- | ------------------------------------------------------------ |
| Palette, type, shape, MUI options | [`frontend/client/theme.ts`](frontend/client/theme.ts)       |
| Fonts, global rules, motion       | [`frontend/app/styles.css`](frontend/app/styles.css)         |
| Markdown, code, syntax colors     | [`frontend/app/markdown.css`](frontend/app/markdown.css)     |
| Behavior and accessibility rules  | [Frontend guide](docs/frontend.md)                           |
| Rendered reference                | [Interface screenshots](docs/frontend.md#interface)          |

Change the code first, then update the matching tokens here. Tokens prefixed
`dark-` are the dark-scheme values of the unprefixed token. `surface-hover` is
MUI's translucent `action.hover` overlay, recorded as its blended color on the
page background.

## Colors

- **Primary** (`#256352` light, `#a6d7be` dark) is the only accent. Use it for
  the send button, focus and hover borders, the assistant label, the overline,
  and the header glyph. Do not add a second accent.
- **Background** is warm off-white (`#f7f7f2`) or green-tinted charcoal
  (`#171b18`); **surface** (`#ffffff` / `#202621`) lifts the composer and menus.
- **Text** has two levels: primary for content, secondary for captions, hints,
  icons, and metadata.
- **Divider** draws every border and separator.
- **Error** keeps MUI's light red; dark mode overrides it with `#ff7a6e`
  because the default fails WCAG AA on the dark surface.
- Every pairing must meet WCAG AA in both schemes, including helper, disabled,
  and error text.
- In components, reference palette roles through `sx` (`"text.secondary"`,
  `"divider"`, `"action.hover"`), never hex values. Raw colors belong only in
  `markdown.css`, written as `light-dark()` pairs. Those pairs depend on the
  `.markdown` `color-scheme` declarations; keep them.
- Syntax highlighting uses GitHub's highlight.js palettes, adjusted for AA
  contrast on the code backgrounds.

## Typography

- Geist for the interface and Geist Mono for code, both bundled locally as
  variable fonts with `font-display: swap`. Do not load fonts from a CDN.
- Body text is 1rem at 1.75 line height; this airy rhythm defines the reading
  experience.
- The welcome headline is the only display type: weight 450, tight
  `-0.055em` tracking, balanced wrapping, 3.75rem on desktop and 2.5rem on
  mobile.
- The header title is small (0.95rem, weight 600) so the product name stays
  understated.
- Buttons use sentence case at weight 500; never uppercase. The overline is
  the one uppercase element, tracked at `0.16em` in the primary color.
- Use typographic characters in copy: `…`, `’`, `·`, `⌘`.

## Layout

- One centered column, at most 920px wide, filling `100dvh`: header, scrolling
  conversation, then the composer pinned at the bottom.
- Spacing follows MUI's 8px unit. Horizontal page padding is 16px on mobile and
  32px from the `sm` breakpoint; messages are spaced 24px apart.
- The bottom padding respects `env(safe-area-inset-bottom)`.
- The `sm` breakpoint (600px) is the only layout switch. Below it, the
  suggestion grid collapses from three columns to one, the overline is hidden,
  and dropdown icons are dropped.
- Code blocks and display equations scroll horizontally inside the reply; the
  page itself never scrolls sideways (minimum width 320px).

## Elevation & Depth

Flat by default: buttons disable elevation, papers drop MUI's dark-mode
gradient, and layers are separated by 1px divider borders. The composer is the
only element with a shadow, a faint `0 8px 32px rgb(0 0 0 / 4%)` that anchors
it above the conversation. The floating "Jump to latest" button is the only
contained button.

## Shapes

- The base radius is 12px (`shape.borderRadius`), used by buttons, menus, and
  suggestion cards.
- The composer and send button use 24px, so the 44px send button reads as a
  rounded square.
- User messages are speech bubbles: `20px 20px 4px 20px`, with the tight corner
  pointing toward the sender.
- Code blocks use 8px and inline code 4px; "Jump to latest" is a pill.

## Components

- **Header:** product name with a primary `↗` glyph on the left, the tagline in
  secondary text on the right, a divider beneath.
- **Welcome:** overline, display headline, short secondary paragraph, then
  three suggestion cards. Cards are outlined text buttons with an
  `ArrowOutward` icon; on hover the border turns primary and the fill takes
  `action.hover`.
- **User message:** right-aligned bubble at most 80% wide (90% on mobile),
  labelled "You" in secondary caption text, preserving line breaks.
- **Assistant message:** full width with no bubble, labelled "Assistant" in a
  primary caption, rendered as Markdown, with a secondary-colored copy action
  below.
- **Composer:** one bordered surface holding a borderless multiline field (two
  to six rows), the send/stop button, and a toolbar beneath a divider. The
  border turns primary on `:focus-within`. The helper line shows the keyboard
  shortcut or the validation error.
- **Toolbar:** text-button dropdowns for model and reasoning effort on the
  left; regenerate and theme toggle icon buttons on the right.
- **Status:** a small progress ring with "Generating…" in a polite live region;
  errors use an MUI error `Alert` that suggests what to do next.
- **Disclaimer:** one centered secondary caption under the composer.
- Icons come from `@mui/icons-material`. Every icon-only button has a tooltip
  and an accessible name.

## Do's and Don'ts

- Do build with Material UI components and theme roles. AI Elements is an
  interaction reference only; do not add a second UI toolkit, CSS framework,
  or icon set.
- Do hoist static `sx` objects into `*_SX` constants beside the component.
- Do keep every interactive target at least 44×44px.
- Do show a 2px solid focus outline (offset 3px on buttons, 2px on the skip
  link and scrollable blocks); never remove focus styles.
- Do make new states work in both schemes and both layouts, and add them to the
  accessibility audit and visual baselines
  ([browser and visual tests](docs/development.md#browser-and-visual-tests)).
- Do keep motion subtle; the global `prefers-reduced-motion` rule must keep
  winning.
- Don't introduce new colors, gradients, heavy shadows, or uppercase labels.
- Don't hard-code hex values in components or override the theme per
  component when a theme change would do.
- Don't chase automated scores with markup that hurts clarity; prefer
  idiomatic MUI and semantic HTML.
