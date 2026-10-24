import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import midiPackage from '@tonejs/midi';
const { Midi } = midiPackage;
const fixtures = resolve('../humline-build-context/fixtures');
async function example(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /Try a synthetic example/ }).click();
  await page.getByRole('button', { name: 'Convert to notes' }).click();
  await expect(page.locator('.note')).toHaveCount(6);
}
test('production end-to-end: actual WAV, edit, undo/redo, presets, transport, MIDI, persistence', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/demo');
  await example(page);
  await expect(
    page.getByText('SYNTHETIC EXAMPLE · Generated tones, not a human recording'),
  ).toBeVisible();
  await page.locator('.note').first().click();
  await page.getByLabel('Note pitch', { exact: true }).selectOption('72');
  await page.getByLabel('Note length', { exact: true }).fill('2.5');
  await page.getByLabel('Note start', { exact: true }).fill('0.5');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  for (const preset of ['Keys', 'Pluck', 'Pad']) {
    await page.getByRole('button', { name: preset, exact: true }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.getByRole('button', { name: 'Stop playback' }).click();
  }
  await page.getByRole('button', { name: 'Listen to original' }).click();
  await expect(page.getByRole('button', { name: 'Stop original' })).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Listen to original' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop playback' }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export MIDI' }).click();
  const download = await downloadEvent;
  const path = await download.path();
  const midi = new Midi(new Uint8Array(await readFile(path!)));
  const project = await page.evaluate(() => JSON.parse(localStorage.getItem('humline.demo.v1')!));
  expect(midi.tracks[0].notes[0].midi).toBe(72);
  expect(midi.tracks[0].notes[0].durationTicks / midi.header.ppq).toBe(2.5);
  expect(midi.tracks[0].notes[0].ticks / midi.header.ppq).toBe(0.5);
  expect(midi.tracks[0].instrument.number).toBe(88);
  expect(midi.tracks[0].notes).toHaveLength(project.notes.length);
  await page.screenshot({ path: '../release/screenshots/studio-desktop.png', fullPage: true });
  await page.reload();
  await expect(page.locator('.note')).toHaveCount(6);
  await expect(page.getByText(/Notes restored/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Listen to original' })).toBeDisabled();
  expect(errors).toEqual([]);
});
test('pointer drag and resize each create one history entry; keyboard edits, add and delete', async ({
  page,
}) => {
  await page.goto('/demo');
  await example(page);
  const note = page.locator('.note').first();
  const before = await note.boundingBox();
  await page.mouse.move(before!.x + 15, before!.y + 8);
  await page.mouse.down();
  await page.mouse.move(before!.x + 73, before!.y - 15, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByLabel('Note pitch', { exact: true })).toHaveValue('58');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await note.click();
  await expect(page.getByLabel('Note pitch', { exact: true })).toHaveValue('57');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  const after = await note.boundingBox();
  await page.mouse.move(after!.x + after!.width - 2, after!.y + 8);
  await page.mouse.down();
  await page.mouse.move(after!.x + after!.width + 56, after!.y + 8, { steps: 7 });
  await page.mouse.up();
  await expect(page.getByLabel('Note length', { exact: true })).toHaveValue('2');
  await note.focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByLabel('Note pitch', { exact: true })).toHaveValue('59');
  await page.keyboard.press('Delete');
  await expect(page.locator('.note')).toHaveCount(5);
  const grid = await page.locator('.piano-scroll').boundingBox();
  await page.mouse.click(grid!.x + 180, grid!.y + 70);
  await expect(page.locator('.note')).toHaveCount(6);
});
test('bad audio and silent input recover; project import validates before replacement', async ({
  page,
}) => {
  await page.goto('/demo');
  await page
    .getByLabel('Import audio file')
    .setInputFiles({ name: 'bad.wav', mimeType: 'audio/wav', buffer: Buffer.from('bad wav') });
  await expect(page.getByRole('alert')).toContainText('could not be read');
  await page.getByLabel('Import audio file').setInputFiles(resolve(fixtures, 'silence.wav'));
  await page.getByRole('button', { name: 'Convert to notes' }).click();
  await expect(page.getByRole('alert')).toContainText('No steady pitches');
  await expect(page.locator('.note')).toHaveCount(0);
  await example(page);
  await page.getByLabel('Import project file').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":9}'),
  });
  await expect(page.getByRole('alert')).toContainText('Invalid Humline project');
  await expect(page.locator('.note')).toHaveCount(6);
  await page.getByRole('button', { name: /Try a synthetic example/ }).click();
  await page.getByRole('button', { name: 'Convert to notes' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Keep current melody' }).click();
  await expect(page.locator('.note')).toHaveCount(6);
});
test('permission denied is recoverable with import', async ({ page, context }) => {
  await context.clearPermissions();
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Record a melody', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Microphone access was denied');
  await example(page);
  await expect(page.locator('.note')).toHaveCount(6);
});
test('browser microphone pipeline uses synthetic device; stop and cancel release tracks', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['microphone']);
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    (window as any).__streams = [];
    navigator.mediaDevices.getUserMedia = async (c) => {
      const s = await original(c);
      (window as any).__streams.push(s);
      return s;
    };
  });
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Record a melody', exact: true }).click();
  await expect(page.getByText('Recording…', { exact: true })).toBeVisible();
  await page.waitForTimeout(2200);
  await page.getByRole('button', { name: 'Stop recording' }).click();
  await page.getByRole('button', { name: 'Convert to notes' }).click();
  await expect(page.locator('.note').first()).toBeVisible();
  expect(
    await page.evaluate(() =>
      (window as any).__streams.every((s: MediaStream) =>
        s.getTracks().every((t) => t.readyState === 'ended'),
      ),
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Record a melody', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel recording' }).click();
  expect(
    await page.evaluate(() =>
      (window as any).__streams.every((s: MediaStream) =>
        s.getTracks().every((t) => t.readyState === 'ended'),
      ),
    ),
  ).toBe(true);
  await expect(page.locator('.note').first()).toBeVisible();
});
test('20-second microphone auto-stop releases device', async ({ page, context }) => {
  await context.grantPermissions(['microphone']);
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Record a melody', exact: true }).click();
  await expect(page.getByText('Recording…', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Convert to notes' })).toBeVisible({
    timeout: 25_000,
  });
  await expect(page.getByText('Recording…', { exact: true })).toHaveCount(0);
});
for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
])
  test(`responsive studio ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/demo');
    await example(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.getByRole('button', { name: 'Export MIDI' })).toBeVisible();
    await page.locator('.note').first().click();
    await expect(page.getByLabel('Note pitch', { exact: true })).toBeVisible();
    await page.getByLabel('Note pitch', { exact: true }).selectOption('65');
    await page.screenshot({
      path: `../release/screenshots/studio-${viewport.width}.png`,
      fullPage: true,
    });
  });

test('project JSON download/import retains edited state; undo restores the session source', async ({
  page,
}) => {
  await page.goto('/demo');
  await example(page);
  await page.getByLabel('Project title').fill('My first melody');
  const tempo = page.getByLabel('Tempo', { exact: true });
  await tempo.focus();
  await tempo.press('ControlOrMeta+A');
  await tempo.pressSequentially('120');
  await tempo.press('Tab');
  await expect(tempo).toHaveValue('120');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save project JSON' }).click();
  const file = await downloaded;
  const path = await file.path();
  await page.getByLabel('Import project file').setInputFiles(path!);
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  await expect(page.getByLabel('Project title')).toHaveValue('My first melody');
  await expect(tempo).toHaveValue('120');
  await expect(page.getByRole('button', { name: 'Listen to original' })).toBeDisabled();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Listen to original' })).toBeEnabled();
});
test('all synthesis presets produce audio and Stop silences the output', async ({ page }) => {
  await page.addInitScript(() => {
    const original = AudioContext.prototype.createDynamicsCompressor;
    (window as any).__analysers = [];
    AudioContext.prototype.createDynamicsCompressor = function () {
      const compressor = original.call(this),
        analyser = this.createAnalyser();
      analyser.fftSize = 1024;
      compressor.connect(analyser);
      (window as any).__analysers.push(analyser);
      return compressor;
    };
  });
  await page.goto('/demo');
  await example(page);
  for (const preset of ['Keys', 'Pluck', 'Pad']) {
    await page.getByRole('button', { name: preset, exact: true }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const a = (window as any).__analysers[0] as AnalyserNode,
            data = new Float32Array(a.fftSize);
          a.getFloatTimeDomainData(data);
          return Math.max(...data.map(Math.abs));
        }),
      )
      .toBeGreaterThan(0.001);
    await page.getByRole('button', { name: 'Stop playback' }).click();
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const a = (window as any).__analysers[0] as AnalyserNode,
            data = new Float32Array(a.fftSize);
          a.getFloatTimeDomainData(data);
          return Math.max(...data.map(Math.abs));
        }),
      )
      .toBeLessThan(0.00001);
  }
});
test('empty and edited studio pass automated accessibility checks', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await page.goto('/demo');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await example(page);
  await page.locator('.note').first().click();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});
