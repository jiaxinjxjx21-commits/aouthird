import React, { useState } from 'react';
import { FriendGroup, FriendMember, CalendarEvent, MemberBusySlot, GroupInviteCode } from '../../types';
import { generateInviteCode } from '../../utils/inviteCode';
import { NATURAL_PALETTES } from '../../data/initialData';
import { formatTime, formatDate } from '../../utils/calendarUtils';
import { 
  Users, 
  Plus, 
  Calendar, 
  Sparkles, 
  Check, 
  Copy,
  Key,
  Send,
  UserPlus,
  ChevronDown,
  ChevronUp,
  X,
  Ticket
} from 'lucide-react';

interface FriendGroupsViewProps {
  friendGroups: FriendGroup[];
  events: CalendarEvent[];
  onOpenNewEventForGroup: (groupId: string) => void;
  onCreateGroup: (newGroup: Omit<FriendGroup, 'id' | 'createdAt'>) => void;
  onAddMemberToGroup: (groupId: string, member: Omit<FriendMember, 'id'>) => void;
  onGenerateInviteCode?: (groupId: string, guestName?: string, guestEmail?: string, expirationType?: '7days' | 'permanent') => string;
  onJoinGroupByCode?: (code: string, memberName: string, memberEmail?: string) => boolean | Promise<boolean>;
  onOpenJoinCode?: () => void;
  onUpdateMemberBusySchedule?: (groupId: string, memberId: string, busySlot: MemberBusySlot) => void;
  onOpenEvent: (event: CalendarEvent) => void;
  onGoToMatcherForGroup?: (groupId: string) => void;
  isLargeTextMode: boolean;
}

interface PendingInvite {
  name: string;
  email: string;
  inviteType: 'email' | 'code';
  code?: string;
  expirationType?: '7days' | 'permanent';
}

