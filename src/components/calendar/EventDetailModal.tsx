import React, { useState } from 'react';
import { CalendarEvent, FriendGroup, ProposedTimeSlot } from '../../types';
import { formatDate, formatTime, generateICSFile, downloadICSFile } from '../../utils/calendarUtils';
import { 
  X, 
  MapPin, 
  Clock, 
  Calendar, 
  Bell, 
  Download, 
  Trash2, 
  Send, 
  Car, 
  History,
  Check,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

interface EventDetailModalProps {
  isOpen: boolean;
  event: CalendarEvent | null;
  friendGroup?: FriendGroup;
  currentUserId?: string;
  onClose: () => void;
  onDeleteEvent: (eventId: string) => void;
  onOpenVerificationModal: (event: CalendarEvent) => void;
  onBroadcastChange: (eventId: string, updateMessage: string) => void;
  onUpdateEventStatus: (eventId: string, status: CalendarEvent['status']) => void;
  onVoteSlot?: (eventId: string, slotId: string, available: boolean) => void;
  onConfirmSlot?: (eventId: string, slot: ProposedTimeSlot) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  event,
  friendGroup,
  currentUserId = 'm-1',
  onClose,
  onDeleteEvent,
  onOpenVerificationModal,
  onBroadcastChange,
  onUpdateEventStatus,
  onVoteSlot,
  onConfirmSlot,
}) => {
  const [broadcastNote, setBroadcastNote] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);

  if (!isOpen || !event) return null;

  const groupColor = friendGroup?.color || '#8A9A5B';
  const groupBg = friendGroup?.bgLightColor || '#F3F6EC';
  const groupBorder = friendGroup?.borderColor || '#C9D6A8';
  const groupText = friendGroup?.textColor || '#485526';

  const userAttendee = event.attendees.find((a) => a.memberId === 'm-1') || event.attendees[0];

  const handleDownloadICS = () => {
    const icsContent = generateICSFile(event);
    const filename = `${event.title.replace(/\s+/g, '_')}.ics`;
    downloadICSFile(icsContent, filename);
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastNote.trim()) return;

    onBroadcastChange(event.id, broadcastNote.trim());
    setIsBroadcasting(false);
    setBroadcastSent(true);
    setBroadcastNote('');
    setTimeout(() => setBroadcastSent(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
      <div
        id="event-detail-modal"
        className="bg-[#FDFCF8] border border-[#E8E4D9] rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh] max-h-[92dvh]"
      >
        {/* Header with Group Color */}
        <div
          className="p-5 sm:p-6 border-b border-[#E8E4D9] relative"
          style={{ backgroundColor: groupBg }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#ffffff', color: groupText, border: `1px solid ${groupBorder}` }}
                >
                  {friendGroup?.name || 'Social Gathering'}
                </span>

                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    event.status === 'confirmed'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : event.status === 'proposed'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {event.status === 'confirmed' ? '✓ Confirmed Event' : '🗳️ Polling Time Slots'}
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold font-serif text-[#3D3A35] mt-2">
                {event.title}
              </h3>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/5 text-[#8E8A81] transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain space-y-6">
          
          {/* Quick Date, Time & Location Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <div className="p-3.5 bg-white rounded-2xl border border-[#E8E4D9] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F7F3EB] text-[#8A9A5B] flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#8E8A81] uppercase">Date & Time</p>
                <p className="text-sm font-bold text-[#3D3A35]">{formatDate(event.date)}</p>
                <p className="text-xs font-semibold text-[#5C574F]">
                  {formatTime(event.startTime)} – {formatTime(event.endTime)}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-2xl border border-[#E8E4D9] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F7F3EB] text-[#D48C70] flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#8E8A81] uppercase">Location</p>
                <p className="text-sm font-bold text-[#3D3A35] truncate">{event.location || 'Location TBD'}</p>
                <p className="text-xs text-[#8E8A81]">
                  {event.locationType === 'online' ? 'Online Video Meet' : 'In-Person Gathering'}
                </p>
              </div>
            </div>

          </div>

          {/* Description & Notes */}
          {event.description && (
            <div className="p-4 bg-[#F7F3EB] rounded-2xl border border-[#E8E4D9]">
              <p className="text-xs font-bold text-[#8E8A81] uppercase tracking-wider mb-1">Details & Plan</p>
              <p className="text-sm text-[#3D3A35] leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* Proposed Time Slots Polling (if event has proposed slots) */}
          {event.proposedSlots && event.proposedSlots.length > 0 && (
            <div className="p-4 bg-[#F7F3EB] rounded-2xl border border-[#E8E4D9] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#4A463F] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#8A9A5B]" />
                  <span>Time Slot Poll & Voting ({event.proposedSlots.length} options)</span>
                </h4>
                <span className="text-[11px] font-semibold text-[#8E8A81]">
                  {event.status === 'confirmed' ? '✓ Time Finalized' : 'Vote on times you can make'}
                </span>
              </div>

              <div className="space-y-2.5">
                {event.proposedSlots.map((slot) => {
                  const myVote = slot.votes.find((v) => v.memberId === currentUserId);
                  const yesVotes = slot.votes.filter((v) => v.available);
                  const isSelected = event.selectedSlotId === slot.id;

                  return (
                    <div
                      key={slot.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-[#F3F6EC] border-[#8A9A5B] shadow-xs'
                          : 'bg-white border-[#E8E4D9]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#3D3A35]">
                              {formatDate(slot.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-xs font-semibold text-[#5C574F]">
                              {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-bold bg-[#8A9A5B] text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Selected Slot
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#8E8A81] mt-0.5">
                            {yesVotes.length} of {event.attendees.length} members free ({yesVotes.map((v) => v.memberName).join(', ') || 'No votes yet'})
                          </p>
                        </div>

                        {/* Voting & Confirm Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {onVoteSlot && (
                            <>
                              <button
                                onClick={() => onVoteSlot(event.id, slot.id, true)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                                  myVote?.available === true
                                    ? 'bg-[#8A9A5B] text-white'
                                    : 'bg-[#F7F3EB] text-[#5C574F] hover:bg-[#EFE9DC]'
                                }`}
                              >
                                <ThumbsUp className="w-3 h-3" />
                                <span>I'm Free</span>
                              </button>
                              <button
                                onClick={() => onVoteSlot(event.id, slot.id, false)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                                  myVote?.available === false
                                    ? 'bg-[#D48C70] text-white'
                                    : 'bg-[#F7F3EB] text-[#5C574F] hover:bg-[#EFE9DC]'
                                }`}
                              >
                                <ThumbsDown className="w-3 h-3" />
                                <span>Busy</span>
                              </button>
                            </>
                          )}

                          {onConfirmSlot && event.status !== 'confirmed' && (
                            <button
                              onClick={() => onConfirmSlot(event.id, slot)}
                              className="px-2.5 py-1 rounded-lg bg-[#3D3A35] hover:bg-[#2B2925] text-white text-xs font-semibold shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3 text-[#8A9A5B]" />
                              <span>Lock Slot</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scheduled Time Verification Prompt Box */}
          <div className="p-4 bg-gradient-to-r from-[#F3F6EC] to-[#FAF0EB] rounded-2xl border border-[#C9D6A8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#485526]">
                <Bell className="w-4 h-4 text-[#8A9A5B]" />
                <span>Attendance Verification Status</span>
              </div>
              <p className="text-xs text-[#5C574F] mt-0.5">
                Your current status:{' '}
                <strong className="text-[#3D3A35] capitalize">
                  {userAttendee?.checkInStatus ? userAttendee.checkInStatus.replace(/_/g, ' ') : 'Unverified'}
                </strong>
              </p>
            </div>

            <button
              id="btn-trigger-verify-from-modal"
              onClick={() => onOpenVerificationModal(event)}
              className="px-4 py-2 rounded-xl bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Car className="w-3.5 h-3.5" />
              <span>Verify / Check In Now</span>
            </button>
          </div>

          {/* Participants & Check-in Verification Roster */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-[#8E8A81] uppercase tracking-wider">
                Participants & Verification Status ({event.attendees.length})
              </h4>
            </div>

            <div className="space-y-2">
              {event.attendees.map((att) => {
                let badge = (
                  <span className="text-[11px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md">
                    Invited
                  </span>
                );

                if (att.checkInStatus === 'on_the_way') {
                  badge = (
                    <span className="text-[11px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      🚗 On the way
                    </span>
                  );
                } else if (att.checkInStatus === 'attending') {
                  badge = (
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      ✓ Arrived / Confirmed
                    </span>
                  );
                } else if (att.checkInStatus === 'running_late') {
                  badge = (
                    <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      ⏱️ Running late
                    </span>
                  );
                } else if (att.checkInStatus === 'cannot_make_it') {
                  badge = (
                    <span className="text-[11px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      ✕ Can't make it
                    </span>
                  );
                }

                return (
                  <div
                    key={att.memberId}
                    className="p-2.5 bg-white rounded-xl border border-[#E8E4D9] flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-2xs"
                        style={{ backgroundColor: att.avatarColor }}
                      >
                        {att.name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#3D3A35]">{att.name}</p>
                        {att.checkInNote && (
                          <p className="text-[10px] text-[#8E8A81] italic">"{att.checkInNote}"</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {badge}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Broadcast Updates to Group Form */}
          <div className="pt-2 border-t border-[#F0ECE4]">
            {!isBroadcasting ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#8E8A81]">Need to change location or time?</p>
                <button
                  onClick={() => setIsBroadcasting(true)}
                  className="text-xs font-bold text-[#8A9A5B] hover:underline flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Notify All Friends of Changes</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendBroadcast} className="p-3.5 bg-[#F7F3EB] rounded-2xl border border-[#E8E4D9] space-y-2.5">
                <h5 className="text-xs font-bold text-[#3D3A35] flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-[#8A9A5B]" />
                  Broadcast Notice to {friendGroup?.name || 'Participants'}
                </h5>
                <textarea
                  rows={2}
                  value={broadcastNote}
                  onChange={(e) => setBroadcastNote(e.target.value)}
                  placeholder="e.g., Table is reserved under Alex, parking on side street!"
                  className="w-full p-2.5 bg-white border border-[#E8E4D9] rounded-xl text-xs text-[#3D3A35]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBroadcasting(false)}
                    className="px-3 py-1 text-xs text-[#8E8A81]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-[#8A9A5B] text-white text-xs font-bold rounded-xl"
                  >
                    Send Update to Group
                  </button>
                </div>
              </form>
            )}

            {broadcastSent && (
              <p className="text-xs text-emerald-700 font-bold text-center mt-2">
                ✓ Update notification broadcasted to all participants!
              </p>
            )}
          </div>

          {/* Change History Audit Log */}
          {event.changeHistory && event.changeHistory.length > 0 && (
            <div className="pt-2 border-t border-[#F0ECE4]">
              <h5 className="text-[11px] font-bold text-[#8E8A81] uppercase tracking-wider mb-2 flex items-center gap-1">
                <History className="w-3 h-3" /> Change History
              </h5>
              <div className="space-y-1 pl-2 border-l-2 border-[#E8E4D9] text-[11px] text-[#5C574F]">
                {event.changeHistory.map((item, idx) => (
                  <div key={idx} className="leading-tight">
                    <span className="font-semibold text-[#3D3A35]">{item.author}</span>: {item.action}
                    <span className="text-[#AFA99E] ml-1">({item.timestamp})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-[#F7F3EB] border-t border-[#E8E4D9] flex flex-wrap items-center justify-between gap-3">
          
          <button
            onClick={() => onDeleteEvent(event.id)}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Cancel Event</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadICS}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#E8E4D9] text-xs font-bold text-[#3D3A35] hover:bg-[#FDFCF8] flex items-center gap-1.5 shadow-2xs"
              title="Download standard .ICS file for Google Calendar, Apple Calendar, Outlook"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .ICS</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#3D3A35] text-white text-xs font-bold hover:bg-[#2B2925] shadow-xs"
            >
              Done
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
