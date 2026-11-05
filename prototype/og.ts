// Prototype for #71: OG images (1200×630) in the lesson page's print style (#55). Throwaway.
// Run: node prototype/og.ts  → prototype-renders/<variant>-<lesson>.png and sheet-<variant>.png
//
// The print is drawn as plain SVG for resvg (Satori has no `filter` or `mix-blend-mode`):
//   paper rect → photo through an feColorMatrix/feComponentTransfer chain that reproduces
//   `grayscale(1) contrast(1.35) brightness(1.05)` multiplied over the paper → a <pattern> of
//   paper-coloured dots 4px apart at 55%. Satori lays out the text as a second SVG on top.
// Converge with #61: the print layer (printLayer) and compose() are what #61's renderer needs
// for the covers too; in the build, they belong in src/lib/artwork-render.ts beside the cover
// template, and only the OG layouts (the overlays below) stay specific to #71.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { INK, PAPER } from '../src/lib/print.ts';

type Series = keyof typeof PAPER;
const W = 1200;
const H = 630;
const SERIES_LABEL: Record<Series, string> = { pronunciation: 'Pronunciation', grammar: 'Grammar', supplementary: 'Supplementary' };
// The lesson page's own colours (src/styles/base.css, light): the title sits on --surface.
const SURFACE = '#ffffff';
const PAGE_INK = '#1b2a20';
const ACCENT = '#1c6a43';

interface Lesson {
  slug: string;
  series: Series;
  number: number;
  title: string;
  photo?: string; // a data: URI
}

async function loadLesson(slug: string): Promise<Lesson> {
  const md = await readFile(`src/content/lessons/${slug}.md`, 'utf8');
  const field = (re: RegExp) => md.match(re)?.[1];
  const series = field(/^series:\s*(\w+)/m) as Series;
  const title = JSON.parse(field(/^title:\s*(".*")$/m)!);
  const photoUrl = field(/^photo:\s*\n\s+url:\s*(\S+)/m);
  const photo = photoUrl ? `data:image/jpeg;base64,${(await readFile(`public${photoUrl}`)).toString('base64')}` : undefined;
  return { slug, series, number: Number(field(/^number:\s*(\d+)/m)), title, photo };
}

// ---- Fonts ---------------------------------------------------------------------------------
const font = (pkg: string, file: string) => readFile(`node_modules/@fontsource/${pkg}/files/${file}`);
const fonts = [
  { name: 'Alegreya', data: await font('alegreya', 'alegreya-latin-700-normal.woff'), weight: 700 as const, style: 'normal' as const },
  { name: 'Alegreya Sans', data: await font('alegreya-sans', 'alegreya-sans-latin-700-normal.woff'), weight: 700 as const, style: 'normal' as const },
];

type El = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown, extra: Record<string, unknown> = {}): El => ({
  type,
  props: { style, children, ...extra },
});
const div = (style: Record<string, unknown>, children?: unknown) => el('div', style, children);

const layout = (node: El, width = W, height = H) => satori(node as never, { width, height, fonts });

// ---- The print -----------------------------------------------------------------------------
/** A rectangle of the canvas the print fills. */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);

/**
 * The print as SVG: paper, the photo in ink (or "Tá Falado" when there is none), the dot screen.
 * CSS order: grayscale → contrast(1.35) → brightness(1.05), each clamped; then multiply by paper.
 */
