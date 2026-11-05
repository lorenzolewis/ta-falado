# Prototype: mini-player (#59)

Throwaway branch, never merged. The decision comment on #59 is the source of truth for the build (#60). This file records the same values beside the code.

## What was chosen

**Variant A, "Bar and sheet"** (`/proto/player-a`): a slim bar that holds back 10s and play, with the lesson's progress as a line along its top edge. On a phone the bar opens a full sheet with everything. On desktop the bar is one full row, with no sheet.

Three variants were tried, each in place of the real player on every page, so each was judged with audio playing across navigation:

- **A, Bar and sheet**: chosen.
- **B, Full deck**: every control always visible, no expanded state, also shown when idle.
- **C, Floating card**: a detached card with a progress ring around play that expands in place.

All three, with the switcher, are at commit `6b53939`, the last one before this cleanup.

Why A: on a phone the bar takes the least room above the tab bar and keeps the two controls a learner reaches for most, play and "say that again" (back 10s). Everything else is one tap away in the sheet. On desktop there's room for everything, so nothing is hidden.

## Specs

The colours, type and shapes are the #52 tokens in `src/styles/base.css` unless stated.

### Placement

- The player is outside `<main>` and on every page, under one `transition:persist` name (ADR 0001). It's sticky at `inset-block-end: var(--tabs-block-size)`, so on a phone it sits just above the tab bar. It's inset by `--panel-gap` (8px) on each side, so it lines up with the panels.
- It has `--strong` fill and the `--radius-player` (24px) radius on its top corners only. There's no border and no shadow.
- `--player-block-size` is the player's measured height (ResizeObserver). The desktop grid is `calc(100dvh - var(--player-block-size))`, and `:root` keeps `scroll-padding-block-end: calc(var(--player-block-size) + var(--tabs-block-size))`, so focused content is never under it.
- **Safe areas:** the viewport meta adds `viewport-fit=cover`.
  - On a phone, `--tabs-block-size` is `calc(64px + env(safe-area-inset-bottom))`, and the tab bar pads its foot by `env(safe-area-inset-bottom)`.
  - Where there is no tab bar (desktop and iPad), the player pads its foot by `env(safe-area-inset-bottom)` instead: `--player-safe-b`, which is `0px` on a phone.
  - `.app` pads its sides and top by `max(var(--panel-gap), env(safe-area-inset-*))`, for landscape.
- **Idle:** hidden until a lesson is loaded (unchanged).

### Phone bar (below 52rem)

- **Progress line:** 3px of `--ipe` along the top edge, `inline-size: calc(progress × 100%)`. It's decorative (`aria-hidden`), and its corners are clipped by the bar's radius.
- **Row:** flex, with 4px gap and 8px padding, plus `--player-safe-b` at the foot. The bar is 72px tall.
- **Open button:** fills the rest of the row and is at least 56px tall, with a 12px gap and 12px radius. It holds:
  - The episode cover, 44×44 with a 12px radius. Its background is `--track-on-strong` until the image loads.
  - The title in Alegreya Bold 18 / 1.25, on one line with an ellipsis.
  - Under the title, "7:37 left" in Alegreya Sans 14, `--on-strong` at 78% over `--strong`, with tabular figures.
  - Its accessible name is the title followed by ", open the player". It has `aria-haspopup="dialog"`.
- **Back 10s:** a 48px round icon button.
- **Play/pause:** 48px round, `--ipe` with an `--on-ipe` 26px icon.
- Forward 30s, seek, speed and mute live in the sheet.

### Phone sheet

- A modal `<dialog>` (`showModal()`) along the bottom, full width.
  - `max-block-size: calc(100dvh - max(2rem, env(safe-area-inset-top)))`.
  - `--strong` with 24px top corners.
  - Padding is 8px on top and `max(24px, env(safe-area-inset-left))` on the sides. At the foot it's `32px + env(safe-area-inset-bottom)`.
  - The backdrop is `color-mix(in srgb, var(--strong) 55%, transparent)`.
