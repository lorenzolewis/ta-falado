// The "print" (#55): a lesson photo printed in one black ink on a coloured paper under a dot screen.
// Each series has its own paper, one of the three colours the ipê tree flowers in. Fixed values, not
// theme tokens, so a print looks the same in light and dark. The album art (#61) and the OG images
// (#71) are meant to use the same papers and ink.
import type { Series } from './series';

export const PAPER: Record<Series, string> = {
  pronunciation: '#f5c842', // ipê-amarelo (the same as --ipe in light mode)
  grammar: '#f4a6c6', // ipê-rosa
  supplementary: '#bba6ec', // ipê-roxo
};

/** The site-wide paper, where there is no series (the podcast cover, for example). */
export const DEFAULT_PAPER = PAPER.pronunciation;

export const INK = '#1b1b1b';
