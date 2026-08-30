import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:5174/DeeSewSew/',
    channel: 'chrome',
    headless: true,
    viewport: { width: 768, height: 1024 },
    hasTouch: true,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5174',
    url: 'http://127.0.0.1:5174/DeeSewSew/',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
