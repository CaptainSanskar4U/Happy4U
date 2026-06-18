import React from 'react';
import { InAppNotification, Birthday } from '../types';
import { X, Trash2, CheckCircle2, Inbox, Bell, CheckCheck, Clock, ExternalLink } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onOpenBirthday: (birthdayId: string) => void;
  birthdaysList: Birthday[];
}

export const NotificationInboxModal: React.FC<Props> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onClearAll,
  onOpenBirthday,
  birthdaysList
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose} 
      />
      
      {/* Drawer Panel */}
      <div 
        className="relative w-full max-w-lg bg-surface border-t sm:border border-dark-border rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl h-[85vh] sm:h-[75vh] flex flex-col transform transition-all duration-300 animate-popup"
      >
        {/* Draw Pull Bar */}
        <div className="w-12 h-1 bg-muted/30 rounded-full mx-auto mb-6 sm:hidden"></div>

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lime/10 border border-lime/30 flex items-center justify-center text-lime">
              <Bell className="w-5 h-5 animate-swing" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary">Notifications</h2>
              <p className="text-xs text-muted">
                {unreadCount > 0 ? `${unreadCount} unread alarm alerts` : 'All caught up offline'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-surfaceLight border border-dark-border flex items-center justify-center text-muted hover:text-primary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Controls */}
        {notifications.length > 0 && (
          <div className="flex justify-between gap-2 mb-4">
            {unreadCount > 0 ? (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1.5 text-xs font-bold text-lime bg-lime/5 hover:bg-lime/15 px-3 py-2 rounded-xl transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-400/5 hover:bg-red-400/15 px-3 py-2 rounded-xl transition-colors cursor-pointer ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear history
            </button>
          </div>
        )}

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-80">
              <div className="w-20 h-20 rounded-full bg-surfaceLight border border-dark-border flex items-center justify-center mb-4 text-muted/40">
                <Inbox className="w-10 h-10" />
              </div>
              <p className="text-primary font-bold text-lg mb-1">No alerts triggered yet</p>
              <p className="text-muted text-xs max-w-xs leading-relaxed">
                As soon as your configured offline timers detect an upcoming birthday, the local alert center will log reminders here.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const matchedBirthday = birthdaysList.find(b => b.id === notif.birthdayId);
              
              return (
                <div 
                  key={notif.id}
                  onClick={() => onMarkRead(notif.id)}
                  className={`p-4 rounded-2xl border transition-all relative flex gap-3 ${
                    notif.read 
                    ? 'bg-surfaceLight/30 border-dark-border/40 opacity-70' 
                    : 'bg-surfaceLight border-dark-border shadow-sm'
                  }`}
                >
                  {/* Status Indicator */}
                  {!notif.read && (
                    <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-lime animate-pulse" />
                  )}

                  {/* Icon Panel */}
                  <div className="w-12 h-12 rounded-xl bg-dark-card border border-dark-border flex items-center justify-center text-2xl shrink-0">
                    {matchedBirthday?.emoji || '🎂'}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2 pr-4">
                      <h3 className={`text-sm tracking-tight truncate ${notif.read ? 'text-muted font-medium' : 'text-primary font-bold'}`}>
                        {notif.title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted leading-relaxed pr-2">
                      {notif.body}
                    </p>
                    
                    {/* Time / Actions Row */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] text-muted font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(notif.timestamp)}
                      </span>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {matchedBirthday && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenBirthday(notif.birthdayId);
                            }}
                            className="bg-lime/10 hover:bg-lime/20 text-lime font-bold py-1 px-2.5 rounded-lg text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Birthday
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(notif.id);
                          }}
                          className="hover:bg-red-500/10 text-muted hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
