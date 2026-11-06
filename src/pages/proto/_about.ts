// PROTOTYPE (#57): the About page's content as data, for three layout variants at /proto/about-{a,b,c}.
// The facts are CREDITS.md's, restructured by hand; the bios are lifted from its compiled HTML.
// Throwaway: never merged.
import * as credits from '../../../CREDITS.md';

export const VARIANTS = [
  { key: 'a', name: 'Liner notes' },
  { key: 'b', name: 'Attribution card' },
  { key: 'c', name: 'Cast list' },
] as const;

export const REPO = 'https://github.com/lorenzolewis/tafalado';
export const LINKS = {
  repo: REPO,
  credits: `${REPO}/blob/main/CREDITS.md`,
  license: `${REPO}/blob/main/LICENSE`,
  issues: `${REPO}/issues`,
  ccby: 'https://creativecommons.org/licenses/by/3.0/',
  original: 'https://www.coerll.utexas.edu/brazilpod/tafalado/',
  originalAbout: 'https://www.coerll.utexas.edu/brazilpod/tafalado/about.html',
  alegreya: 'https://www.huertatipografica.com/en/fonts/alegreya-ht-pro',
  alegreyaSans: 'https://www.huertatipografica.com/en/fonts/alegreya-sans-ht',
  tltc: 'http://tltc.la.utexas.edu/',
  laits: 'http://www.laits.utexas.edu/',
};

export interface Person {
  id: string;
  name: string;
  /** HTML, for lang spans. */
  nameHtml?: string;
  role: string;
  from: string;
  /** Which lessons, for guests. */
  note?: string;
  bio: string;
}

const html = (await credits.compiledContent()).replace(/<!--[\s\S]*?-->/g, '');
// Each bio is an <h3> under "Bios" followed by its paragraphs, up to the next <h3> or the end.
const biosHtml = html.slice(html.indexOf('<h2 id="bios"'));
const bios = new Map<string, string>();
for (const m of biosHtml.matchAll(/<h3 id="([^"]+)">[\s\S]*?<\/h3>([\s\S]*?)(?=<h3|$)/g)) bios.set(m[1]!, m[2]!.trim());
const bio = (id: string) => bios.get(id) ?? '';

export const TEAM: { group: string; people: Person[] }[] = [
  {
    group: 'Host',
    people: [
      { id: 'orlando-kelm', name: 'Orlando R. Kelm', role: 'Host', from: '', note: 'Hispanic linguistics, University of Texas at Austin', bio: bio('orlando-kelm') },
    ],
  },
  {
    group: 'Voices',
    people: [
      { id: 'valdo-oliveira', name: 'Valdo Oliveira', role: 'Voice', from: 'Feira de Santana, Bahia', bio: bio('valdo-oliveira') },
      { id: 'michelle-schreiner-lima', name: 'Michelle Schreiner Lima', role: 'Voice', from: 'Limeira and Americana, São Paulo', bio: bio('michelle-schreiner-lima') },
      {
        id: 'josé-luis-montiel',
        name: 'José Luis Montiel',
        nameHtml: '<span lang="es">José Luis Montiel</span>',
        role: 'Voice, the Spanish speaker',
        from: 'Maracaibo, Venezuela',
        bio: bio('josé-luis-montiel') || bio('jose-luis-montiel'),
      },
    ],
  },
  {
    group: 'Guest voices',
    people: [
      { id: 'vivian-flanzer', name: 'Vivian Flanzer', role: 'Guest voice', from: 'Rio de Janeiro', note: 'Pronunciation 13 and 15', bio: bio('vivian-flanzer') },
      { id: 'alfredo-barros', name: 'Alfredo Barros', role: 'Guest voice', from: 'Pernambuco', note: 'Pronunciation 11', bio: bio('alfredo-barros') },
    ],
  },
  {
    group: 'Production',
    people: [
      { id: 'michael-heidenreich', name: 'Michael Heidenreich', role: 'Audio recording', from: '', bio: bio('michael-heidenreich') },
      { id: 'spalomino', name: 's.palomino', role: 'Multimedia and technology', from: '', bio: bio('spalomino') },
    ],
  },
];

export const BIO_IDS = [...bios.keys()];
