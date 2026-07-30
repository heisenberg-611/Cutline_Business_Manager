'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export const AblyContext = createContext<any>(null);

export function AblyProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  const [client, setClient] = useState<any>(null);
  
  useEffect(() => {
    let ablyClient: any = null;

    if (isSignedIn) {
      import('ably').then((AblyModule) => {
        const Ably = AblyModule.default || AblyModule;
        ablyClient = new Ably.Realtime({ 
          authCallback: async (tokenParams, callback) => {
            try {
              const res = await fetch('/api/ably/auth');
              if (!res.ok) {
                throw new Error(`Auth failed with status ${res.status}`);
              }
              const tokenRequestData = await res.json();
              callback(null, tokenRequestData);
            } catch (err) {
              callback(err, null);
            }
          }
        });
        
        ablyClient.connection.on('connected', () => {
          console.log('Ably connected successfully (Admin)');
        });
        
        ablyClient.connection.on('failed', (err: any) => {
          console.error('Ably connection failed (Admin):', err);
        });

        setClient(ablyClient);
      }).catch(err => console.error('Failed to import Ably:', err));
      
      return () => { 
        if (ablyClient) {
          ablyClient.close(); 
        }
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
