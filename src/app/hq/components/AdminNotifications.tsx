'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getUnreadAdminNotifications, markAdminNotificationRead, markAllAdminNotificationsRead } from '../actions/notifications';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const data = await getUnreadAdminNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  const handleRead = async (id: string, actionUrl?: string | null) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== id));
      await markAdminNotificationRead(id);
      if (actionUrl) {
        setIsOpen(false);
        router.push(actionUrl);
      }
    } catch (e) {
      console.error(e);
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setNotifications([]);
      await markAllAdminNotificationsRead();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      fetchNotifications();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <button
            title="Notifications"
            className="relative w-full flex items-center justify-center gap-2 px-3 py-3 md:py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          />
        }
      >
        <div className="relative pointer-events-none">
          <Bell className="w-5 h-5 shrink-0" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-background">
              {notifications.length > 99 ? '99+' : notifications.length}
            </span>
          )}
        </div>
        <span className="hidden md:block pointer-events-none">Alerts</span>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-4 md:mr-0 z-50 mb-2 md:mb-0 md:ml-4" align="end" side="right">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {notifications.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No new notifications.
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleRead(n.id, n.actionUrl)}
                  className="px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
                      {n.title}
                    </p>
                    {n.actionUrl && (
                      <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 leading-snug">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-2">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
