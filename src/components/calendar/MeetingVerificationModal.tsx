import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CalendarEvent, FriendGroup, CheckInStatus } from '../../types';
import { formatRelativeEventTime } from '../../utils/calendarUtils';
import { 
  Bell, 
  MapPin, 
  Users, 
  Car, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Send, 
  Sparkles,
  X
} from 'lucide-react';

interface MeetingVerificationModalProps {
  isOpen: boolean;
  event: CalendarEvent | null;
  friendGroup?: FriendGroup;
  onClose: () => void;
  onVerifyStatus: (
    eventId: string, 
    status: CheckInStatus, 
    note?: string
  ) => void;
}

export const MeetingVerificationModal: React.FC<MeetingVerificationModalProps> = ({
  isOpen,
  event,
  friendGroup,
  onClose,
  onVerifyStatus,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<CheckInStatus | null>(null);
  const [customNote, setCustomNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  if (!isOpen || !event) return null;

  const groupColor = friendGroup?.color || '#8A9A5B';
  const groupBg = friendGroup?.bgLightColor || '#F3F6EC';
  const groupBorder = friendGroup?.borderColor || '#C9D6A8';
  const groupText = friendGroup?.textColor || '#485526';

  const userAttendee = event.attendees.find((a) => a.memberId === 'm-1') || event.attendees[0];
  const currentStatus = userAttendee?.checkInStatus || 'unverified';

  const handleSelectOption = (status: CheckInStatus, defaultNote = '') => {
    setSelectedStatus(status);
    if (!customNote && defaultNote) {
      setCustomNote(defaultNote);
    }
  };

  const handleConfirm = () => {
    if (!selectedStatus) return;
    setIsSubmitting(true);

    let confirmationText = '';
    if (selectedStatus === 'on_the_way') confirmationText = "Notified group: You're on your way! 🚗";
    else if (selectedStatus === 'attending') confirmationText = "Verified: You've arrived! 📍";
    else if (selectedStatus === 'running_late') confirmationText = "Notified group: Running a little late ⏱️";
    else if (selectedStatus === 'cannot_make_it') confirmationText = "Notified group: Can't make it ❌";

    setTimeout(() => {
      onVerifyStatus(event.id, selectedStatus, customNote);
      setIsSubmitting(false);
      setSubmittedMessage(confirmationText);
      setTimeout(() => {
        setSubmittedMessage(null);
        setSelectedStatus(null);
        setCustomNote('');
        onClose();
      }, 1400);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        id="meeting-verification-modal"
        className="bg-[#FDFCF8] border border-[#E8E4D9] text-[#3D3A35] rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] max-h-[90dvh]"
      >
        {/* Top Header Banner */}
        <div 
          className="p-5 sm:p-6 border-b border-[#E8E4D9] relative"
          style={{ backgroundColor: groupBg }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0"
                style={{ backgroundColor: groupColor, color: '#ffffff' }}
              >
                <Bell className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span 
                    className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#ffffff', color: groupText, border: `1px solid ${groupBorder}` }}
                  >
                    {friendGroup?.name || 'Upcoming Gathering'}
                  </span>
                  <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
                    Almost Scheduled Time!
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold font-serif text-[#3D3A35] mt-1">
                  Are you going to this meeting?
                </h3>
              </div>
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

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain space-y-5">
          
          {/* Event Quick Snapshot Card */}
          <div className="bg-[#F7F3EB] rounded-2xl p-4 border border-[#E8E4D9]">
            <h4 className="text-base font-bold text-[#3D3A35]">{event.title}</h4>
            
            <div className="flex flex-wrap gap-y-2 gap-x-4 text-xs text-[#5C574F] mt-2">
              <div className="flex items-center gap-1.5 font-semibold text-[#8A9A5B]">
                <Clock className="w-4 h-4" />
                <span>{formatRelativeEventTime(event.date, event.startTime)}</span>
              </div>

              {event.location && (
                <div className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-4 h-4 text-[#8E8A81]" />
                  <span>{event.location}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 font-medium">
                <Users className="w-4 h-4 text-[#8E8A81]" />
                <span>{event.attendees.length} participants invited</span>
              </div>
            </div>

            {/* Live attendee status tracker */}
            <div className="mt-3 pt-3 border-t border-[#E8E4D9]/80">
              <p className="text-[11px] font-bold text-[#8E8A81] uppercase tracking-wider mb-2">
                Friends' Current Check-in Status:
              </p>
              <div className="flex flex-wrap gap-2">
                {event.attendees.map((att) => {
                  let statusBadge = (
                    <span className="text-[11px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md">
                      Pending
                    </span>
                  );
                  if (att.checkInStatus === 'on_the_way') {
                    statusBadge = (
                      <span className="text-[11px] bg-sky-100 text-sky-800 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                        🚗 On the way
                      </span>
                    );
                  } else if (att.checkInStatus === 'attending') {
                    statusBadge = (
                      <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                        ✓ Arrived
                      </span>
                    );
                  } else if (att.checkInStatus === 'running_late') {
                    statusBadge = (
                      <span className="text-[11px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                        ⏱️ Running late
                      </span>
                    );
                  } else if (att.checkInStatus === 'cannot_make_it') {
                    statusBadge = (
                      <span className="text-[11px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                        ✕ Can't make it
                      </span>
                    );
                  }

                  return (
                    <div
                      key={att.memberId}
                      className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-[#E8E4D9] text-xs shadow-2xs"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: att.avatarColor }}
                      />
                      <span className="font-medium text-[#3D3A35]">{att.name}</span>
                      {statusBadge}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Choice Buttons for Every Age Gap */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A81] mb-2.5">
              Verify your attendance with 1 tap:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Option 1: On the way */}
              <button
                type="button"
                id="btn-verify-on-the-way"
                onClick={() => handleSelectOption('on_the_way', "On my way! ETA 10 mins 🚗")}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  selectedStatus === 'on_the_way'
                    ? 'bg-[#EEF4FC] border-[#7096D4] ring-2 ring-[#7096D4]/30 shadow-sm'
                    : 'bg-white border-[#E8E4D9] hover:bg-[#F7F3EB]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#7096D4]/15 text-[#7096D4] flex items-center justify-center shrink-0 font-bold">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-[#3D3A35]">I'm On My Way!</h5>
                  <p className="text-xs text-[#5C574F] mt-0.5">Leaving now / traveling to location</p>
                </div>
              </button>

              {/* Option 2: Arrived / Here */}
              <button
                type="button"
                id="btn-verify-arrived"
                onClick={() => handleSelectOption('attending', "I'm already here! Grabbed a table 📍")}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  selectedStatus === 'attending'
                    ? 'bg-[#F3F6EC] border-[#8A9A5B] ring-2 ring-[#8A9A5B]/30 shadow-sm'
                    : 'bg-white border-[#E8E4D9] hover:bg-[#F7F3EB]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#8A9A5B]/15 text-[#8A9A5B] flex items-center justify-center shrink-0 font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-[#3D3A35]">Already Here</h5>
                  <p className="text-xs text-[#5C574F] mt-0.5">Arrived at the spot / ready</p>
                </div>
              </button>

              {/* Option 3: Running a bit late */}
              <button
                type="button"
                id="btn-verify-running-late"
                onClick={() => handleSelectOption('running_late', 'Running 5-10 minutes late! Hold the spot')}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  selectedStatus === 'running_late'
                    ? 'bg-[#FAF3EB] border-[#C98A4B] ring-2 ring-[#C98A4B]/30 shadow-sm'
                    : 'bg-white border-[#E8E4D9] hover:bg-[#F7F3EB]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#C98A4B]/15 text-[#C98A4B] flex items-center justify-center shrink-0 font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-[#3D3A35]">Running Late</h5>
                  <p className="text-xs text-[#5C574F] mt-0.5">Need a few extra minutes</p>
                </div>
              </button>

              {/* Option 4: Can't make it */}
              <button
                type="button"
                id="btn-verify-cannot-make-it"
                onClick={() => handleSelectOption('cannot_make_it', "Sorry everyone, something came up and I can't make it today!")}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  selectedStatus === 'cannot_make_it'
                    ? 'bg-[#FBF2EE] border-[#D48C70] ring-2 ring-[#D48C70]/30 shadow-sm'
                    : 'bg-white border-[#E8E4D9] hover:bg-[#F7F3EB]'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#D48C70]/15 text-[#D48C70] flex items-center justify-center shrink-0 font-bold">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-sm font-bold text-[#3D3A35]">Can't Make It</h5>
                  <p className="text-xs text-[#5C574F] mt-0.5">Politely decline / update friends</p>
                </div>
              </button>

            </div>
          </div>

          {/* Optional Note / Message to Friends */}
          {selectedStatus && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-1.5"
            >
              <label className="block text-xs font-semibold text-[#5C574F]">
                Quick message to {friendGroup?.name || 'group participants'}:
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g., Taking the bus, see you in 10 mins!"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E8E4D9] rounded-xl text-sm text-[#3D3A35] placeholder-[#AFA99E] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
              />
            </motion.div>
          )}

          {/* Feedback message upon submitting */}
          {submittedMessage && (
            <div className="p-3 bg-[#F3F6EC] border border-[#8A9A5B] rounded-xl text-center text-sm font-bold text-[#485526] flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8A9A5B]" />
              <span>{submittedMessage}</span>
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 bg-[#F7F3EB] border-t border-[#E8E4D9] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#E8E4D9] text-xs sm:text-sm font-semibold text-[#5C574F] hover:bg-white transition-colors"
          >
            Remind Me in 5 Mins
          </button>

          <button
            type="button"
            id="btn-confirm-attendance-verification"
            disabled={!selectedStatus || isSubmitting}
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all ${
              selectedStatus && !isSubmitting
                ? 'bg-[#8A9A5B] hover:bg-[#7D8D50] text-white cursor-pointer active:scale-98'
                : 'bg-[#E8E4D9] text-[#AFA99E] cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Notifying Friends...' : 'Confirm & Notify Friends'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
