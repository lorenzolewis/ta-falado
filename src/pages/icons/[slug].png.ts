import type { APIRoute, GetStaticPaths } from 'astro';
import type { ManifestIcon } from '../../lib/artwork';
import { manifestIconPaths, pngResponse, renderManifestIcon } from '../../lib/artwork-render';

// The web app manifest's icons, built to /icons/icon-192.png and so on (MANIFEST_ICONS).
export const getStaticPaths = manifestIconPaths satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => pngResponse(await renderManifestIcon((props as { icon: ManifestIcon }).icon));