async function printLayer(lesson: Lesson, box: Box, id: string): Promise<string> {
  const paper = PAPER[lesson.series];
  const [r, g, b] = hex(paper);
  const { x, y, w, h } = box;
  let ink: string;
  if (lesson.photo) {
    ink = `
      <filter id="${id}-ink" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" values="
          0.2126 0.7152 0.0722 0 0
          0.2126 0.7152 0.0722 0 0
          0.2126 0.7152 0.0722 0 0
          0 0 0 1 0"/>
        <feComponentTransfer>
          <feFuncR type="linear" slope="1.35" intercept="-0.175"/>
          <feFuncG type="linear" slope="1.35" intercept="-0.175"/>
          <feFuncB type="linear" slope="1.35" intercept="-0.175"/>
        </feComponentTransfer>
        <feComponentTransfer>
          <feFuncR type="linear" slope="1.05"/>
          <feFuncG type="linear" slope="1.05"/>
          <feFuncB type="linear" slope="1.05"/>
        </feComponentTransfer>
        <feComponentTransfer>
          <feFuncR type="linear" slope="${r}"/>
          <feFuncG type="linear" slope="${g}"/>
          <feFuncB type="linear" slope="${b}"/>
        </feComponentTransfer>
      </filter>
      <image href="${lesson.photo}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" filter="url(#${id}-ink)"/>`;
  } else {
    // "Tá Falado" on one line across the top: 18.5% of the frame's width, line-height 0.82,
    // letter-spacing -0.03em, margin 0.16em 0 0 0.1em; ink at 85%.
    const size = 0.185 * w;
    const name = await layout(
      div(
        { display: 'flex', width: w, height: h, fontFamily: 'Alegreya', fontWeight: 700, color: INK },
        el('span', { fontSize: size, lineHeight: 0.82, letterSpacing: -0.03 * size, marginTop: 0.16 * size, marginLeft: 0.1 * size, whiteSpace: 'nowrap' }, 'Tá Falado', { lang: 'pt-BR' }),
      ),
      w,
      h,
    );
    ink = `<g opacity="0.85" transform="translate(${x} ${y})">${name}</g>`;
  }
  return `
    <clipPath id="${id}-clip"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>
    <radialGradient id="${id}-dot" cx="2" cy="2" r="1.5" gradientUnits="userSpaceOnUse">
      <stop offset="${0.9 / 1.5}" stop-color="${paper}"/>
      <stop offset="1" stop-color="${paper}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="${id}-dots" width="4" height="4" patternUnits="userSpaceOnUse" x="${x}" y="${y}">
      <rect width="4" height="4" fill="url(#${id}-dot)"/>
    </pattern>
    <g clip-path="url(#${id}-clip)">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${paper}"/>
      ${ink}
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}-dots)" opacity="0.55"/>
    </g>`;
}

/** The print under Satori's text, as one SVG, rasterised as an opaque PNG. */
async function compose(print: string, overlay: El): Promise<Buffer> {
  const text = await layout(overlay);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${print}${text}</svg>`;
  return new Resvg(svg, { fitTo: { mode: 'width', value: W }, background: '#ffffff' }).render().asPng();
}

// ---- The variants ---------------------------------------------------------------------------
const label = (l: Lesson) => `${SERIES_LABEL[l.series]} ${l.number}`;
const titleSize = (t: string, big: number, small: number) => (t.length > 34 ? small : big);

/** A: the page header. The print fills the card; the series and title sit on its foot over a
 *  fade into the page's white, as on the lesson page. */
async function variantA(l: Lesson) {
  const print = await printLayer(l, { x: 0, y: 0, w: W, h: H }, 'a');
  const overlay = div(
    { width: W, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' },
    div(
      {
        display: 'flex',
        flexDirection: 'column',
        padding: '150px 64px 52px',
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.7) 45%, ${SURFACE} 80%)`,
      },
      [
        div({ fontFamily: 'Alegreya Sans', fontWeight: 700, fontSize: 34, color: ACCENT, marginBottom: 6 }, label(l)),
        div({ fontFamily: 'Alegreya', fontWeight: 700, fontSize: titleSize(l.title, 80, 68), lineHeight: 1, color: PAGE_INK, lineClamp: 2 }, l.title),
      ],
    ),
  );
  return compose(print, overlay);
}

/** B: one sheet of paper. The text is printed in ink on the left of the paper; the photo is
 *  printed on its right, on the same paper, with no frame between them. */
