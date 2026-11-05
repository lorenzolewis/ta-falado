# Prototype: home page (#53)

Throwaway branch, never merged. The decision comment on #53 is the source of truth for the build; this file records the same values beside the code.

## What was chosen

**Variant D, "Sidebar app"** (`/proto/home-d`): the structure of a music app, inspired by Spotify but drawn entirely in the #52 identity. One sidebar holds the site's navigation, every lesson and the footer; the main pane shows the home page, a lesson, or About. The mini-player runs along the bottom. On a phone it becomes one view at a time with Home and Lessons tabs.

Four variants were tried:

- **A, Notebook index**: the #52 home refined, with a sticky filter.
- **B, Toolbar and tabs**: the filter in a sticky top bar, with series tabs.
- **C, Rail and map**: lessons as numbered tiles, with a sticky desktop rail.
- **D, Sidebar app**: chosen after one refinement round.

The refinement merged D's two sidebar panels into one, put the footer at the foot of the sidebar, and added an About row under Home. All four, with the switcher, are at commit `2709f12`, the last one before this cleanup.

Why D: the lesson list is always one glance away, and a lesson opens beside it instead of replacing it. That fits a site whose player persists across pages (ADR 0001).

## Layout

### Desktop (from 52rem)

- The page is a grid with two columns: the sidebar is `minmax(18rem, 22rem)` and the main pane takes the rest. The gap and outer padding are 8px.
- The grid's height is `calc(100dvh - var(--player-block-size, 0px))`, so both panels end above the mini-player. Each panel scrolls on its own and the page itself doesn't scroll.
- Both panels are `--surface` with a 20px radius, on `--bg`. They have no border and no shadow.

### Sidebar, top to bottom

1. **Site rows** have 12px of padding at the top, 8px at the bottom and 12px at the sides, and a 1px `--line` divider below them.
   - **Wordmark**: Alegreya Bold Italic 21, in `--accent`, with 8px of padding.
   - **Home** and **About this site** rows: each is 48px tall, with an icon and a 14px gap, in Alegreya Sans Bold 18, with a 12px radius. The text is `--muted`, and `--ink` on hover or when current.
   - The current row has a `color-mix(in srgb, var(--accent) 14%, var(--surface))` background, and Home switches to its filled icon.
   - About opens in the main pane.
2. **Lessons**:
   - **Header**: "Lessons" in Alegreya Bold 24, with a 44px round search button on the right. The button opens the filter field (`aria-expanded`), and closing it clears the filter.
   - **Filter field**: a pill 44px tall with a 2px `--control` border, a search icon, and the placeholder "nh, ão, ficar…".
   - **Series pills**: Pronunciation 24, Grammar 20 and Supplementary 2. Each is 36px tall, Alegreya Sans Medium 16, on `--bg`. The count is 14 at 0.8 opacity.
     - Pressing a pill (`aria-pressed`) shows only that series; it turns `--accent` / `--on-accent` and the other pills hide.
     - A 36px round ✕ pill before it shows every series again, and so does pressing the pill a second time.
     - The pills wrap rather than scroll.
   - **List**: one ordered list of all 46 lessons, in series order, scrolling inside the sidebar. Rows are described below.
3. **Footer**, pinned to the bottom of the sidebar so it is always visible on desktop:
   - "**An independent, unofficial archive.** Lessons by COERLL, University of Texas at Austin, licensed CC BY 3.0."
   - Alegreya Sans 13 / 1.45 in `--muted`, with the first sentence in `--ink` Medium.
   - 12px of padding at the top, 16px at the bottom and 20px at the sides, with a 1px `--line` divider above.

### Lesson row

- The row is a single link, at least 56px tall, with 6px of vertical and 8px of horizontal padding and a 12px radius. It is a grid of `44px 1fr auto` with a 12px gap.
- **Number square**: 44×44 with a 12px radius, on `--bg`, holding the series number in Alegreya Bold 20 in `--accent` with lining tabular figures.
  - When the lesson is **finished**, the square becomes `--accent` with an `--on-accent` check (a 20px icon with a 3px stroke).
  - When it is **started**, the square becomes `--strong` with the number in `--ipe`.
- **Title**: Alegreya Sans Medium 17 / 1.25 on one line, truncated with an ellipsis.
- **Subtitle**: "Grammar 17, Online Activities" (the series and number, then the topic), in Alegreya Sans 14 `--muted` on one line.
- **Duration**: Alegreya Sans 13 `--muted` with tabular figures. Screen readers get the "Finished" mark, which is visually hidden because the square already shows it.
- The **selected** lesson has `aria-current="true"` and the 14% accent mix background. The hover background is `--bg`.

