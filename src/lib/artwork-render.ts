import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { crc32, deflateSync } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { artworkSlug, COVER_SIZE, EPISODE_COVER_SIZE, OG_HEIGHT, OG_WIDTH, PODCAST_COVER_SLUG } from './artwork';
import { getLessons, type Lesson } from './lessons';
import { DEFAULT_PAPER, INK, PAPER } from './print';
import { dotPitch, nestSvg, printLayers, type Box } from './print-svg';
import { SERIES_LABEL } from './series';

// The artwork template (#61, the decision is on that issue): the lesson photo printed across the top
// in the #55 print style, "Tá Falado" on a paper tab at the photo's bottom-left, and the series,
// number and title on the paper foot. Rendered at build time by the endpoints in src/pages/artwork/.
//
// Each image is one SVG for resvg, stacked as: the paper; the photo in ink (./print-svg); the
// printed text; the dot screen; the overprinted text. Satori lays out only the text, as two
// transparent layers. Server-only: browser code that needs an artwork URL imports ./artwork instead.
// Apple wants RGB with no transparency, so every image is written as an opaque RGB PNG.

/** A canvas in CSS pixels. Sizes in the templates are in these units. */
interface Size {
  width: number;
  height: number;
}
/** The covers are drawn on this canvas, then scaled to their output size. */
const SQUARE: Size = { width: 1000, height: 1000 };
const OG: Size = { width: OG_WIDTH, height: OG_HEIGHT };

const SERIF = 'Alegreya';
const SANS = 'Alegreya Sans';
const NAME = 'Tá Falado';
const SUBTITLE = 'Brazilian Portuguese pronunciation and grammar for Spanish speakers';

/** One image: the print's box and paper, and the text above and below the dot screen. */
interface Artwork {
  canvas: Size;
  paper: string;
  /** Where the photo is printed. Absent: paper and dots only. */
  photo?: { box: Box; image: Photo };
  /** Text that is part of the print, under the dot screen. */
  printed?: SatoriElement[];
  /** Text overprinted on top of the dot screen. */
  over?: SatoriElement[];
}

type Photo = { data: Buffer; type: 'image/jpeg' | 'image/png' };

async function renderPodcastCover(): Promise<Buffer> {
  return render(
    {
      canvas: SQUARE,
      paper: DEFAULT_PAPER,
      printed: [at({ left: 56, bottom: 40 }, [name(300, 'Tá', 0.82), name(300, 'Falado', 0.82)])],
      over: [at({ left: 64, top: 64, width: 720, fontFamily: SANS, fontSize: 54, lineHeight: 1.12 }, SUBTITLE)],
    },
    COVER_SIZE,
  );
}

async function renderEpisodeCover(lesson: Lesson): Promise<Buffer> {
  const { data } = lesson;
  const paper = PAPER[data.series];
  const photo = await lessonPhoto(lesson);
  if (!photo) return render(sheet(lesson, SQUARE, { name: 120, title: [[22, 112], [34, 96], [99, 88]] }), EPISODE_COVER_SIZE);
  const photoHeight = 620;
  return render(
    {
      canvas: SQUARE,
      paper,
      photo: { box: { x: 0, y: 0, width: SQUARE.width, height: photoHeight }, image: photo },
      // The tab rises from the foot at the photo's bottom-left, clear of the faces, which sit high.
      printed: [at({ left: 0, bottom: SQUARE.height - photoHeight, padding: '30px 40px 22px 56px', backgroundColor: paper }, [name(96)])],
      over: [at({ left: 60, top: photoHeight, right: 60, bottom: 56, justifyContent: 'flex-end' }, caption(lesson, [[22, 88], [34, 72], [99, 60]]))],
    },
    EPISODE_COVER_SIZE,
  );
}

/**
 * The lesson page's Open Graph image. A stopgap until #71 lands its own layout: the cover's
 * no-photo sheet (name at the top, the series, number and title at the foot) at 1200×630.
 */
export function renderOgImage(lesson: Lesson): Promise<Buffer> {
  return render(sheet(lesson, OG, { name: 88, title: [[34, 72], [99, 60]] }), OG.width);
}

/** Paper and dots with no photo: the name at the top, the series, number and title at the foot. */
function sheet(lesson: Lesson, canvas: Size, sizes: { name: number; title: [number, number][] }): Artwork {
  const inset = Math.round(canvas.height * 0.064);
  return {
    canvas,
    paper: PAPER[lesson.data.series],
    over: [
      at({ left: inset, top: inset - 4, right: inset, bottom: inset, justifyContent: 'space-between' }, [
        name(sizes.name),
        div({ display: 'flex', flexDirection: 'column' }, caption(lesson, sizes.title)),
      ]),
    ],
  };
}

/** The series and number, then the full title. */
function caption({ data }: Lesson, sizes: [maxChars: number, size: number][]): SatoriElement[] {
  const size = (sizes.find(([max]) => data.title.length <= max) ?? sizes.at(-1)!)[1];
  return [
    div({ fontFamily: SANS, fontSize: 50, lineHeight: 1, marginBottom: 14 }, `${SERIES_LABEL[data.series]} ${data.number}`),
    // One box per word: Satori breaks lines after a slash, which would split "/ô/".
    div(
      { display: 'flex', flexWrap: 'wrap', columnGap: 0.24 * size, fontFamily: SERIF, fontSize: size, lineHeight: 1, letterSpacing: -0.01 * size },
      data.title.split(' ').map((word) => div({ whiteSpace: 'nowrap' }, word)),
    ),
  ];
}

