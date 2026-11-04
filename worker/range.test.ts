/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import worker from './index';
import { parseRange } from './range';

const mp3 = readFileSync(new URL('../public/mp3/tafalado_01.mp3', import.meta.url));
const size = mp3.byteLength; // 7,590,390

// Stands in for the static-asset binding, which ignores Range and always returns the whole file,
// but (as seen on a preview deploy) leaves out Cache-Control when the request carries Range.
const env = {
  ASSETS: {
    async fetch(request: Request) {
      if (!new URL(request.url).pathname.endsWith('/tafalado_01.mp3')) {
        return new Response('not found', { status: 404 });
      }
      return new Response(request.method === 'HEAD' ? null : mp3, {
        headers: {
          'Content-Type': 'audio/mpeg',
          ETag: '"abc"',
          ...(request.headers.has('Range')
            ? {}
            : { 'Cache-Control': 'public, max-age=0, must-revalidate' }),
        },
      });
    },
  },
};

function get(headers: Record<string, string> = {}, method = 'GET', path = '/mp3/tafalado_01.mp3') {
  return worker.fetch(new Request(`https://example.com${path}`, { method, headers }), env);
}

describe('parseRange', () => {
  it.each([
    ['bytes=0-99', { start: 0, end: 99 }],
    ['bytes=100-', { start: 100, end: 999 }],
    ['bytes=-100', { start: 900, end: 999 }],
    ['bytes=-5000', { start: 0, end: 999 }],
    ['bytes=900-5000', { start: 900, end: 999 }],
  ])('%s', (header, expected) => {
    expect(parseRange(header, 1000)).toEqual(expected);
  });

  it.each(['bytes=1000-', 'bytes=5000-6000', 'bytes=-0'])('%s is unsatisfiable', (header) => {
    expect(parseRange(header, 1000)).toBe('unsatisfiable');
  });

  it.each([null, 'bytes=0-1,5-9', 'bytes=5-1', 'items=0-1', 'bytes=-', 'bytes=a-b'])(
    '%s means the whole file',
    (header) => {
      expect(parseRange(header, 1000)).toBeNull();
    },
  );
});

describe('worker', () => {
  it('answers a range with 206 and the exact bytes', async () => {
    const res = await get({ Range: 'bytes=3795000-3796023' });
    expect(res.status).toBe(206);
    expect(res.headers.get('Content-Range')).toBe(`bytes 3795000-3796023/${size}`);
    expect(res.headers.get('Content-Length')).toBe('1024');
    expect(res.headers.get('Accept-Ranges')).toBe('bytes');
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
    expect(Buffer.from(await res.arrayBuffer())).toEqual(mp3.subarray(3795000, 3796024));
  });

  it('answers open-ended and suffix ranges', async () => {
    const open = await get({ Range: 'bytes=5000000-' });
    expect(open.headers.get('Content-Range')).toBe(`bytes 5000000-${size - 1}/${size}`);
    expect(open.headers.get('Content-Length')).toBe(String(size - 5000000));

    const suffix = await get({ Range: 'bytes=-1024' });
    expect(suffix.headers.get('Content-Range')).toBe(`bytes ${size - 1024}-${size - 1}/${size}`);
    expect(Buffer.from(await suffix.arrayBuffer())).toEqual(mp3.subarray(size - 1024));
  });

  it('answers an unsatisfiable range with 416', async () => {
    const res = await get({ Range: 'bytes=99999999-' });
    expect(res.status).toBe(416);
    expect(res.headers.get('Content-Range')).toBe(`bytes */${size}`);
  });

  it('answers no range, or several, with 200 and Accept-Ranges', async () => {
    for (const headers of [{}, { Range: 'bytes=0-1,5-9' }] as Record<string, string>[]) {
      const res = await get(headers);
      expect(res.status).toBe(200);
      expect(res.headers.get('Accept-Ranges')).toBe('bytes');
      expect((await res.arrayBuffer()).byteLength).toBe(size);
    }
  });

  it('ignores the range when If-Range no longer matches', async () => {
    expect((await get({ Range: 'bytes=0-1', 'If-Range': '"abc"' })).status).toBe(206);
    expect((await get({ Range: 'bytes=0-1', 'If-Range': '"old"' })).status).toBe(200);
  });

  it('passes HEAD through with Accept-Ranges', async () => {
    const res = await get({ Range: 'bytes=0-1' }, 'HEAD');
    expect(res.status).toBe(200);
    expect(res.headers.get('Accept-Ranges')).toBe('bytes');
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg');
  });

  it('passes a missing file through untouched', async () => {
    const res = await get({ Range: 'bytes=0-1' }, 'GET', '/mp3/nope.mp3');
    expect(res.status).toBe(404);
    expect(res.headers.get('Accept-Ranges')).toBeNull();
  });
});
