// Local TLS smoke test only. Temporary self-signed keys are never packaged.
import { createServer } from 'node:https';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium, expect } from '@playwright/test';
const temp = mkdtempSync(resolve(tmpdir(), 'humline-tls-'));
const root = resolve('dist');
let server, browser;
try {
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      resolve(temp, 'key.pem'),
      '-out',
      resolve(temp, 'cert.pem'),
      '-days',
      '1',
      '-subj',
      '/CN=localhost',
      '-addext',
      'subjectAltName=DNS:localhost,IP:127.0.0.1',
    ],
    { stdio: 'ignore' },
  );
  server = createServer(
    { key: readFileSync(resolve(temp, 'key.pem')), cert: readFileSync(resolve(temp, 'cert.pem')) },
    (req, res) => {
      const path = resolve(
        root,
        '.' +
          new URL(req.url, 'https://localhost').pathname +
          (req.url === '/' ? 'index.html' : ''),
      );
      if (!path.startsWith(root + '/')) {
        res.writeHead(403);
        res.end();
        return;
      }
      try {
        const data = readFileSync(path);
        res.setHeader(
          'Content-Type',
          {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.svg': 'image/svg+xml',
            '.wav': 'audio/wav',
          }[extname(path)] ?? 'application/octet-stream',
        );
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end();
      }
    },
  );
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    args: [
      '--no-sandbox',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${resolve('../humline-build-context/fixtures/melody-clean.wav')}`,
    ],
  });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    permissions: ['microphone'],
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`https://127.0.0.1:${port}`);
  expect(await page.evaluate(() => window.isSecureContext)).toBe(true);
  await page.getByRole('button', { name: /Try a synthetic example/ }).click();
  await page.getByRole('button', { name: 'Convert to notes' }).click();
  await expect(page.locator('.note')).toHaveCount(6);
  await page.getByRole('button', { name: 'Record a melody', exact: true }).click();
  await expect(page.getByText('Recording…', { exact: true })).toBeVisible();
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: 'Stop recording' }).click();
  await expect(page.getByRole('button', { name: 'Convert to notes' })).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'PASS: production assets, transcription worker and synthetic microphone capture on local HTTPS. Certificate trust errors were ignored for this ephemeral self-signed test.',
  );
} finally {
  await browser?.close();
  if (server) await new Promise((r) => server.close(r));
  rmSync(temp, { recursive: true, force: true });
}
