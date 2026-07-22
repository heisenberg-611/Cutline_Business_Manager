'use client';

import { useState } from 'react';
import { deleteRequest } from '../subscriptions/actions';
import { Trash2 } from 'lucide-react';

export function DeleteRequestButton({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this subscription request? This will remove it from the revenue calculation entirely.')) {
      return;
    }
    
    setLoading(true);
    try {
      await deleteRequest(requestId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete request');
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleDelete}
      disabled={loading}
      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors disabled:opacity-50"
      title="Delete record from finances"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
