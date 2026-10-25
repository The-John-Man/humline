import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testDir: './tests/clerk',
  timeout: 60_000,
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    { name: 'authenticated', testMatch: /.*\.spec\.ts/, dependencies: ['setup'] },
  ],
  use: { ...base.use, baseURL: 'http://localhost:3001' },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3001/api/health',
    reuseExistingServer: false,
  },
});
