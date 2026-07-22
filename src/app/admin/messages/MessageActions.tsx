'use client';

import { useState } from 'react';
import { markMessageAsRead, deleteMessage } from './actions';
import { Check, Trash2, MailOpen } from 'lucide-react';

interface MessageActionsProps {
  id: string;
  isRead: boolean;
}

export function MessageActions({ id, isRead }: MessageActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleMarkAsRead = async () => {
    setLoading(true);
    try {
      await markMessageAsRead(id);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    setLoading(true);
    try {
      await deleteMessage(id);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 justify-end">
      {!isRead && (
        <button 
          onClick={handleMarkAsRead}
          disabled={loading}
          className="p-2 text-zinc-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-md transition-colors disabled:opacity-50"
          title="Mark as Read"
        >
          <Check className="w-4 h-4" />
        </button>
      )}
      <button 
        onClick={handleDelete}
        disabled={loading}
        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors disabled:opacity-50"
        title="Delete Message"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
