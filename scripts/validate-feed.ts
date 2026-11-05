// Validates the built podcast feed (dist/feed.xml): well-formed XML, the RSS 2.0 required
// elements, Apple's required iTunes tags, ADR 0003, and every enclosure length against the file
// on disk. Run after `pnpm build`: `pnpm validate:feed`. Exits non-zero on any error.

import { readFileSync, statSync } from 'node:fs';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

const DIST = new URL('../dist/', import.meta.url);
const EPISODES = 46;

const xml = readFileSync(new URL('feed.xml', DIST), 'utf8');
const errors: string[] = [];
const fail = (message: string) => errors.push(message);

const wellFormed = XMLValidator.validate(xml);
if (wellFormed !== true) {
  console.error(`✗ feed.xml is not well-formed XML: ${wellFormed.err.msg} (line ${wellFormed.err.line})`);
  process.exit(1);
}
console.log('✓ well-formed XML');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  isArray: (name) => ['item', 'itunes:category'].includes(name),
});
const rss = parser.parse(xml).rss;
const channel = rss?.channel;
if (rss?.['@version'] !== '2.0' || !channel) {
  console.error('✗ root must be <rss version="2.0"> with a <channel>');
  process.exit(1);
}

const text = (node: unknown): string => (typeof node === 'object' && node ? String((node as any)['#text'] ?? '') : String(node ?? '')).trim();
const requireText = (node: any, name: string, where: string) => {
  if (!text(node?.[name])) fail(`${where}: missing <${name}>`);
};
const site = new URL(text(channel.link));

// Channel: RSS 2.0 requires title, link, description; Apple requires title, description,
// itunes:image, language, itunes:category and itunes:explicit.
for (const name of ['title', 'link', 'description', 'language', 'copyright', 'itunes:author']) requireText(channel, name, 'channel');
if (!channel['itunes:image']?.['@href']) fail('channel: missing <itunes:image href>');
const category = channel['itunes:category']?.[0];
if (category?.['@text'] !== 'Education' || category?.['itunes:category']?.[0]?.['@text'] !== 'Language Learning') {
  fail('channel: category must be Education → Language Learning');
}
if (text(channel['itunes:explicit']) !== 'false') fail('channel: <itunes:explicit> must be false');
if (text(channel.language) !== 'en') fail('channel: <language> must be en');
if (text(channel['itunes:type']) !== 'serial') fail('channel: <itunes:type> must be serial (ADR 0003)');
if (!/unofficial/i.test(text(channel.description))) fail('channel: description must say the archive is unofficial');

// Items: RSS 2.0 requires a title or description; Apple requires title, enclosure and guid.
const items: any[] = channel.item ?? [];
if (items.length !== EPISODES) fail(`expected ${EPISODES} items, found ${items.length}`);
const guids = new Set<string>();
items.forEach((item, index) => {
  const where = `item ${index + 1} (${text(item.title) || 'untitled'})`;
  for (const name of ['title', 'link', 'guid', 'pubDate', 'description', 'itunes:duration']) requireText(item, name, where);
  if ('itunes:season' in item) fail(`${where}: has <itunes:season> (ADR 0003: no seasons)`);
  if (Number(text(item['itunes:episode'])) !== index + 1) fail(`${where}: <itunes:episode> must be ${index + 1}, in order`);
  if (!/^(Pronunciation|Grammar|Supplementary) \d+ · /.test(text(item.title))) fail(`${where}: title must name the series`);
  if (Number.isNaN(Date.parse(text(item.pubDate)))) fail(`${where}: <pubDate> is not a date`);
  if (!/^\d+$/.test(text(item['itunes:duration']))) fail(`${where}: <itunes:duration> must be whole seconds`);
  if (!item['itunes:image']?.['@href']) fail(`${where}: missing <itunes:image href>`);

  const description = text(item.description);
  if (!description.includes('CC BY 3.0')) fail(`${where}: description lacks the CC BY 3.0 credit`);
  if (!description.includes(`href="${text(item.link)}"`)) fail(`${where}: description lacks a link to the lesson page`);

  const guid = text(item.guid);
  if (guids.has(guid)) fail(`${where}: duplicate guid ${guid}`);
  guids.add(guid);
  if (guid.includes(site.host)) fail(`${where}: guid must not depend on the domain`);

  const enclosure = item.enclosure;
  if (!enclosure?.['@url'] || !enclosure['@length'] || enclosure['@type'] !== 'audio/mpeg') {
    fail(`${where}: <enclosure> needs url, length and type="audio/mpeg"`);
    return;
  }
  const audio = new URL(enclosure['@url']);
  if (audio.origin !== site.origin) return; // hosted elsewhere: nothing on disk to compare
  const size = statSync(new URL(`.${decodeURIComponent(audio.pathname)}`, DIST), { throwIfNoEntry: false })?.size;
  if (size === undefined) fail(`${where}: enclosure ${audio.pathname} is not in dist/`);
  else if (size !== Number(enclosure['@length'])) fail(`${where}: enclosure length ${enclosure['@length']} ≠ ${size} bytes on disk`);
});
if (!/^Pronunciation 1 · /.test(text(items[0]?.title))) fail('the first item must be Pronunciation 1 (Lesson 1)');

if (errors.length) {
  for (const error of errors) console.error(`✗ ${error}`);
  console.error(`\n${errors.length} problem(s) in dist/feed.xml`);
  process.exit(1);
}
console.log('✓ RSS 2.0 required elements (channel title, link, description; item title, guid)');
console.log('✓ Apple required tags (itunes:image, itunes:category, itunes:explicit, language, enclosure)');
console.log('✓ ADR 0003: itunes:type serial, itunes:episode 1–46 in order, no itunes:season, series in titles');
console.log(`✓ ${items.length} enclosures, every length matches the file size in dist/`);
console.log(`✓ first episode: ${text(items[0].title)}`);
