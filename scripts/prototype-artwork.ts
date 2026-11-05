// PROTOTYPE (#61), throwaway: renders three artwork templates in the #55 print style for a handful
// of lessons into prototype-renders/. Run: `node scripts/prototype-artwork.ts`.
// Standalone (no Astro): it reads the lesson frontmatter itself.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { crc32, deflateSync } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { DEFAULT_PAPER, INK, PAPER } from '../src/lib/print.ts';
import { nestSvg, printLayers, type Box } from '../src/lib/print-svg.ts';
import { SERIES_LABEL, type Series } from '../src/lib/series.ts';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('prototype-renders/', ROOT);
const C = 1000; // every layout is drawn on a 1000×1000 canvas, then scaled
const SUBTITLE = 'Brazilian Portuguese pronunciation and grammar for Spanish speakers';

// ---------------------------------------------------------------------------------------------
// Content

interface Cover {
  slug: string;
  series?: Series; // absent on the podcast cover
  number?: number;
  title?: string;
  photo?: { data: Buffer; type: 'image/jpeg' };
}

const SAMPLES = ['pronunciation-01', 'pronunciation-04', 'grammar-02', 'grammar-14', 'supplementary-01'];

function lesson(slug: string): Cover {
  const md = readFileSync(new URL(`src/content/lessons/${slug}.md`, ROOT), 'utf8');
  const field = (name: string) => md.match(new RegExp(`^${name}: "?(.*?)"?$`, 'm'))?.[1];
  const series = field('series') as Series;
  const title = field('title')!;
  const photoUrl = md.match(/^photo:\n {2}url: (.*)$/m)?.[1];
  return {
    slug,
    series,
    number: Number(field('number')),
    title: series === 'pronunciation' ? title.replace(/^Pronunciation of /, '') : title,
    photo: photoUrl ? { data: readFileSync(new URL(`public${photoUrl}`, ROOT)), type: 'image/jpeg' } : undefined,
  };
}

// ---------------------------------------------------------------------------------------------
// Satori helpers

type El = { type: string; props: { style?: Record<string, unknown>; lang?: string; children?: El | El[] | string } };
const div = (style: Record<string, unknown>, children?: El['props']['children']): El => ({ type: 'div', props: { style, children } });
const SERIF = 'Alegreya';
const SANS = 'Alegreya Sans';

function font(pkg: string, name: string, subset: string) {
  return { name, weight: 700 as const, style: 'normal' as const, data: readFileSync(new URL(`node_modules/@fontsource/${pkg}/files/${pkg}-${subset}-700-normal.woff`, ROOT)) };
}
const FONTS = ['latin', 'latin-ext'].flatMap((s) => [font('alegreya', SERIF, s), font('alegreya-sans', SANS, s)]);

/** A full-canvas, transparent Satori layer of absolutely placed children. */
async function layer(children: El[], box: Box = { x: 0, y: 0, width: C, height: C }): Promise<string> {
  const root = div({ width: box.width, height: box.height, display: 'flex', position: 'relative', color: INK }, children);
  return satori(root as never, {
    width: box.width,
    height: box.height,
    fonts: FONTS,
    loadAdditionalAsset: async (_l, segment) => {
      throw new Error(`No glyph for "${segment}"`);
    },
  });
}

const at = (style: Record<string, unknown>, children: El['props']['children']) => div({ position: 'absolute', display: 'flex', flexDirection: 'column', ...style }, children);

/** "Tá Falado" set as on the lesson page's no-photo print: one line, 18.5% of the frame's width. */
function nameplate(width: number, opacity = 0.85): El {
  const size = 0.185 * width;
  return at(
    { left: 0.1 * size, top: 0.16 * size, fontFamily: SERIF, fontSize: size, lineHeight: 0.82, letterSpacing: -0.03 * size, opacity, whiteSpace: 'nowrap' },
    'Tá Falado',
  );
}

/** A title size that keeps the longest titles to the given number of lines. */
function titleSize(title: string, sizes: [maxChars: number, size: number][]): number {
  return (sizes.find(([max]) => title.length <= max) ?? sizes.at(-1)!)[1];
}

// ---------------------------------------------------------------------------------------------
// Variants. Each returns the print's box, the dot pitch, and two text layers: `printed` sits under
// the dot screen (it is part of the print), `over` is overprinted on top of it.

interface Layout {
  box: Box;
  pitch: number;
  printed?: El[];
  over?: El[];
  /** Extra SVG drawn with the ink, under the printed text (variant C's podcast cover). */
  extra?: string;
}

