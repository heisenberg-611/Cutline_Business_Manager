'use client';

import { useEffect, useState, useRef } from 'react';
import { useUser } from '@clerk/nextjs';

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
      if (user) {
        await OneSignal.login(user.id);
      } else {
        await OneSignal.logout();
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
    return <DebugOneSignal />;
  }

  return (
    <>
      <DebugOneSignal />
      {showVerificationDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-white">
              Your OneSignal SDK integration is complete!
            </h2>
            <p className="text-zinc-600 dark:text-zinc-300 mb-6">
              You can now send Push Notifications & In-App Messages through OneSignal. Tap below to enable push notifications.
            </p>
            <button
              onClick={() => {
                setShowVerificationDialog(false);
                localStorage.setItem('onesignal-prompt-dismissed', 'true');
                window.OneSignalDeferred.push(async function(OneSignal: any) {
                  await OneSignal.Notifications.requestPermission();
                });
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function DebugOneSignal() {
  return (
    <div className="fixed bottom-24 left-4 z-50">
      <button 
        onClick={() => {
          window.OneSignalDeferred.push(async function(OneSignal: any) {
            try {
              const result = await OneSignal.Notifications.requestPermission();
              alert("Permission result: " + result + " | Current Permission: " + OneSignal.Notifications.permission);
              const subId = OneSignal.User?.PushSubscription?.id;
              alert("Subscription ID: " + (subId || "NONE"));
            } catch (e: any) {
              alert("Error: " + e.message);
            }
          });
        }}
        className="bg-red-500 text-white text-xs px-3 py-1 rounded shadow-lg"
      >
        Force Subscribe Test
      </button>
    </div>
  );
}
