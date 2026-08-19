import { defineConfig, devices } from '@playwright/test';

const isCI = process.env.CI === 'true';

export default defineConfig({
  testDir: './tests',
  timeout: 120000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  retries: isCI ? 2 : 1,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['line']],
  outputDir: 'test-results',

  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120000,
  },

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    headless: isCI,
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    launchOptions: {
      headless: isCI,
      args: [
        ...(isCI ? [] : ['--start-maximized']),
        '--no-sandbox',
        '--disable-web-security',
        '--allow-file-access-from-files',
      ],
      slowMo: 0,
    },

    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'abdwallet',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
