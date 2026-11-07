const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
   testDir: './tests',
   timeout: 30_000,
   use: {
      baseURL: 'http://localhost:3000',
      headless: true
   },
   webServer: {
      command: 'npm start',
      url: 'http://localhost:3000/app/login',
      reuseExistingServer: true,
      timeout: 120_000
   }
});
