import type { APIRoute } from 'astro';
import { APPLE_TOUCH_ICON_SIZE } from '../lib/artwork';
import { pngResponse, renderIcon } from '../lib/artwork-render';

// The home screen icon for iPhone and iPad, at the root, where iOS and link previews look for it
// even when a page doesn't link it (src/layouts/Base.astro does).
export const GET: APIRoute = async () => pngResponse(await renderIcon(APPLE_TOUCH_ICON_SIZE));
