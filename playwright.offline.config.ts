import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/offline',
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4175/DeeSewSew/',
    channel: 'chrome',
    headless: true,
    viewport: { width: 768, height: 1024 },
    hasTouch: true,
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4175',
    url: 'http://127.0.0.1:4175/DeeSewSew/',
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
