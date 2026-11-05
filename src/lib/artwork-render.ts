import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { crc32, deflateSync } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { artworkSlug, COVER_SIZE, EPISODE_COVER_SIZE, OG_HEIGHT, OG_WIDTH, PODCAST_COVER_SLUG } from './artwork';
import { getLessons, shortTitle, type Lesson } from './lessons';
import { INK, PAPER } from './print';
import { SERIES_LABEL, type Series } from './series';

// The artwork template (#17): one layout drawn at three sizes, rendered at build time by the
// endpoints in src/pages/artwork/. Satori lays out the elements as SVG; resvg rasterises it.
// Server-only: browser code that needs an artwork URL imports ./artwork instead.
//
// The covers' look is a placeholder; #61 restyles them. The OG image is #71's "one sheet" in the
// print style (#55), drawn by the print layer below. Keep the size and format rules: Apple wants
// RGB with no transparency, so every image is written as an opaque RGB PNG.

/** A canvas in CSS pixels. Sizes in the template scale with it. */
interface Size {
  width: number;
  height: number;
}
/** The cover layouts are drawn on this canvas, then scaled to their output size. */
const SQUARE: Size = { width: 1000, height: 1000 };
const OG: Size = { width: OG_WIDTH, height: OG_HEIGHT };

/** What one image shows. The series is absent on the podcast cover. */
interface ArtworkContent {
  series?: Series;
  /** The large line: the lesson number, or the site name on the podcast cover. */
  headline: string;
  title?: string;
  topic?: string;
}

const COLORS: Record<Series | 'site', { background: string; text: string }> = {
  site: { background: '#0b6e4f', text: '#ffffff' },
  pronunciation: { background: '#0b6e4f', text: '#ffffff' },
  grammar: { background: '#1d4e89', text: '#ffffff' },
  supplementary: { background: '#7a3e00', text: '#ffffff' },
};

function renderPodcastCover(): Promise<Buffer> {
  const content = { headline: 'Tá Falado', title: 'Brazilian Portuguese pronunciation and grammar for Spanish speakers' };
  return render(content, SQUARE, COVER_SIZE);
}

function renderEpisodeCover(lesson: Lesson): Promise<Buffer> {
  return render(lessonContent(lesson), SQUARE, EPISODE_COVER_SIZE);
}

/** The OG text column, left. With a photo, the print fills the rest of the width. */
const OG_COLUMN = 520;

/**
 * A lesson page's Open Graph image (#71, "one sheet"): one sheet of the series' paper under the
 * dot screen. "Tá Falado" is in the upper left; the series and number, then the title, are at the
 * foot of a text column in ink; the photo is printed on the right of the same sheet with no frame
 * between them. Without a photo the sheet is blank paper and the column spans it.
 */
export async function renderOgImage({ data }: Lesson): Promise<Buffer> {
  const paper = PAPER[data.series];
  const sheet: Box = { x: 0, y: 0, width: OG.width, height: OG.height };
  const photo = data.photo && (await photoDataUri(data.photo.url));
  const print = photo
    ? printLayer({ paper, box: sheet, id: 'sheet' }) +
      printLayer({ paper, photo, box: { x: OG_COLUMN, y: 0, width: OG.width - OG_COLUMN, height: OG.height }, id: 'photo' })
    : printLayer({ paper, box: sheet, id: 'sheet' });
  const titleSize = !photo ? 76 : data.title.length > 34 ? 60 : 72;
  const overlay = div(
    { width: OG.width, height: OG.height, display: 'flex' },
    div(
      {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        width: photo ? OG_COLUMN : OG.width,
        height: OG.height,
        padding: '56px 48px 56px 60px',
        color: INK,
      },
      [
        element('div', { fontFamily: 'Alegreya', fontWeight: 700, fontSize: 88, lineHeight: 0.9, letterSpacing: -0.03 * 88 }, 'Tá Falado', { lang: 'pt-BR' }),
        div({ display: 'flex', flexDirection: 'column' }, [
          div({ fontFamily: 'Alegreya Sans', fontWeight: 700, fontSize: 42, marginBottom: 12 }, `${SERIES_LABEL[data.series]} ${data.number}`),
          div({ fontFamily: 'Alegreya', fontWeight: 700, fontSize: titleSize, lineHeight: 1, lineClamp: 4 }, data.title),
        ]),
      ],
    ),
  );
  const text = await layout(overlay, OG, await ogFonts(), data.title);
  return rasterise(print, text, OG, OG.width, paper);
}

