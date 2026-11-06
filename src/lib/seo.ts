import { episodeCoverPath, PODCAST_COVER_PATH } from './artwork';
import { isoDate, isoDuration } from './format';
import { LICENSE_URL, PODCAST_AUTHOR, PODCAST_DESCRIPTION, PODCAST_TITLE } from './podcast';
import { INK } from './print';
import { lessonPath, lessonTitle, type Series } from './series';

/** The site's own short description: the default meta description, and the web app manifest's. */
export const SITE_DESCRIPTION = 'Brazilian Portuguese pronunciation and grammar podcast for Spanish speakers.';

/**
 * The browser's and the home screen app's bar colour: the sheet the page is printed on
 * (--surface in src/styles/base.css), white stock in light mode and ink in dark.
 */
export const THEME_COLOUR = { light: '#ffffff', dark: INK } as const;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };

/** Search engines show about this many characters of a description. */
const DESCRIPTION_MAX = 160;
/** Whole sentences shorter than this say too little ("Just look at that barriga!"), so fill up to the max. */
const DESCRIPTION_MIN = 100;

/**
 * A lesson's meta description from its rendered intro: plain text, at most 160 characters. A long
 * intro ends after its last whole sentence that fits, unless that leaves under 100 characters: then
 * it is cut at a word, with an ellipsis.
 */
export function lessonDescription(html: string): string {
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&(#\d+|[a-z]+);/g, (entity, name: string) => ENTITIES[name] ?? entity)
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= DESCRIPTION_MAX) return text;

  // A sentence ends at . ! or ?, then any closing quotes or brackets, then a space: `Russian?” That`.
  let fit = 0;
  for (const end of text.matchAll(/[.!?]+["'”’)\]]*(?= )/g)) {
    const at = end.index + end[0].length;
    if (at > DESCRIPTION_MAX) break;
    fit = at;
  }
  if (fit >= DESCRIPTION_MIN) return text.slice(0, fit);

  const cut = text.slice(0, DESCRIPTION_MAX); // leaves room for the ellipsis after trimming a word
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:]+$/, '')}…`;
}

type EpisodeRef = {
  series: Series;
  number: number;
  episode: number;
  title: string;
  date: Date;
  audio: { url: string; durationSeconds: number };
};

/** schema.org JSON-LD for a lesson page. `site` is Astro's, so every URL is absolute. */
export function podcastEpisodeLd(lesson: EpisodeRef, description: string, site: URL) {
  const url = (path: string) => new URL(path, site).href;
  const duration = isoDuration(lesson.audio.durationSeconds);
  return {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    name: lessonTitle(lesson),
    description,
    url: url(lessonPath(lesson)),
    episodeNumber: lesson.episode,
    datePublished: isoDate(lesson.date),
    duration,
    image: url(episodeCoverPath(lesson)),
    inLanguage: 'en',
    license: LICENSE_URL,
    associatedMedia: { '@type': 'AudioObject', contentUrl: url(lesson.audio.url), encodingFormat: 'audio/mpeg', duration },
    partOfSeries: { '@type': 'PodcastSeries', name: PODCAST_TITLE, url: url('/') },
  };
}

/** schema.org JSON-LD for the home page: the podcast as a whole. */
export function podcastSeriesLd(site: URL) {
  const url = (path: string) => new URL(path, site).href;
  return {
    '@context': 'https://schema.org',
    '@type': 'PodcastSeries',
    name: PODCAST_TITLE,
    description: PODCAST_DESCRIPTION,
    url: url('/'),
    webFeed: url('/feed.xml'),
    image: url(PODCAST_COVER_PATH),
    inLanguage: 'en',
    license: LICENSE_URL,
    author: { '@type': 'Organization', name: PODCAST_AUTHOR },
  };
}

/**
 * JSON for a `<script type="application/ld+json">`. Escapes `<` so no string in the data can
 * end the element early (`</script>`); JSON parsers read `<` back as `<`.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
