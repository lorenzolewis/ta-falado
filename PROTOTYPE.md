# Prototype: visual identity (#52)

Throwaway branch for the identity round of the UI pass (#29). It is never merged: the decision comment on #52 carries the chosen tokens to the build ticket (#54).

## What's here

Three directions, each a standalone HTML file under `prototypes/identity/`. Each one shows the home page (series lists and the Continue card) and Grammar 17 with a static mini-player, built from the real lesson data, followed by its tokens: light and dark palettes with contrast ratios, the type scale with a pt-BR and es diacritics specimen, spacing, radii and the icon set.

| | Direction | Type | Colour | Shape |
|---|---|---|---|---|
| A | `azulejo.html` | Atkinson Hyperlegible only (already committed) | cobalt on white, navy at night | 8 to 14px radii, square number tiles, round-stroke icons |
| B | `caderno.html` | Alegreya serif and Alegreya Sans | deep green ink, ipê-yellow highlighter | 3px radii, ruled lists, soft filled icons |
| C | `tropicalia.html` | Archivo, extra-condensed for display | violet, magenta and pink | pills, compact, sharp geometric icons |

Every direction follows `prefers-color-scheme`. On the prototype pages only, `#light` or `#dark` in the URL forces a theme for side-by-side comparison; the site itself has no toggle.

## Constraints checked

- Fonts: all OFL and available as static TTF (see each page's Tokens section for the exact files), so the Satori artwork can use them. All cover ã õ ç ê é á ñ ¿ ¡.
- Contrast: every text pair is at least 4.5:1 and every control boundary at least 3:1, in both themes (the ratios are listed on each page).
- The CC BY 3.0 attribution and the "independent, unofficial" notice stay in the footer of both screens.
