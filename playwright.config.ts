import { defineConfig, devices } from '@playwright/test';

// Browser tests against the built site (#51). They run on `wrangler dev`, not `astro preview`,
// because /mp3/* goes through the range Worker (worker/, ADR 0002). Each test starts from a fresh
// browser context, so no localStorage carries over between tests. Accessibility checks (#23) join
// this run as more `e2e/*.e2e.ts` files.
const PORT = 8788;
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'e2e',
  // Not *.test.ts / *.spec.ts, so vitest (unit tests) doesn't pick these up.
  testMatch: '**/*.e2e.ts',
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // CI builds in an earlier step; locally, build first so the test never runs on a stale dist/.
    command: `${CI ? '' : 'pnpm build && '}wrangler dev --ip 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !CI,
    timeout: 180_000,
    env: { WRANGLER_SEND_METRICS: 'false' },
  },
});
