import React, { useEffect, useState } from 'react';
import { FriendGroup, FriendMember, CalendarEvent, MemberBusySlot } from '../../types';
import type { InviteStatus } from '../../lib/firebase';
import { NATURAL_PALETTES } from '../../data/initialData';
import { formatTime, formatDate } from '../../utils/calendarUtils';
import { 
  Users, 
  Plus, 
  Calendar, 
  Sparkles, 
  Check, 
  Copy,
  UserPlus,
  ChevronDown,
  ChevronUp,
  X,
  Ticket,
  Trash2,
  LogOut,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface FriendGroupsViewProps {
  friendGroups: FriendGroup[];
  events: CalendarEvent[];
  onOpenNewEventForGroup: (groupId: string) => void;
  onCreateGroup: (newGroup: Omit<FriendGroup, 'id' | 'createdAt'>) => void;
  currentUserId?: string;
  onGenerateInviteCode?: (groupId: string) => string;
  onEnsureInviteLive?: (groupId: string) => Promise<InviteStatus>;
  onDeleteGroup?: (groupId: string) => void;
  onLeaveGroup?: (groupId: string) => void;
  onRemoveMember?: (groupId: string, memberId: string) => void;
  onOpenJoinCode?: () => void;
  onUpdateMemberBusySchedule?: (groupId: string, memberId: string, busySlot: MemberBusySlot) => void;
  onOpenEvent: (event: CalendarEvent) => void;
  onGoToMatcherForGroup?: (groupId: string) => void;
  isLargeTextMode: boolean;
}

export const FriendGroupsView: React.FC<FriendGroupsViewProps> = ({
  friendGroups,
  events,
  onOpenNewEventForGroup,
  onCreateGroup,
  currentUserId,
  onGenerateInviteCode,
  onEnsureInviteLive,
  onDeleteGroup,
  onLeaveGroup,
  onRemoveMember,
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
  
  // Room invite panel (existing groups): one permanent code per room
  const [activeInviteGroupId, setActiveInviteGroupId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedFullMessage, setCopiedFullMessage] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<Record<string, InviteStatus | 'checking'>>({});

  const verifyInvite = async (groupId: string) => {
    if (!onEnsureInviteLive) return;
    setInviteStatus((prev) => ({ ...prev, [groupId]: 'checking' }));
    const status = await onEnsureInviteLive(groupId);
    setInviteStatus((prev) => ({ ...prev, [groupId]: status }));
  };

  // Whenever the invite panel is open, make sure the code really exists in the cloud
  const activeRoomCode = friendGroups.find((g) => g.id === activeInviteGroupId)?.roomCode;
  useEffect(() => {
    if (activeInviteGroupId && activeRoomCode) verifyInvite(activeInviteGroupId);
  }, [activeInviteGroupId, activeRoomCode]);

  // Expandable member schedules
  const [expandedSchedules, setExpandedSchedules] = useState<Record<string, boolean>>({});

  const toggleScheduleExpand = (groupId: string) => {
    setExpandedSchedules((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const palette = NATURAL_PALETTES[selectedPaletteIndex] || NATURAL_PALETTES[0];

    // The creator is added as the first member (and the room code is generated) by the app.
    onCreateGroup({
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || 'Social gatherings & hangout sync',
      color: palette.color,
      textColor: palette.textColor,
      bgLightColor: palette.bgLightColor,
      borderColor: palette.borderColor,
      icon: 'Users',
      members: [],
    });

    setNewGroupName('');
    setNewGroupDesc('');
    setIsCreatingGroup(false);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyFullMessage = (groupName: string, code: string) => {
    const link = `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(code)}`;
    const msg = `Hey! Join our room "${groupName}" on NaddD.\nTap this link: ${link}\nor open NaddD, click "Enter Code" and type: ${code}`;
    navigator.clipboard?.writeText(msg);
    setCopiedFullMessage(true);
    setTimeout(() => setCopiedFullMessage(false), 2500);
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
              onOpenJoinCode?.();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#F7F3EB] hover:bg-[#EFE9DD] border border-[#E8E4D9] text-[#5C574F] hover:text-[#3D3A35] text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            title="Have a room code from a friend?"
          >
            <Ticket className="w-4 h-4 text-[#8A9A5B]" />
            <span>Join with Room Code</span>
          </button>

          {/* New Friend Group Button */}
          <button
            id="btn-create-friend-group"
            onClick={() => setIsCreatingGroup(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Group</span>
          </button>
        </div>
      </div>

      {/* Group Creation Form Modal/Card with Name/Email or Code Invitations */}
      {isCreatingGroup && (
        <div className="bg-[#F7F3EB] border-2 border-[#8A9A5B] rounded-3xl p-5 sm:p-6 shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold font-serif text-[#3D3A35] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#8A9A5B]" />
              <span>Create Friend Group</span>
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

            {/* Room code info */}
            <div className="p-4 bg-white rounded-2xl border border-[#E8E4D9] flex items-start gap-2.5">
              <Ticket className="w-4 h-4 text-[#8A9A5B] mt-0.5 shrink-0" />
              <p className="text-xs text-[#5C574F] leading-relaxed">
                Your room gets its own <span className="font-semibold">room code</span> that never expires.
                Share it with all your friends — anyone who enters it joins the room.
              </p>
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
                Create Group
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
              onClick={() => setIsCreatingGroup(true)}
              className="px-5 py-2.5 rounded-2xl bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Circle</span>
            </button>

            <button
              id="btn-empty-join-code"
              onClick={() => {
                onOpenJoinCode?.();
              }}
              className="px-4 py-2.5 rounded-2xl bg-[#F7F3EB] hover:bg-[#EFE9DD] border border-[#E8E4D9] text-[#5C574F] hover:text-[#3D3A35] text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
            >
              <Ticket className="w-4 h-4 text-[#8A9A5B]" />
              <span>Join with Room Code</span>
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
          // Circles from before cloud sharing have no ownerId yet: treat them as mine
          const isOwner = !group.ownerId || group.ownerId === currentUserId;

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
                    {isOwner && onDeleteGroup && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete "${group.name}"?\n\nThe group, its room code and its gatherings will be removed for everyone. Members will lose access. This cannot be undone.`)) {
                            onDeleteGroup(group.id);
                          }
                        }}
                        className="p-1.5 rounded-xl bg-white/80 text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer"
                        title="Delete group (removes all members)"
                        aria-label={`Delete group ${group.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!isOwner && onLeaveGroup && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Leave "${group.name}"?`)) onLeaveGroup(group.id);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/80 text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-semibold transition-all cursor-pointer"
                        title="Leave group"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Leave</span>
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
                          } else {
                            // Rooms created before room codes existed get one the first time it is needed
                            if (!group.roomCode) onGenerateInviteCode?.(group.id);
                            setActiveInviteGroupId(group.id);
                          }
                        }}
                        className="text-xs font-semibold text-[#8A9A5B] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{isInvitingToThisGroup ? 'Close' : 'Invite Friends'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Room code panel: one permanent code for the whole room */}
                  {isInvitingToThisGroup && (
                    <div className="p-3.5 bg-[#F7F3EB] rounded-2xl border border-[#E8E4D9] mb-3 space-y-2.5">
                      <h5 className="text-xs font-bold text-[#3D3A35]">
                        Invite friends to {group.name}
                      </h5>

                      {group.roomCode ? (
                        <div className="p-3.5 bg-white rounded-xl border border-[#C9D6A8] space-y-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-[#485526] font-semibold flex items-center gap-1">
                              <Ticket className="w-4 h-4 text-[#8A9A5B]" />
                              <span>Room code</span>
                            </p>
                            <span className="text-[10px] text-[#2D5A27] font-semibold bg-[#F3F6EC] px-2 py-0.5 rounded-full">
                              Never expires
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-2.5 bg-[#F3F6EC] rounded-xl border border-[#C9D6A8]">
                            <span className="font-mono text-base font-bold text-[#2D5A27] tracking-wider">
                              {group.roomCode}
                            </span>
                            <button
                              onClick={() => handleCopyCode(group.roomCode!)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs font-semibold rounded-md cursor-pointer transition-all"
                            >
                              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyFullMessage(group.name, group.roomCode!)}
                            className="w-full py-1.5 px-3 bg-[#F7F3EB] hover:bg-[#EFE9DD] border border-[#E8E4D9] text-[#3D3A35] text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                          >
                            {copiedFullMessage ? <Check className="w-3.5 h-3.5 text-[#8A9A5B]" /> : <Copy className="w-3.5 h-3.5 text-[#5C574F]" />}
                            <span>{copiedFullMessage ? 'Copied Invite Message!' : 'Copy Shareable Message for Friends'}</span>
                          </button>

                          {(() => {
                            const st = inviteStatus[group.id];
                            if (!onEnsureInviteLive) return null;
                            if (!st || st === 'checking')
                              return (
                                <p className="text-[11px] text-[#8E8A81] flex items-center gap-1.5">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Publishing the code so friends can join…
                                </p>
                              );
                            if (st === 'ready')
                              return (
                                <p className="text-[11px] text-[#2D5A27] font-semibold flex items-center gap-1.5">
                                  <Check className="w-3.5 h-3.5" /> Live — friends on any device can join with this code.
                                </p>
                              );
                            const text =
                              st === 'guest'
                                ? 'Sign in with an account first. Guest rooms stay on this device only.'
                                : st === 'denied'
                                ? 'The database refused to publish this code. Deploy the latest firestore.rules (see README).'
                                : st === 'offline'
                                ? 'Could not reach the server. Check your connection.'
                                : 'This code is not published yet.';
                            return (
                              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 flex items-start gap-2">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span className="flex-1">{text}</span>
                                {st !== 'guest' && (
                                  <button
                                    type="button"
                                    onClick={() => verifyInvite(group.id)}
                                    className="flex items-center gap-1 font-semibold underline cursor-pointer"
                                  >
                                    <RefreshCw className="w-3 h-3" /> Retry
                                  </button>
                                )}
                              </div>
                            );
                          })()}

                          <p className="text-[11px] text-[#8E8A81]">
                            Everyone can use the same code or link. Friends sign in, tap the link (or click "Enter Code") and join this room.
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-[#8E8A81]">Creating the room code…</p>
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
                                {member.role === 'admin' ? 'Host & Organizer' : (member.email || 'Member')}
                              </p>
                            </div>
                            {isOwner && onRemoveMember && member.id !== currentUserId && member.role !== 'admin' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Remove ${member.name} from "${group.name}"?`)) {
                                    onRemoveMember(group.id, member.id);
                                  }
                                }}
                                className="p-1 text-[#AFA99E] hover:text-rose-500 rounded-lg cursor-pointer shrink-0"
                                title={`Remove ${member.name}`}
                                aria-label={`Remove ${member.name}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
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
