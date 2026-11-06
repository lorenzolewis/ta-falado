# Prototype: About page (#57)

Throwaway branch `prototype/57-about`, never merged. The decision comment on #57 is the source of truth for the build ticket. The chosen page is at `/proto/about`: `src/pages/proto/about.astro`, with its content as data in `src/pages/proto/_about.ts`. Screenshots (phone and desktop, light and dark) are in `prototype-screenshots/`.

## Chosen: A, "Liner notes"

The credits read like the back of a record sleeve: a roster of roles and names, each name opening its bio in place. Then the license as a paragraph of small print, then this site's own code and links.

Why:
- The people come first, and the roster stays short: eight names and their roles fit on one phone screen. The bios are long, so they stay folded until someone asks for them.
- Writing the license out as prose covers every part of the attribution (title, authors, publisher, source, copyright, license, changes) without a form-like table.
- It uses only existing tokens and type, with no new components.

Tried and dropped (in this branch's history, commit f0f7fc8): B "Attribution card" (the CC BY attribution as a definition list on an ipê-yellow print card, beside a "This site" card) and C "Cast list" (every bio in full under a large name, with a dark green license panel at the end).

## Specs

### Intro
- `h1` "About this site" (base `h1`, Alegreya 700, `--text-36`).
- Lede: Alegreya `--text-21 / 1.5`. "An independent, unofficial archive of <i lang="pt-BR">Tá Falado</i>, a podcast of Brazilian Portuguese lessons for speakers of Spanish, recorded at the University of Texas at Austin in 2006 and 2007. All 46 lessons and their transcripts from the [archived original site](https://www.coerll.utexas.edu/brazilpod/tafalado/), in a site that works on a phone."
- Notice, in `--muted` sans at body size: "This site isn't affiliated with or endorsed by the University of Texas at Austin or COERLL."
- Column: `max-inline-size: 40rem`. Section `h2`s: `--text-28`, margin `48px 0 --space-16`.

### Credits roster
- A `<dl>` with a `2px solid --ink` rule on top. Each group is a row: `grid-template-columns: 7.5rem 1fr`, gap `--space-16`, padding `--space-12` top and bottom, `1px --line` rule underneath. Below 30rem it stacks into one column with no gap.
- Groups in order: Host, Voices, Guest voices, Production, Support. Role (`dt`): `--muted`, Alegreya Sans 500, `padding-block-start: 6px`.
- Each person is a `<details>`. The summary shows the name in Alegreya 700 `--text-21 / 1.25` followed by a `+` in `--accent` (`–` when open), and under it a line in `--muted`:
  - Voices: where they're from ("Feira de Santana, Bahia").
  - Host: "Hispanic linguistics, University of Texas at Austin".
  - Guests: where they're from plus their lessons ("Rio de Janeiro, Pronunciation 13 and 15").
  - Production: their role ("Audio recording", "Multimedia and technology").
- The name turns `--accent` on hover. The default disclosure marker is hidden.
- Bio: Alegreya `--text-18 / 1.55`, padding `--space-8 0 --space-12`, paragraphs `0 0 --space-12`, taken unchanged from the original bios in CREDITS.md.
- Support row: plain text with the TLTC and LAITS links, no disclosure.
- Under the roster in `--muted` `--text-14`: "Tap a name for their bio, from the original About page (2006–2007). The roles come from the lesson intros."

### License
- Three paragraphs in Alegreya `--text-18 / 1.55`:
  1. The attribution as one sentence: title (`<cite>`), authors, publisher, original URL and archive date, © 2025 University of Texas at Austin, "Licensed under Creative Commons Attribution 3.0 Unported (CC BY 3.0)" (linked).
  2. **Modified: re-hosted and re-presented.** (Alegreya Sans bold), then the "what changed" text from CREDITS.md.
  3. The photos note with the "open an issue" link.

### This site's code
- One paragraph at body size: the code is MIT-licensed and separate from the content, and the artwork's fonts (Alegreya, Alegreya Sans, Huerta Tipográfica, SIL OFL).
- Links in a wrapping row of three (Alegreya Sans 700, gap `--space-8 --space-24`): "Source code on GitHub", "MIT license" (`LICENSE`), "CREDITS.md".

## Open for the build ticket
- The real `/about` renders CREDITS.md directly. The roster needs structured data (role, from, lessons) that the Markdown doesn't have. Either give CREDITS.md a convention the page can parse, or move the roster into a data file that both CREDITS.md and the page draw from. The prototype hand-copies it into `_about.ts` and pulls only the bios from the compiled Markdown.
- `/proto` paths don't get the phone's "Lessons" back link or the sidebar's "About this site" highlight; the real `/about` route will.