/**
 * getStaticPaths for the per-lesson images: one per lesson, at `[slug]` = `pronunciation-01`.
 *
 * The `cacheKey` lets Astro's incremental build (astro.config.ts) reuse an image from the last
 * build instead of drawing it again. Astro already redraws when this module's code changes; the
 * key adds what it can't see: the lesson's data (its digest), the font files and the lesson's
 * photo, which are read from disk rather than imported.
 */
export async function lessonArtworkPaths() {
  const fontKey = await fontHash();
  return Promise.all(
    (await getLessons()).map(async (lesson) => {
      // The glob loader always sets a digest. Without one, an edited lesson would keep its old image.
      if (!lesson.digest) throw new Error(`Lesson "${lesson.id}" has no digest to key its cached artwork.`);
      const photoKey = lesson.data.photo ? hash([await readPhoto(lesson.data.photo.url)]) : 'none';
      return { params: { slug: artworkSlug(lesson.data) }, props: { lesson }, cacheKey: `${lesson.digest}:${fontKey}:${photoKey}` };
    }),
  );
}

/**
 * getStaticPaths for the covers in /artwork/: the podcast cover, then one per episode. They share
 * one route because Astro only caches routes with getStaticPaths, and a second dynamic route
 * beside `[slug].png` would collide with it. The podcast cover's text lives in this module, so
 * its key only needs the fonts.
 */
export async function coverArtworkPaths() {
  const podcastCover = { params: { slug: PODCAST_COVER_SLUG }, props: { lesson: undefined }, cacheKey: await fontHash() };
  return [podcastCover, ...(await lessonArtworkPaths())];
}

/** Draws a cover from `coverArtworkPaths`: the podcast cover when there is no lesson. */
export function renderCover(lesson: Lesson | undefined): Promise<Buffer> {
  return lesson ? renderEpisodeCover(lesson) : renderPodcastCover();
}

/** The response a build endpoint returns for a rendered image. */
export function pngResponse(bytes: Buffer): Response {
  return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/png' } });
}

function lessonContent({ data }: Lesson): ArtworkContent {
  return { series: data.series, headline: `${SERIES_LABEL[data.series]} ${data.number}`, title: shortTitle(data), topic: data.topic };
}

/**
 * Lays out `content` on a `canvas` of CSS pixels, then rasterises it `outputWidth` pixels wide
 * (the height follows the aspect ratio).
 */
async function render(content: ArtworkContent, canvas: Size, outputWidth: number): Promise<Buffer> {
  const colors = COLORS[content.series ?? 'site'];
  const text = [content.headline, content.title, content.topic].filter(Boolean).join(' / ');
  const svg = await layout(template(content, colors, canvas), canvas, await fonts(), text);
  const image = new Resvg(svg, { fitTo: { mode: 'width', value: outputWidth }, background: colors.background }).render();
  return encodeRgbPng(image.pixels, image.width, image.height);
}

/** Satori lays out `root` on `canvas` as SVG, with the text drawn as paths. `text` names the
 *  content in the error when a glyph is missing. */
function layout(root: SatoriElement, canvas: Size, fonts: SatoriFont[], text: string): Promise<string> {
  // Satori's types want a React element; ours has the same shape without depending on React.
  return satori(root as never, {
    ...canvas,
    fonts,
    // Satori asks for more fonts when a glyph isn't in ours. Fail the build instead of drawing
    // a blank box, so a title with a character the font lacks can't ship broken.
    loadAdditionalAsset: async (_language, segment) => {
      throw new Error(`The artwork font has no glyph for "${segment}" (in "${text}").`);
    },
  });
}