/** "Tá Falado" (or part of it) in the identity's display setting. */
function name(size: number, text = NAME, lineHeight = 0.9): SatoriElement {
  return div({ fontFamily: SERIF, fontSize: size, lineHeight, letterSpacing: -0.03 * size, whiteSpace: 'nowrap' }, text);
}

/** The lesson's photo from public/, or undefined when it has none. */
async function lessonPhoto({ id, data }: Lesson): Promise<Photo | undefined> {
  if (!data.photo) return undefined;
  const url = data.photo.url;
  // Photos are static assets in git (ADR 0002). An absolute URL would need fetching at build time.
  if (!url.startsWith('/')) throw new Error(`Lesson "${id}" has a photo at ${url}; artwork needs a root-relative path in public/.`);
  const type = url.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return { data: await readFile(`public${url}`), type };
}

/**
 * getStaticPaths for the per-lesson images: one per lesson, at `[slug]` = `pronunciation-01`.
 *
 * The `cacheKey` lets Astro's incremental build (astro.config.ts) reuse an image from the last
 * build instead of drawing it again. Astro already redraws when this module's code changes; the
 * key adds what it can't see: the lesson's data (its digest), its photo and the font files, which
 * are read from disk rather than imported.
 */
export async function lessonArtworkPaths() {
  const fontKey = await fontHash();
  return Promise.all(
    (await getLessons()).map(async (lesson) => {
      // The glob loader always sets a digest. Without one, an edited lesson would keep its old image.
      if (!lesson.digest) throw new Error(`Lesson "${lesson.id}" has no digest to key its cached artwork.`);
      const photo = await lessonPhoto(lesson);
      const photoKey = photo ? createHash('sha256').update(photo.data).digest('hex').slice(0, 16) : 'none';
      return { params: { slug: artworkSlug(lesson.data) }, props: { lesson }, cacheKey: `${lesson.digest}:${photoKey}:${fontKey}` };
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

/** Composes an artwork's layers into one SVG and rasterises it `outputWidth` pixels wide. */
async function render({ canvas, paper, photo, printed = [], over = [] }: Artwork, outputWidth: number): Promise<Buffer> {
  const full: Box = { x: 0, y: 0, ...canvas };
  const print = printLayers({
    id: 'print',
    paper,
    box: photo?.box ?? full,
    screenBox: full,
    pitch: dotPitch(canvas.width, canvas.height),
    photo: photo?.image,
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
    <defs>${print.defs}</defs>
    <rect width="${canvas.width}" height="${canvas.height}" fill="${paper}"/>
    ${print.ink}
    ${printed.length ? nestSvg(await textLayer(printed, canvas), full, 'printed') : ''}
    ${print.screen}
    ${over.length ? nestSvg(await textLayer(over, canvas), full, 'over') : ''}
  </svg>`;
  const image = new Resvg(svg, { fitTo: { mode: 'width', value: outputWidth }, background: paper }).render();
  return encodeRgbPng(image.pixels, image.width, image.height);
}

/** A transparent Satori layer of absolutely placed text, in ink. */
async function textLayer(children: SatoriElement[], { width, height }: Size): Promise<string> {
  // Satori's types want a React element; ours has the same shape without depending on React.
  const root = div({ width, height, display: 'flex', position: 'relative', color: INK }, children);
  return satori(root as never, {
    width,
    height,
    fonts: await fonts(),
    // Satori asks for more fonts when a glyph isn't in ours. Fail the build instead of drawing
    // a blank box, so a title with a character the font lacks can't ship broken.
    loadAdditionalAsset: async (_language, segment) => {
      throw new Error(`The artwork fonts have no glyph for "${segment}".`);
    },
  });
}

// Satori takes React-shaped elements; plain objects avoid a React dependency.
type SatoriElement = { type: string; props: { style?: Record<string, unknown>; children?: SatoriElement | SatoriElement[] | string } };
const div = (style: Record<string, unknown>, children?: SatoriElement['props']['children']): SatoriElement => ({
  type: 'div',
  props: { style, children },
});
/** An absolutely placed column. */
const at = (style: Record<string, unknown>, children: SatoriElement['props']['children']) =>
  div({ position: 'absolute', display: 'flex', flexDirection: 'column', ...style }, children);

type Font = { name: string; data: Buffer; weight: 700; style: 'normal' };
let fontCache: Promise<Font[]> | undefined;

/**
 * Alegreya and Alegreya Sans Bold (#52), from the same pinned @fontsource packages as the site.
 * WOFF, not WOFF2, which Satori can't read. Latin covers Portuguese and Spanish; Latin Extended
 * is there for anything rarer. Read from the project root: Astro bundles this module before
 * running it, so import.meta.url doesn't point at src/.
 */
function fonts(): Promise<Font[]> {
  fontCache ??= Promise.all(
    (['latin', 'latin-ext'] as const).flatMap((subset) =>
      ([['alegreya', SERIF], ['alegreya-sans', SANS]] as const).map(async ([pkg, family]) => ({
        name: family,
        data: await readFile(`node_modules/@fontsource/${pkg}/files/${pkg}-${subset}-700-normal.woff`),
        weight: 700 as const,
        style: 'normal' as const,
      })),
    ),
  );
  return fontCache;
}

/** A short hash of the font files, so swapping a font invalidates the cached artwork. */
async function fontHash(): Promise<string> {
  const hash = createHash('sha256');
  for (const font of await fonts()) hash.update(font.data);
  return hash.digest('hex').slice(0, 16);
}

/**
 * Writes RGBA pixels as an 8-bit RGB PNG (colour type 2), dropping the alpha channel. resvg's
 * own PNGs are RGBA, and Apple's artwork rules ask for RGB with no transparency. The pixels are
 * opaque already: resvg fills the paper colour first.
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
