import { test, expect } from '@playwright/test';
test('welcome explains the workflow and public demo stays accessible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hum a melody. Make it yours.' })).toBeVisible();
  await page.getByRole('link', { name: /Try the synthetic demo/ }).click();
  await expect(page.getByText('Local demo', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Record a melody', exact: true })).toBeVisible();
});
test('an unconfigured build fails closed on account and private routes', async ({ page }) => {
  test.skip(!!process.env.VITE_CLERK_PUBLISHABLE_KEY, 'Only for the explicitly unconfigured build');
  for (const path of ['/sign-in', '/sign-up', '/account', '/melodies', '/studio/new']) {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { name: "Accounts aren't configured yet" }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Record a melody', exact: true })).toHaveCount(0);
  }
});
