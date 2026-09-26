import { defineConfig } from '@playwright/test'

// Isolated review run against the caller-owned server on port 5302.
export default defineConfig({
  testDir: '../../tests/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:5302/DeeSewSew/',
    channel: 'chrome',
    headless: true,
    viewport: { width: 768, height: 1024 },
    hasTouch: true,
  },
})
