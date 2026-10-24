import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useBlocker, useParams, useSearchParams } from 'react-router';
import { useAuth, useClerk } from '@clerk/react';
import App from '../App';
import { newProject, parseProject } from '../state/project';
import type { HumlineProject } from '../types/project';
import { download } from '../music/midi';
import { cloudProject, projectFingerprint, type CloudMelody } from './model';
import { clearDrafts, draftKey, RequestError, useApi } from './client';

type Initial = { project: HumlineProject; remote: CloudMelody | null; recovered: boolean };
export function CloudStudio() {
  const { id = 'new' } = useParams();
  const [search] = useSearchParams();
  const draftId = id === 'new' ? search.get('draft') : null;
  const { userId } = useAuth();
  const api = useApi();
  const [initial, setInitial] = useState<Initial | null>(null),
    [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const key = draftKey(userId!, draftId ? `new:${draftId}` : id);
  useEffect(() => {
    const controller = new AbortController();
    setInitial(null);
    setError('');
    void (async () => {
      let draft: { project?: HumlineProject; remoteId?: string; revision?: number } | null = null;
      try {
        const raw = localStorage.getItem(key);
        if (raw) draft = JSON.parse(raw);
      } catch {
        /* Recovery is optional. */
      }
      const remoteId = id === 'new' ? draft?.remoteId : id;
      const remote = remoteId
        ? await api<CloudMelody>(`/melodies/${remoteId}`, { signal: controller.signal })
        : null;
      let project = remote?.project ?? newProject(),
        recovered = false;
      try {
        if (draft?.project) {
          const candidate = parseProject(JSON.stringify(draft.project));
          if (projectFingerprint(candidate) !== projectFingerprint(project)) {
            project = candidate;
            recovered = true;
          }
        }
      } catch {
        /* Keep the valid server version if local recovery is corrupt. */
      }
      if (!controller.signal.aborted) setInitial({ project, remote, recovered });
    })().catch((e) => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => controller.abort();
  }, [api, id, key, retry]);
  if (error)
    return (
      <main className="account-page">
        <h1>Couldn't open this melody</h1>
        <p role="alert">{error}</p>
        <button onClick={() => setRetry((n) => n + 1)}>Retry</button>
        <Link to="/melodies">My melodies</Link>
      </main>
    );
  if (!initial)
    return (
      <main className="account-page" role="status">
        Opening your melody…
      </main>
    );
  return (
    <Editor
      key={`${key}:${retry}`}
      initial={initial}
      storageKey={key}
      onReload={() => {
        localStorage.removeItem(key);
        setRetry((n) => n + 1);
      }}
    />
  );
}
function Editor({
  initial,
  storageKey,
  onReload,
}: {
  initial: Initial;
  storageKey: string;
  onReload: () => void;
}) {
  const api = useApi(),
    { userId } = useAuth(),
    { signOut } = useClerk();
  const [project, setProject] = useState(initial.project),
    [remote, setRemote] = useState(initial.remote);
  const [acknowledged, setAcknowledged] = useState(
    initial.remote ? projectFingerprint(initial.remote.project) : '',
  );
  const [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const [recovered, setRecovered] = useState(initial.recovered),
    [conflict, setConflict] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false),
    [draftWarning, setDraftWarning] = useState('');
  const alive = useRef(true),
    inFlight = useRef(false),
    controller = useRef<AbortController | null>(null);
  const fingerprint = projectFingerprint(project),
    dirty = fingerprint !== acknowledged;
  const latestFingerprint = useRef(fingerprint);
  latestFingerprint.current = fingerprint;
  const blocker = useBlocker(dirty);
  useEffect(
    () => () => {
      alive.current = false;
      controller.current?.abort();
    },
    [],
  );
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ project, remoteId: remote?.id, revision: remote?.revision ?? null }),
      );
    } catch {
      setDraftWarning('Browser recovery is unavailable. Download JSON to keep a backup.');
    }
  }, [project, remote?.revision, storageKey]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  async function save(copy = false) {
    if (inFlight.current) return false;
    inFlight.current = true;
    setSaving(true);
    setError('');
    const sent = fingerprint;
    controller.current = new AbortController();
    try {
      const saved = await api<CloudMelody>(
        remote && !copy ? `/melodies/${remote.id}` : '/melodies',
        {
          method: remote && !copy ? 'PATCH' : 'POST',
          body: JSON.stringify({ project: cloudProject(project), revision: remote?.revision }),
          signal: controller.current.signal,
        },
      );
      if (!alive.current) return false;
      setRemote(saved);
      setAcknowledged(sent);
      setRecovered(false);
      setConflict(false);
      // A save can finish after a newer edit. A leave action must not discard that edit.
      return latestFingerprint.current === sent;
    } catch (e) {
      if (alive.current) {
        setError(e instanceof Error ? e.message : 'Could not save.');
        setConflict(e instanceof RequestError && e.status === 409);
      }
      return false;
    } finally {
      inFlight.current = false;
      if (alive.current) setSaving(false);
    }
  }
  // First save is explicit; recovered/conflicting drafts never overwrite a server copy automatically.
  useEffect(() => {
    if (!remote || !dirty || saving || error || recovered || conflict) return;
    const timer = setTimeout(() => void save(), 1200);
    return () => clearTimeout(timer);
  });
  function backup() {
    download(
      new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }),
      project.title,
      'json',
    );
  }
  async function leave(signingOut: boolean, discard = false) {
    if (discard) localStorage.removeItem(storageKey);
    if (signingOut) {
      try {
        try {
          clearDrafts(userId!);
        } catch {
          /* Do not prevent sign-out if storage is blocked. */
        }
        await signOut({ redirectUrl: '/' });
      } catch {
        setError('Could not sign out. Please retry.');
        setSignOutPending(false);
      }
    } else if (blocker.state === 'blocked') blocker.proceed();
  }
  const toolbar = (
    <div className="cloud-toolbar">
      <Link to="/melodies">← My melodies</Link>
      <span role="status">
        {saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved to your library'}
      </span>
      <button
        className="primary"
        disabled={saving || (!dirty && !!remote)}
        onClick={() => void save()}
      >
        Save melody
      </button>
      <Link to="/account">Account</Link>
      <button onClick={() => (dirty ? setSignOutPending(true) : void leave(true))}>Sign out</button>
      <p>Notes and settings sync. Original audio stays on this device.</p>
      {draftWarning && <p role="alert">{draftWarning}</p>}
      {recovered && (
        <p role="status">
          Recovered a browser draft. Review it, then choose Save, Save a copy, or Reload.
        </p>
      )}
      {error && <p role="alert">{error} Your edits are still here.</p>}
      {(error || recovered) && (
        <div className="account-actions">
          <button disabled={saving} onClick={() => void save(true)}>
            Save a copy
          </button>
          <button
            disabled={saving}
            onClick={() => {
              if (window.confirm('Discard this browser draft and reload the saved melody?'))
                onReload();
            }}
          >
            Reload saved melody
          </button>
          <button onClick={backup}>Download JSON</button>
        </div>
      )}
    </div>
  );
  return (
    <>
      <App
        initialProject={initial.project}
        storageKey={null}
        onProjectChange={setProject}
        cloudToolbar={toolbar}
      />
      {(blocker.state === 'blocked' || signOutPending) && (
        <LeaveDialog
          onCancel={() => {
            setSignOutPending(false);
            if (blocker.state === 'blocked') blocker.reset();
          }}
        >
          <h2 id="leave-title">Keep your latest edits?</h2>
          <p>Save to your library or download a backup before leaving.</p>
          <div className="account-actions">
            <button
              autoFocus
              onClick={() => {
                setSignOutPending(false);
                if (blocker.state === 'blocked') blocker.reset();
              }}
            >
              Keep editing
            </button>
            <button
              disabled={saving}
              onClick={() =>
                void save().then((ok) => {
                  if (ok) void leave(signOutPending);
                })
              }
            >
              Save and leave
            </button>
            <button
              disabled={saving}
              onClick={() => {
                backup();
                void leave(signOutPending, true);
              }}
            >
              Download JSON and leave
            </button>
            <button disabled={saving} onClick={() => void leave(signOutPending, true)}>
              Discard and leave
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </LeaveDialog>
      )}
    </>
  );
}
function LeaveDialog({ onCancel, children }: { onCancel: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="leave-title"
      className="account-card leave-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      {children}
    </dialog>
  );
}
