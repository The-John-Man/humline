import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { newDb } from 'pg-mem';
import { Pool } from 'pg';
import request from 'supertest';
import { createApi } from '../server/api';
import { ApiError, Repository } from '../server/repository';
import { newProject } from '../src/state/project';
import { cloudProject } from '../src/cloud/model';

// Authentication is injected only into the test app. Production always uses Clerk.
// TEST_DATABASE_URL is exclusively for a disposable database: each test clears its tables.
describe('private library API', () => {
  let pool: Pool;
  let app: ReturnType<typeof createApi>;
  let repository: Repository;
  const origin = 'http://localhost:5173';
  const payload = () => ({
    project: {
      ...newProject(),
      title: 'A melody',
      sourceAudio: { name: 'private-voice.wav', durationSeconds: 3, synthetic: false },
      notes: [
        { id: 'n1', midi: 60, startBeat: 0.5, durationBeats: 1, velocity: 0.7, source: 'manual' },
      ],
    },
  });
  beforeEach(async () => {
    if (process.env.TEST_DATABASE_URL) {
      const url = new URL(process.env.TEST_DATABASE_URL);
      if (!url.pathname.endsWith('_test'))
        throw new Error('TEST_DATABASE_URL must use a database name ending in _test.');
      pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    } else {
      const memory = newDb();
      pool = new (memory.adapters.createPg().Pool)() as Pool;
    }
    await pool.query(await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8'));
    await pool.query('DELETE FROM melodies');
    await pool.query('DELETE FROM accounts');
    repository = new Repository(pool);
    app = createApi({
      repository,
      origins: [origin],
      authenticate: async (req) => {
        const token = req.headers.authorization?.slice(7);
        return token === 'alice' || token === 'bob' ? { userId: token, has: () => true } : null;
      },
      deleteClerkUser: async () => undefined,
      deletedUserEvent: async (req) => {
        if (req.get('test-signature') !== 'valid')
          throw new ApiError(400, 'Invalid webhook signature.');
        return 'alice';
      },
    });
  });
  afterEach(async () => {
    await pool.end();
  });
  const auth = (test: request.Test, user = 'alice') =>
    test.set('Authorization', `Bearer ${user}`).set('Origin', origin);
  const create = () => auth(request(app).post('/api/melodies')).send(payload()).expect(201);
  it('requires a verified identity and trusted write origin', async () => {
    await request(app).get('/api/melodies').expect(401);
    await auth(request(app).get('/api/melodies'), 'invalid').expect(401);
    await auth(request(app).post('/api/melodies'))
      .set('Origin', 'https://attacker.example')
      .send(payload())
      .expect(403);
    await request(app).get('/api/melodies').set('Cookie', '__session=alice').expect(401);
  });
  it('creates a server identity, strips recording metadata and round-trips the musical data', async () => {
    const body = payload();
    const created = await auth(request(app).post('/api/melodies'))
      .send({ ...body, owner_clerk_user_id: 'bob' })
      .expect(201);
    expect(created.body.id).not.toBe(body.project.id);
    expect(created.body.project).toEqual({
      ...cloudProject(body.project as never),
      id: created.body.id,
    });
    expect(created.body.revision).toBe(1);
    expect(created.body.project.sourceAudio).toBeUndefined();
    const opened = await auth(request(app).get(`/api/melodies/${created.body.id}`)).expect(200);
    expect(opened.body.project.notes).toEqual(body.project.notes);
    expect(opened.headers['cache-control']).toBe('no-store');
  });
  it('denies cross-user list/read/update/delete even with a known project ID', async () => {
    const { body } = await create();
    const list = await auth(request(app).get('/api/melodies'), 'bob').expect(200);
    expect(list.body.items).toEqual([]);
    await auth(request(app).get(`/api/melodies/${body.id}`), 'bob').expect(404);
    await auth(request(app).patch(`/api/melodies/${body.id}`), 'bob')
      .send({ ...payload(), revision: 1 })
      .expect(404);
    await auth(request(app).delete(`/api/melodies/${body.id}`), 'bob').expect(404);
    await auth(request(app).get(`/api/melodies/${body.id}`)).expect(200);
  });
  it('rejects stale revisions without overwriting newer edits', async () => {
    const { body } = await create();
    const update = payload();
    update.project.title = 'Newer edit';
    const saved = await auth(request(app).patch(`/api/melodies/${body.id}`))
      .send({ ...update, revision: 1 })
      .expect(200);
    expect(saved.body.revision).toBe(2);
    await auth(request(app).patch(`/api/melodies/${body.id}`))
      .send({ ...payload(), revision: 1 })
      .expect(409);
    const opened = await auth(request(app).get(`/api/melodies/${body.id}`)).expect(200);
    expect(opened.body.project.title).toBe('Newer edit');
  });
  it('validates incoming projects, revisions and pagination', async () => {
    const invalid = payload();
    invalid.project.notes[0].midi = 500;
    await auth(request(app).post('/api/melodies')).send(invalid).expect(400);
    await auth(request(app).post('/api/melodies'))
      .send({ project: { title: 'incomplete' } })
      .expect(400);
    await auth(request(app).get('/api/melodies?offset=-1')).expect(400);
    await auth(request(app).get('/api/melodies/not-a-uuid')).expect(404);
    const { body } = await create();
    await auth(request(app).patch(`/api/melodies/${body.id}`))
      .send(payload())
      .expect(400);
  });
  it('deletes an owned melody and returns 404 on subsequent access', async () => {
    const { body } = await create();
    await auth(request(app).delete(`/api/melodies/${body.id}`)).expect(204);
    await auth(request(app).get(`/api/melodies/${body.id}`)).expect(404);
  });
  it('account deletion is idempotent and blocks old sessions from recreating data', async () => {
    await create();
    await request(app).post('/api/webhooks/clerk').send({}).expect(400);
    await request(app)
      .post('/api/webhooks/clerk')
      .set('test-signature', 'valid')
      .send({})
      .expect(204);
    await request(app)
      .post('/api/webhooks/clerk')
      .set('test-signature', 'valid')
      .send({})
      .expect(204);
    expect((await pool.query('SELECT * FROM melodies')).rows).toEqual([]);
    await auth(request(app).post('/api/melodies')).send(payload()).expect(403);
    await auth(request(app).get('/api/melodies')).expect(403);
  });
  it('app-owned account deletion blocks immediately, removes melodies, and deletes identity', async () => {
    const deleted: string[] = [];
    let recent = false;
    app = createApi({
      repository,
      origins: [origin],
      authenticate: async (req) => {
        const token = req.headers.authorization?.slice(7);
        return token === 'alice' ? { userId: 'alice', has: () => recent } : null;
      },
      deleteClerkUser: async (userId) => {
        deleted.push(userId);
      },
      deletedUserEvent: async () => null,
    });
    const { body } = await auth(request(app).post('/api/melodies')).send(payload()).expect(201);
    await auth(request(app).delete('/api/account')).expect(403);
    expect(deleted).toEqual([]);
    await auth(request(app).get(`/api/melodies/${body.id}`)).expect(200);
    recent = true;
    await auth(request(app).delete('/api/account')).expect(204);
    expect(deleted).toEqual(['alice']);
    await auth(request(app).get('/api/melodies')).expect(403);
    await auth(request(app).post('/api/melodies')).send(payload()).expect(403);
    await auth(request(app).delete('/api/account')).expect(204);
    expect(deleted).toEqual(['alice', 'alice']);
  });
  it('keeps the deletion tombstone when Clerk identity removal fails so the client can retry', async () => {
    app = createApi({
      repository,
      origins: [origin],
      authenticate: async () => ({ userId: 'alice', has: () => true }),
      deleteClerkUser: async () => {
        throw new Error('Clerk unavailable');
      },
      deletedUserEvent: async () => null,
    });
    await auth(request(app).post('/api/melodies')).send(payload()).expect(201);
    await auth(request(app).delete('/api/account')).expect(503);
    await auth(request(app).get('/api/melodies')).expect(403);
  });
  it('paginates only the current user library', async () => {
    for (let index = 0; index < 22; index++) await repository.create('alice', newProject());
    await repository.create('bob', newProject());
    const first = await auth(request(app).get('/api/melodies')).expect(200);
    const second = await auth(request(app).get('/api/melodies?offset=20')).expect(200);
    expect(first.body.items).toHaveLength(20);
    expect(first.body.nextOffset).toBe(20);
    expect(second.body.items).toHaveLength(2);
    expect(second.body.nextOffset).toBeNull();
    expect(
      new Set([...first.body.items, ...second.body.items].map((v: { id: string }) => v.id)).size,
    ).toBe(22);
  });
});
