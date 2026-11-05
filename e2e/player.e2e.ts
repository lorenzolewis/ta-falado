// Smoke test of the persistent player (#51, ADR 0001): play, pause, seek and speed; playback
// carries on across a ClientRouter navigation; after a reload the lesson resumes where it was left
// (ADR 0004). Elements are found by role and accessible name only, so restyling (#29) can't break it.
import { expect, test, type Locator, type Page } from '@playwright/test';

const seconds = async (seek: Locator) => Number(await seek.inputValue());

/** The audio is playing: the Seek slider moves on its own. */
async function expectPlaying(seek: Locator) {
  const from = await seconds(seek);
  await expect.poll(() => seconds(seek), { timeout: 10_000 }).toBeGreaterThan(from);
}

function playerOf(page: Page) {
  const region = page.getByRole('region', { name: 'Audio player' });
  return {
    region,
    play: region.getByRole('button', { name: 'Play', exact: true }),
    pause: region.getByRole('button', { name: 'Pause', exact: true }),
    seek: region.getByRole('slider', { name: 'Seek' }),
    speed: region.getByRole('combobox', { name: 'Speed' }),
  };
}

test('the player plays, seeks, keeps playing across pages and resumes after a reload', async ({ page }) => {
  await page.goto('/pronunciation/01');
  const player = playerOf(page);
  await expect(player.region).toBeHidden();

  // Play
  await page.getByRole('main').getByRole('button', { name: 'Play lesson' }).click();
  await expect(player.region).toBeVisible();
  await expect(player.pause).toBeVisible();
  await expectPlaying(player.seek);

  // Pause
  await player.pause.click();
  await expect(player.play).toBeVisible();
  const pausedAt = await seconds(player.seek);
  await page.waitForTimeout(1500);
  expect(await seconds(player.seek)).toBe(pausedAt);

  // Seek (once the real duration is known, so the position isn't clamped)
  await expect.poll(async () => Number(await player.seek.getAttribute('max'))).toBeGreaterThan(120);
  await player.seek.fill('60');
  await expect(player.seek).toHaveValue('60');
  await expect(player.seek).toHaveAttribute('aria-valuetext', /^1:00 of /);

  // Speed
  await player.speed.selectOption({ label: '1.5×' });
  await expect(player.speed).toHaveValue('1.5');

  await player.play.click();
  await expect(player.pause).toBeVisible();
  await expectPlaying(player.seek);
  expect(await seconds(player.seek)).toBeGreaterThanOrEqual(60);

  // Navigate: the audio keeps playing through a ClientRouter page swap.
  await page.getByRole('link', { name: 'About this site' }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(/Pronunciation of/);
  await expect(player.pause).toBeVisible();
  await expect(player.speed).toHaveValue('1.5');
  await expectPlaying(player.seek);

  // Reload: the position and speed are kept on the device, and Resume picks up from there.
  const beforeReload = await seconds(player.seek);
  await page.reload();
  await expect(player.region).toBeHidden(); // nothing plays until the learner asks
  await page.getByRole('link', { name: 'Tá Falado', exact: true }).click();
  const resume = page.getByRole('region', { name: 'Continue where you left off' });
  await expect(resume).toBeVisible();
  await resume.getByRole('button', { name: 'Resume' }).click();
  await expect(player.pause).toBeVisible();
  await expect(player.speed).toHaveValue('1.5');
  await expect.poll(() => seconds(player.seek)).toBeGreaterThanOrEqual(beforeReload);
  await expectPlaying(player.seek);
});
