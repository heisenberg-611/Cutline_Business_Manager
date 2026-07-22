'use client';

import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function GlobalAlerts({ alerts }: { alerts: any[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    // Load dismissed alerts from local storage on mount
    const saved = localStorage.getItem('cutline_dismissed_alerts');
    if (saved) {
      setDismissed(JSON.parse(saved));
    }
  }, []);

  const handleDismiss = (alert: any) => {
    const token = `${alert.id}_${new Date(alert.updatedAt).getTime()}`;
    const newDismissed = [...dismissed, token];
    setDismissed(newDismissed);
    localStorage.setItem('cutline_dismissed_alerts', JSON.stringify(newDismissed));
  };

  const activeAlerts = alerts.filter(a => {
    const token = `${a.id}_${new Date(a.updatedAt).getTime()}`;
    // We check if the exact version was dismissed. We also ignore plain IDs to force a re-show 
    // of previously dismissed alerts that were bugged, but once dismissed again they will use the token.
    return !dismissed.includes(token);
  });

  if (activeAlerts.length === 0) return null;

  return (
    <div className="flex flex-col z-50">
      {activeAlerts.map((alert) => {
        let bgClass = 'bg-blue-600';
        let Icon = Info;
        
        if (alert.type === 'warning') {
          bgClass = 'bg-amber-600';
          Icon = AlertTriangle;
        } else if (alert.type === 'error') {
          bgClass = 'bg-red-600';
          Icon = AlertTriangle;
        } else if (alert.type === 'success') {
          bgClass = 'bg-emerald-600';
          Icon = CheckCircle;
        }

        return (
          <div key={alert.id} className={`${bgClass} px-4 py-3 text-white sm:px-6 lg:px-8`}>
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm leading-6">
                  <strong className="font-semibold">{alert.title}</strong>
                  <svg viewBox="0 0 2 2" className="mx-2 inline h-0.5 w-0.5 fill-current" aria-hidden="true"><circle cx={1} cy={1} r={1} /></svg>
                  {alert.message}
                </p>
              </div>
              <button 
                onClick={() => handleDismiss(alert)}
                className="flex-shrink-0 p-1 hover:bg-white/20 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
