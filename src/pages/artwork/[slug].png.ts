import type { APIRoute, GetStaticPaths } from 'astro';
import { coverArtworkPaths, pngResponse, renderCover } from '../../lib/artwork-render';
import type { Lesson } from '../../lib/lessons';

// The podcast cover, built to /artwork/cover.png (PODCAST_COVER_PATH), and one cover per
// episode, built to /artwork/pronunciation-01.png (episodeCoverPath).
export const getStaticPaths = coverArtworkPaths satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => pngResponse(await renderCover((props as { lesson?: Lesson }).lesson));
