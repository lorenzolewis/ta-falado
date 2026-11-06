// The icon set (#52, plus home, info, back and close from #53): a 24px grid with sharp
// geometry, 2.5px strokes with square caps and mitred joins, and solid shapes (class "f").
// Drawn by src/components/Icon.astro; the stroke styles are in src/styles/base.css.
export const ICONS = {
  play: '<path class="f" d="M6.5 3.5 20.5 12l-14 8.5z"/>',
  pause: '<path class="f" d="M5.5 4h5v16h-5zM13.5 4h5v16h-5z"/>',
  back10: '<path d="M4 12.5A8 8 0 1 0 7 6.3"/><path class="f" d="M3.6 2.6 10 6.4 4 9.6z"/><text x="12.4" y="15.8">10</text>',
  forward30: '<path d="M20 12.5A8 8 0 1 1 17 6.3"/><path class="f" d="M20.4 2.6 14 6.4l6 3.2z"/><text x="11.6" y="15.8">30</text>',
  volume: '<path class="f" d="M3 9h4l6-5v16l-6-5H3z"/><path d="M16 9a4.2 4.2 0 0 1 0 6M18.8 6.2a8.2 8.2 0 0 1 0 11.6"/>',
  mute: '<path class="f" d="M3 9h4l6-5v16l-6-5H3z"/><path d="m16 9 6 6m0-6-6 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.75"/><path d="m15.5 15.5 5.5 5.5"/>',
  check: '<path d="M4 12.5 9 17.5 20 6.5"/>',
  doc: '<path class="f" fill-rule="evenodd" d="M5 2h9l5 5v15H5zm3.5 10v2H15v-2zm0 4v2h4.5v-2zM13 3.5V8h4.5z"/>',
  chevron: '<path class="f" d="M6 9h12l-6 7z"/>',
  home: '<path d="M3.5 10.5 12 3.5l8.5 7V20.5h-6v-6h-5v6h-6z"/>',
  info: '<circle cx="12" cy="12" r="8.75"/><path d="M12 11v6"/><path class="f" d="M10.6 6.6h2.8v2.8h-2.8z"/>',
  back: '<path d="M15 4.5 7.5 12l7.5 7.5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
} as const;

export type IconName = keyof typeof ICONS;
