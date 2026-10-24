import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import express from 'express';
import { Pool } from 'pg';
import { createClerkClient } from '@clerk/backend';
import { verifyWebhook } from '@clerk/backend/webhooks';
import { createApi } from './api';
import { ApiError, Repository } from './repository';

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}
const pool = new Pool({ connectionString: required('DATABASE_URL'), max: 10 });
if (process.argv.includes('--migrate')) {
  await pool.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  await pool.end();
  console.log('Database schema applied.');
} else {
  const origins = required('APP_ORIGINS')
    .split(',')
    .map((v) => new URL(v.trim()).origin);
  const clerk = createClerkClient({
    secretKey: required('CLERK_SECRET_KEY'),
    publishableKey: required('VITE_CLERK_PUBLISHABLE_KEY'),
  });
  const signingSecret = required('CLERK_WEBHOOK_SIGNING_SECRET');
  const app = createApi({
    repository: new Repository(pool),
    origins,
    authenticate: async (req) => {
      const request = new Request(new URL(req.originalUrl, origins[0]), {
        headers: { authorization: req.headers.authorization ?? '' },
      });
      const result = await clerk.authenticateRequest(request, {
        authorizedParties: origins,
        acceptsToken: 'session_token',
      });
      const auth = result.toAuth();
      return auth?.userId ? { userId: auth.userId, has: (params) => auth.has(params) } : null;
    },
    deleteClerkUser: async (userId) => {
      try {
        await clerk.users.deleteUser(userId);
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 404) return;
        throw error;
      }
    },
    deletedUserEvent: async (req) => {
      const headers = new Headers();
      for (const key of ['svix-id', 'svix-timestamp', 'svix-signature'])
        headers.set(key, req.get(key) ?? '');
      let event;
      try {
        event = await verifyWebhook(
          new Request(new URL(req.originalUrl, origins[0]), {
            method: 'POST',
            headers,
            body: req.body,
          }),
          { signingSecret },
        );
      } catch {
        throw new ApiError(400, 'Invalid webhook signature.');
      }
      return event.type === 'user.deleted' ? (event.data.id ?? null) : null;
    },
  });
  const dist = fileURLToPath(new URL('../dist', import.meta.url));
  app.use(express.static(dist));
  // Assets must return 404, never HTML; SPA fallback is for extensionless page routes only.
  app.get('/{*path}', (req, res) => {
    if (req.path.split('/').at(-1)?.includes('.')) {
      res.sendStatus(404);
      return;
    }
    res.sendFile(resolve(dist, 'index.html'));
  });
  const server = app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0', () =>
    console.log('Humline API listening.'),
  );
  for (const signal of ['SIGTERM', 'SIGINT'])
    process.on(signal, () =>
      server.close(() => {
        void pool.end().then(() => process.exit(0));
      }),
    );
}
