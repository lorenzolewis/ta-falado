# Prototype: visual identity (#52)

A throwaway branch for the identity round of the UI pass (#29). It is never merged. The decision comment on #52 hands these tokens to the build ticket (#54).

## Decision

Lorenzo explored three directions: A Azulejo (Atkinson Hyperlegible, cobalt), B Caderno (Alegreya, green ink and ipê yellow) and C Tropicália (condensed Archivo, violet and pink, pill shapes). He chose a mix of two of them: **Caderno's colours and fonts on Tropicália's shapes.** In the mix, Tropicália's violet card and player become deep green, and its pink buttons become ipê yellow.

- `prototypes/identity/identity.html`: the chosen identity, applied to the home page and Grammar 17 with a static mini-player, followed by its tokens. It follows `prefers-color-scheme`. On this prototype page only, `#light` or `#dark` in the URL forces a theme; the site has no toggle.
- `prototypes/identity/screenshots/`: phone-width (390px, 2x) captures of both screens in both themes.

The other directions are still in the history of this branch, in the commit before the cleanup.

## Tokens

### Colour

| Token (prototype variable) | Role | Light | Dark |
|---|---|---|---|
| `--bg` | page | `#F6F7F2` | `#111813` |
| `--surface` | fields, raised areas | `#FFFFFF` | `#18221B` |
| `--ink` | text | `#1B2A20` | `#E8EDE5` |
| `--muted` | secondary text | `#4E5D53` | `#A7B3A9` |
| `--accent` | links, primary buttons, numbers, finished chips | `#1C6A43` | `#86D4A8` |
| `--on-accent` (`--onAccent`) | text and icons on accent | `#FFFFFF` | `#0F2017` |
| `--strong` (`--soft`) | Continue card, mini-player | `#1D3B2A` | `#21402E` |
| `--on-strong` (`--onSoft`) | text and icons on strong | `#FFFFFF` | `#F1F5EE` |
| `--ipe` (`--soft2`) | buttons and progress on strong | `#F5C842` | `#E9BC2E` |
| `--on-ipe` (`--onSoft2`) | text and icons on ipê | `#1B2A20` | `#1B1806` |
| `--line` | row dividers (decorative) | `#D8DDD3` | `#2A362D` |
| `--control` | field and select borders, seek track | `#7B887E` | `#6D7C71` |

The unfilled track on `--strong` is `color-mix(in srgb, var(--on-strong) 25%, var(--strong))`. The focus ring is a 2px `--accent` outline with a 2px offset, or `--ipe` inside the player.

Contrast (WCAG 2.2), light and dark: ink on bg 13.9 and 15.2, muted on bg 6.5 and 8.3, accent on bg 6.1 and 10.3, on-accent on accent 6.6 and 9.7, on-strong on strong 12.3 and 10.4, on-ipe on ipê 9.5 and 9.9, ipê against strong 7.7 and 6.4, control on bg 3.4 and 4.1.

### Type

Fonts: Alegreya and Alegreya Sans, both by Juan Pablo del Peral of Huerta Tipográfica, under the OFL. Both cover ã õ ç ê é á ñ ¿ ¡.

| File | Source |
|---|---|
| `AlegreyaSans-Regular.ttf`, `-Medium.ttf`, `-Bold.ttf` | static, in google/fonts `ofl/alegreyasans/` |
| `Alegreya-Regular.ttf`, `-Italic.ttf`, `-Bold.ttf`, `-BoldItalic.ttf` | static TTFs from the Google Fonts API (google/fonts ships only the variable `Alegreya[wght].ttf`; instancing it at 400 and 700 gives the same) |

| Role | Font | Size / line height |
|---|---|---|
| Home name (h1) | Alegreya Bold, -0.01em | 60 / 1.0 |
| Lesson title (h1) | Alegreya Bold | 36 / 1.05 |
| Series heading (h2) | Alegreya Bold | 36 / 1.0 |
| Continue title | Alegreya Bold | 28 / 1.1 |
| List numbers | Alegreya Bold, `--accent`, lining tabular figures | 24 / 1.0 |
| Wordmark (header) | Alegreya Bold Italic, `--accent` | 21 |
| Lede, lesson intro | Alegreya Regular (Portuguese and Spanish words in Italic) | 21 / 1.6 (lede 1.45) |
| Lesson topic | Alegreya Italic, `--muted` | 21 |
| Player title | Alegreya Bold | 18 |
| List titles | Alegreya Sans Medium | 18 / 1.25 |
| Buttons | Alegreya Sans Bold | 18 |
| UI text | Alegreya Sans Regular | 16 / 1.4 |
| Labels, kicker | Alegreya Sans Medium | 14 (kicker 16) |
| Topics in lists, times, meta, footer | Alegreya Sans Regular | 14 |

Scale: 14 · 16 · 18 · 21 · 24 · 28 · 36 · 60.

### Space, shape and borders

- Spacing: 4 · 6 · 8 · 12 · 16 · 24 · 32. The page gutter is 16, sections are 24 to 32 apart, and cards have 20 of padding. Density is compact: list rows are at least 48 tall.
- Radii: 999 for buttons, the filter field, the speed select, finished chips, progress bars and the seek track and thumb; 20 for cards and photos; 24 for the mini-player's top corners.
- Borders: a 1px `--line` between list rows; 2px `--control` around fields; a 2px `currentColor` border on the speed select inside the player. Cards have no border and no shadow.
- Targets: buttons are at least 48 tall. Player controls are 48, and the main play/pause button is 60. The seek track is 8 and its thumb 20.

### Icons

Inline SVG on a 24px grid with sharp geometry: 2.5px strokes with square caps and mitred joins, and solid triangles and bars. The set is play, pause, back 10, forward 30, volume, mute, search, check, document (PDF) and chevron. Their exact paths are in `identity.html`, in the Icons section.
