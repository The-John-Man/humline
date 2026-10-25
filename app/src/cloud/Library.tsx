import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { parseProject, STORAGE_KEY } from '../state/project';
import { cloudProject, type CloudMelody, type MelodySummary } from './model';
import { useApi } from './client';

export function Library() {
  const api = useApi(),
    navigate = useNavigate();
  const [items, setItems] = useState<MelodySummary[]>([]);
  const [offset, setOffset] = useState(0),
    [nextOffset, setNextOffset] = useState<number | null>(null);
  const [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [legacy, setLegacy] = useState(() => {
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  });
  const input = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void api<{ items: MelodySummary[]; nextOffset: number | null }>(`/melodies?offset=${offset}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setItems(data.items);
          setNextOffset(data.nextOffset);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [api, offset, refresh]);
  async function action(run: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await run();
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : 'Could not update the library.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function importText(text: string, fromLegacy = false) {
    const project = cloudProject(parseProject(text));
    const saved = await api<CloudMelody>('/melodies', {
      method: 'POST',
      body: JSON.stringify({ project }),
    });
    if (!mounted.current) return;
    if (fromLegacy) {
      localStorage.removeItem(STORAGE_KEY);
      setLegacy(false);
    }
    navigate(`/studio/${saved.id}`);
  }
  return (
    <main className="account-page library-page">
      <div className="library-title">
        <div>
          <p className="eyebrow">YOUR SPACE TO CREATE</p>
          <h1>Your melodies</h1>
          <p>Pick up where you left off.</p>
        </div>
        <div className="account-actions">
          <button disabled={busy} onClick={() => input.current?.click()}>
            Import JSON
          </button>
          <Link className="primary account-link" to={`/studio/new?draft=${crypto.randomUUID()}`}>
            + New melody
          </Link>
        </div>
      </div>
      <p className="account-hint">
        Notes and settings sync. Your original recording stays on this device.
      </p>
      {legacy && (
        <section className="account-card">
          <h2>A melody is saved on this browser</h2>
          <p>
            Only import it if it belongs to you. It will be added to your account after a successful
            save.
          </p>
          <button
            disabled={busy}
            onClick={() => {
              if (window.confirm('Add the old browser melody to this account?'))
                void action(() => importText(localStorage.getItem(STORAGE_KEY) ?? '', true));
            }}
          >
            Import my browser melody
          </button>
        </section>
      )}
      {error && (
        <div role="alert" className="account-card">
          <p>{error}</p>
          <button onClick={() => setRefresh((n) => n + 1)}>Retry</button>
        </div>
      )}
      {loading ? (
        <p role="status">Loading your library…</p>
      ) : !error && items.length === 0 ? (
        <section className="account-card">
          <h2>Your first melody starts with a hum.</h2>
          <Link to={`/studio/new?draft=${crypto.randomUUID()}`}>Create a melody</Link>
        </section>
      ) : (
        <ul className="melody-list">
          {items.map((item) => (
            <li className="account-card melody-card" key={item.id}>
              <div>
                <Link to={`/studio/${item.id}`} className="melody-title">
                  {item.title || 'Untitled melody'}
                </Link>
                <p>
                  {item.instrument} · {item.bpm} BPM ·{' '}
                  {new Date(item.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="account-actions">
                <Link to={`/studio/${item.id}`}>Open</Link>
                <button
                  disabled={busy}
                  onClick={() => {
                    const title = window.prompt('Rename melody', item.title);
                    if (title !== null && title.trim())
                      void action(async () => {
                        const current = await api<CloudMelody>(`/melodies/${item.id}`);
                        if (!mounted.current) return;
                        await api(`/melodies/${item.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({
                            project: { ...current.project, title: title.trim().slice(0, 100) },
                            revision: current.revision,
                          }),
                        });
                        if (mounted.current) setRefresh((n) => n + 1);
                      });
                  }}
                >
                  Rename
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      const current = await api<CloudMelody>(`/melodies/${item.id}`);
                      if (!mounted.current) return;
                      await api('/melodies', {
                        method: 'POST',
                        body: JSON.stringify({
                          project: {
                            ...current.project,
                            title: `${current.project.title} (copy)`.slice(0, 100),
                          },
                        }),
                      });
                      if (mounted.current) {
                        setOffset(0);
                        setRefresh((n) => n + 1);
                      }
                    })
                  }
                >
                  Duplicate
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Delete “${item.title}”? This cannot be undone.`))
                      void action(async () => {
                        await api(`/melodies/${item.id}`, { method: 'DELETE' });
                        if (mounted.current) {
                          setOffset(0);
                          setRefresh((n) => n + 1);
                        }
                      });
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="account-actions">
        <button
          disabled={loading || offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 20))}
        >
          Previous
        </button>
        <button
          disabled={loading || nextOffset === null}
          onClick={() => nextOffset !== null && setOffset(nextOffset)}
        >
          Next
        </button>
      </div>
      <input
        hidden
        ref={input}
        type="file"
        accept=".json,application/json"
        aria-label="Import melody JSON"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file)
            void action(async () => {
              if (file.size > 2_000_000) throw new Error('Project is over 2 MB.');
              const text = await file.text();
              if (mounted.current) await importText(text);
            });
        }}
      />
    </main>
  );
}
