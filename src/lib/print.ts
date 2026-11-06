// The "print" (#55): a lesson photo printed in one black ink on a coloured paper under a dot screen.
// Each series has its own paper, one of the three colours the ipê tree flowers in. Fixed values, not
// theme tokens, so a print looks the same in light and dark. The album art (#61), the OG images (#71)
// and the site's colours (src/styles/base.css, set from here by src/layouts/Base.astro) all use them.
import type { Series } from './series';

export const PAPER: Record<Series, string> = {
  pronunciation: '#f5c842', // ipê-amarelo (also the podcast cover's and the site name's paper)
  grammar: '#f4a6c6', // ipê-rosa
  supplementary: '#bba6ec', // ipê-roxo
};

/** The site-wide paper, where there is no series (the podcast cover, for example). */
export const DEFAULT_PAPER = PAPER.pronunciation;

export const INK = '#1b1b1b';
