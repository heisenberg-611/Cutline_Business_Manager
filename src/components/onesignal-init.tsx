'use client';

import { useEffect, useState, useRef } from 'react';
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
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const hasShownDialog = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      try {
        if (!OneSignal.User) return;
        
        if (user) {
          await OneSignal.login(user.id);
        } else {
          await OneSignal.logout();
        }
      } catch (e) {
        // Silently fail if OneSignal is not initialized (e.g., on localhost without secure origin)
      }
    });
  }, [user, isLoaded]);

  useEffect(() => {
    let mounted = true;

    const evaluateSubscriptionId = (id: string | null | undefined) => {
      if (id && !id.startsWith('local-')) {
        if (!hasShownDialog.current && mounted) {
          hasShownDialog.current = true;
          setShowVerificationDialog(true);
        }
      }
    };

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      // Check if we've already permanently dismissed the custom dialog
      const hasDismissed = localStorage.getItem('onesignal-prompt-dismissed') === 'true';
      
      if (hasDismissed) return;

      // Show dialog if not opted in yet
      if (!OneSignal.Notifications.permission) {
        if (!hasShownDialog.current && mounted) {
          hasShownDialog.current = true;
          setShowVerificationDialog(true);
        }
      } else {
        // If they already have permission, check if we have a real ID
        if (OneSignal.User && OneSignal.User.PushSubscription) {
          evaluateSubscriptionId(OneSignal.User.PushSubscription.id);
        }
      }

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

      const changeHandler = () => {
        if (OneSignal.User && OneSignal.User.PushSubscription) {
          evaluateSubscriptionId(OneSignal.User.PushSubscription.id);
        }
      };
      
      if (OneSignal.User && OneSignal.User.PushSubscription) {
        OneSignal.User.PushSubscription.addEventListener('change', changeHandler);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!showVerificationDialog) {
    return null;
  }

  return (
    <>
      {showVerificationDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground border border-border rounded-xl p-6 max-w-sm w-full shadow-lg animate-in zoom-in-95 duration-200">
            <div className="flex flex-col space-y-1.5 mb-5">
              <h2 className="text-xl font-semibold leading-none tracking-tight">
                Enable Notifications
              </h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Stay updated with important alerts, project milestones, and messages. Tap below to enable push notifications.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowVerificationDialog(false);
                  localStorage.setItem('onesignal-prompt-dismissed', 'true');
                  window.OneSignalDeferred.push(async function(OneSignal: any) {
                    await OneSignal.Notifications.requestPermission();
                  });
                }}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
              >
                Enable Notifications
              </button>
              <button
                onClick={() => {
                  setShowVerificationDialog(false);
                  localStorage.setItem('onesignal-prompt-dismissed', 'true');
                }}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