const label = (cover: Cover) => `${SERIES_LABEL[cover.series!]} ${cover.number}`;

const VARIANTS: Record<string, { name: string; blurb: string; layout: (c: Cover) => Layout }> = {
  a: {
    name: 'A, Plate',
    blurb: 'The print across the top two thirds, a paper foot with the series, number and title. Fine screen.',
    layout(cover) {
      const pitch = C / 160;
      if (!cover.series) {
        // Podcast cover: the name stacked large at the foot, the subtitle at the top.
        return {
          box: { x: 0, y: 0, width: C, height: C },
          pitch,
          printed: [at({ left: 56, bottom: 40, fontFamily: SERIF, fontSize: 300, lineHeight: 0.82, letterSpacing: -9, opacity: 0.88 }, [div({}, 'Tá'), div({}, 'Falado')])],
          over: [at({ left: 64, top: 64, width: 720, fontFamily: SANS, fontSize: 54, lineHeight: 1.12 }, SUBTITLE)],
        };
      }
      const box = { x: 0, y: 0, width: C, height: 620 };
      const size = titleSize(cover.title!, [[14, 110], [24, 88], [36, 72], [99, 60]]);
      return {
        box,
        pitch,
        printed: cover.photo ? [] : [nameplate(box.width)],
        over: [
          at({ left: 64, top: 676, right: 64, bottom: 56 }, [
            div({ fontFamily: SANS, fontSize: 54, lineHeight: 1 }, label(cover)),
            div({ fontFamily: SERIF, fontSize: size, lineHeight: 1, marginTop: 20, letterSpacing: -0.01 * size }, cover.title),
          ]),
        ],
      };
    },
  },
  b: {
    name: 'B, Numeral',
    blurb: 'The print fills the square; a paper tab holds the series and a huge number. No title: apps show it beside the art. Coarse screen.',
    layout(cover) {
      const pitch = C / 90;
      const box = { x: 0, y: 0, width: C, height: C };
      if (!cover.series) {
        return {
          box,
          pitch,
          printed: [nameplate(C, 0.88)],
          over: [at({ left: 64, bottom: 64, width: 640, fontFamily: SANS, fontSize: 54, lineHeight: 1.12 }, SUBTITLE)],
        };
      }
      const digits = String(cover.number).length;
      return {
        box,
        pitch,
        printed: [
          ...(cover.photo ? [] : [nameplate(C)]),
          // The tab: paper, so it reads over any photo. Drawn in the printed layer so the screen covers it.
          at({ left: 0, bottom: 0, width: digits > 1 ? 520 : 400, height: 470, backgroundColor: cover.photo ? PAPER[cover.series] : 'transparent', padding: '40px 0 0 56px' }, [
            div({ fontFamily: SANS, fontSize: 52, lineHeight: 1, opacity: 0.88 }, SERIES_LABEL[cover.series]),
            div({ fontFamily: SERIF, fontSize: 400, lineHeight: 0.86, letterSpacing: -16, marginTop: 4, marginLeft: -12, opacity: 0.88 }, String(cover.number)),
          ]),
        ],
      };
    },
  },
  c: {
    name: 'C, Masthead',
    blurb: '"Tá Falado" printed across the top of every cover, the print in a window below, then the series, number and title. Medium screen.',
    layout(cover) {
      const pitch = C / 120;
      const m = 56;
      const masthead = at({ left: m - 6, top: 34, fontFamily: SERIF, fontSize: 196, lineHeight: 1, letterSpacing: -6, opacity: 0.88, whiteSpace: 'nowrap' }, 'Tá Falado');
      const box = { x: m, y: 250, width: C - 2 * m, height: cover.series ? 500 : 540 };
      if (!cover.series) {
        // Podcast cover: the window shows the three papers, one per series.
        const w = box.width / 3;
        const extra = (['pronunciation', 'grammar', 'supplementary'] as const)
          .map((s, i) => `<rect x="${box.x + i * w}" y="${box.y}" width="${w + (i < 2 ? 1 : 0)}" height="${box.height}" fill="${PAPER[s]}"/>`)
          .join('');
        const rule = `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="none" stroke="${INK}" stroke-width="6"/>`;
        return {
          box,
          pitch,
          extra: extra + rule,
          printed: [masthead],
          over: [at({ left: m, top: 830, width: 800, fontFamily: SANS, fontSize: 52, lineHeight: 1.12 }, SUBTITLE)],
        };
      }
      const size = titleSize(cover.title!, [[22, 78], [34, 62], [99, 54]]);
      return {
        box,
        pitch,
        printed: [
          masthead,
          ...(cover.photo
            ? []
            : [at({ left: m + 40, top: box.y + box.height - 430, fontFamily: SERIF, fontSize: 480, lineHeight: 0.86, opacity: 0.88 }, String(cover.number))]),
        ],
        over: [
          at({ left: m, top: 790, right: m }, [
            div({ fontFamily: SANS, fontSize: 40, lineHeight: 1 }, label(cover)),
            div({ fontFamily: SERIF, fontSize: size, lineHeight: 1.02, marginTop: 14, letterSpacing: -0.01 * size, lineClamp: 2 }, cover.title),
          ]),
        ],
      };
    },
  },
};

