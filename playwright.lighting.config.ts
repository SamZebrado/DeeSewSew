import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /lighting-(?:prototype|integration)\.spec\.ts/,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: 'line',
  outputDir: 'review/lighting-prototype-20260908/browser',
  use: {
    baseURL: 'http://127.0.0.1:4189/DeeSewSew/',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 1180 },
    video: 'on',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4189 --strictPort',
    url: 'http://127.0.0.1:4189/DeeSewSew/',
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
