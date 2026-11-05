// The print (#55) as plain SVG, for the generated artwork (#61) and the OG images (#71). Satori has
// no CSS `filter` or `mix-blend-mode`, so the photo is drawn here instead, for resvg to rasterise:
// an SVG filter turns it into black ink on the series paper, and a <pattern> lays the dot screen
// over it. Satori only draws the text, which the caller places between the layers (printed: under
// the dots) or on top (overprinted). Same recipe as src/components/Print.astro:
//   photo: grayscale(1) contrast(1.35) brightness(1.05), multiplied over the paper in INK
//   dots:  paper-coloured, solid to 0.9/4 of the pitch, soft to 1.5/4, at 55% opacity
import { INK } from './print.ts';

/** A rectangle on the canvas, in canvas units. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The parts of one print, to stack in this order: `ink`, any printed text, `screen`. */
export interface PrintLayers {
  defs: string;
  /** The paper over `box` and, when there's a photo, the photo in ink, cropped to cover the box. */
  ink: string;
  /** The dot screen over `screenBox` (the whole canvas, usually, so printed text is screened too). */
  screen: string;
}

export interface PrintOptions {
  /** Unique within the SVG: prefixes the filter and pattern ids. */
  id: string;
  paper: string;
  box: Box;
  screenBox?: Box;
  /** The dot pitch in canvas units. The lesson page uses 4px on a frame about 400–700px wide. */
  pitch: number;
  /** A JPEG or PNG, as bytes. */
  photo?: { data: Buffer; type: 'image/jpeg' | 'image/png' };
}

export function printLayers({ id, paper, box, screenBox = box, pitch, photo }: PrintOptions): PrintLayers {
  const [pr, pg, pb] = rgb(paper);
  const [ir, ig, ib] = rgb(INK);
  // Multiplying an ink-tinted grey over the paper is a straight line per channel from paper×ink
  // (where the photo is black) to paper (where it is white): one feComponentTransfer table.
  const channel = (p: number, i: number) => `${fmt(p * i)} ${fmt(p)}`;
  const defs = `
    <filter id="${id}-ink" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncR type="linear" slope="1.35" intercept="-0.175"/><feFuncG type="linear" slope="1.35" intercept="-0.175"/><feFuncB type="linear" slope="1.35" intercept="-0.175"/></feComponentTransfer>
      <feComponentTransfer><feFuncR type="linear" slope="1.05"/><feFuncG type="linear" slope="1.05"/><feFuncB type="linear" slope="1.05"/></feComponentTransfer>
      <feComponentTransfer><feFuncR type="table" tableValues="${channel(pr, ir)}"/><feFuncG type="table" tableValues="${channel(pg, ig)}"/><feFuncB type="table" tableValues="${channel(pb, ib)}"/></feComponentTransfer>
    </filter>
    <radialGradient id="${id}-dot"><stop offset="0.6" stop-color="${paper}"/><stop offset="1" stop-color="${paper}" stop-opacity="0"/></radialGradient>
    <pattern id="${id}-screen" width="${pitch}" height="${pitch}" patternUnits="userSpaceOnUse">
      <circle cx="${pitch / 2}" cy="${pitch / 2}" r="${(pitch * 1.5) / 4}" fill="url(#${id}-dot)"/>
    </pattern>
    <clipPath id="${id}-clip"><rect ${attrs(box)}/></clipPath>`;
  const image = photo
    ? `<image ${attrs(box)} preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}-clip)" filter="url(#${id}-ink)" href="data:${photo.type};base64,${photo.data.toString('base64')}"/>`
    : '';
  return {
    defs,
    ink: `<rect ${attrs(box)} fill="${paper}"/>${image}`,
    screen: `<rect ${attrs(screenBox)} fill="url(#${id}-screen)" opacity="0.55"/>`,
  };
}

/**
 * Nests a Satori SVG in another SVG at `box`. Satori numbers its ids from zero in every call, so
 * two layers in one image would clash: prefix them.
 */
export function nestSvg(svg: string, box: Box, prefix: string): string {
  return svg
    .replace(/^<svg /, `<svg x="${box.x}" y="${box.y}" `)
    .replaceAll(/id="([^"]+)"/g, `id="${prefix}-$1"`)
    .replaceAll(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`)
    .replaceAll(/href="#([^"]+)"/g, `href="#${prefix}-$1"`);
}

function attrs({ x, y, width, height }: Box): string {
  return `x="${x}" y="${y}" width="${width}" height="${height}"`;
}

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const fmt = (n: number) => n.toFixed(4);
