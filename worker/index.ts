// Runs only for `/mp3/*` (`assets.run_worker_first` in wrangler.jsonc); every other path
// is served straight from static assets without invoking this Worker.
import { serveRange } from './range';

type Env = { ASSETS: { fetch(request: Request): Promise<Response> } };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // The asset binding drops Cache-Control when it sees Range, so ask it for the plain file.
    const headers = new Headers(request.headers);
    headers.delete('Range');
    headers.delete('If-Range');
    const asset = await env.ASSETS.fetch(new Request(request, { headers }));
    return serveRange(request, asset);
  },
};
