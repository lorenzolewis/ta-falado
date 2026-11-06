# Prototype: view-transition motion (#62)

Throwaway branch `prototype/62-motion`, never merged. The chosen motion runs on every page (`src/pages/proto/_motion.css`, wired by `src/pages/proto/_MotionSwitcher.astro` and a hook in `src/lib/sidebar-ui.ts`). `/proto/motion` explains it; the pink bar slows it ×5 and simulates reduced motion. `node src/pages/proto/_frames.mjs` captures frame strips mid-transition.

## Chosen: "Sheets"

Each page is a sheet on the board. Forward lays a new sheet over the old one from the right. Back pulls the top sheet off to the right, and the sheet underneath was there all along.

Why:
- It says where you are going: deeper (a lesson) comes in on top, back up (home, the Lessons view) is uncovered underneath.
- On a phone it reads as the platform's own navigation stack, which is what the Lessons view and page already are (#53).
- Only the page moves. The sidebar, the mini-player and the "‹ Lessons" button stay still, so the player is visibly untouched (ADR 0001).

Tried and dropped (in this branch's history):
- A, "The tab carries" (e8967bb): the row's number square morphed into the lesson's paper tab, and the title into the heading.
- B, "Sheets" as first built (e8967bb): the same as the chosen motion, except going home followed browser history.
- C, "Press" (e8967bb): no movement; the new page printed in place, with the photo's ink coming up and the text following.
- D, "Sheets, printed" (0d6cb62): B with a quieter version of C. The ink-up and text fades were too much.

## Specs

### What moves
- `view-transition-name`s: `sheet` on the page (`.app > .pane`); on a phone, also on the Lessons view (`.app[data-view='lessons'] > .side`), since only one of the two is shown at a time. `sidebar` on the sidebar (desktop only), `player` on the mini-player, `back` on the phone's "‹ Lessons" button: these three don't animate (`animation: none` on the group and new image; the old image is hidden) and sit above the sheet (`z-index`).
- The `root` group doesn't animate either: the board stays put.
- The sheet's old and new images fill the group (`block-size: 100%; object-fit: cover; object-position: top`). On desktop the group clips (`overflow: clip`), so a sheet sliding in never covers the sidebar.

### Forward (`html[data-astro-transition='forward']`, the default)
- New sheet: from `translateX(100%)` to its place, 400ms, `cubic-bezier(0.2, 0.7, 0, 1)`, on top (`z-index: 2`), with a 1px `--line` edge (`filter: drop-shadow(-1px 0 0 var(--line))`).
- Old sheet: desktop, stays put and dims to `brightness(0.9)`. Phone, also slides to `translateX(-28%)` and dims to `brightness(0.86)`. Same 400ms and curve.

### Back (`html[data-astro-transition='back']`)
- Old sheet: slides off to `translateX(100%)`, 360ms, same curve, on top, with the same 1px edge.
- New sheet: desktop, from `brightness(0.9)` to normal, in place. Phone, from `translateX(-28%)` and `brightness(0.86)` to normal. 360ms.

### Which way each move goes
- History Back and Forward: as the browser says.
- Desktop: going to home from any other page is always Back, even from a link (the site name): home is the bottom sheet.
- Phone: home is reached from the Lessons view and opens forward, like any page. Opening the Lessons view ("‹ Lessons", "All 46 lessons", history Back to `#lessons`) is Back; leaving it for the page on the same URL (history Back from `#lessons`) is Forward. These same-page switches aren't animated by the ClientRouter, so they run their own `document.startViewTransition`, setting `data-astro-transition` for its duration.

### Reduced motion
- `prefers-reduced-motion: reduce`: nothing slides or dims. The sheet's old and new images crossfade, 150ms linear. The sidebar, player and button stay put as always.

### Focus
- A click on a row in the sidebar keeps focus on that row (the router restores focus inside persisted elements), so the list keeps its place on desktop.
- Otherwise focus would fall to `<body>`: it moves to `<main id="main">` (`tabindex="-1"`, no outline) with `preventScroll`, so Tab continues from the top of the new page.

### Without view transitions
- Navigation works as before: the ClientRouter's fallback swaps the page, and the phone's view switch happens with no motion.
