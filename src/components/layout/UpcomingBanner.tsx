import React from 'react';
import { CalendarEvent, FriendGroup } from '../../types';
import { formatRelativeEventTime } from '../../utils/calendarUtils';
import { MapPin, Users, Send, ChevronRight, Sparkles, Clock, Car} from 'lucide-react';

interface UpcomingBannerProps {
  events: CalendarEvent[];
  friendGroups: FriendGroup[];
  onOpenEvent: (event: CalendarEvent) => void;
  onQuickNotify: (event: CalendarEvent) => void;
  onOpenVerificationModal: (event: CalendarEvent) => void;
}

export const UpcomingBanner: React.FC<UpcomingBannerProps> = ({
  events,
  friendGroups,
  onOpenEvent,
  onQuickNotify,
  onOpenVerificationModal,
}) => {
  // Find the next upcoming confirmed or proposed event
  const upcomingEvent = events
    .filter((e) => e.status !== 'cancelled')
    .sort((a, b) => {
      const dateA = `${a.date}T${a.startTime || '00:00'}`;
      const dateB = `${b.date}T${b.startTime || '00:00'}`;
      return dateA.localeCompare(dateB);
    })[0];

  if (!upcomingEvent) return null;

  const group = friendGroups.find((g) => g.id === upcomingEvent.groupId);
  const groupColor = group?.color || '#8A9A5B';
  const groupBg = group?.bgLightColor || '#F3F6EC';
  const groupBorder = group?.borderColor || '#C9D6A8';
  const groupText = group?.textColor || '#485526';

  const userAttendee = upcomingEvent.attendees.find((a) => a.memberId === 'm-1');
  const userCheckIn = userAttendee?.checkInStatus || 'unverified';

  return (
    <div
      id="upcoming-event-banner"
      className="bg-white border border-[#F0ECE4] rounded-3xl p-5 sm:p-6 shadow-sm transition-all hover:shadow-md relative overflow-hidden"
    >
      {/* Decorative top accent line with friend group color */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{ backgroundColor: groupColor }}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left Info */}
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-2xs"
            style={{ backgroundColor: groupBg, color: groupText, border: `1px solid ${groupBorder}` }}
          >
            <Sparkles className="w-5 h-5" style={{ color: groupColor }} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider"
                style={{ backgroundColor: groupBg, color: groupText, border: `1px solid ${groupBorder}` }}
              >
                {group?.name || 'Social Gathering'}
              </span>

              {upcomingEvent.status === 'proposed' ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#FAF3EB] text-[#C98A4B] border border-[#E8C59F]">
                  🗳️ Polling
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#F3F6EC] text-[#485526] border border-[#C9D6A8]">
                  ✓ Confirmed
                </span>
              )}

              <span className="text-xs text-[#8E8A81] font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#AFA99E]" />
                {formatRelativeEventTime(upcomingEvent.date, upcomingEvent.startTime)}
              </span>

              {userCheckIn !== 'unverified' && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {userCheckIn.replace(/_/g, ' ')}
                </span>
              )}
            </div>

            <h3
              onClick={() => onOpenEvent(upcomingEvent)}
              className="text-base sm:text-lg font-bold text-[#3D3A35] hover:text-[#8A9A5B] cursor-pointer leading-snug transition-colors font-serif-soft"
            >
              {upcomingEvent.title}
            </h3>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#5C574F] mt-1.5">
              {upcomingEvent.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#AFA99E] shrink-0" />
                  <span className="truncate max-w-xs">{upcomingEvent.location}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#AFA99E] shrink-0" />
                <span>{upcomingEvent.attendees.length} members</span>
                {/* Micro avatar pile */}
                <div className="flex -space-x-1.5 overflow-hidden ml-0.5">
                  {upcomingEvent.attendees.slice(0, 4).map((att) => (
                    <div
                      key={att.memberId}
                      className="inline-block h-4.5 w-4.5 rounded-full ring-1 ring-white text-[8px] flex items-center justify-center font-bold text-white shadow-2xs"
                      style={{ backgroundColor: att.avatarColor }}
                      title={att.name}
                    >
                      {att.name[0]}
                    </div>
                  ))}
                  {upcomingEvent.attendees.length > 4 && (
                    <div className="inline-block h-4.5 w-4.5 rounded-full bg-[#E8E4D9] ring-1 ring-white text-[8px] flex items-center justify-center text-[#5C574F] font-semibold">
                      +{upcomingEvent.attendees.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
          
          {/* Quick attendance verification button */}
          <button
            id={`btn-banner-verify-${upcomingEvent.id}`}
            onClick={() => onOpenVerificationModal(upcomingEvent)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Check-in attendance"
          >
            <Car className="w-3.5 h-3.5" />
            <span>Check In</span>
          </button>

          <button
            id={`btn-banner-notify-${upcomingEvent.id}`}
            onClick={() => onQuickNotify(upcomingEvent)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F7F3EB] hover:bg-[#E8E4D9] text-[#3D3A35] text-xs font-semibold border border-[#E8E4D9] transition-colors cursor-pointer"
            title="Notify group"
          >
            <Send className="w-3.5 h-3.5 text-[#8A9A5B]" />
            <span>Notify</span>
          </button>

          <button
            id={`btn-banner-view-${upcomingEvent.id}`}
            onClick={() => onOpenEvent(upcomingEvent)}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#3D3A35] hover:bg-[#2A2724] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <span>Details</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
