import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { crc32, deflateSync } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { artworkSlug, OG_HEIGHT, OG_WIDTH, PODCAST_COVER_SLUG } from './artwork';
import { getLessons, shortTitle, type Lesson } from './lessons';
import { SERIES_LABEL, type Series } from './series';

// The artwork template (#17): one layout drawn at three sizes, rendered at build time by the
// endpoints in src/pages/artwork/. Satori lays out the elements as SVG; resvg rasterises it.
// Server-only: browser code that needs an artwork URL imports ./artwork instead.
//
// The look is a placeholder; the design pass (#29) restyles it. Keep the size and format rules:
// Apple wants RGB with no transparency, so every image is written as an opaque RGB PNG.

/** The podcast cover: 3000×3000, Apple's maximum. */
export const COVER_SIZE = 3000;
/** Episode covers: 1400×1400, Apple's minimum, which keeps 46 of them quick to build. */
export const EPISODE_COVER_SIZE = 1400;

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

export function renderOgImage(lesson: Lesson): Promise<Buffer> {
  return render(lessonContent(lesson), OG, OG.width);
}

/**
 * getStaticPaths for the per-lesson images: one per lesson, at `[slug]` = `pronunciation-01`.
 *
 * The `cacheKey` lets Astro's incremental build (astro.config.ts) reuse an image from the last
 * build instead of drawing it again. Astro already redraws when this module's code changes; the
 * key adds what it can't see: the lesson's data (its digest) and the font files, which are read
 * from disk rather than imported.
 */
export async function lessonArtworkPaths() {
  const fontKey = await fontHash();
  return (await getLessons()).map((lesson) => {
    // The glob loader always sets a digest. Without one, an edited lesson would keep its old image.
    if (!lesson.digest) throw new Error(`Lesson "${lesson.id}" has no digest to key its cached artwork.`);
    return { params: { slug: artworkSlug(lesson.data) }, props: { lesson }, cacheKey: `${lesson.digest}:${fontKey}` };
  });
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
  // Satori's types want a React element; ours has the same shape without depending on React.
  const svg = await satori(template(content, colors, canvas) as never, {
    ...canvas,
    fonts: await fonts(),
    // Satori asks for more fonts when a glyph isn't in ours. Fail the build instead of drawing
    // a blank box, so a title with a character the font lacks can't ship broken.
    loadAdditionalAsset: async (_language, segment) => {
      const text = [content.headline, content.title, content.topic].filter(Boolean).join(' / ');
      throw new Error(`The artwork font has no glyph for "${segment}" (in "${text}").`);
    },
  });
  const image = new Resvg(svg, { fitTo: { mode: 'width', value: outputWidth }, background: colors.background }).render();
  return encodeRgbPng(image.pixels, image.width, image.height);
}

// Satori takes React-shaped elements; plain objects avoid a React dependency.
type SatoriElement = { type: string; props: { style?: Record<string, unknown>; children?: SatoriElement | SatoriElement[] | string } };
const div = (style: Record<string, unknown>, children?: SatoriElement['props']['children']): SatoriElement => ({
  type: 'div',
  props: { style, children },
});

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

let fontCache: Promise<{ name: string; data: Buffer; weight: 400 | 700; style: 'normal' }[]> | undefined;

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

/** A short hash of the font files, so swapping a font invalidates the cached artwork. */
async function fontHash(): Promise<string> {
  const hash = createHash('sha256');
  for (const font of await fonts()) hash.update(font.data);
  return hash.digest('hex').slice(0, 16);
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
