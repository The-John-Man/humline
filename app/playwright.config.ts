import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 45_000,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH ||
        (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
      args: [
        '--no-sandbox',
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio-capture=${resolve('../humline-build-context/fixtures/melody-clean.wav')}`,
      ],
    },
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
