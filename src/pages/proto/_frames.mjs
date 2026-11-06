// PROTOTYPE (#62), throwaway. Captures frame strips of each motion variant mid-navigation by
// pausing every animation at fixed times, then lays them out as one contact sheet per journey.
// Run against the dev server: node src/pages/proto/_frames.mjs [baseUrl] [outDir] [light|dark]
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:4322';
const OUT = process.argv[3] ?? 'prototype-screenshots';
const SCHEME = process.argv[4] ?? 'light';
mkdirSync(OUT, { recursive: true });

const TIMES = { 0: [60, 125, 190], a: [80, 180, 300], b: [80, 170, 270], c: [100, 260, 480], d: [80, 220, 360] };
const VARIANTS = (process.env.VARIANTS ?? '0,a,b,c,d').split(',');
const NAMES = { 0: 'Today', a: 'A, The tab carries', b: 'B, Sheets', c: 'C, Press', d: 'D, Sheets, printed' };

const VIEWPORTS = {
  phone: { ...devices['iPhone 15'], defaultBrowserType: undefined },
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
};

// Each journey: where to start, what to click (or 'back'), from the start page.
const JOURNEYS = {
  desktop: [
    { id: 'home-to-lesson', label: 'Home → lesson (row click)', start: '/', act: '[data-sidebar] .list a[href="/pronunciation/02"]' },
    { id: 'lesson-to-lesson', label: 'Lesson → lesson (row click)', start: '/pronunciation/02', act: '[data-sidebar] .list a[href="/pronunciation/05"]' },
    { id: 'back-to-home', label: 'Lesson → home (browser Back)', start: '/', pre: '[data-sidebar] .list a[href="/pronunciation/02"]', act: 'back' },
  ],
  phone: [
    { id: 'page-to-lessons', label: '“‹ Lessons” from a lesson', start: '/pronunciation/02', act: '.back' },
    { id: 'lessons-to-lesson', label: 'Lessons → lesson (row tap)', start: '/pronunciation/02#lessons', act: '[data-sidebar] .list a[href="/pronunciation/05"]' },
    { id: 'back-to-home', label: 'Lesson → home (browser Back)', start: '/', pre: '[data-all-lessons]', pre2: '[data-sidebar] .list a[href="/pronunciation/02"]', act: 'back' },
  ],
};

async function freeze(page, t) {
  await page.waitForFunction(() => document.getAnimations().some((a) => a.effect?.pseudoElement), null, { timeout: 5000, polling: 5 });
  await page.evaluate((t) => {
    const anims = document.getAnimations();
    anims.forEach((a) => {
      a.pause();
      a.currentTime = t;
    });
    window.__resume = () => anims.forEach((a) => a.play());
  }, t);
}

const browser = await chromium.launch();
for (const [vp, opts] of Object.entries(VIEWPORTS)) {
  for (const journey of JOURNEYS[vp]) {
    const rows = [];
    for (const v of VARIANTS) {
      const shots = [];
      for (const t of [...TIMES[v], 'end']) {
        const context = await browser.newContext({ ...opts, colorScheme: SCHEME });
        const page = await context.newPage();
        await page.goto(`${BASE}/?motion=${v}`);
        // Audio playing, so the mini-player is up through every transition.
        await page.click('[data-continue-play]');
        await page.waitForSelector('[data-player]:not([hidden])');
        await page.evaluate(() => document.querySelector('audio')?.pause());
        if (journey.start !== '/') {
          await page.goto(`${BASE}${journey.start}`);
          await page.waitForTimeout(300);
        }
        for (const pre of [journey.pre, journey.pre2].filter(Boolean)) {
          await page.click(pre);
          await page.waitForTimeout(900);
        }
        await page.waitForTimeout(300);
        if (journey.act === 'back') page.goBack().catch(() => {});
        else page.click(journey.act).catch(() => {});
        if (t === 'end') await page.waitForTimeout(1500);
        else await freeze(page, t).catch(() => {});
        shots.push({ t, src: `data:image/png;base64,${(await page.screenshot()).toString('base64')}` });
        await context.close();
      }
      rows.push({ v, shots });
    }
    // The contact sheet: a row per variant, a column per frame.
    const w = vp === 'phone' ? 196 : 400;
    const sheet = await browser.newPage({ viewport: { width: 200 + 4 * (w + 12), height: 400 }, deviceScaleFactor: 2 });
    await sheet.setContent(`<!doctype html><body style="margin:0;padding:16px;font:14px system-ui;background:${SCHEME === 'dark' ? '#222' : '#fff'};color:${SCHEME === 'dark' ? '#eee' : '#111'}">
      <h2 style="margin:0 0 12px">${journey.label}, ${vp}, ${SCHEME}</h2>
      ${rows
        .map(
          (r) => `<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:14px">
            <div style="width:180px;font-weight:700">${NAMES[r.v]}</div>
            ${r.shots.map((s) => `<figure style="margin:0;width:${w}px"><img src="${s.src}" style="width:100%;outline:1px solid #888"><figcaption>${s.t === 'end' ? 'settled' : s.t + ' ms'}</figcaption></figure>`).join('')}
          </div>`,
        )
        .join('')}
    </body>`);
    const file = `${OUT}/frames-${vp}-${journey.id}-${SCHEME}.png`;
    await sheet.screenshot({ path: file, fullPage: true });
    await sheet.close();
    console.log(file);
  }
}
await browser.close();
