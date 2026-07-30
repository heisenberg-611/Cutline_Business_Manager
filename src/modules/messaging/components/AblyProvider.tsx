'use client';

import * as Ably from 'ably';
import { AblyProvider as RealAblyProvider } from 'ably/react';
import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';

export function AblyProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  
  const [client] = useState(() => {
    if (typeof window === 'undefined' || !isSignedIn) return null;
    return new Ably.Realtime({ authUrl: '/api/ably/auth' });
  });

  if (!client) {
    return <>{children}</>;
  }

  return (
    <RealAblyProvider client={client}>
      {children}
    </RealAblyProvider>
  );
}
