import { test as setup } from '@playwright/test';
import { clerkSetup } from '@clerk/testing/playwright';

setup('configure real Clerk development testing', async () => {
  process.env.CLERK_PUBLISHABLE_KEY ??= process.env.VITE_CLERK_PUBLISHABLE_KEY;
  for (const name of [
    'CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'CLERK_TEST_USER_A',
    'CLERK_TEST_USER_B',
  ]) {
    if (!process.env[name]) throw new Error(`Configure ${name} before running the Clerk suite.`);
  }
  if (!process.env.CLERK_PUBLISHABLE_KEY!.startsWith('pk_test_'))
    throw new Error('Use a development Clerk instance for tests.');
  await clerkSetup();
});
