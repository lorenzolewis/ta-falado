import { describe, expect, it } from 'vitest';
import { parseCredits } from './credits';

// The shape Astro compiles CREDITS.md to.
const team = (roles: string) => `<h1 id="credits-and-license">Credits and license</h1>
<h2 id="the-team">The team</h2>
<p>The roles here come from the lesson intros.</p>
<!-- a maintainer note with <h3>tags</h3> -->
${roles}
<h2 id="bios">Bios</h2>
<p>From the original About Us page.</p>
<h3 id="orlando-r-kelm">Orlando R. Kelm</h3>
<p><em>Orlando</em> was born in Calgary.</p>
<p>Professionally, business schools.</p>
<h3 id="josé-luis-montiel"><span lang="es">José Luis Montiel</span></h3>
<p>Born in Maracaibo.</p>`;

const ROLES = `<h3 id="host">Host</h3>
<ul>
<li><strong>Orlando R. Kelm</strong>: Hispanic linguistics, University of Texas at Austin</li>
</ul>
<h3 id="voices">Voices</h3>
<ul>
<li><strong><span lang="es">José Luis Montiel</span></strong>: Maracaibo, Venezuela</li>
</ul>
<h3 id="support">Support</h3>
<p>Support by <em><a href="http://tltc.la.utexas.edu/">TLTC</a></em>.</p>`;

describe('parseCredits', () => {
  it('reads the roles in order, each person with their line and bio', () => {
    const roles = parseCredits(team(ROLES));
    expect(roles.map((r) => r.role)).toEqual(['Host', 'Voices', 'Support']);
    expect(roles[0]!.people).toEqual([
      {
        name: 'Orlando R. Kelm',
        nameHtml: 'Orlando R. Kelm',
        lineHtml: 'Hispanic linguistics, University of Texas at Austin',
        bioHtml: '<p><em>Orlando</em> was born in Calgary.</p>\n<p>Professionally, business schools.</p>',
      },
    ]);
  });

  it('keeps lang spans in the name and matches the bio by its text', () => {
    const [person] = parseCredits(team(ROLES))[1]!.people;
    expect(person!.nameHtml).toBe('<span lang="es">José Luis Montiel</span>');
    expect(person!.bioHtml).toBe('<p>Born in Maracaibo.</p>');
  });

  it('gives a role written as a paragraph as its HTML, with no people', () => {
    const support = parseCredits(team(ROLES))[2]!;
    expect(support.people).toEqual([]);
    expect(support.html).toBe('Support by <em><a href="http://tltc.la.utexas.edu/">TLTC</a></em>.');
  });

  it('fails when someone has no bio', () => {
    const roles = ROLES.replace('Orlando R. Kelm</strong>', 'Orlando Kelm</strong>');
    expect(() => parseCredits(team(roles))).toThrow('no bio under "Bios" headed "Orlando Kelm"');
  });

  it('fails when a bio has no one in the team', () => {
    const roles = ROLES.replace(/<h3 id="voices">[\s\S]*?<\/ul>\n/, '');
    expect(() => parseCredits(team(roles))).toThrow('bios with no one in "The team": José Luis Montiel');
  });

  it('fails when a person breaks the "**Name**: line" convention', () => {
    const roles = ROLES.replace('</strong>: Hispanic', '</strong>, Hispanic');
    expect(() => parseCredits(team(roles))).toThrow('isn\'t "**Name**: line"');
  });
});
