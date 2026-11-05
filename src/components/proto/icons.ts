// PROTOTYPE (#53): the #52 icon set (24px grid, 2.5px square strokes), as inline SVG strings.
const svg = (body: string) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;

export const ICON = {
  play: svg('<path class="f" d="M6.5 3.5 20.5 12l-14 8.5z"/>'),
  search: svg('<circle cx="10.5" cy="10.5" r="6.75"/><path d="m15.5 15.5 5.5 5.5"/>'),
  check: svg('<path d="M4 12.5 9 17.5 20 6.5"/>'),
  chevron: svg('<path class="f" d="M6 9h12l-6 7z"/>'),
  close: svg('<path d="m6 6 12 12M18 6 6 18"/>'),
};
