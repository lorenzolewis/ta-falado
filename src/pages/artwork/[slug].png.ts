import type { APIRoute, GetStaticPaths } from 'astro';
import { lessonArtworkPaths, pngResponse, renderEpisodeCover } from '../../lib/artwork-render';
import type { Lesson } from '../../lib/lessons';

// One cover per episode, built to /artwork/pronunciation-01.png (episodeCoverPath).
export const getStaticPaths = lessonArtworkPaths satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => pngResponse(await renderEpisodeCover((props as { lesson: Lesson }).lesson));