export const FriendGroupsView: React.FC<FriendGroupsViewProps> = ({
  friendGroups,
  events,
  onOpenNewEventForGroup,
  onCreateGroup,
  onAddMemberToGroup,
  onGenerateInviteCode,
  onJoinGroupByCode,
  onOpenJoinCode,
  onOpenEvent,
  onGoToMatcherForGroup,
  isLargeTextMode,
}) => {
  // New Group Modal/State
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState(0);
  
  // Pending friends to invite during group creation
  const [initialInvites, setInitialInvites] = useState<PendingInvite[]>([]);
  const [currentInviteName, setCurrentInviteName] = useState('');
  const [currentInviteEmail, setCurrentInviteEmail] = useState('');
  const [currentInviteMethod, setCurrentInviteMethod] = useState<'email' | 'code'>('email');

  // Join by code modal/state
  const [isJoinCodeModalOpen, setIsJoinCodeModalOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinNameInput, setJoinNameInput] = useState('');
  const [joinEmailInput, setJoinEmailInput] = useState('');
  const [joinStatusMsg, setJoinStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Group Invite Modal / Action State (for existing groups)
  const [activeInviteGroupId, setActiveInviteGroupId] = useState<string | null>(null);
  const [inviteModalTab, setInviteModalTab] = useState<'email' | 'code'>('email');
  const [memberInviteName, setMemberInviteName] = useState('');
  const [memberInviteEmail, setMemberInviteEmail] = useState('');
  const [existingCodeLifetime, setExistingCodeLifetime] = useState<'7days' | 'permanent'>('7days');
  const [generatedOneTimeCode, setGeneratedOneTimeCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedFullMessage, setCopiedFullMessage] = useState(false);

  // Expandable member schedules
  const [expandedSchedules, setExpandedSchedules] = useState<Record<string, boolean>>({});

  const toggleScheduleExpand = (groupId: string) => {
    setExpandedSchedules((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const generateRandomCode = generateInviteCode;

  const handleAddPendingInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInviteName.trim()) return;

    const code = currentInviteMethod === 'code' ? generateRandomCode() : undefined;

    setInitialInvites((prev) => [
      ...prev,
      {
        name: currentInviteName.trim(),
        email: currentInviteEmail.trim(),
        inviteType: currentInviteMethod,
        code,
      },
    ]);

    setCurrentInviteName('');
    setCurrentInviteEmail('');
  };

  const handleRemovePendingInvite = (index: number) => {
    setInitialInvites((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const palette = NATURAL_PALETTES[selectedPaletteIndex] || NATURAL_PALETTES[0];
    const emojis = ['🌟', '☕', '🎨', '🚀', '📸', '🎵', '🌿', '🧭', '🥾', '🎲'];

    const inviteCodes: GroupInviteCode[] = [];
    const members: FriendMember[] = [
      { id: 'm-1', name: 'Alex (You)', avatarColor: palette.color, avatarEmoji: '🌿', role: 'admin', status: 'active' },
    ];

    initialInvites.forEach((inv, idx) => {
      const randomEmoji = emojis[(idx + 1) % emojis.length];
      const memberId = `m-inv-${Date.now()}-${idx}`;
      
      if (inv.inviteType === 'code' && inv.code) {
        inviteCodes.push({
          code: inv.code,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          expirationType: '7days',
          isUsed: false,
          invitedName: inv.name,
          invitedEmail: inv.email || undefined,
        });
      }

      members.push({
        id: memberId,
        name: inv.name,
        email: inv.email || undefined,
        avatarColor: palette.color,
        avatarEmoji: randomEmoji,
        role: 'member',
        status: 'invited',
        inviteCode: inv.code,
        invitedAt: new Date().toISOString(),
        busySchedule: [],
      });
    });

    onCreateGroup({
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || 'Social gatherings & hangout sync',
      color: palette.color,
      textColor: palette.textColor,
      bgLightColor: palette.bgLightColor,
      borderColor: palette.borderColor,
      icon: 'Users',
      members,
      inviteCodes,
    });

    setNewGroupName('');
    setNewGroupDesc('');
    setInitialInvites([]);
    setCurrentInviteName('');
    setCurrentInviteEmail('');
    setIsCreatingGroup(false);
  };

  // Existing group: Send email invite or generate single-use code
  const handleExistingGroupInviteSubmit = (groupId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!memberInviteName.trim()) return;

    const group = friendGroups.find((g) => g.id === groupId);
    const emojis = ['🌟', '☕', '🎨', '🚀', '📸', '🎵', '🌿', '🧭'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    if (inviteModalTab === 'email') {
      onAddMemberToGroup(groupId, {
        name: memberInviteName.trim(),
        email: memberInviteEmail.trim() || undefined,
        avatarColor: group?.color || '#8A9A5B',
        avatarEmoji: randomEmoji,
        role: 'member',
        status: 'invited',
        invitedAt: new Date().toISOString(),
        busySchedule: [],
      });
      setMemberInviteName('');
      setMemberInviteEmail('');
      setActiveInviteGroupId(null);
    } else {
      // Generate one-time use code
      let code = '';
      if (onGenerateInviteCode) {
        code = onGenerateInviteCode(groupId, memberInviteName.trim(), memberInviteEmail.trim() || undefined, existingCodeLifetime);
      } else {
        code = generateRandomCode();
      }

      onAddMemberToGroup(groupId, {
        name: memberInviteName.trim(),
        email: memberInviteEmail.trim() || undefined,
        avatarColor: group?.color || '#8A9A5B',
        avatarEmoji: randomEmoji,
        role: 'member',
        status: 'invited',
        inviteCode: code,
        invitedAt: new Date().toISOString(),
        busySchedule: [],
      });

      setGeneratedOneTimeCode(code);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyFullMessage = (groupName: string, code: string, lifetime: '7days' | 'permanent') => {
    const duration = lifetime === 'permanent' ? 'Permanent code' : 'Valid for 7 days';
    const msg = `Hey! Join our circle "${groupName}" on NaddD with invite code: ${code} (${duration}). Open NaddD and click "Enter Code" to join!`;
    navigator.clipboard?.writeText(msg);
    setCopiedFullMessage(true);
    setTimeout(() => setCopiedFullMessage(false), 2500);
  };

  const handleJoinByCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim() || !joinNameInput.trim()) return;

    if (onJoinGroupByCode) {
      const success = await onJoinGroupByCode(joinCodeInput.trim(), joinNameInput.trim(), joinEmailInput.trim() || undefined);
      if (success) {
        setJoinStatusMsg({ type: 'success', text: 'Success! You joined the circle.' });
        setTimeout(() => {
          setIsJoinCodeModalOpen(false);
          setJoinCodeInput('');
          setJoinNameInput('');
          setJoinEmailInput('');
          setJoinStatusMsg(null);
        }, 1200);
      } else {
        setJoinStatusMsg({ type: 'error', text: 'Invalid or already used invite code.' });
      }
    }
  };

  return (
    <div id="friend-groups-container" className="space-y-6">
      
      {/* Top Header card */}
      <div className="bg-white border border-[#E8E4D9] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-[#3D3A35]">Friend Groups</h2>
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-[#F3F6EC] text-[#485526] rounded-full border border-[#C9D6A8]">
              {friendGroups.length}
            </span>
          </div>
          <p className="text-xs text-[#8E8A81] mt-0.5">
            Groups and their shared calendars.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Join with Invite Code Button */}
          <button
            id="btn-join-group-code"
            onClick={() => {
              if (onOpenJoinCode) {
                onOpenJoinCode();
              } else {
                setIsJoinCodeModalOpen(true);
                setJoinStatusMsg(null);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#F7F3EB] hover:bg-[#EFE9DD] border border-[#E8E4D9] text-[#5C574F] hover:text-[#3D3A35] text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            title="Have an invite code from a friend?"
          >
            <Ticket className="w-4 h-4 text-[#8A9A5B]" />
            <span>Join with Code</span>
          </button>

          {/* New Friend Group Button */}
          <button
            id="btn-create-friend-group"
            onClick={() => {
              setIsCreatingGroup(true);
              setInitialInvites([]);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Group</span>
          </button>
        </div>
      </div>

      {/* Modal / Dialog: Join Group with One-Time Code */}
      {isJoinCodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#FDFCF8] border border-[#E8E4D9] rounded-3xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 sm:p-5 bg-[#F7F3EB] border-b border-[#E8E4D9] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-[#8A9A5B]" />
                <h3 className="text-base sm:text-lg font-bold font-serif text-[#3D3A35]">
                  Join Circle with Code
                </h3>
              </div>
              <button
                onClick={() => setIsJoinCodeModalOpen(false)}
                className="p-1 rounded-xl text-[#8E8A81] hover:text-[#3D3A35] hover:bg-stone-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleJoinByCodeSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#5C574F] mb-1">
                  One-Time Invite Code *
                </label>
                <input
                  type="text"
                  required
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. NADD-K7M2QX"
                  className="w-full px-3.5 py-2 bg-white border border-[#E8E4D9] rounded-xl text-sm font-mono uppercase tracking-wider text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C574F] mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={joinNameInput}
                  onChange={(e) => setJoinNameInput(e.target.value)}
                  placeholder="e.g. Jordan Lee"
                  className="w-full px-3.5 py-2 bg-white border border-[#E8E4D9] rounded-xl text-sm text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C574F] mb-1">
                  Your Email (Optional)
                </label>
                <input
                  type="email"
                  value={joinEmailInput}
                  onChange={(e) => setJoinEmailInput(e.target.value)}
                  placeholder="e.g. jordan@example.com"
                  className="w-full px-3.5 py-2 bg-white border border-[#E8E4D9] rounded-xl text-sm text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
                />
              </div>

              {joinStatusMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    joinStatusMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {joinStatusMsg.text}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJoinCodeModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#8E8A81] hover:text-[#3D3A35] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Join Circle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Creation Form Modal/Card with Name/Email or Code Invitations */}
      {isCreatingGroup && (
        <div className="bg-[#F7F3EB] border-2 border-[#8A9A5B] rounded-3xl p-5 sm:p-6 shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold font-serif text-[#3D3A35] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#8A9A5B]" />
              <span>Create Friend Group & Invite Friends</span>
            </h3>
            <button
              onClick={() => setIsCreatingGroup(false)}
              className="text-xs font-semibold text-[#8E8A81] hover:text-[#3D3A35] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5C574F] mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Saturday Pottery Club, Tennis Crew"
                  className="w-full px-3.5 py-2 bg-white border border-[#E8E4D9] rounded-xl text-sm text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5C574F] mb-1">
                  Description / Purpose
                </label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="e.g., Weekend coffee hangs & date matching"
                  className="w-full px-3.5 py-2 bg-white border border-[#E8E4D9] rounded-xl text-sm text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
                />
              </div>
            </div>

            {/* Natural Palette Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#5C574F] mb-1.5">
                Calendar Color Theme
              </label>
              <div className="flex flex-wrap gap-2">
                {NATURAL_PALETTES.map((pal, idx) => (
                  <button
                    key={pal.name}
                    type="button"
                    onClick={() => setSelectedPaletteIndex(idx)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      selectedPaletteIndex === idx
                        ? 'ring-2 ring-[#3D3A35] shadow-xs font-bold'
                        : 'hover:opacity-90'
                    }`}
                    style={{
                      backgroundColor: pal.bgLightColor,
                      color: pal.textColor,
                      borderColor: pal.borderColor,
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: pal.color }}
                    />
                    <span>{pal.name}</span>
                    {selectedPaletteIndex === idx && <Check className="w-3 h-3 ml-0.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Invite Friends Section: by Name/Email OR One-Time Code */}
            <div className="p-4 bg-white rounded-2xl border border-[#E8E4D9] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#3D3A35] uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-[#8A9A5B]" />
                    <span>Invite Friends to this Group</span>
                  </h4>
                  <p className="text-[11px] text-[#8E8A81] mt-0.5">
                    Invite by Name & Email or generate a one-time use join code.
                  </p>
                </div>

                {/* Invite Method Switcher */}
                <div className="flex items-center p-0.5 bg-[#F7F3EB] rounded-xl border border-[#E8E4D9] text-xs">
                  <button
                    type="button"
                    onClick={() => setCurrentInviteMethod('email')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      currentInviteMethod === 'email'
                        ? 'bg-white text-[#3D3A35] shadow-2xs font-semibold'
                        : 'text-[#8E8A81] hover:text-[#3D3A35]'
                    }`}
                  >
                    Name & Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentInviteMethod('code')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      currentInviteMethod === 'code'
                        ? 'bg-white text-[#3D3A35] shadow-2xs font-semibold'
                        : 'text-[#8E8A81] hover:text-[#3D3A35]'
                    }`}
                  >
                    One-Time Code
                  </button>
                </div>
              </div>

              {/* Add friend sub-form */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    value={currentInviteName}
                    onChange={(e) => setCurrentInviteName(e.target.value)}
                    placeholder="Friend's Name (e.g., Liam, Maya)"
                    className="w-full px-3 py-1.5 bg-[#FDFCF8] border border-[#E8E4D9] rounded-xl text-xs text-[#3D3A35]"
                  />
                </div>

                <div className="sm:col-span-5">
                  <input
                    type="email"
                    value={currentInviteEmail}
                    onChange={(e) => setCurrentInviteEmail(e.target.value)}
                    placeholder={currentInviteMethod === 'email' ? "Email address *" : "Email address (optional)"}
                    className="w-full px-3 py-1.5 bg-[#FDFCF8] border border-[#E8E4D9] rounded-xl text-xs text-[#3D3A35]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddPendingInvite}
                    disabled={!currentInviteName.trim()}
                    className="w-full h-full min-h-[32px] px-2.5 py-1.5 bg-[#8A9A5B] hover:bg-[#7D8D50] disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* List of Pending Invites */}
              {initialInvites.length > 0 && (
                <div className="pt-2 border-t border-[#F0ECE4] space-y-1.5">
                  <p className="text-[11px] font-semibold text-[#5C574F]">
                    Invites ready to send ({initialInvites.length}):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {initialInvites.map((inv, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-[#FDFCF8] rounded-xl border border-[#E8E4D9] flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-[#3D3A35] truncate">{inv.name}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#8E8A81]">
                            {inv.inviteType === 'code' ? (
                              <span className="font-mono text-[#8A9A5B] bg-[#F3F6EC] px-1 py-0.5 rounded">
                                Code: {inv.code}
                              </span>
                            ) : (
                              <span className="truncate">{inv.email || 'Email invite'}</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePendingInvite(idx)}
                          className="p-1 text-[#AFA99E] hover:text-rose-500 rounded-lg cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingGroup(false)}
                className="px-3.5 py-2 rounded-xl border border-[#E8E4D9] text-xs font-semibold text-[#5C574F] hover:bg-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs font-semibold shadow-sm cursor-pointer"
              >
                Create Group & Send Invites
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of Friend Groups or Empty Zero State */}
      {friendGroups.length === 0 ? (
        <div id="empty-friend-groups-new-user" className="bg-white rounded-3xl border border-[#E8E4D9] p-8 sm:p-10 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-[#F3F6EC] border border-[#C9D6A8] text-[#8A9A5B] flex items-center justify-center mx-auto shadow-2xs">
            <Users className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#F3F6EC] text-[#485526] border border-[#C9D6A8]">
              New User Workspace
            </span>
            <h3 className="text-xl sm:text-2xl font-bold font-serif text-[#3D3A35] pt-1">
              No Friend Groups Yet
            </h3>
            <p className="text-xs sm:text-sm text-[#736E65] leading-relaxed">
              Friend groups let you coordinate hangouts, share calendars, and automatically discover dates when everyone is free.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              id="btn-empty-create-group"
              onClick={() => {
                setIsCreatingGroup(true);
                setInitialInvites([]);
              }}
              className="px-5 py-2.5 rounded-2xl bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Circle</span>
            </button>

            <button
              id="btn-empty-join-code"
              onClick={() => {
                if (onOpenJoinCode) {
                  onOpenJoinCode();
                } else {
                  setIsJoinCodeModalOpen(true);
                  setJoinStatusMsg(null);
                }
              }}
              className="px-4 py-2.5 rounded-2xl bg-[#F7F3EB] hover:bg-[#EFE9DD] border border-[#E8E4D9] text-[#5C574F] hover:text-[#3D3A35] text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
            >
              <Ticket className="w-4 h-4 text-[#8A9A5B]" />
              <span>Join with Invite Code</span>
            </button>
          </div>

          {/* 3 Step onboarding preview */}
          <div className="pt-6 border-t border-[#F0ECE4] grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
            <div className="p-4 bg-[#FDFCF8] rounded-2xl border border-[#E8E4D9]">
              <div className="w-7 h-7 rounded-xl bg-[#8A9A5B] text-white font-bold text-xs flex items-center justify-center mb-2">
                1
              </div>
              <h4 className="text-xs font-bold text-[#3D3A35]">Create or Join</h4>
              <p className="text-[11px] text-[#8E8A81] mt-0.5">
                Set up a circle for brunch, book club, or sports and invite friends.
              </p>
            </div>

            <div className="p-4 bg-[#FDFCF8] rounded-2xl border border-[#E8E4D9]">
              <div className="w-7 h-7 rounded-xl bg-[#7096D4] text-white font-bold text-xs flex items-center justify-center mb-2">
                2
              </div>
              <h4 className="text-xs font-bold text-[#3D3A35]">Set Availability</h4>
              <p className="text-[11px] text-[#8E8A81] mt-0.5">
                Members add regular busy slots or connect their calendar.
              </p>
            </div>

            <div className="p-4 bg-[#FDFCF8] rounded-2xl border border-[#E8E4D9]">
              <div className="w-7 h-7 rounded-xl bg-[#D48C70] text-white font-bold text-xs flex items-center justify-center mb-2">
                3
              </div>
              <h4 className="text-xs font-bold text-[#3D3A35]">Match Free Dates</h4>
              <p className="text-[11px] text-[#8E8A81] mt-0.5">
                The Matcher algorithm spots open dates when 100% of friends are free.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {friendGroups.map((group) => {
          const groupEvents = events.filter((e) => e.groupId === group.id && !e.isPersonal);
          const upcomingGroupEvents = groupEvents.filter((e) => e.status !== 'cancelled');
          const isScheduleExpanded = !!expandedSchedules[group.id];
          const isInvitingToThisGroup = activeInviteGroupId === group.id;

          return (
            <div
              key={group.id}
              id={`friend-group-card-${group.id}`}
              className="bg-white rounded-3xl border border-[#E8E4D9] shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
            >
              {/* Group Colored Header */}
              <div
                className="p-5 border-b border-[#E8E4D9] relative"
                style={{ backgroundColor: group.bgLightColor }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs"
                      style={{ backgroundColor: group.color }}
                    >
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: '#ffffff', color: group.textColor, border: `1px solid ${group.borderColor}` }}
                        >
                          Calendar Color
                        </span>
                        <span className="text-xs text-[#8E8A81]">
                          {group.members.length} members
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold font-serif text-[#3D3A35] mt-0.5">
                        {group.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onGoToMatcherForGroup && (
                      <button
                        onClick={() => onGoToMatcherForGroup(group.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#8A9A5B] text-white hover:bg-[#78884d] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                        title="Find free dates"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Matcher</span>
                      </button>
                    )}
                  </div>
                </div>

                {group.description && (
                  <p className="text-xs text-[#5C574F] mt-2 leading-relaxed">
                    {group.description}
                  </p>
                )}
              </div>

              {/* Members & Invite Section */}
              <div className="p-4 sm:p-5 flex-1 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-[#8E8A81] uppercase tracking-wider">
                      Members ({group.members.length})
                    </h4>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleScheduleExpand(group.id)}
                        className="text-xs font-medium text-[#5C574F] hover:text-[#3D3A35] flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isScheduleExpanded ? 'Hide' : 'Schedules'}</span>
                        {isScheduleExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {/* Invite Friend Trigger */}
                      <button
                        onClick={() => {
                          if (isInvitingToThisGroup) {
                            setActiveInviteGroupId(null);
                            setGeneratedOneTimeCode(null);
                          } else {
                            setActiveInviteGroupId(group.id);
                            setGeneratedOneTimeCode(null);
                            setMemberInviteName('');
                            setMemberInviteEmail('');
                          }
                        }}
                        className="text-xs font-semibold text-[#8A9A5B] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{isInvitingToThisGroup ? 'Close' : 'Invite Friend'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Invite modal / Inline form for this specific group */}
                  {isInvitingToThisGroup && (
                    <div className="p-3.5 bg-[#F7F3EB] rounded-2xl border border-[#E8E4D9] mb-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-[#3D3A35]">
                          Invite Friend to {group.name}
                        </h5>
                        <div className="flex items-center p-0.5 bg-white rounded-lg border border-[#E8E4D9] text-[11px]">
                          <button
                            type="button"
                            onClick={() => {
                              setInviteModalTab('email');
                              setGeneratedOneTimeCode(null);
                            }}
                            className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                              inviteModalTab === 'email' ? 'bg-[#8A9A5B] text-white font-semibold' : 'text-[#5C574F]'
                            }`}
                          >
                            Name & Email
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setInviteModalTab('code');
                              setGeneratedOneTimeCode(null);
                            }}
                            className={`px-2 py-0.5 rounded-md font-medium cursor-pointer ${
                              inviteModalTab === 'code' ? 'bg-[#8A9A5B] text-white font-semibold' : 'text-[#5C574F]'
                            }`}
                          >
                            One-Time Code
                          </button>
                        </div>
                      </div>

                      {generatedOneTimeCode ? (
                        <div className="p-3.5 bg-white rounded-xl border border-[#C9D6A8] space-y-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-[#485526] font-semibold flex items-center gap-1">
                              <Check className="w-4 h-4 text-[#8A9A5B]" />
                              <span>Invite Code Generated!</span>
                            </p>
                            <span className="text-[10px] text-[#2D5A27] font-semibold bg-[#F3F6EC] px-2 py-0.5 rounded-full">
                              {existingCodeLifetime === 'permanent' ? 'Permanent' : 'Valid for 7 days'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-2.5 bg-[#F3F6EC] rounded-xl border border-[#C9D6A8]">
                            <span className="font-mono text-base font-bold text-[#2D5A27] tracking-wider">
                              {generatedOneTimeCode}
                            </span>
                            <button
                              onClick={() => handleCopyCode(generatedOneTimeCode)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs font-semibold rounded-md cursor-pointer transition-all"
                            >
                              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyFullMessage(group.name, generatedOneTimeCode, existingCodeLifetime)}
                            className="w-full py-1.5 px-3 bg-[#F7F3EB] hover:bg-[#EFE9DD] border border-[#E8E4D9] text-[#3D3A35] text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                          >
                            {copiedFullMessage ? <Check className="w-3.5 h-3.5 text-[#8A9A5B]" /> : <Copy className="w-3.5 h-3.5 text-[#5C574F]" />}
                            <span>{copiedFullMessage ? 'Copied Invite Message!' : 'Copy Shareable Message for Friends'}</span>
                          </button>

                          <p className="text-[11px] text-[#8E8A81]">
                            Your friend can click "Enter Code" in the top bar to join this circle immediately.
                          </p>
                        </div>
                      ) : (
                        <form onSubmit={(e) => handleExistingGroupInviteSubmit(group.id, e)} className="space-y-2.5">
                          {inviteModalTab === 'code' && (
                            <div className="flex items-center justify-between py-1 bg-white p-2 rounded-xl border border-[#E8E4D9] text-xs">
                              <span className="font-semibold text-[#5C574F]">Code Lifetime:</span>
                              <div className="flex items-center p-0.5 bg-[#F7F3EB] rounded-lg border border-[#E8E4D9] text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => setExistingCodeLifetime('7days')}
                                  className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                                    existingCodeLifetime === '7days' ? 'bg-[#8A9A5B] text-white' : 'text-[#5C574F]'
                                  }`}
                                >
                                  7 Days (Default)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExistingCodeLifetime('permanent')}
                                  className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                                    existingCodeLifetime === 'permanent' ? 'bg-[#8A9A5B] text-white' : 'text-[#5C574F]'
                                  }`}
                                >
                                  No Expiration
                                </button>
                              </div>
                            </div>
                          )}

                          <input
                            type="text"
                            required
                            value={memberInviteName}
                            onChange={(e) => setMemberInviteName(e.target.value)}
                            placeholder="Friend's Name *"
                            className="w-full px-3 py-1.5 bg-white border border-[#E8E4D9] rounded-lg text-xs"
                          />
                          <input
                            type="email"
                            required={inviteModalTab === 'email'}
                            value={memberInviteEmail}
                            onChange={(e) => setMemberInviteEmail(e.target.value)}
                            placeholder={inviteModalTab === 'email' ? "Friend's Email Address *" : "Friend's Email Address (optional)"}
                            className="w-full px-3 py-1.5 bg-white border border-[#E8E4D9] rounded-lg text-xs"
                          />

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setActiveInviteGroupId(null)}
                              className="px-3 py-1 text-xs text-[#8E8A81] cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-3 py-1 bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              {inviteModalTab === 'email' ? (
                                <>
                                  <Send className="w-3 h-3" />
                                  <span>Send Email Invite</span>
                                </>
                              ) : (
                                <>
                                  <Key className="w-3 h-3" />
                                  <span>Generate Code</span>
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* Member Badges with Availability preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.members.map((member) => {
                      const busyCount = member.busySchedule?.length || 0;
                      const isInvited = member.status === 'invited';

                      return (
                        <div
                          key={member.id}
                          className="p-2.5 bg-[#FDFCF8] rounded-xl border border-[#F0ECE4] space-y-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs relative"
                              style={{ backgroundColor: member.avatarColor }}
                            >
                              {member.avatarEmoji || member.name[0]}
                              {isInvited && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-semibold text-[#3D3A35] truncate">{member.name}</p>
                                {isInvited && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                                    Invited
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-[#AFA99E] truncate">
                                {member.role === 'admin' 
                                  ? 'Host & Organizer' 
                                  : member.inviteCode 
                                    ? `Code: ${member.inviteCode}` 
                                    : (member.email || 'Member')}
                              </p>
                            </div>
                          </div>

                          {/* Member Busy details if expanded */}
                          {isScheduleExpanded && (
                            <div className="pt-1 border-t border-[#E8E4D9]/60 text-[10px] text-[#8E8A81]">
                              {busyCount === 0 ? (
                                <span className="text-[#8A9A5B] font-medium">✨ Open weekly availability</span>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="font-semibold text-[#5C574F]">Busy blocks:</span>
                                  {member.busySchedule?.map((slot, sIdx) => (
                                    <p key={sIdx} className="truncate text-[#8E8A81]">
                                      • {slot.title} ({slot.dayOfWeek !== undefined ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][slot.dayOfWeek] : slot.specificDate})
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Upcoming Gatherings for this specific group */}
                <div className="pt-3 border-t border-[#F0ECE4]">
                  <h4 className="text-xs font-bold text-[#8E8A81] uppercase tracking-wider mb-2">
                    Scheduled Gatherings ({upcomingGroupEvents.length})
                  </h4>

                  {upcomingGroupEvents.length === 0 ? (
                    <div className="p-3 bg-[#FDFCF8] rounded-xl text-center text-xs text-[#AFA99E]">
                      No upcoming gatherings. Schedule one or find matching free dates!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {upcomingGroupEvents.slice(0, 2).map((evt) => (
                        <div
                          key={evt.id}
                          onClick={() => onOpenEvent(evt)}
                          className="p-3 rounded-xl border border-[#E8E4D9] bg-white hover:bg-[#FDFCF8] cursor-pointer transition-colors flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-[#3D3A35] truncate">{evt.title}</h5>
                            <div className="flex items-center gap-2 text-[10px] text-[#8E8A81] mt-0.5">
                              <span className="font-semibold">{formatDate(evt.date)}</span>
                              <span>•</span>
                              <span>{formatTime(evt.startTime)}</span>
                              {evt.status === 'proposed' && (
                                <span className="text-amber-600 font-bold bg-amber-50 px-1 rounded">Polling</span>
                              )}
                            </div>
                          </div>

                          <span className="text-xs font-bold text-[#8A9A5B] shrink-0">
                            View →
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-[#F7F3EB] border-t border-[#E8E4D9] flex items-center justify-between text-xs text-[#8E8A81]">
                <button
                  onClick={() => onGoToMatcherForGroup && onGoToMatcherForGroup(group.id)}
                  className="font-semibold text-[#485526] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#8A9A5B]" />
                  <span>Free Dates</span>
                </button>

                <button
                  onClick={() => onOpenNewEventForGroup(group.id)}
                  className="font-semibold text-[#8A9A5B] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Plan Event</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

    </div>
  );
};
