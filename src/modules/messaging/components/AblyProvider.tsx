'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
// Type-only: erased at compile time, so the SDK is not pulled into SSR.
import type { ErrorInfo, Realtime, TokenDetails, TokenRequest } from 'ably';

export const AblyContext = createContext<Realtime | null>(null);

export function AblyProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, orgId, getToken } = useAuth();
  const [client, setClient] = useState<Realtime | null>(null);

  useEffect(() => {
    // Wait for the organization, not just the session. /api/ably/auth scopes the
    // token to `business:{orgId}:*` and rejects a request without an org, so
    // connecting too early fails auth and leaves a dead connection to close.
    if (!isSignedIn || !orgId) return;

    let cancelled = false;
    let ablyClient: Realtime | null = null;

    import('ably')
      .then(({ Realtime: AblyRealtime }) => {
        const created = new AblyRealtime({
          authCallback: async (
            _tokenParams,
            callback: (
              error: ErrorInfo | string | null,
              tokenRequestOrDetails: TokenDetails | TokenRequest | string | null
            ) => void
          ) => {
            try {
              const token = await getToken();
              const res = await fetch('/api/ably/auth', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });

              if (!res.ok) {
                throw new Error(`Auth failed with status ${res.status}`);
              }
              callback(null, await res.json());
            } catch (err) {
              callback(err as ErrorInfo, null);
            }
          },
        });

        // The import is async, so the effect may already have been cleaned up —
        // React 19 mounts, unmounts and remounts effects in development. Closing
        // here is what stops that first client leaking with an open socket.
        if (cancelled) {
          closeQuietly(created);
          return;
        }

        ablyClient = created;

        created.connection.on('failed', (stateChange) => {
          console.error('Ably connection failed (Admin):', stateChange.reason);
        });

        setClient(created);
      })
      .catch((err) => console.error('Failed to import Ably:', err));

    return () => {
      cancelled = true;
      setClient(null);
      closeQuietly(ablyClient);
      ablyClient = null;
    };
  }, [isSignedIn, orgId, getToken]);

  return <AblyContext.Provider value={client}>{children}</AblyContext.Provider>;
}

/**
 * close() throws if the connection is already closed or failed — which is
 * exactly the state it is in when auth failed or a previous teardown got there
 * first. Tearing down must not surface that as a runtime error.
 */
function closeQuietly(client: Realtime | null) {
  if (!client) return;
  try {
    client.close();
  } catch {
    // Already closed, closing, or failed.
  }
}

export function useAblyClient() {
  return useContext(AblyContext);
}
