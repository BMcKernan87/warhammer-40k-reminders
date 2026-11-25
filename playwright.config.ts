import {defineConfig} from '@playwright/test';
const external=process.env.PLAYWRIGHT_BASE_URL;
const baseURL=external??'http://127.0.0.1:4173/warhammer-40k-reminders/';
export default defineConfig({testDir:'./tests/e2e',use:{baseURL},webServer:external?undefined:{command:'npm run build && npm exec vite preview -- --host 127.0.0.1 --port 4173 --strictPort',url:baseURL,reuseExistingServer:!process.env.CI,timeout:120000}});
