// The About page's roster, parsed from CREDITS.md's compiled HTML (docs/adr/0005). CREDITS.md stays
// the single source for the credits; this reads its convention and throws when the file breaks it,
// so a mistake fails the build instead of dropping someone from the page.

export interface Person {
  /** The name as plain text, which matches the bio's heading. */
  name: string;
  /** The name as HTML, for `lang` spans. */
  nameHtml: string;
  /** The line under the name: where they're from, their lessons or their role. HTML. */
  lineHtml: string;
  /** The bio's paragraphs, as HTML. */
  bioHtml: string;
}

export interface Role {
  role: string;
  /** The people in this role, each with a bio. Empty for a role given as a paragraph. */
  people: Person[];
  /** A role given as a paragraph (Support): its inner HTML. */
  html?: string;
}

const textOf = (html: string) => html.replace(/<[^>]+>/g, '').trim();

/** The HTML from `<h2 id="{id}">` up to the next `<h2>`. */
function section(html: string, id: string): string {
  const start = html.indexOf(`<h2 id="${id}"`);
  if (start < 0) throw new Error(`CREDITS.md: no "## " heading with the id "${id}"`);
  const end = html.indexOf('<h2', start + 1);
  return html.slice(start, end < 0 ? undefined : end);
}

/** Each `<h3>` in a section, with the HTML under it. */
function subsections(html: string) {
  return [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|$)/g)].map((m) => ({
    headingHtml: m[1]!,
    body: m[2]!.trim(),
  }));
}

/** CREDITS.md's "The team" roles and people, each person with their bio from "Bios". */
export function parseCredits(compiledHtml: string): Role[] {
  const html = compiledHtml.replace(/<!--[\s\S]*?-->/g, '');

  const bios = new Map(subsections(section(html, 'bios')).map((b) => [textOf(b.headingHtml), b.body]));
  const used = new Set<string>();

  const roles = subsections(section(html, 'the-team')).map(({ headingHtml, body }): Role => {
    const role = textOf(headingHtml);
    if (!body.includes('<li')) {
      const paragraph = body.match(/^<p>([\s\S]*)<\/p>$/);
      if (!paragraph) throw new Error(`CREDITS.md: "${role}" needs a list of people or one paragraph`);
      return { role, people: [], html: paragraph[1]! };
    }
    const items = [...body.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]!.trim());
    const people = items.map((item): Person => {
      const m = item.match(/^<strong>([\s\S]+?)<\/strong>:\s*([\s\S]+)$/);
      if (!m) throw new Error(`CREDITS.md: "${textOf(item)}" under "${role}" isn't "**Name**: line"`);
      const name = textOf(m[1]!);
      const bioHtml = bios.get(name);
      if (!bioHtml) throw new Error(`CREDITS.md: no bio under "Bios" headed "${name}"`);
      used.add(name);
      return { name, nameHtml: m[1]!, lineHtml: m[2]!, bioHtml };
    });
    return { role, people };
  });

  const unused = [...bios.keys()].filter((name) => !used.has(name));
  if (unused.length) throw new Error(`CREDITS.md: bios with no one in "The team": ${unused.join(', ')}`);
  return roles;
}
