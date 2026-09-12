import { defineConfig } from '@playwright/test'
export default defineConfig({testDir:'./tests/lab3d',workers:1,retries:0,reporter:'line',outputDir:'review/lab3d-ux/browser',
  use:{baseURL:'http://127.0.0.1:4194/DeeSewSew/',channel:'chrome',headless:true,viewport:{width:1280,height:1100},video:'on'},
  webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4194 --strictPort',url:'http://127.0.0.1:4194/DeeSewSew/',reuseExistingServer:false}})
