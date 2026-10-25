import { useAuth, useClerk } from '@clerk/react';
import { useCallback } from 'react';

export class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function useApi() {
  const { getToken, sessionId, userId } = useAuth();
  const clerk = useClerk();
  return useCallback(
    async <T>(path: string, options: RequestInit = {}): Promise<T> => {
      const current = () =>
        !!sessionId && clerk.session?.id === sessionId && clerk.user?.id === userId;
      if (!current()) throw new RequestError(401, 'Your session changed. Sign in again.');
      const token = await getToken();
      if (!token || !current())
        throw new RequestError(401, 'Your session expired. Sign in again to save.');
      const response = await fetch(`/api${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });
      if (!current()) throw new RequestError(401, 'Your session changed. Sign in again.');
      if (response.status === 204) return undefined as T;
      const body = await response.json().catch(() => null);
      if (!response.ok)
        throw new RequestError(
          response.status,
          body?.error ?? 'The library is unavailable. Please retry.',
        );
      return body as T;
    },
    [getToken, sessionId, userId, clerk],
  );
}
export const draftKey = (userId: string, projectId: string) =>
  `humline.draft.v1:${userId}:${projectId}`;
export function clearDrafts(userId: string) {
  for (const key of Object.keys(localStorage))
    if (key.startsWith(`humline.draft.v1:${userId}:`)) localStorage.removeItem(key);
}
