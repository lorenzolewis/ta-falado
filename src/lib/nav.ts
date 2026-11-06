// Which part of the site a path is, and which view the phone shows (#53), for the sidebar's current
// row. Shared by src/layouts/Base.astro (the first render) and src/lib/sidebar-ui.ts
// (every navigation), so both apply the same rules.
import { SERIES, type Series } from './series';

export type Section = 'home' | 'lesson' | 'about' | 'other';
/** The phone shows one at a time: the home page, any other page, or the Lessons view. */
export type View = 'home' | 'page' | 'lessons';

/** The phone's Lessons view is this fragment on any page, so it has a URL and Back leaves it. */
export const LESSONS_ID = 'lessons';

const LESSON_PATH = new RegExp(`^/(${SERIES.join('|')})/\\d\\d$`);

/** `/grammar/17` for `/grammar/17.html`: the path without the `.html` the static build may serve. */
export function pagePath(pathname: string): string {
  return pathname.replace(/(\/index)?\.html$/, '') || '/';
}

export function sectionOf(pathname: string): Section {
  const path = pagePath(pathname);
  if (path === '/') return 'home';
  if (path === '/about') return 'about';
  return LESSON_PATH.test(path) ? 'lesson' : 'other';
}

/** The series of a lesson page's path (`/grammar/03` → `grammar`), or undefined for any other page. */
export function seriesOf(pathname: string): Series | undefined {
  const match = LESSON_PATH.exec(pagePath(pathname));
  return match ? (match[1] as Series) : undefined;
}

/** The phone's view for a path and its fragment. */
export function viewOf(pathname: string, hash = '') {
  const section = sectionOf(pathname);
  const view: View = hash === `#${LESSONS_ID}` ? 'lessons' : section === 'home' ? 'home' : 'page';
  return { section, view };
}
