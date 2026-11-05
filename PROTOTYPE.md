# Prototype #61: generated artwork template

Throwaway branch. The decision comment on #61 is the source of truth; the build lands on `main` in
`src/lib/artwork-render.ts`.

## Decision: A2, "Plate with a name tab"

The lesson photo is printed across the top of the square in the #55 print style. A paper foot holds
the series and number and the full title. "Tá Falado" sits on a paper tab that rises from the foot at
the photo's bottom-left, clear of the faces, which sit high in most photos.

- Renders: `prototype-renders/a2/` (cover 3000×3000, episodes 1400×1400) and `prototype-renders/sheet-a2.png` (300, 120 and 60px)
- Code: `scripts/prototype-artwork.ts` (layout) and `src/lib/print-svg.ts` (the print as SVG)
- Rerun: `node scripts/prototype-artwork.ts`

### How we got here
- Round 1: A (Plate), B (Numeral: a paper tab with a huge number, no title) and C (Masthead: "Tá Falado" across the top, the photo in a window). Lorenzo picked A and asked for the podcast name on it.
- Round 2: A1 put the name at the top of the foot; A2 put it on a paper tab over the photo's top-left. Lorenzo picked A2 but asked to move the tab to the bottom-left, as the top-left covered faces.
- Round 2 also matched the OG image's specs (#71): the multiply ink, the dot pitch rule, the full title, its type settings, and no big name on photo-less covers.

## Specs

All sizes are on a 1000×1000 canvas, scaled to 3000 (podcast cover) or 1400 (episode covers). Every
PNG is RGB with no transparency. Paper and ink come from `src/lib/print.ts`.

**The print** (the same recipe as `src/components/Print.astro` and the OG image)
- Photo: Rec. 709 grayscale, contrast 1.35 (slope 1.35, intercept −0.175), brightness 1.05, then multiplied over the paper (a per-channel slope equal to the paper's RGB). An SVG filter for resvg, since Satori has no `filter` or `mix-blend-mode`.
- Dot screen over the whole canvas: paper dots, solid to 0.9/4 of the pitch and soft to 1.5/4, at 55% opacity. The pitch is 1/160 of the canvas's short side (6.25 canvas units: about 9px on a 1400 cover; about 4px on the 1200×630 OG image).
- Satori draws only the text, in two layers: printed (under the dots: the name tab, the podcast cover's name) and overprinted (above: the foot's text).

**Episode cover, with a photo**
- Photo box: the full width, 620 high, `object-fit: cover`.
- Name tab: paper, at the photo's bottom-left, padded 30 40 22 56. "Tá Falado" (pt-BR) in Alegreya 700, 96, line-height 0.9, letter-spacing −0.03em, in ink. Under the dots.
- Foot: inset 60 left and right, 56 from the bottom, text set to the bottom.
  - Series and number ("Grammar 2") in Alegreya Sans 700, 50, line-height 1, 14 below.
  - The full title (`data.title`) in Alegreya 700, line-height 1, letter-spacing −0.01em: 88 up to 22 characters, 72 up to 34, 60 beyond. Each word is its own box, so lines never break inside "/ô/".

**Episode cover, no photo (Supplementary 1 and 2)**
- Blank paper and dots. Inset 64 (60 at the top), spaced between: "Tá Falado" at 120 on top; the series and number, then the title at 112 / 96 / 88, at the bottom.

**Podcast cover**
- Paper and dots. "Tá" and "Falado" stacked in Alegreya 700, 300, line-height 0.82, −0.03em, 56 from the left and 40 from the bottom, under the dots.
- "Brazilian Portuguese pronunciation and grammar for Spanish speakers" in Alegreya Sans 700, 54, line-height 1.12, 720 wide, 64 from the top and left.

**Fonts:** the @fontsource Alegreya and Alegreya Sans 700 `.woff` files, latin and latin-ext (Satori can't read woff2).

## Things the prototype turned up
- At 60px, only the paper colour and one large shape read. The tab keeps the name legible at 120px.
- The photos (about 220×175) hold up at 1400px as a print: the dots hide the softness.
- Satori breaks lines after a slash, so titles with phonetic symbols need one box per word.
- Satori numbers its SVG ids from zero in every call, so two Satori layers in one image need their ids prefixed.
