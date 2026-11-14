import React from 'react';
import { motion } from 'motion/react';
import { NotificationItem, CalendarEvent } from '../../types';
import { 
  X, 
  Bell, 
  Clock, 
  Calendar, 
  Car, 
  Vote, 
  Trash2,
  Sparkles
} from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  notifications: NotificationItem[];
  events: CalendarEvent[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onOpenVerificationModal: (event: CalendarEvent) => void;
  onOpenEvent: (event: CalendarEvent) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  notifications,
  events,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onOpenVerificationModal,
  onOpenEvent,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (notif: NotificationItem) => {
    onMarkAsRead(notif.id);
    if (notif.eventId) {
      const event = events.find((e) => e.id === notif.eventId);
      if (event) {
        if (notif.type === 'attendance_verification') {
          onOpenVerificationModal(event);
        } else {
          onOpenEvent(event);
        }
        onClose();
      }
    }
  };

  const getNotifIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'attendance_verification':
        return <Car className="w-4 h-4 text-emerald-700" />;
      case 'event_reminder':
        return <Clock className="w-4 h-4 text-[#8A9A5B]" />;
      case 'poll_update':
        return <Vote className="w-4 h-4 text-[#7096D4]" />;
      case 'event_update':
        return <Calendar className="w-4 h-4 text-[#D48C70]" />;
      case 'task_reminder':
        return <Sparkles className="w-4 h-4 text-[#C98A4B]" />;
      default:
        return <Bell className="w-4 h-4 text-[#8A9A5B]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/40 backdrop-blur-xs flex justify-end">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        id="notification-drawer"
        className="w-full max-w-md bg-[#FDFCF8] border-l border-[#E8E4D9] shadow-2xl h-full max-h-[100dvh] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 bg-white border-b border-[#E8E4D9] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F3F6EC] text-[#8A9A5B] flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif text-[#3D3A35]">Notifications</h3>
              <p className="text-xs text-[#8E8A81]">
                {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs font-semibold text-[#8A9A5B] hover:underline"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/5 text-[#8E8A81]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="p-4 overflow-y-auto overscroll-contain flex-1 space-y-3">
          {notifications.length === 0 ? (
            <div className="p-10 text-center text-[#8E8A81]">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#8A9A5B]" />
              <p className="text-sm font-semibold">No notifications</p>
              <p className="text-xs mt-1">Upcoming gathering alerts & verification prompts will appear here.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isVerification = notif.type === 'attendance_verification';

              return (
                <div
                  key={notif.id}
                  id={`notif-card-${notif.id}`}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                    !notif.read
                      ? isVerification
                        ? 'bg-[#F3F6EC] border-[#8A9A5B] shadow-2xs'
                        : 'bg-white border-[#8A9A5B]/40 shadow-2xs'
                      : 'bg-[#FDFCF8] border-[#E8E4D9] opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-white border border-[#E8E4D9] shadow-2xs shrink-0 mt-0.5">
                      {getNotifIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-xs font-bold ${!notif.read ? 'text-[#3D3A35]' : 'text-[#5C574F]'}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-[#AFA99E] shrink-0">{notif.timestamp}</span>
                      </div>

                      <p className="text-xs text-[#5C574F] mt-1 leading-snug">{notif.message}</p>

                      {/* Interactive prompt button for attendance verification */}
                      {isVerification && notif.eventId && (
                        <div className="mt-2.5 pt-2 border-t border-[#8A9A5B]/20 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#485526] uppercase tracking-wider">
                            Action Required:
                          </span>
                          <button
                            type="button"
                            className="px-3 py-1 rounded-lg bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                          >
                            <Car className="w-3 h-3" />
                            <span>Verify Attendance →</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-[#8A9A5B] shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-4 bg-white border-t border-[#E8E4D9] flex justify-between items-center text-xs">
            <button
              onClick={onClearAll}
              className="text-[#8E8A81] hover:text-rose-600 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear all notifications</span>
            </button>
            <span className="text-[#AFA99E]">{notifications.length} total</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};
