// Byte-range serving for static assets, which ignore `Range` on their own (ADR 0002).

export type ByteRange = { start: number; end: number };

/**
 * Parses a `Range` header against a file of `size` bytes (RFC 9110 §14.1.2).
 *
 * - `null`: serve the whole file with 200. This covers no header, a header we can't parse
 *   (which the spec says to ignore) and multiple ranges (which the spec lets us answer whole).
 * - `'unsatisfiable'`: answer 416.
 * - otherwise the inclusive byte range to answer with 206.
 */
export function parseRange(header: string | null, size: number): ByteRange | 'unsatisfiable' | null {
  if (header === null) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, first, last] = match;

  if (first === '') {
    // Suffix range: the last n bytes.
    if (last === '') return null;
    const length = Number(last);
    if (length === 0 || size === 0) return 'unsatisfiable';
    return { start: Math.max(0, size - length), end: size - 1 };
  }

  const start = Number(first);
  const end = last === '' ? Infinity : Number(last);
  if (end < start) return null;
  if (start >= size) return 'unsatisfiable';
  return { start, end: Math.min(end, size - 1) };
}

/**
 * Turns a full static-asset response into the answer for `request`: 206 for a single
 * satisfiable range, 416 for an unsatisfiable one, and the asset itself otherwise.
 * Every successful answer advertises `Accept-Ranges: bytes`.
 */
export async function serveRange(request: Request, asset: Response): Promise<Response> {
  if (asset.status !== 200) return asset;

  const headers = new Headers(asset.headers);
  headers.set('Accept-Ranges', 'bytes');
  const whole = () => new Response(asset.body, { status: 200, headers });

  const rangeHeader = request.method === 'GET' ? request.headers.get('Range') : null;
  // If-Range: only honour the range while the client's validator still matches.
  const ifRange = request.headers.get('If-Range');
  if (rangeHeader === null || (ifRange !== null && ifRange !== asset.headers.get('ETag'))) {
    return whole();
  }

  const body = await asset.arrayBuffer();
  const size = body.byteLength;
  const range = parseRange(rangeHeader, size);

  if (range === null) return new Response(body, { status: 200, headers });

  if (range === 'unsatisfiable') {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${size}`, 'Content-Length': '0' },
    });
  }

  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
  headers.set('Content-Length', String(range.end - range.start + 1));
  return new Response(body.slice(range.start, range.end + 1), { status: 206, headers });
}