// ---------------------------------------------------------------------------------------------
// Rendering

async function render(variant: string, cover: Cover, outputWidth: number): Promise<Buffer> {
  const paper = cover.series ? PAPER[cover.series] : DEFAULT_PAPER;
  const { box, pitch, printed = [], over = [], extra = '' } = VARIANTS[variant].layout(cover);
  const canvas = { x: 0, y: 0, width: C, height: C };
  const print = printLayers({ id: 'p', paper, box, screenBox: canvas, pitch, photo: cover.photo });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${C}" height="${C}" viewBox="0 0 ${C} ${C}">
    <defs>${print.defs}</defs>
    <rect width="${C}" height="${C}" fill="${paper}"/>
    ${print.ink}${extra}
    ${printed.length ? nestSvg(await layer(printed), canvas, 'printed') : ''}
    ${print.screen}
    ${over.length ? nestSvg(await layer(over), canvas, 'over') : ''}
  </svg>`;
  const image = new Resvg(svg, { fitTo: { mode: 'width', value: outputWidth }, background: paper }).render();
  return encodeRgbPng(image.pixels, image.width, image.height);
}

function encodeRgbPng(rgba: Buffer, width: number, height: number): Buffer {
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const f = (y * width + x) * 4;
      const t = y * stride + 1 + x * 3;
      raw[t] = rgba[f];
      raw[t + 1] = rgba[f + 1];
      raw[t + 2] = rgba[f + 2];
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('sRGB', Buffer.from([0])),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * A contact sheet per variant: every cover at 300px, then the same covers at 120px and 60px, the
 * sizes of a podcast app's episode list and library grid. Downscaled by sips (macOS) for real
 * resampling, not resvg's.
 */
function contactSheet(variant: string, files: string[]): void {
  const dir = new URL(`${variant}/`, OUT);
  const thumb = (file: string, px: number) => {
    const out = new URL(`../.thumbs/${variant}-${px}-${file}`, dir);
    execFileSync('sips', ['-Z', String(px), new URL(file, dir).pathname, '--out', out.pathname], { stdio: 'ignore' });
    return readFileSync(out).toString('base64');
  };
  const gap = 24;
  const rows: [number, number][] = [[300, 0], [120, 0], [60, 0]];
  let y = gap;
  const parts: string[] = [];
  for (const [px] of rows) {
    files.forEach((file, i) => {
      parts.push(`<image x="${gap + i * (px + gap)}" y="${y}" width="${px}" height="${px}" href="data:image/png;base64,${thumb(file, px)}"/>`);
    });
    y += px + gap;
  }
  const width = gap + files.length * (300 + gap);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${y}"><rect width="100%" height="100%" fill="#ffffff"/>${parts.join('')}</svg>`;
  const png = new Resvg(svg, { fitTo: { mode: 'original' }, imageRendering: 1 }).render().asPng();
  writeFileSync(new URL(`sheet-${variant}.png`, OUT), png);
}

mkdirSync(new URL('.thumbs/', OUT), { recursive: true });
process.on('exit', () => rmSync(new URL('.thumbs/', OUT), { recursive: true, force: true }));
const covers: [Cover, number][] = [[{ slug: 'cover' }, 3000], ...SAMPLES.map((s): [Cover, number] => [lesson(s), 1400])];
for (const variant of Object.keys(VARIANTS)) {
  mkdirSync(new URL(`${variant}/`, OUT), { recursive: true });
  const files: string[] = [];
  for (const [cover, size] of covers) {
    const file = `${cover.slug}.png`;
    writeFileSync(new URL(`${variant}/${file}`, OUT), await render(variant, cover, size));
    files.push(file);
    console.log(`${variant}/${file}`);
  }
  contactSheet(variant, files);
}
