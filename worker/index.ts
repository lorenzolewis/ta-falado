// Runs only for `/mp3/*` (`assets.run_worker_first` in wrangler.jsonc); every other path
// is served straight from static assets without invoking this Worker.
import { serveRange } from './range';

type Env = { ASSETS: { fetch(request: Request): Promise<Response> } };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return serveRange(request, await env.ASSETS.fetch(request));
  },
};