- It opens with a slide-up of 0.28s, `cubic-bezier(0.2, 0.8, 0.2, 1)`, from 40% down and transparent. There's no animation under `prefers-reduced-motion`.
- It closes from the chevron button ("Close the player", top left), from Escape, from a tap on the backdrop, when navigating (`astro:before-swap`), and when the window grows past 52rem. Focus returns to the open button (native dialog).
- It's a centred grid with a 12px gap. Top to bottom:
  1. The close button: 48px, the chevron icon (pointing down).
  2. The cover: `min(68vw, 18rem, 34dvh)` square, 20px radius.
  3. The title, as a link to the lesson: Alegreya Bold 24 / 1.15, balanced, 8px extra space above.
  4. The series: 14, muted as above.
  5. The seek slider at full width, with the times under it (current on the left, duration on the right), 14 with tabular figures.
  6. The transport, 32px apart: back 10s (48), play/pause (72, with a 30px icon), and forward 30s (48).
  7. Speed (left) and mute (right), spread apart, 8px extra space above.

### Desktop row (from 52rem)

- A grid of `minmax(16rem, 1.3fr) auto minmax(14rem, 1.5fr) auto`, with a 24px gap. The padding is 12px top and bottom and 24px on the sides, plus `--player-safe-b` at the foot. There's no sheet.
- From left to right:
  1. **Identity:** the cover at 56×56 (12px radius), 12px from the title as a link to the lesson (Alegreya Bold 18, one line with an ellipsis), with the series under it (14, muted).
  2. **Transport:** back 10s (48), play/pause (60, with a 26px icon) and forward 30s (48), with a 4px gap.
  3. **Seek:** the current time, the slider and the duration, with a 12px gap. The times are 14 with tabular figures, muted.
  4. **Extras:** speed and mute, with an 8px gap.
- The progress line runs along the top edge, as on the phone.

### Controls

- **Icon buttons:** 48px round, transparent, in `currentColor` (`--on-strong`). On hover they fill with `--track-on-strong`. The icons are the #52 set (back10, forward30, play, pause, volume, mute, chevron).
- **Seek:** a native range input styled with `appearance: none`, with a 48px tall hit area.
  - The track is 8px, pill-shaped: `--ipe` up to the position and `--track-on-strong` after it.
  - The thumb is 20px, round, `--ipe`.
  - The focus ring is drawn inside (`outline-offset: -8px`).
  - It keeps `aria-label="Seek"` and `aria-valuetext="3:12 of 10:50"`.
- **Speed:** a native `<select>` with 0.75×, 1×, 1.25× and 1.5×, labelled "Speed".
  - A 48px tall pill with a 2px `currentColor` border and a transparent fill, in Alegreya Sans Bold with tabular figures. The padding is 16px on the left and 34px on the right.
  - The chevron icon is 18px, 10px from the right edge.
  - The options use `--ink` on `--surface`, so the native list is readable.
- **Mute:** an icon button with `aria-pressed`. It shows the volume icon, or the mute icon when pressed.
- **Focus:** inside the player the ring is `--ipe` (2px, 2px offset).

### Accessible names

- The region is labelled "Audio player".
- Play/pause is an icon button whose name is "Play" or "Pause" (`aria-label`, kept in step with the state).
- The jumps are "Back 10 seconds" and "Forward 30 seconds".
- The others are "Mute", "Speed", "Seek" and "Close the player". The sheet is labelled "Player".
- `aria-keyshortcuts` stays on the bar's controls. The shortcuts are unchanged: Space, ←, →, `<`, `>` and M.

### States

The state is drawn from the player, with no new features:

- **Idle:** no lesson is loaded, and the player is hidden.
- **Loading:** asked to play, but `audio.readyState < 3` (listen for `waiting`, `canplay`, `playing`, `loadstart` and `stalled`). Play/pause shows a 24px ring with a 3px `currentColor` border, open on one side, spinning once every 0.9s. Under reduced motion it doesn't spin and the border is dotted. The accessible name stays "Pause".
- **Playing:** the pause icon.
- **Paused:** the play icon.
- **Error:** the status line ("The audio could not be loaded.", `role="status"`) replaces the "time left" line under the title, in `--ipe`, Alegreya Sans Medium 14. Play stays available.

## Not part of the decision

- `src/components/proto/PlayerProto.astro` and `src/lib/proto/player-proto.ts` are prototype code. The build should restyle `src/components/Player.astro` and `src/lib/player-ui.ts` (#60).
- `?state=idle|loading|playing|paused|error` forces a state on this branch only, for screenshots.
- The cover is a CSS background here because Astro's dev-toolbar audit re-fetched every `<img>` on each time update and stalled the dev server. In the build, an `<img alt="" decoding="async">` is fine if the player stops rewriting the DOM that often, or a background works too.
