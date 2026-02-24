import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.screenshots' });

export default defineConfig({
  testDir: './scripts/screenshots',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  use: {
    baseURL: process.env.SCREENSHOT_BASE_URL || 'http://localhost:3001',
    viewport: { width: 1440, height: 900 },
    screenshot: 'off',
    colorScheme: 'light',
    actionTimeout: 10_000,
  },
  outputDir: './docs/help-center/screenshots',
});
