// PROTOTYPE (#53): the #52 icon set (24px grid, 2.5px square strokes), as inline SVG strings.
const svg = (body: string) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;

export const ICON = {
  play: svg('<path class="f" d="M6.5 3.5 20.5 12l-14 8.5z"/>'),
  search: svg('<circle cx="10.5" cy="10.5" r="6.75"/><path d="m15.5 15.5 5.5 5.5"/>'),
  check: svg('<path d="M4 12.5 9 17.5 20 6.5"/>'),
  chevron: svg('<path class="f" d="M6 9h12l-6 7z"/>'),
  home: svg('<path d="M3.5 10.5 12 3.5l8.5 7V20.5h-6v-6h-5v6h-6z"/>'),
  homeFilled: svg('<path class="f" d="M2 10.2 12 2l10 8.2V22h-8.2v-6.5h-3.6V22H2z"/>'),
  library: svg('<path d="M4.5 3.5v17M10 3.5v17M15 4.5l5 15.5"/>'),
  back: svg('<path d="M15 4.5 7.5 12l7.5 7.5"/>'),
  info: svg('<circle cx="12" cy="12" r="8.75"/><path d="M12 11v6"/><path class="f" d="M10.6 6.6h2.8v2.8h-2.8z"/>'),
  close: svg('<path d="m6 6 12 12M18 6 6 18"/>'),
};
