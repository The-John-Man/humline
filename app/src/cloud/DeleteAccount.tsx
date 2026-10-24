import { useReverification, useAuth, useClerk, useUser } from '@clerk/react';
import { useState } from 'react';
import { clearDrafts } from './client';

const CONFIRMATION = 'DELETE';

export function DeleteAccount() {
  const { userId, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const deleteAccount = useReverification(async () => {
    const token = await getToken();
    if (!token) throw new Error('Please sign in again.');
    return fetch('/api/account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  });
  return (
    <section className="account-card delete-account" aria-labelledby="delete-account-title">
      <h2 id="delete-account-title">Delete your Humline account</h2>
      <p>
        This permanently removes your cloud melodies and your Clerk sign-in. Download any projects
        you want to keep first. MIDI or JSON files already on your devices are not erased. Original
        recordings never left this browser.
      </p>
      <p>
        Signed in as {user?.primaryEmailAddress?.emailAddress ?? 'this account'}. Type{' '}
        <strong>{CONFIRMATION}</strong> to confirm.
      </p>
      <label className="delete-confirm">
        Confirmation
        <input
          value={confirm}
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={CONFIRMATION}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button
        className="danger"
        disabled={busy || confirm !== CONFIRMATION}
        onClick={() => {
          if (
            !window.confirm(
              'Delete your account and all cloud melodies now? This cannot be undone.',
            )
          )
            return;
          setBusy(true);
          setError('');
          void (async () => {
            try {
              const response = await deleteAccount();
              if (!response) return;
              if (response.status !== 204) {
                const body = await response.json().catch(() => null);
                throw new Error(
                  body?.error ?? 'Could not delete the account. Please retry in a moment.',
                );
              }
              try {
                if (userId) clearDrafts(userId);
              } catch {
                /* Identity removal still proceeds. */
              }
              await signOut({ redirectUrl: '/' });
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not delete the account.');
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        {busy ? 'Deleting…' : 'Delete account and melodies'}
      </button>
    </section>
  );
}
