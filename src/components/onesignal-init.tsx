'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';

declare global {
  interface Window {
    OneSignalDeferred: any[];
    OneSignal: any;
  }
}

export function OneSignalInit() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      if (user) {
        await OneSignal.login(user.id);
      } else {
        await OneSignal.logout();
      }
    });
  }, [user, isLoaded]);

  useEffect(() => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      
      // Ensure that when the tab is open, we manually display a beautiful Toast notification!
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', function(event: any) {
        event.preventDefault(); // Stop native browser push which might be suppressed by OS anyway

        const notification = event.notification;
        const title = notification.title || "New Notification";
        const body = notification.body || "";
        
        toast.info(title, {
          description: body,
          action: notification.url ? {
            label: "View",
            onClick: () => window.location.href = notification.url
          } : undefined,
          duration: 8000,
        });
      });
    });
  }, []);

  return null;
}
