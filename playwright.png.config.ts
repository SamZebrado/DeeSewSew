import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e', testMatch: /ux-completion-png(?:-gaps)?\.spec\.ts/,
  workers: 1, retries: 0, reporter: 'line',
  use: { baseURL: 'http://127.0.0.1:5189/DeeSewSew/', channel: 'chrome', headless: true, viewport: { width: 1280, height: 1000 }, hasTouch: true },
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 5189 --strictPort', url: 'http://127.0.0.1:5189/DeeSewSew/', reuseExistingServer: false, timeout: 30_000 },
})
