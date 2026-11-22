import { defineConfig, devices } from '@playwright/test';
const baseURL = 'http://127.0.0.1:4173/warhammer-40k-reminders/';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath: process.env.CHROMIUM_PATH } },
    },
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
  ],
  webServer: { command: 'npm run preview:test', url: baseURL, reuseExistingServer: !process.env.CI },
});
