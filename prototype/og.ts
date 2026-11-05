// Prototype for #71: OG images (1200×630) in the lesson page's print style (#55). Throwaway.
// The chosen layout is B4, "one sheet" (see PROTOTYPE.md).
// Run: node prototype/og.ts  → prototype-renders/<lesson>.png and prototype-renders/sheet.png
//
// The print is drawn as plain SVG for resvg (Satori has no `filter` or `mix-blend-mode`):
//   paper rect → photo through an feColorMatrix/feComponentTransfer chain that reproduces
//   `grayscale(1) contrast(1.35) brightness(1.05)` multiplied over the paper → a <pattern> of
//   paper-coloured dots 4px apart at 55%. Satori lays out the text as a second SVG on top.
// Converge with #61: the print layer (printLayer) and compose() are what #61's renderer needs
// for the covers too; in the build, they belong in src/lib/artwork-render.ts beside the cover
// template, and only the OG layout (ogImage's overlay) stays specific to #71.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { INK, PAPER } from '../src/lib/print.ts';

type Series = keyof typeof PAPER;
const W = 1200;
const H = 630;
const SERIES_LABEL: Record<Series, string> = { pronunciation: 'Pronunciation', grammar: 'Grammar', supplementary: 'Supplementary' };

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
 * The print as SVG: paper, the photo in ink (if there is one), the dot screen.
 * CSS order: grayscale → contrast(1.35) → brightness(1.05), each clamped; then multiply by paper.
 */
async function printLayer(lesson: Pick<Lesson, 'series' | 'photo'>, box: Box, id: string): Promise<string> {
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
    ink = '';
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

// ---- The layout: B4, one sheet ---------------------------------------------------------------
const label = (l: Lesson) => `${SERIES_LABEL[l.series]} ${l.number}`;
const COLUMN = 520; // the text column, left; the photo is printed on the rest

/** One sheet of paper. "Tá Falado" in the upper left, the series and title at the foot of a column
 *  of text in ink, and the photo printed on the right of the same paper with no frame between
 *  them. Without a photo the whole sheet is blank paper and the text column spans it. */
async function ogImage(l: Lesson) {
  const print = l.photo
    ? (await printLayer({ series: l.series }, { x: 0, y: 0, w: W, h: H }, 'sheet')) + (await printLayer(l, { x: COLUMN, y: 0, w: W - COLUMN, h: H }, 'photo'))
    : await printLayer(l, { x: 0, y: 0, w: W, h: H }, 'sheet');
  const overlay = div(
    { width: W, height: H, display: 'flex' },
    div(
      { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', width: l.photo ? COLUMN : W, height: H, padding: '56px 48px 56px 60px', color: INK },
      [
        el('div', { fontFamily: 'Alegreya', fontWeight: 700, fontSize: 88, lineHeight: 0.9, letterSpacing: -0.03 * 88 }, 'Tá Falado', { lang: 'pt-BR' }),
        div({ display: 'flex', flexDirection: 'column' }, [
          div({ fontFamily: 'Alegreya Sans', fontWeight: 700, fontSize: 42, marginBottom: 12 }, label(l)),
          div({ fontFamily: 'Alegreya', fontWeight: 700, fontSize: !l.photo ? 76 : l.title.length > 34 ? 60 : 72, lineHeight: 1, lineClamp: 4 }, l.title),
        ]),
      ],
    ),
  );
  return compose(print, overlay);
}

// ---- Run ------------------------------------------------------------------------------------
const LESSONS = ['pronunciation-16', 'pronunciation-11', 'pronunciation-04', 'grammar-17', 'grammar-14', 'supplementary-01'];
const out = 'prototype-renders';
await mkdir(out, { recursive: true });
const lessons = await Promise.all(LESSONS.map(loadLesson));

{
  const pngs: Buffer[] = [];
  for (const l of lessons) {
    const png = await ogImage(l);
    pngs.push(png);
    await writeFile(`${out}/${l.slug}.png`, png);
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
  await writeFile(`${out}/sheet.png`, new Resvg(sheet, { fitTo: { mode: 'zoom', value: 2 } }).render().asPng());
}
console.log('done');
