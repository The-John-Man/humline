import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { HumlineProject } from '../src/types/project';
import type { CloudMelody, MelodySummary } from '../src/cloud/model';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
type Row = { id: string; project: HumlineProject; revision: number; updated_at: Date };
function melody(row: Row): CloudMelody {
  return {
    id: row.id,
    project: row.project,
    revision: row.revision,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}
export class Repository {
  constructor(private pool: Pool) {}
  // Account row lock serializes saves with account deletion and per-account quotas.
  async forUser<T>(owner: string, run: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('INSERT INTO accounts(clerk_user_id) VALUES($1) ON CONFLICT DO NOTHING', [
        owner,
      ]);
      const result = await client.query(
        'SELECT deleting FROM accounts WHERE clerk_user_id=$1 FOR UPDATE',
        [owner],
      );
      if (result.rows[0].deleting) throw new ApiError(403, 'This account is being deleted.');
      const value = await run(client);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async list(owner: string, offset: number) {
    return this.forUser(owner, async (client) => {
      const result = await client.query(
        'SELECT id, project, revision, updated_at FROM melodies WHERE owner_clerk_user_id=$1 ORDER BY updated_at DESC, id LIMIT 21 OFFSET $2',
        [owner, offset],
      );
      const items: MelodySummary[] = result.rows.slice(0, 20).map((r: Row) => ({
        id: r.id,
        title: r.project.title,
        bpm: r.project.bpm,
        instrument: r.project.instrument,
        updatedAt: new Date(r.updated_at).toISOString(),
      }));
      return { items, nextOffset: result.rows.length > 20 ? offset + 20 : null };
    });
  }
  async get(owner: string, id: string) {
    return this.forUser(owner, async (client) => {
      const result = await client.query(
        'SELECT * FROM melodies WHERE id=$1 AND owner_clerk_user_id=$2',
        [id, owner],
      );
      if (!result.rows[0]) throw new ApiError(404, 'Melody not found.');
      return melody(result.rows[0]);
    });
  }
  async create(owner: string, project: HumlineProject) {
    return this.forUser(owner, async (client) => {
      const count = await client.query(
        'SELECT count(*) AS count FROM melodies WHERE owner_clerk_user_id=$1',
        [owner],
      );
      if (Number(count.rows[0].count) >= 100)
        throw new ApiError(
          409,
          'Library limit reached (100 melodies). Export and remove an old melody first.',
        );
      const id = randomUUID();
      const result = await client.query(
        'INSERT INTO melodies(id, owner_clerk_user_id, project) VALUES($1,$2,$3) RETURNING *',
        [id, owner, { ...project, id }],
      );
      return melody(result.rows[0]);
    });
  }
  async update(owner: string, id: string, project: HumlineProject, revision: number) {
    return this.forUser(owner, async (client) => {
      const exists = await client.query(
        'SELECT revision FROM melodies WHERE id=$1 AND owner_clerk_user_id=$2',
        [id, owner],
      );
      if (!exists.rows[0]) throw new ApiError(404, 'Melody not found.');
      if (exists.rows[0].revision !== revision)
        throw new ApiError(409, 'This melody changed on another device. Reload it or save a copy.');
      const result = await client.query(
        'UPDATE melodies SET project=$3, revision=revision+1, updated_at=now() WHERE id=$1 AND owner_clerk_user_id=$2 RETURNING *',
        [id, owner, { ...project, id }],
      );
      return melody(result.rows[0]);
    });
  }
  async remove(owner: string, id: string) {
    return this.forUser(owner, async (client) => {
      const result = await client.query(
        'DELETE FROM melodies WHERE id=$1 AND owner_clerk_user_id=$2 RETURNING id',
        [id, owner],
      );
      if (!result.rows[0]) throw new ApiError(404, 'Melody not found.');
    });
  }
  async deleteAccount(owner: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'INSERT INTO accounts(clerk_user_id, deleting) VALUES($1,true) ON CONFLICT(clerk_user_id) DO UPDATE SET deleting=true',
        [owner],
      );
      await client.query('DELETE FROM melodies WHERE owner_clerk_user_id=$1', [owner]);
      await client.query('COMMIT');
      // Keep the tombstone: delayed requests or duplicate webhooks cannot recreate this account.
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