async function variantB(l: Lesson) {
  const col = 520;
  const print = await printLayer(l, { x: 0, y: 0, w: W, h: H }, 'b-paper').then(async (bg) =>
    // Draw the whole sheet as paper and dots, then print the photo only in the right part.
    l.photo ? bg.replace(/<image[^>]*\/>/, '') + (await printLayer(l, { x: col, y: 0, w: W - col, h: H }, 'b')) : printLayer(l, { x: 0, y: 0, w: W, h: H }, 'b'),
  );
  const overlay = div(
    { width: W, height: H, display: 'flex', flexDirection: l.photo ? 'row' : 'column', justifyContent: l.photo ? 'flex-start' : 'flex-end' },
    div(
      { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', boxSizing: 'border-box', width: l.photo ? col : W, height: l.photo ? H : 'auto', padding: '56px 48px 56px 60px', color: INK },
      [
        div({ fontFamily: 'Alegreya Sans', fontWeight: 700, fontSize: 34, marginBottom: 10 }, label(l)),
        div({ fontFamily: 'Alegreya', fontWeight: 700, fontSize: l.photo ? titleSize(l.title, 72, 60) : 76, lineHeight: 1, lineClamp: 4 }, l.title),
      ],
    ),
  );
  return compose(print, overlay);
}

/** C: the caption strip. The print fills the top; a band of solid ink along the foot carries the
 *  series and title in the paper colour, like a caption under a plate. */
async function variantC(l: Lesson) {
  const paper = PAPER[l.series];
  const print = await printLayer(l, { x: 0, y: 0, w: W, h: H }, 'c');
  const overlay = div(
    { width: W, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' },
    div({ display: 'flex', flexDirection: 'column', padding: '34px 60px 44px', backgroundColor: INK, color: paper }, [
      div({ fontFamily: 'Alegreya Sans', fontWeight: 700, fontSize: 30, marginBottom: 4 }, label(l)),
      div({ fontFamily: 'Alegreya', fontWeight: 700, fontSize: titleSize(l.title, 70, 60), lineHeight: 1.02, lineClamp: 2 }, l.title),
    ]),
  );
  return compose(print, overlay);
}

// ---- Run ------------------------------------------------------------------------------------
const LESSONS = ['pronunciation-16', 'pronunciation-11', 'pronunciation-04', 'grammar-17', 'grammar-14', 'supplementary-01'];
const VARIANTS = { A: variantA, B: variantB, C: variantC };
const out = 'prototype-renders';
await mkdir(out, { recursive: true });
const lessons = await Promise.all(LESSONS.map(loadLesson));

for (const [name, render] of Object.entries(VARIANTS)) {
  const pngs: Buffer[] = [];
  for (const l of lessons) {
    const png = await render(l);
    pngs.push(png);
    await writeFile(`${out}/${name}-${l.slug}.png`, png);
  }
  // A contact sheet at link-preview sizes: Slack/social (~400px) and an iMessage bubble (~260px),
  // plus a 120px thumbnail (a compact card or a notification).
  const sizes = [400, 260, 120];
  const gap = 24;
  const rowH = (400 * H) / W;
  const sheetW = gap + sizes.reduce((s, w) => s + w + gap, 0);
  const sheetH = gap + lessons.length * (rowH + gap);
  const imgs = pngs.flatMap((png, i) => {
    let x = gap;
    const y = gap + i * (rowH + gap);
    return sizes.map((w) => {
      const h = (w * H) / W;
      const tag = `<rect x="${x - 0.5}" y="${y - 0.5}" width="${w + 1}" height="${h + 1}" rx="10" fill="#d8ddd3"/><clipPath id="r${i}-${w}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/></clipPath><image clip-path="url(#r${i}-${w})" href="data:image/png;base64,${png.toString('base64')}" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
      x += w + gap;
      return tag;
    });
  });
  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}"><rect width="100%" height="100%" fill="#f6f7f2"/>${imgs.join('')}</svg>`;
  await writeFile(`${out}/sheet-${name}.png`, new Resvg(sheet, { fitTo: { mode: 'zoom', value: 2 } }).render().asPng());
}
console.log('done');
