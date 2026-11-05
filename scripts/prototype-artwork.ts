// PROTOTYPE (#61), throwaway: renders the chosen artwork template (A2) in the #55 print style for a handful
// of lessons into prototype-renders/. Run: `node scripts/prototype-artwork.ts`.
// Standalone (no Astro): it reads the lesson frontmatter itself.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { crc32, deflateSync } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { DEFAULT_PAPER, INK, PAPER } from '../src/lib/print.ts';
import { dotPitch, nestSvg, printLayers, type Box } from '../src/lib/print-svg.ts';
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
    title, // the full title, as on the OG image (#71)
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

/** A title size that keeps the longest titles to the given number of lines. */
function titleSize(title: string, sizes: [maxChars: number, size: number][]): number {
  return (sizes.find(([max]) => title.length <= max) ?? sizes.at(-1)!)[1];
}

// ---------------------------------------------------------------------------------------------
// The chosen template, A2 (round 1 picked A; round 2 added the podcast name on a tab). Type follows the OG image (#71):
// the name in Alegreya 700 at line-height 0.9 and -0.03em, the series and number in Alegreya Sans
// 700, then the full title in Alegreya 700 at line-height 1. `printed` sits under the dot screen
// (part of the print); `over` is overprinted on top of it.

interface Layout {
  box: Box;
  printed?: El[];
  over?: El[];
}

const label = (cover: Cover) => `${SERIES_LABEL[cover.series!]} ${cover.number}`;
const name = (size: number, text = 'Tá Falado', lineHeight = 0.9) =>
  div({ fontFamily: SERIF, fontSize: size, lineHeight, letterSpacing: -0.03 * size, whiteSpace: 'nowrap' }, text);

/** The series and number, then the title: the foot of every episode cover. */
function caption(cover: Cover, sizes: [number, number][]): El[] {
  const size = titleSize(cover.title!, sizes);
  return [
    div({ fontFamily: SANS, fontSize: 50, lineHeight: 1, marginBottom: 14 }, label(cover)),
    // One box per word: Satori breaks lines after a slash, which split "/ô/" across lines.
    div(
      { display: 'flex', flexWrap: 'wrap', columnGap: 0.24 * size, fontFamily: SERIF, fontSize: size, lineHeight: 1, letterSpacing: -0.01 * size },
      cover.title!.split(' ').map((word) => div({ whiteSpace: 'nowrap' }, word)),
    ),
  ];
}

const FULL: Box = { x: 0, y: 0, width: C, height: C };

/** The podcast cover, the same in both: the name stacked large at the foot, the subtitle at the top. */
const podcastCover = (): Layout => ({
  box: FULL,
  printed: [at({ left: 56, bottom: 40 }, [name(300, 'Tá', 0.82), name(300, 'Falado', 0.82)])],
  over: [at({ left: 64, top: 64, width: 720, fontFamily: SANS, fontSize: 54, lineHeight: 1.12 }, SUBTITLE)],
});

/** No photo (Supplementary 1 and 2), the same in both: as on the OG image, blank paper and dots. */
const blank = (cover: Cover): Layout => ({
  box: FULL,
  over: [
    at({ left: 64, top: 60, right: 64, bottom: 64, justifyContent: 'space-between' }, [
      name(120),
      div({ display: 'flex', flexDirection: 'column' }, caption(cover, [[22, 112], [34, 96], [99, 88]])),
    ]),
  ],
});

const VARIANTS: Record<string, { name: string; layout: (c: Cover) => Layout }> = {
  a2: {
    name: 'A2, name on a tab at the foot of the photo',
    layout(cover) {
      if (!cover.series) return podcastCover();
      if (!cover.photo) return blank(cover);
      return {
        box: { x: 0, y: 0, width: C, height: 620 },
        // The tab rises from the foot at the photo's bottom-left, clear of the faces, which sit high.
        printed: [at({ left: 0, bottom: C - 620, padding: '30px 40px 22px 56px', backgroundColor: PAPER[cover.series] }, [name(96)])],
        over: [at({ left: 60, top: 620, right: 60, bottom: 56, justifyContent: 'flex-end' }, caption(cover, [[22, 88], [34, 72], [99, 60]]))],
      };
    },
  },
};


// ---------------------------------------------------------------------------------------------
// Rendering

async function render(variant: string, cover: Cover, outputWidth: number): Promise<Buffer> {
  const paper = cover.series ? PAPER[cover.series] : DEFAULT_PAPER;
  const { box, printed = [], over = [] } = VARIANTS[variant].layout(cover);
  const pitch = dotPitch(C, C);
  const canvas = { x: 0, y: 0, width: C, height: C };
  const print = printLayers({ id: 'p', paper, box, screenBox: canvas, pitch, photo: cover.photo });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${C}" height="${C}" viewBox="0 0 ${C} ${C}">
    <defs>${print.defs}</defs>
    <rect width="${C}" height="${C}" fill="${paper}"/>
    ${print.ink}
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
