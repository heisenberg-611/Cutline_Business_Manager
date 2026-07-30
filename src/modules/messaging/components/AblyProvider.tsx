'use client';

import * as Ably from 'ably';
import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export const AblyContext = createContext<Ably.Realtime | null>(null);

export function AblyProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  const [client, setClient] = useState<Ably.Realtime | null>(null);
  
  useEffect(() => {
    if (isSignedIn) {
      const ablyClient = new Ably.Realtime({ authUrl: '/api/ably/auth' });
      setClient(ablyClient);
      
      return () => { 
        ablyClient.close(); 
      };
    }
  }, [isSignedIn]);

  return (
    <AblyContext.Provider value={client}>
      {children}
    </AblyContext.Provider>
  );
}

export function useAblyClient() {
  return useContext(AblyContext);
}
