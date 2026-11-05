# Prototype: lesson page (#55)

Throwaway branch `prototype/55-lesson-page`, never merged. The decision comment on #55 is the source of truth for the build ticket. The chosen page is at `/proto/lesson/<lesson>` (start at `/proto`): `src/pages/proto/lesson/[lesson].astro`. Screenshots (phone and desktop, light and dark) are in `prototype-screenshots/`.

## Chosen: A8, "print cover"

The lesson photo is printed edge to edge across the top of the page, in black ink on a coloured paper under a dot screen. The series and title sit on the foot of the print over a gradient into the page colour, and A's facts line and Play pill follow.

Why:
- The photos are only about 200–300 px wide. Printing them as a dot screen is what lets them go full width without the softness showing.
- A paper colour for each series gives every lesson page a strong identity without new chrome, and it matches the album art (#61).
- A placeholder in the same frame keeps the header the same height on every lesson, including the two with no photo.

Tried and dropped: A (liner notes, photo floated in the intro), B (listening card), C (number and rail), A2–A6 (other ways to put the photo in the header), A7 (lesson number as the placeholder), A9–A12 (riso, line screen, poster and film treatments). They are all in this branch's history.

## Specs

### The print
- Frame: `aspect-ratio: 9 / 7` (the 44 photos average 1.28, median 1.29), `object-fit: cover`. The near-square photos lose a little top and bottom; the one panorama (Grammar 14) loses its sides.
- Phone: bleeds to the pane's edges (−20px sides, −24px top), top corners `--radius-card`.
- Desktop (≥ 52rem): bleeds to the pane's edges (−48px sides, −40px top), height capped at `min(62vh, 560px)`, so wide panes crop wider than 9:7. Text stays within 44rem.
- Photo: `filter: grayscale(1) contrast(1.35) brightness(1.05); mix-blend-mode: multiply` over the paper.
- Dot screen: a layer over it, `radial-gradient(circle, <paper> 0.9px, transparent 1.5px) 0 0 / 4px 4px` at `opacity: 0.55`.
- Paper and ink are fixed values, not theme tokens: the print looks the same in light and dark mode.

### Paper colours: the three colours the ipê tree flowers in

| Series | Name | Paper |
|---|---|---|
| Pronunciation | ipê-amarelo | `#f5c842` (= `--ipe`) |
| Grammar | ipê-rosa | `#f4a6c6` |
| Supplementary | ipê-roxo | `#bba6ec` |

Ink `#1b1b1b`. The site-wide fallback (the podcast cover, for example) is ipê-amarelo.

### No photo (Supplementary 1 and 2)
- The same frame and paper, with "Tá Falado" (`lang="pt-BR"`) in Alegreya 700 on one line across the top: `font-size: 18.5cqi` (the frame is the container), `line-height: 0.82`, `letter-spacing: -0.03em`, margin `0.16em 0 0 0.1em`, ink with `mix-blend-mode: multiply; opacity: 0.85`, under the same dot screen. `aria-hidden`: the series and title below already say what it is.

### Title over the print
- The series and title share the print's grid cell, `align-self: end`, padded `112px <bleed> 0`.
- Background: `linear-gradient(to bottom, transparent, color-mix(in srgb, var(--surface) 70%, transparent) 45%, var(--surface) 80%)`. The gradient belongs to the title block, so a long title moves the fade higher. The text always has the page colour behind it, so contrast holds in both themes.
- Series and number: `--accent`, Alegreya Sans 700, `--text-18`. Title: Alegreya 700, `clamp(--text-36, 7vw, --text-60)`, `line-height: 1`, `text-wrap: balance`.

### Below the print (from variant A)
- Facts: "First published 1 October 2007. 10 min of audio. Culture talk: Online Activities." in `--muted`.
- Play: the `btn btn-ipe` pill. Its label follows the mini-player: Play, Resume, Pause, Play again, with "N min left" beside it once started.
- Intro: Alegreya `--text-21 / 1.55`, max 38rem, under a `--line` rule. Portuguese words: `<i lang="pt-BR">` in `--accent`, weight 500. Spanish words: `<i lang="es">`, plain italic.
- Transcript: "Read the transcript" with the `doc` icon, then "PDF, 147 KB" in `--muted`.

## Open for the build ticket
- The intros italicise Portuguese words, Spanish words, names and plain emphasis the same way, so `lang` can't be inferred. The build needs a Markdown convention for marking them; the prototype hand-marks three lessons in `src/pages/proto/_lesson.ts`.
- `/proto` paths don't get the phone's "Lessons" back link; real lesson routes will.
- The album art (#61) and the OG images (follow-up ticket) should use the same print and paper colours.