// Satori takes React-shaped elements; plain objects avoid a React dependency.
type SatoriElement = {
  type: string;
  props: { style?: Record<string, unknown>; children?: SatoriElement | SatoriElement[] | string; [attribute: string]: unknown };
};
const element = (
  type: string,
  style: Record<string, unknown>,
  children?: SatoriElement['props']['children'],
  attributes: Record<string, unknown> = {},
): SatoriElement => ({ type, props: { style, children, ...attributes } });
const div = (style: Record<string, unknown>, children?: SatoriElement['props']['children']) => element('div', style, children);

// ---- The print (#55) ---------------------------------------------------------------------------
// A photo printed in black ink on a coloured paper under a dot screen, as on the lesson page
// (src/components/Print.astro). Satori has no CSS `filter` or `mix-blend-mode`, so the print is
// plain SVG for resvg, and Satori's text goes on top (rasterise). The OG image uses it now; #61's
// covers are meant to use the same two functions with their own layout.

/** A rectangle of the canvas, in CSS pixels. */
interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The print as SVG elements filling `box`: the paper, the photo in ink if there is one (cover
 * crop), then paper-coloured dots 4px apart at 55%. `id` prefixes the defs, so one SVG can hold
 * several prints.
 *
 * The ink reproduces Print.astro's `grayscale(1) contrast(1.35) brightness(1.05)` and
 * `mix-blend-mode: multiply`: grayscale (Rec. 709 weights), contrast, brightness, each clamped,
 * then a per-channel slope of the paper's RGB, which for an opaque photo is multiply over it.
 */
function printLayer({ paper, photo, box, id }: { paper: string; photo?: string; box: Box; id: string }): string {
  const { x, y, width, height } = box;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(paper.slice(i, i + 2), 16) / 255);
  const linear = (slope: number, intercept = 0) =>
    `<feComponentTransfer>${['R', 'G', 'B'].map((c) => `<feFunc${c} type="linear" slope="${slope}" intercept="${intercept}"/>`).join('')}</feComponentTransfer>`;
  const ink = photo
    ? `<filter id="${id}-ink" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0"/>
        ${linear(1.35, -0.175)}
        ${linear(1.05)}
        <feComponentTransfer><feFuncR type="linear" slope="${r}"/><feFuncG type="linear" slope="${g}"/><feFuncB type="linear" slope="${b}"/></feComponentTransfer>
      </filter>
      <image href="${photo}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" filter="url(#${id}-ink)"/>`
    : '';
  return `
    <clipPath id="${id}-clip"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath>
    <radialGradient id="${id}-dot" cx="2" cy="2" r="1.5" gradientUnits="userSpaceOnUse">
      <stop offset="0.6" stop-color="${paper}"/>
      <stop offset="1" stop-color="${paper}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="${id}-dots" width="4" height="4" patternUnits="userSpaceOnUse" x="${x}" y="${y}">
      <rect width="4" height="4" fill="url(#${id}-dot)"/>
    </pattern>
    <g clip-path="url(#${id}-clip)">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${paper}"/>
      ${ink}
      <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="url(#${id}-dots)" opacity="0.55"/>
    </g>`;
}

/** Rasterises the print (SVG elements from printLayer) under Satori's `text` SVG, `outputWidth`
 *  pixels wide, as an opaque RGB PNG. */
function rasterise(print: string, text: string, { width, height }: Size, outputWidth: number, background: string): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${print}${text}</svg>`;
  const image = new Resvg(svg, { fitTo: { mode: 'width', value: outputWidth }, background }).render();
  return encodeRgbPng(image.pixels, image.width, image.height);
}

/** A lesson photo's bytes, from `public/` (its `photo.url` is site-relative: `/images/…`). */
function readPhoto(url: string): Promise<Buffer> {
  // From the project root, as with the fonts.
  return readFile(`public${url}`);
}

async function photoDataUri(url: string): Promise<string> {
  const type = url.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${type};base64,${(await readPhoto(url)).toString('base64')}`;
}

