import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir:'./tests/playtest',workers:1,retries:0,reporter:'line',outputDir:'review/playtest-page/browser',
  use:{baseURL:'http://127.0.0.1:4196/DeeSewSew/',channel:'chrome',headless:true,viewport:{width:1280,height:1000}},
  webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4196 --strictPort',url:'http://127.0.0.1:4196/DeeSewSew/playtest/',reuseExistingServer:false},
})