### Filter behaviour

- The search field and the series pill combine, and the list updates on every keystroke.
- The pill counts become match counts, and a pill with no matches hides while you type.
- A status line below the pills reads "N lessons match", in Alegreya Sans 14 `--muted`.
- **Empty state**: "No lessons match." with a "Clear the filter" text button, in Alegreya Sans Bold `--accent`. The button clears both the query and the pill.

### Main pane

- Padding is 40px at the top, 48px at the sides and 48px at the bottom on desktop, and 24/20/32 on a phone. Content is at most 48rem wide.
- **Home** (nothing selected):
  - The name in Alegreya Bold 60 / 1.0 at -0.01em, then the lede in Alegreya 21 / 1.45 `--muted`, at most 34rem wide.
  - **Continue card**: as in #52. It is `--strong`, 20px of padding, a 20px radius, and an 8px gap.
    - The label "Continue where you left off" in Alegreya Sans Medium 14.
    - The title in Alegreya Bold 28 / 1.1.
    - An 8px `--ipe` progress bar on the strong-track mix.
    - An `--ipe` "Resume" pill with a play icon, followed by "7 min left" in Alegreya Sans 14.
  - **"The three series"** in Alegreya Bold 36, then one block per series, separated by 1px `--line` rules with 16px of vertical padding. Each block has:
    - The series name in Alegreya Bold 24, with an "All 24 lessons" text button on the right. The button opens the list filtered to that series.
    - "3 of 24 finished" in 14 `--muted`.
    - A 6px `--accent` progress bar on `--line`.
    - "Next up: Pronunciation 4: …", a link to the first unfinished lesson. It reads "Start with" before any progress and "Every lesson finished." when done.
- **Lesson** (selected): the lesson page from #55 goes here. The prototype shows a placeholder with the cover, title, topic, a Play button and the intro.
- **About**: the About page goes here, and its design is #57.

### Phone (below 52rem)

- One view at a time:
  - **Home**: the main pane's home page.
  - **Lessons**: the sidebar, without the wordmark and Home row, which the tabs replace. The About row stays at the top.
  - **Lesson** and **About**: the main pane.
- **Tab bar**: fixed to the bottom, 64px tall, on `--bg` with a 1px `--line` top border, with two tabs, **Home** and **Lessons**.
  - Each tab is an icon above a label in Alegreya Sans Medium 13. The label is `--muted`, and `--ink` when current.
  - Lessons stays current while a lesson is open.
- The mini-player sits just above the tab bar (`inset-block-end: 64px`).
- A lesson has a "‹ Lessons" back button at the top, in Alegreya Sans Bold `--accent`, 44px tall.
- **Footer**: on a phone it closes the Lessons view (the sidebar footer) and also the home page (a copy that desktop hides). That keeps the CC BY credit and the "independent, unofficial" notice reachable from both tabs.

## New values (beyond the #52 tokens)

- A **12px radius** for the number squares, sidebar rows and list rows. It sits between #52's 999 for pills and 20 for cards, and needs confirming.
- The **selected-row background** is `color-mix(in srgb, var(--accent) 14%, var(--surface))`.
- New **sizes**: the sidebar is 18–22rem, the panel gap 8px, and the tab bar 64px.
- **Icons**: `home` (outline, filled when current), `info` (About) and `library` (the Lessons tab), drawn in the #52 style: a 24px grid with 2.5px square strokes. Their paths are in `src/components/proto/icons.ts`.

## Notes for the build

- **URLs**: the prototype keeps the selection in query strings (`?lesson=grammar/17`, `?view=lessons`, `?view=about`) on one page. In the build these should be the real routes (`/`, `/grammar/17`, `/about`). The sidebar should be persisted across navigations with `transition:persist`, the way the player already is (ADR 0001), so its scroll position, pill and query survive. On a phone, the Lessons view needs a route or a client-side state of its own.
- The list rows are links to the real lesson paths, so the page works without JavaScript.
- No new features: everything here is the home page, filter, progress and Continue card the spec (#1) already defines. Only "Next up" per series is a new read of existing progress.

## Running it

`pnpm dev`, then open `/proto/home-d`. The black bar at the bottom right is prototype-only:

- **Fake progress** seeds four finished lessons and a half-played Grammar 17 in the real storage.
- **Theme** forces light or dark.

The screenshots are in `prototypes/home/screenshots/`.
