import express, { type ErrorRequestHandler, type Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import { parseProject } from '../src/state/project';
import { cloudProject } from '../src/cloud/model';
import { ApiError, Repository } from './repository';

export interface Identity {
  userId: string;
}
export interface ApiOptions {
  repository: Repository;
  authenticate: (request: Request) => Promise<Identity | null>;
  origins: string[];
  deletedUserEvent: (request: Request) => Promise<string | null>;
}
export function createApi(options: ApiOptions) {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' });
    next();
  });
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.post(
    '/api/webhooks/clerk',
    express.raw({ type: 'application/json', limit: '256kb' }),
    async (req, res) => {
      const userId = await options.deletedUserEvent(req);
      if (userId) await options.repository.deleteAccount(userId);
      res.sendStatus(204);
    },
  );
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(
    '/api',
    rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }),
  );
  app.use('/api', async (req, res, next) => {
    // Only SDK-issued bearer tokens. Never turn a browser cookie into API authorization.
    if (!req.headers.authorization?.startsWith('Bearer '))
      throw new ApiError(401, 'Please sign in again.');
    if (
      !['GET', 'HEAD'].includes(req.method) &&
      !options.origins.includes(req.headers.origin ?? '')
    )
      throw new ApiError(403, 'Untrusted request origin.');
    const identity = await options.authenticate(req);
    if (!identity) throw new ApiError(401, 'Please sign in again.');
    res.locals.userId = identity.userId;
    next();
  });
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      keyGenerator: (_req, res) => res.locals.userId,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
  );
  app.use('/api', express.json({ limit: '2mb' }));
  const owner = (res: express.Response) => res.locals.userId as string;
  const project = (req: Request) => {
    try {
      return cloudProject(parseProject(JSON.stringify(req.body?.project)));
    } catch {
      throw new ApiError(400, 'Invalid melody. Maximum project size is 2 MB and 2,000 notes.');
    }
  };
  app.param('id', (req, _res, next, id: string) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
      throw new ApiError(404, 'Melody not found.');
    req.params.id = id;
    next();
  });
  app.get('/api/melodies', async (req, res) => {
    const offset = Number(req.query.offset ?? 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 100)
      throw new ApiError(400, 'Invalid page.');
    res.json(await options.repository.list(owner(res), offset));
  });
  app.post('/api/melodies', async (req, res) =>
    res.status(201).json(await options.repository.create(owner(res), project(req))),
  );
  app.get('/api/melodies/:id', async (req, res) =>
    res.json(await options.repository.get(owner(res), String(req.params.id))),
  );
  app.patch('/api/melodies/:id', async (req, res) => {
    const revision = req.body?.revision;
    if (!Number.isSafeInteger(revision) || revision < 1)
      throw new ApiError(400, 'A valid revision is required.');
    res.json(
      await options.repository.update(owner(res), String(req.params.id), project(req), revision),
    );
  });
  app.delete('/api/melodies/:id', async (req, res) => {
    await options.repository.remove(owner(res), String(req.params.id));
    res.sendStatus(204);
  });
  app.use('/api', (_req, _res, next) => next(new ApiError(404, 'API route not found.')));
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ApiError) res.status(error.status).json({ error: error.message });
    else if (error?.type === 'entity.too.large')
      res.status(413).json({ error: 'Request too large.' });
    else if (error instanceof SyntaxError) res.status(400).json({ error: 'Invalid JSON.' });
    else {
      console.error('API request failed:', error?.name ?? 'Error');
      res.status(503).json({ error: 'The library is temporarily unavailable. Please retry.' });
    }
  };
  app.use(errors);
  return app;
}
