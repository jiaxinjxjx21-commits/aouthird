import React, { useState, useEffect } from 'react';
import { CalendarEvent, FriendGroup, ProposedTimeSlot, CheckInStatus } from '../../types';
import { getTodayDateString, formatDate } from '../../utils/calendarUtils';
import { NATURAL_PALETTES } from '../../data/initialData';

import { 
  X, 
  Calendar, 
  MapPin, 
  Users, 
  Sparkles, 
  Plus, 
  Trash2, 
  User,
  Briefcase,
  Heart,
  Dumbbell,
  Home,
  ArrowRight,
  ArrowLeft,
  Check,
  Copy,
  Ticket,
} from 'lucide-react';

interface NewEventModalProps {
  isOpen: boolean;
  preselectedGroupId?: string;
  friendGroups: FriendGroup[];
  startWithPoll?: boolean;
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  initialTitle?: string;
  initialIsPersonal?: boolean;
  onClose: () => void;
  onCreateEvent: (newEvent: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  onQuickCreateGroup?: (name: string, color: string) => string;
  onGenerateInviteCode?: (groupId: string, guestName?: string, guestEmail?: string, expirationType?: '7days' | 'permanent') => string;
}

export const NewEventModal: React.FC<NewEventModalProps> = ({
  isOpen,
  preselectedGroupId,
  friendGroups,
  startWithPoll = false,
  initialDate,
  initialStartTime,
  initialEndTime,
  initialTitle,
  initialIsPersonal = false,
  onClose,
  onCreateEvent,
  onQuickCreateGroup,
  onGenerateInviteCode,
}) => {
  // Step in the unified 3-step planner: 1 = Circle/Who, 2 = When/Availability, 3 = Details & Invites
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Event Type
  const [isPersonalEvent, setIsPersonalEvent] = useState(initialIsPersonal);
  const [personalCategory, setPersonalCategory] = useState<'work' | 'personal' | 'health' | 'family' | 'errand'>('personal');

  // Circle Selection & Quick Create
  const [groupId, setGroupId] = useState(preselectedGroupId || (friendGroups[0]?.id ?? ''));
  const [isQuickCreatingGroup, setIsQuickCreatingGroup] = useState(false);
  const [quickGroupName, setQuickGroupName] = useState('');
  const [quickGroupColor, setQuickGroupColor] = useState(NATURAL_PALETTES[0].color);

  // Date and Time
  const [date, setDate] = useState(initialDate || getTodayDateString());
  const [startTime, setStartTime] = useState(initialStartTime || '11:00');
  const [endTime, setEndTime] = useState(initialEndTime || '13:00');

  // Details
  const [title, setTitle] = useState(initialTitle || '');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [locationType, setLocationType] = useState<'in_person' | 'online'>('in_person');

  // Polling mode toggle
  const [isPollingMode, setIsPollingMode] = useState(startWithPoll);
  const [proposedSlots, setProposedSlots] = useState<Omit<ProposedTimeSlot, 'id' | 'votes'>[]>([
    { date: initialDate || getTodayDateString(), startTime: '10:00', endTime: '12:00' },
    { date: initialDate || getTodayDateString(), startTime: '14:00', endTime: '16:00' },
  ]);

  // Invite code generation inside Step 3
  const [inviteExpirationType, setInviteExpirationType] = useState<'7days' | 'permanent'>('7days');
  const [generatedInviteCode, setGeneratedInviteCode] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Reset and sync state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      if (initialTitle) setTitle(initialTitle);
      if (initialDate) setDate(initialDate);
      if (initialStartTime) setStartTime(initialStartTime);
      if (initialEndTime) setEndTime(initialEndTime);
      if (preselectedGroupId) setGroupId(preselectedGroupId);
      else if (friendGroups.length > 0) setGroupId(friendGroups[0].id);
      setIsPersonalEvent(initialIsPersonal);
      setIsPollingMode(startWithPoll);
      setGeneratedInviteCode(null);
      setCopiedInvite(false);
      setIsQuickCreatingGroup(friendGroups.length === 0 && !initialIsPersonal);
    }
  }, [isOpen, initialTitle, initialDate, initialStartTime, initialEndTime, preselectedGroupId, initialIsPersonal, startWithPoll, friendGroups]);

  if (!isOpen) return null;

  const selectedGroup = friendGroups.find((g) => g.id === groupId);

  const handleAddSlot = () => {
    setProposedSlots([
      ...proposedSlots,
      { date: date || getTodayDateString(), startTime: '18:00', endTime: '20:00' },
    ]);
  };

  const handleRemoveSlot = (index: number) => {
    if (proposedSlots.length <= 1) return;
    setProposedSlots(proposedSlots.filter((_, idx) => idx !== index));
  };

  const handleSlotChange = (index: number, field: 'date' | 'startTime' | 'endTime', value: string) => {
    const updated = [...proposedSlots];
    updated[index] = { ...updated[index], [field]: value };
    setProposedSlots(updated);
  };

  const handleQuickCreateSubmit = () => {
    if (!quickGroupName.trim() || !onQuickCreateGroup) return;
    const newId = onQuickCreateGroup(quickGroupName.trim(), quickGroupColor);
    setGroupId(newId);
    setIsQuickCreatingGroup(false);
  };

  const handleGenerateStep3Code = () => {
    if (!groupId || !onGenerateInviteCode) return;
    const code = onGenerateInviteCode(groupId, undefined, undefined, inviteExpirationType);
    setGeneratedInviteCode(code);
  };

  const handleCopyInviteMessage = () => {
    if (!generatedInviteCode) return;
    const groupName = selectedGroup?.name || quickGroupName || 'our gathering';
    const durationText = inviteExpirationType === 'permanent' ? 'Permanent link' : 'Valid for 7 days';
    const message = `Hey! Join "${groupName}" on NaddD with invite code: ${generatedInviteCode} (${durationText}). Open the app and click "Enter Code" to join!`;
    navigator.clipboard?.writeText(message);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    if (isPersonalEvent) {
      onCreateEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        isPersonal: true,
        personalCategory,
        color: personalCategory === 'work' ? '#7096D4' : personalCategory === 'health' ? '#8A9A5B' : '#D48C70',
        date,
        startTime,
        endTime,
        location: location.trim() || undefined,
        locationType,
        status: 'confirmed',
        attendees: [
          {
            memberId: 'm-1',
            name: 'Alex (You)',
            avatarColor: '#8A9A5B',
            status: 'accepted',
            checkInStatus: 'unverified',
          },
        ],
        reminders: [
          { type: '1day', enabled: true },
          { type: '1hour', enabled: true },
        ],
      });
      onClose();
      return;
    }

    // Group gathering
    let targetGroupId = groupId;
    if (isQuickCreatingGroup && quickGroupName.trim() && onQuickCreateGroup) {
      targetGroupId = onQuickCreateGroup(quickGroupName.trim(), quickGroupColor);
    }

    const currentTargetGroup = friendGroups.find((g) => g.id === targetGroupId) || selectedGroup;

    const attendees = (currentTargetGroup?.members || [
      { id: 'm-1', name: 'Alex (You)', avatarColor: '#8A9A5B' }
    ]).map((m) => ({
      memberId: m.id,
      name: m.name,
      avatarColor: m.avatarColor,
      status: m.id === 'm-1' ? ('accepted' as const) : ('pending' as const),
      checkInStatus: 'unverified' as CheckInStatus,
    }));

    if (isPollingMode) {
      onCreateEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        groupId: targetGroupId,
        groupName: currentTargetGroup?.name || quickGroupName || 'Friend Circle',
        color: currentTargetGroup?.color || quickGroupColor,
        date: proposedSlots[0]?.date || date,
        startTime: proposedSlots[0]?.startTime || startTime,
        endTime: proposedSlots[0]?.endTime || endTime,
        location: location.trim() || undefined,
        locationType,
        status: 'proposed',
        proposedSlots: proposedSlots.map((s, idx) => ({
          id: `slot-${idx + 1}`,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          votes: [
            { memberId: 'm-1', memberName: 'Alex (You)', available: true },
          ],
        })),
        attendees,
        reminders: [
          { type: '1day', enabled: true },
          { type: '1hour', enabled: true },
        ],
      });
    } else {
      onCreateEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        groupId: targetGroupId,
        groupName: currentTargetGroup?.name || quickGroupName || 'Friend Circle',
        color: currentTargetGroup?.color || quickGroupColor,
        date,
        startTime,
        endTime,
        location: location.trim() || undefined,
        locationType,
        status: 'confirmed',
        attendees,
        reminders: [
          { type: '1day', enabled: true },
          { type: '1hour', enabled: true },
        ],
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#FDFCF8] border border-[#E8E4D9] rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header & Progress Indicator */}
        <div className="p-4 sm:px-6 bg-[#F7F3EB] border-b border-[#E8E4D9]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#8A9A5B]/15 text-[#8A9A5B] flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold font-serif text-[#3D3A35]">
                  {isPersonalEvent ? 'Add Personal Commitment' : 'Gathering Planner'}
                </h3>
                <p className="text-[11px] text-[#8E8A81]">
                  {isPersonalEvent
                    ? 'Keep your own private schedule up to date'
                    : `Step ${currentStep} of 3: ${
                        currentStep === 1
                          ? 'Choose or Create Circle'
                          : currentStep === 2
                          ? 'Select Date & Mutual Free Time'
                          : 'Gathering Details & Shareable Invites'
                      }`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#8E8A81] hover:text-[#3D3A35] hover:bg-stone-200/50 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Connected Step Indicator (Only for Group Gatherings) */}
          {!isPersonalEvent && (
            <div className="mt-3.5 flex items-center justify-between text-xs font-semibold">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentStep === 1 ? 'text-[#2D5A27] font-bold' : 'text-[#8E8A81]'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep === 1 ? 'bg-[#8A9A5B] text-white' : 'bg-stone-200 text-[#5C574F]'
                }`}>
                  1
                </span>
                <span>Who</span>
              </button>

              <div className="h-0.5 flex-1 mx-2 bg-[#E8E4D9]" />

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentStep === 2 ? 'text-[#2D5A27] font-bold' : 'text-[#8E8A81]'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep === 2 ? 'bg-[#8A9A5B] text-white' : 'bg-stone-200 text-[#5C574F]'
                }`}>
                  2
                </span>
                <span>When</span>
              </button>

              <div className="h-0.5 flex-1 mx-2 bg-[#E8E4D9]" />

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentStep === 3 ? 'text-[#2D5A27] font-bold' : 'text-[#8E8A81]'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep === 3 ? 'bg-[#8A9A5B] text-white' : 'bg-stone-200 text-[#5C574F]'
                }`}>
                  3
                </span>
                <span>Details & Invites</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* ================= STEP 1: WHO IS GATHERING? ================= */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* Event Type Toggle */}
              <div>
                <label className="block text-xs font-semibold text-[#5C574F] mb-1.5">
                  What kind of event are you scheduling?
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#F7F3EB] rounded-2xl border border-[#E8E4D9]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPersonalEvent(false);
                      if (friendGroups.length === 0) setIsQuickCreatingGroup(true);
                    }}
                    className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      !isPersonalEvent
                        ? 'bg-white text-[#3D3A35] shadow-xs'
                        : 'text-[#8E8A81] hover:text-[#5C574F]'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-[#8A9A5B]" />
                    <span>Friend Gathering</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPersonalEvent(true)}
                    className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isPersonalEvent
                        ? 'bg-white text-[#3D3A35] shadow-xs'
                        : 'text-[#8E8A81] hover:text-[#5C574F]'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 text-[#D48C70]" />
                    <span>Personal Commitment</span>
                  </button>
                </div>
              </div>

              {/* Personal Event Category */}
              {isPersonalEvent ? (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-[#5C574F]">
                    Commitment Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'work', label: 'Work / Shift', icon: Briefcase },
                      { id: 'personal', label: 'Personal Errands', icon: Home },
                      { id: 'health', label: 'Doctor / Health', icon: Heart },
                      { id: 'family', label: 'Family Duty', icon: Users },
                      { id: 'errand', label: 'Fitness / Gym', icon: Dumbbell },
                    ].map((cat) => {
                      const Icon = cat.icon;
                      const isSel = personalCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setPersonalCategory(cat.id as any)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                            isSel
                              ? 'bg-[#F3F6EC] border-[#8A9A5B] text-[#2D5A27] shadow-2xs'
                              : 'bg-white border-[#E8E4D9] text-[#5C574F] hover:bg-[#F7F3EB]'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 text-[#8A9A5B]" />
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5C574F] mb-1">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Annual Health Checkup, Work Shift"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E8E4D9] rounded-xl text-xs sm:text-sm text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-[#5C574F] mb-1">Date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs font-mono text-[#3D3A35]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5C574F] mb-1">Start Time</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs font-mono text-[#3D3A35]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5C574F] mb-1">End Time</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs font-mono text-[#3D3A35]"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Group Gathering Selection */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#5C574F]">
                      Which Circle is Meeting?
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickCreatingGroup(!isQuickCreatingGroup)}
                      className="text-xs font-bold text-[#8A9A5B] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isQuickCreatingGroup ? 'Choose Existing' : 'Create New Circle'}</span>
                    </button>
                  </div>

                  {isQuickCreatingGroup ? (
                    <div className="p-3.5 bg-[#F7F3EB] border border-[#E8E4D9] rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#3D3A35]">
                          Quick Create Circle
                        </span>
                        <span className="text-[10px] text-[#8E8A81]">Step 1 of 3</span>
                      </div>
                      <input
                        type="text"
                        value={quickGroupName}
                        onChange={(e) => setQuickGroupName(e.target.value)}
                        placeholder="Circle name, e.g. Weekend Hikers, Coffee & Books"
                        className="w-full px-3.5 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs sm:text-sm text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
                      />
                      <div>
                        <span className="block text-[11px] font-semibold text-[#5C574F] mb-1.5">
                          Theme Color
                        </span>
                        <div className="flex items-center gap-2">
                          {NATURAL_PALETTES.slice(0, 6).map((pal) => (
                            <button
                              key={pal.color}
                              type="button"
                              onClick={() => setQuickGroupColor(pal.color)}
                              className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                                quickGroupColor === pal.color ? 'ring-2 ring-[#3D3A35] ring-offset-1 scale-110' : 'opacity-80'
                              }`}
                              style={{ backgroundColor: pal.color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : friendGroups.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {friendGroups.map((g) => {
                        const isSel = groupId === g.id;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setGroupId(g.id)}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                              isSel
                                ? 'bg-[#F3F6EC] border-[#8A9A5B] shadow-2xs'
                                : 'bg-white border-[#E8E4D9] hover:bg-[#F7F3EB]'
                            }`}
                          >
                            <div className="flex items-center gap-2 font-bold text-xs text-[#3D3A35]">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: g.color }}
                              />
                              <span className="truncate">{g.name}</span>
                            </div>
                            <p className="text-[11px] text-[#8E8A81] mt-1">
                              {g.members.length} members · {g.inviteCodes?.length || 0} active codes
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900">
                      <p className="font-bold">No friend circles yet!</p>
                      <p className="mt-1 text-[11px] text-amber-800">
                        Type a circle name above to start your first circle. You'll get an invite code in Step 3!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 2: WHEN & MUTUAL AVAILABILITY ================= */}
          {currentStep === 2 && !isPersonalEvent && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5C574F] mb-1.5">
                  Select Date
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-white border border-[#E8E4D9] rounded-xl text-xs sm:text-sm font-mono text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
                  />
                  <button
                    type="button"
                    onClick={() => setDate(getTodayDateString())}
                    className="px-3 py-2.5 bg-[#F7F3EB] hover:bg-[#EFE9DD] border border-[#E8E4D9] rounded-xl text-xs font-semibold text-[#5C574F] cursor-pointer"
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* Group Availability Preview */}
              {selectedGroup && (
                <div className="p-3.5 bg-[#F3F6EC] border border-[#C9D6A8] rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#2D5A27] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#8A9A5B]" />
                      <span>{selectedGroup.name} Member Availability</span>
                    </span>
                    <span className="text-[11px] text-[#485526]">
                      {formatDate(date, { weekday: 'long' })}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {selectedGroup.members.map((m) => {
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between text-xs py-1 border-b border-[#C9D6A8]/40 last:border-none"
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center text-white"
                              style={{ backgroundColor: m.avatarColor }}
                            >
                              {m.avatarEmoji || '•'}
                            </span>
                            <span className="font-medium text-[#3D3A35]">{m.name}</span>
                          </div>
                          <span className="text-[11px] text-[#2D5A27] font-semibold">
                            ✓ Free
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Polling Option vs Fixed Time */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#5C574F]">
                    Meeting Time Mode
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsPollingMode(!isPollingMode)}
                    className="text-xs font-bold text-[#8A9A5B] hover:underline cursor-pointer"
                  >
                    {isPollingMode ? 'Switch to Fixed Time' : 'Poll Multiple Slots'}
                  </button>
                </div>

                {isPollingMode ? (
                  <div className="space-y-2 p-3 bg-[#F7F3EB] rounded-2xl border border-[#E8E4D9]">
                    <p className="text-[11px] text-[#8E8A81]">
                      Propose candidate time slots for circle members to vote on:
                    </p>
                    {proposedSlots.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => handleSlotChange(idx, 'startTime', e.target.value)}
                          className="px-2.5 py-1.5 bg-white border border-[#E8E4D9] rounded-lg text-xs font-mono"
                        />
                        <span className="text-xs text-[#8E8A81]">to</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => handleSlotChange(idx, 'endTime', e.target.value)}
                          className="px-2.5 py-1.5 bg-white border border-[#E8E4D9] rounded-lg text-xs font-mono"
                        />
                        {proposedSlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(idx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddSlot}
                      className="text-xs text-[#8A9A5B] font-bold hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Candidate Time</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#5C574F] mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs sm:text-sm font-mono text-[#3D3A35]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5C574F] mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs sm:text-sm font-mono text-[#3D3A35]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 3: DETAILS & SHAREABLE INVITES ================= */}
          {currentStep === 3 && !isPersonalEvent && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5C574F] mb-1">
                  Gathering Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sunday Brunch, Coffee Catchup, Board Game Night"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E8E4D9] rounded-xl text-xs sm:text-sm text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C574F] mb-1">
                  Location or Link (Optional)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-3 text-[#AFA99E] pointer-events-none" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Green Garden Cafe, Central Park, or Google Meet link"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#E8E4D9] rounded-xl text-xs sm:text-sm text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C574F] mb-1">
                  Note / Agenda (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Any details to share with friends..."
                  className="w-full px-3.5 py-2 bg-white border border-[#E8E4D9] rounded-xl text-xs text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
                />
              </div>

              {/* Instant Shareable Invite Code Generator for Guests */}
              <div className="p-3.5 bg-[#F7F3EB] border border-[#E8E4D9] rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#3D3A35]">
                    <Ticket className="w-3.5 h-3.5 text-[#8A9A5B]" />
                    <span>Invite Friends with One-Time Code</span>
                  </div>
                  {/* Lifetime Selector: 7 Days (Default) vs Permanent */}
                  <div className="flex items-center p-0.5 bg-white rounded-lg border border-[#E8E4D9] text-[11px]">
                    <button
                      type="button"
                      onClick={() => setInviteExpirationType('7days')}
                      className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                        inviteExpirationType === '7days' ? 'bg-[#8A9A5B] text-white' : 'text-[#5C574F]'
                      }`}
                    >
                      7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteExpirationType('permanent')}
                      className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                        inviteExpirationType === 'permanent' ? 'bg-[#8A9A5B] text-white' : 'text-[#5C574F]'
                      }`}
                    >
                      No Expiration
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-[#8E8A81]">
                  Friends can type or paste this code anywhere in NaddD to join your circle and gathering.
                </p>

                {generatedInviteCode ? (
                  <div className="p-2.5 bg-white rounded-xl border border-[#C9D6A8] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-bold text-[#2D5A27] tracking-wider">
                        {generatedInviteCode}
                      </span>
                      <span className="text-[10px] text-[#485526] font-semibold bg-[#F3F6EC] px-2 py-0.5 rounded-full">
                        {inviteExpirationType === 'permanent' ? 'Permanent' : 'Valid 7 days'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyInviteMessage}
                      className="w-full py-1.5 px-3 bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                    >
                      {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedInvite ? 'Invite Message Copied!' : 'Copy Invite Message for Friends'}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerateStep3Code}
                    className="w-full py-2 bg-white hover:bg-stone-50 border border-[#E8E4D9] text-[#3D3A35] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Ticket className="w-3.5 h-3.5 text-[#8A9A5B]" />
                    <span>Generate Shareable Invite Code</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:px-6 bg-[#F7F3EB] border-t border-[#E8E4D9] flex items-center justify-between">
          {isPersonalEvent ? (
            <div className="flex items-center justify-end w-full gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#8E8A81] hover:text-[#3D3A35] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!title.trim()}
                className="px-5 py-2 bg-[#8A9A5B] hover:bg-[#7D8D50] disabled:bg-stone-300 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer"
              >
                Save Commitment
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#5C574F] hover:text-[#3D3A35] flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-semibold text-[#8E8A81] hover:text-[#3D3A35] cursor-pointer"
                >
                  Cancel
                </button>
              )}

              {currentStep === 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (isQuickCreatingGroup && quickGroupName.trim()) {
                      handleQuickCreateSubmit();
                    }
                    setCurrentStep(2);
                  }}
                  className="px-4 py-2 bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>Next: Choose Time</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>Next: Details & Invites</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {currentStep === 3 && (
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={!title.trim()}
                  className="px-5 py-2 bg-[#8A9A5B] hover:bg-[#7D8D50] disabled:bg-stone-300 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isPollingMode ? 'Start Time Poll' : 'Confirm Gathering'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
