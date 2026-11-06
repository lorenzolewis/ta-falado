import type { APIRoute } from 'astro';
import { renderFavicon } from '../lib/artwork-render';

// The browser tab icon, at the root, where browsers ask for it even when a page doesn't link it.
export const GET: APIRoute = async () =>
  new Response(new Uint8Array(await renderFavicon()), { headers: { 'Content-Type': 'image/x-icon' } });
