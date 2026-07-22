'use client';

import { useState, useOptimistic, startTransition } from 'react';
import { createBroadcast, toggleBroadcast, deleteBroadcast } from '../actions';
import { Megaphone, Trash2, Power, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export function BroadcastClient({ alerts }: { alerts: any[] }) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info'); // info, warning, error, success

  const [optimisticAlerts, updateOptimisticAlerts] = useOptimistic(
    alerts,
    (state, update: { action: 'CREATE' | 'TOGGLE' | 'DELETE'; payload: any }) => {
      switch (update.action) {
        case 'CREATE':
          return [update.payload, ...state];
        case 'TOGGLE':
          return state.map(a => a.id === update.payload.id ? { ...a, isActive: !a.isActive } : a);
        case 'DELETE':
          return state.filter(a => a.id !== update.payload.id);
        default:
          return state;
      }
    }
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    
    setLoading(true);
    
    // Optimistic payload mock ID and date
    const optimisticPayload = {
      id: `opt_${Date.now()}`,
      title,
      message,
      type,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    startTransition(() => {
      updateOptimisticAlerts({ action: 'CREATE', payload: optimisticPayload });
    });

    try {
      await createBroadcast(title, message, type);
      setTitle('');
      setMessage('');
      setType('info');
    } catch (err: any) {
      alert(err.message || 'Failed to create broadcast');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    startTransition(() => {
      updateOptimisticAlerts({ action: 'TOGGLE', payload: { id } });
    });
    try {
      await toggleBroadcast(id, !current);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this broadcast?')) return;
    startTransition(() => {
      updateOptimisticAlerts({ action: 'DELETE', payload: { id } });
    });
    try {
      await deleteBroadcast(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const getTypeIcon = (t: string) => {
    switch (t) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Create Form */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-white/10 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-indigo-500" />
            New Broadcast
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Type</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="info">Info (Blue)</option>
                <option value="success">Success (Green)</option>
                <option value="warning">Warning (Yellow)</option>
                <option value="error">Error (Red)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scheduled Maintenance"
                required
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Message</label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. The system will be down for 2 hours tonight..."
                required
                rows={4}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || !title || !message}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              Publish Now
            </button>
          </form>
        </div>
      </div>

      {/* Broadcasts List */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Broadcast History</h2>
        
        {optimisticAlerts.length === 0 ? (
          <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-white/10 p-12 text-center text-zinc-500">
            No broadcasts found.
          </div>
        ) : (
          <div className="space-y-4">
            {optimisticAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`bg-white dark:bg-zinc-950 rounded-xl border ${alert.isActive ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-zinc-200 dark:border-white/10'} p-5 shadow-sm transition-all`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeIcon(alert.type)}
                      <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{alert.title}</h3>
                      {!alert.isActive && <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-900">Inactive</span>}
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">{alert.message}</p>
                    <div className="text-xs text-zinc-400 mt-4">
                      Created {format(new Date(alert.createdAt), 'MMM dd, yyyy h:mm a')}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleToggle(alert.id, alert.isActive)}
                      disabled={loading}
                      className={`p-2 rounded-lg transition-colors ${alert.isActive ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'} hover:opacity-80`}
                      title={alert.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(alert.id)}
                      disabled={loading}
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
