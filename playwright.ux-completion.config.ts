import { defineConfig } from '@playwright/test'
import offline from './playwright.offline.config'
export default defineConfig(offline, {
  testDir: './tests/e2e', testMatch: /(?:ux-completion-(?!profile)|ux-c1-|recovery-).*\.spec\.ts/,
  outputDir: 'test-results/ux-completion-production', use: { video: 'on' },
})
