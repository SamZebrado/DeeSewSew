import { defineConfig } from '@playwright/test'
import offline from './playwright.offline.config'
export default defineConfig(offline, {
  testDir: './tests/e2e',
  testMatch: /(?:ux-c1|recovery)-.*\.spec\.ts/,
  outputDir: 'test-results/ux-c1-production',
  use: { video: 'on' },
})
