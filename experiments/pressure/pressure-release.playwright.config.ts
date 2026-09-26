import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '../../tests/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['line'], ['json', { outputFile: '../../review/pressure-release-20260927/focused/playwright-report.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:5310/DeeSewSew/',
    channel: 'chrome',
    headless: true,
    viewport: { width: 768, height: 1024 },
    hasTouch: true,
  },
})