function template(content: ArtworkContent, colors: { background: string; text: string }, { width, height }: Size): SatoriElement {
  const unit = Math.min(width, height) / 100; // 1% of the short side
  const lines: SatoriElement[] = [];
  if (content.series) {
    lines.push(div({ fontSize: 6 * unit, fontWeight: 700, opacity: 0.85 }, 'Tá Falado'));
  }
  lines.push(div({ fontSize: (content.series ? 11 : 16) * unit, fontWeight: 700, lineHeight: 1.05, marginTop: 2 * unit }, content.headline));
  if (content.title) {
    lines.push(div({ fontSize: 7 * unit, fontWeight: 700, lineHeight: 1.15, marginTop: 4 * unit, lineClamp: 4 }, content.title));
  }
  if (content.topic) {
    lines.push(div({ fontSize: 5.5 * unit, lineHeight: 1.2, marginTop: 3 * unit, opacity: 0.85, lineClamp: 2 }, content.topic));
  }
  return div(
    {
      width,
      height,
      boxSizing: 'border-box', // the padding sits inside the canvas, not around it
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      padding: 8 * unit,
      backgroundColor: colors.background,
      color: colors.text,
      fontFamily: 'Atkinson Hyperlegible',
    },
    lines,
  );
}

type SatoriFont = { name: string; data: Buffer; weight: 400 | 700; style: 'normal' };

let fontCache: Promise<SatoriFont[]> | undefined;

/** The covers' font (until #61 restyles them). */
function fonts() {
  fontCache ??= Promise.all(
    ([['Regular', 400], ['Bold', 700]] as const).map(async ([file, weight]) => ({
      name: 'Atkinson Hyperlegible',
      // From the project root: Astro bundles this module before running it, so import.meta.url
      // doesn't point at src/.
      data: await readFile(`src/assets/fonts/AtkinsonHyperlegible-${file}.ttf`),
      weight,
      style: 'normal' as const,
    })),
  );
  return fontCache;
}

let ogFontCache: Promise<SatoriFont[]> | undefined;

/** The OG image's fonts, as on the lesson page: Alegreya and Alegreya Sans, both 700. Satori reads
 *  WOFF but not WOFF2. */
function ogFonts() {
  ogFontCache ??= Promise.all(
    (['Alegreya', 'Alegreya Sans'] as const).map(async (name) => {
      const pkg = name.toLowerCase().replace(' ', '-');
      return {
        name,
        data: await readFile(`node_modules/@fontsource/${pkg}/files/${pkg}-latin-700-normal.woff`),
        weight: 700 as const,
        style: 'normal' as const,
      };
    }),
  );
  return ogFontCache;
}

/** A short hash of the font files, so swapping a font invalidates the cached artwork. */
async function fontHash(): Promise<string> {
  return hash([...(await fonts()), ...(await ogFonts())].map((font) => font.data));
}

function hash(buffers: Buffer[]): string {
  const sha = createHash('sha256');
  for (const buffer of buffers) sha.update(buffer);
  return sha.digest('hex').slice(0, 16);
}

/**
 * Writes RGBA pixels as an 8-bit RGB PNG (colour type 2), dropping the alpha channel. resvg's
 * own PNGs are RGBA, and Apple's artwork rules ask for RGB with no transparency. The pixels are
 * opaque already: resvg fills the background colour first.
 */
function encodeRgbPng(rgba: Buffer, width: number, height: number): Buffer {
  const stride = width * 3 + 1; // each row starts with its filter type (0, none)
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * 4;
      const to = y * stride + 1 + x * 3;
      raw[to] = rgba[from];
      raw[to + 1] = rgba[from + 1];
      raw[to + 2] = rgba[from + 2];
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('sRGB', Buffer.from([0])), // the colour space is sRGB (perceptual intent)
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
