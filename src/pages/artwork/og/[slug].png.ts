import type { APIRoute, GetStaticPaths } from 'astro';
import { lessonArtworkPaths, pngResponse, renderOgImage } from '../../../lib/artwork-render';
import type { Lesson } from '../../../lib/lessons';

// One Open Graph image per lesson page, built to /artwork/og/pronunciation-01.png (ogImagePath).
export const getStaticPaths = lessonArtworkPaths satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => pngResponse(await renderOgImage((props as { lesson: Lesson }).lesson));
