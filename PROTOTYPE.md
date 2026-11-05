# Prototype #71: OG images in the print style

The Open Graph image of a lesson page (1200×630, `/artwork/og/<series>-NN.png`) in the print style chosen in #55. The chosen layout is **B4, "one sheet"**. This branch is throwaway; the build lands on `main` after #61's renderer.

- Renderer: `prototype/og.ts` (`node prototype/og.ts`)
- Renders: `prototype-renders/<lesson>.png`, and `prototype-renders/sheet.png` at link-preview sizes (about 400px, 260px and 120px wide)

## Layout: one sheet

The whole card is one sheet of the series paper, under the dot screen.

- **Text column**, left, 520px wide, padded `56px 48px 56px 60px`, all in ink `#1b1b1b`. The site name is at the top. The series and number, then the title, are at the bottom (`justify-content: space-between`).
  - Site name: "Tá Falado" (`lang="pt-BR"`), Alegreya 700, 88px, line-height 0.9, letter-spacing -0.03em.
  - Series and number ("Grammar 17"): Alegreya Sans 700, 42px, 12px below.
  - Title: the full `data.title`, as the page's `<h1>` shows it. Alegreya 700, line-height 1, at most 4 lines: 72px, or 60px for titles over 34 characters.
- **Photo**: printed on the right 680px of the same sheet (`object-fit: cover`), with no border or frame between it and the text column.
- **No photo** (Supplementary 1 and 2): the sheet is blank paper and dots, and the text column spans the full width (title at 76px). There's no big "Tá Falado" placeholder, since the site name is already on every card.

## The print

The same as the lesson page (#55, `src/components/Print.astro`), with paper and ink from `src/lib/print.ts`:

| Series | Paper |
|---|---|
| Pronunciation | `#f5c842` ipê-amarelo |
| Grammar | `#f4a6c6` ipê-rosa |
| Supplementary | `#bba6ec` ipê-roxo |

- Photo: grayscale, contrast 1.35, brightness 1.05, multiplied over the paper.
- Dot screen: paper-coloured dots 4px apart (0.9px to 1.5px soft edge) at 55% opacity, over the whole sheet. The pitch stays 4px at 1200px wide; at link-preview sizes the dots blend into a lighter tone without moiré.

### How it's drawn

Satori has no CSS `filter` or `mix-blend-mode`, so the print is plain SVG for resvg, and Satori draws the text on top:

1. A paper `<rect>`.
2. The photo as an `<image preserveAspectRatio="xMidYMid slice">` through a filter: `feColorMatrix` (grayscale, Rec. 709 weights), then `feComponentTransfer` linear functions for contrast (slope 1.35, intercept -0.175) and brightness (slope 1.05), then a per-channel slope equal to the paper's RGB. For an opaque photo that last step is the same as `multiply` over the paper.
3. A `<pattern>` of 4px tiles, each a `radialGradient` dot, over the print at `opacity="0.55"`.
4. Satori's SVG (text as paths) on top. Fonts are the `@fontsource` WOFF files (not WOFF2).

No build-time photo processing is needed.

## For the build

- **Converge with #61.** #61 (the podcast and episode covers, PR #74) needs the same print. The print layer and the compose step belong in `src/lib/artwork-render.ts` once, shared by the covers and the OG image. If #61's renderer already has a print layer, the OG image uses that one. Only this layout is #71's own.
- Keep `renderOgImage(lesson)` and `ogImagePath()`, and keep the paths stable: link previews cache by URL.
- If #61 scales the dot pitch with the canvas, the OG image follows the same rule.
- Check the image as a link preview in at least one real app (#71's acceptance criteria).

## Tried and dropped

All in the branch history:
- **A, page header**: the print full-bleed, with the title over a fade into white, like the lesson page.
- **C, caption strip**: the print above a band of ink, with the title in the paper colour.
- **B**: one sheet without the site name. **B2** added the name at 44px. **B3** doubled it to 88px and dropped the no-photo placeholder. **B4** made the series and number 25% larger (34px to 42px).
