import { defineConfig } from '@playwright/test'
import offline from './playwright.offline.config'

export default defineConfig(offline, {
  testDir: './tests/e2e',
  testMatch: /recovery-.*\.spec\.ts/,
  outputDir: 'test-results/recovery-production',
  use: { video: 'on' },
})
