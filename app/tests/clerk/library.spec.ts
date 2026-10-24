import { test, expect, type Page } from '@playwright/test';
import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright';

async function login(page: Page, email: string) {
  await setupClerkTestingToken({ page });
  await page.goto('/sign-in');
  await clerk.signIn({ page, emailAddress: email });
  await page.goto('/melodies');
  await expect(page.getByRole('heading', { name: 'Your melodies' })).toBeVisible();
}
async function apiStatus(page: Page, path: string, method: string, body?: unknown) {
  return page.evaluate(
    async ({ path, method, body }) => {
      const token = await (window as any).Clerk.session.getToken();
      const response = await fetch(`/api${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      return response.status;
    },
    { path, method, body },
  );
}
test('real Clerk sessions save across contexts and isolate another account', async ({
  browser,
  page,
}) => {
  await login(page, process.env.CLERK_TEST_USER_A!);
  await page.getByRole('link', { name: '+ New melody' }).click();
  const title = `Clerk verification ${Date.now()}`;
  await page.getByLabel('Project title', { exact: true }).fill(title);
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/melodies') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Save melody', exact: true }).click();
  const saved = await (await response).json();
  await expect(page.getByText('Saved to your library', { exact: true })).toBeVisible();
  const second = await browser.newContext(),
    other = await browser.newContext();
  try {
    const secondPage = await second.newPage();
    await login(secondPage, process.env.CLERK_TEST_USER_A!);
    await secondPage.goto(`/studio/${saved.id}`);
    await expect(secondPage.getByLabel('Project title', { exact: true })).toHaveValue(title);
    const otherPage = await other.newPage();
    await login(otherPage, process.env.CLERK_TEST_USER_B!);
    expect(await apiStatus(otherPage, `/melodies/${saved.id}`, 'GET')).toBe(404);
    expect(
      await apiStatus(otherPage, `/melodies/${saved.id}`, 'PATCH', {
        project: saved.project,
        revision: saved.revision,
      }),
    ).toBe(404);
    expect(await apiStatus(otherPage, `/melodies/${saved.id}`, 'DELETE')).toBe(404);
    await clerk.signOut({ page: secondPage });
    await secondPage.goto(`/studio/${saved.id}`);
    await expect(secondPage).toHaveURL(/\/sign-in/);
  } finally {
    await apiStatus(page, `/melodies/${saved.id}`, 'DELETE');
    await second.close();
    await other.close();
  }
});
