import type { APIRoute } from 'astro';
import { pngResponse, renderPodcastCover } from '../../lib/artwork-render';

// Built to /artwork/cover.png (PODCAST_COVER_PATH in src/lib/artwork.ts).
export const GET: APIRoute = async () => pngResponse(await renderPodcastCover());
