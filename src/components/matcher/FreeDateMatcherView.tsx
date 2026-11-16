import React, { useState } from 'react';
import { FriendGroup, CalendarEvent, Task, FreeDateMatch, MatchedTimeSlot } from '../../types';
import { findMatchingFreeDates } from '../../utils/scheduleMatcher';
import { formatDate, getTodayDateString } from '../../utils/calendarUtils';
import { 
  Sparkles, 
  Calendar as CalendarIcon, 
  Users, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  RefreshCw, 
  CalendarHeart,
} from 'lucide-react';

interface FreeDateMatcherViewProps {
  friendGroups: FriendGroup[];
  events: CalendarEvent[];
  tasks: Task[];
  onPlanMeetupForMatch: (match: FreeDateMatch, slot?: MatchedTimeSlot) => void;
  onOpenNewEventWithPoll: () => void;
  isLargeTextMode: boolean;
  onRefreshMatches?: () => void;
  onNavigateToGroups?: () => void;
}

export const FreeDateMatcherView: React.FC<FreeDateMatcherViewProps> = ({
  friendGroups,
  events,
  tasks,
  onPlanMeetupForMatch,
  onOpenNewEventWithPoll,
  isLargeTextMode,
  onRefreshMatches,
  onNavigateToGroups,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | 'all'>('all');
  const [onlyFullMatches, setOnlyFullMatches] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Compute matches
  const allMatches = findMatchingFreeDates(
    friendGroups,
    events,
    tasks,
    28,
    selectedGroupId === 'all' ? undefined : selectedGroupId
  );

  const filteredMatches = onlyFullMatches
    ? allMatches.filter((m) => m.isFullMatch)
    : allMatches;

  const fullMatchCount = allMatches.filter((m) => m.isFullMatch).length;

  const handleScanSchedule = () => {
    setIsScanning(true);
    setScanMessage('Cross-referencing personal calendar with friends schedules...');
    setTimeout(() => {
      setIsScanning(false);
      setScanMessage(`Scan complete! Discovered ${fullMatchCount} perfect 100% free dates.`);
      if (onRefreshMatches) onRefreshMatches();
    }, 600);
  };

  return (
    <div id="free-date-matcher-container" className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-[#E8E4D9] rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[#8A9A5B]/15 text-[#8A9A5B]">
              <CalendarHeart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-serif text-[#3D3A35]">
                  Date Matcher
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#F3F6EC] text-[#485526] border border-[#C9D6A8]">
                  {fullMatchCount} free
                </span>
              </div>
              <p className="text-xs text-[#8E8A81] mt-0.5">
                Dates when you and your friend groups are free.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-scan-free-dates"
              onClick={handleScanSchedule}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F7F3EB] hover:bg-[#EFE9DC] text-[#3D3A35] text-xs font-semibold border border-[#E8E4D9] transition-all cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#8A9A5B] ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Scan'}</span>
            </button>

            <button
              id="btn-new-poll-from-matcher"
              onClick={onOpenNewEventWithPoll}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8A9A5B] hover:bg-[#78884d] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Poll</span>
            </button>
          </div>
        </div>

        {scanMessage && (
          <div className="mt-3.5 p-2.5 rounded-xl bg-[#F3F6EC] border border-[#C9D6A8] text-xs text-[#485526] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8A9A5B]" />
              <span className="font-semibold">{scanMessage}</span>
            </div>
            <button
              onClick={() => setScanMessage(null)}
              className="text-[#8A9A5B] hover:text-[#485526] font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="mt-4 pt-4 border-t border-[#E8E4D9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Group Filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedGroupId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedGroupId === 'all'
                  ? 'bg-[#3D3A35] text-white shadow-xs'
                  : 'bg-[#F7F3EB] text-[#5C574F] hover:bg-[#ECE7DA]'
              }`}
            >
              All ({allMatches.length})
            </button>

            {friendGroups.map((grp) => {
              const count = allMatches.filter((m) => m.groupId === grp.id).length;
              return (
                <button
                  key={grp.id}
                  onClick={() => setSelectedGroupId(grp.id)}
                  style={{
                    backgroundColor: selectedGroupId === grp.id ? grp.color : grp.bgLightColor,
                    color: selectedGroupId === grp.id ? '#FFFFFF' : grp.textColor,
                    borderColor: grp.borderColor,
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                    selectedGroupId === grp.id ? 'shadow-xs font-bold' : 'hover:opacity-90'
                  }`}
                >
                  {grp.name} ({count})
                </button>
              );
            })}
          </div>

          {/* 100% toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[#5C574F] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyFullMatches}
                onChange={(e) => setOnlyFullMatches(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#8A9A5B] focus:ring-[#8A9A5B]/30 border-[#E8E4D9]"
              />
              <span>100% Free ({fullMatchCount})</span>
            </label>
          </div>

        </div>
      </div>

      {/* Matching Results Grid */}
      {friendGroups.length === 0 ? (
        <div id="matcher-empty-no-groups" className="bg-white border border-[#E8E4D9] rounded-3xl p-8 sm:p-10 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-3xl bg-[#F3F6EC] border border-[#C9D6A8] text-[#8A9A5B] flex items-center justify-center mx-auto shadow-2xs">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold font-serif text-[#3D3A35]">
              No Friend Groups Connected
            </h3>
            <p className="text-xs sm:text-sm text-[#736E65] leading-relaxed">
              The Date Matcher finds mutual free time by cross-referencing your schedule with your friend circles. Create or join a friend group to start matching dates.
            </p>
          </div>

          {onNavigateToGroups && (
            <div className="pt-2">
              <button
                id="btn-matcher-go-groups"
                onClick={onNavigateToGroups}
                className="px-5 py-2.5 rounded-2xl bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs sm:text-sm font-semibold shadow-xs inline-flex items-center gap-2 cursor-pointer transition-all"
              >
                <Users className="w-4 h-4" />
                <span>Go to Friend Groups →</span>
              </button>
            </div>
          )}
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="bg-white border border-[#E8E4D9] rounded-3xl p-8 text-center space-y-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#F7F3EB] text-[#8E8A81] flex items-center justify-center mx-auto">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#3D3A35]">No Matching Free Dates</h3>
          <p className="text-xs text-[#8E8A81] max-w-sm mx-auto">
            Uncheck "100% Free" to view dates where most friends are available.
          </p>
          <button
            onClick={() => setOnlyFullMatches(false)}
            className="px-3.5 py-1.5 rounded-xl bg-[#8A9A5B] text-white text-xs font-semibold cursor-pointer"
          >
            Show All
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMatches.map((match) => {
            const grp = friendGroups.find((g) => g.id === match.groupId);
            
            return (
              <div
                key={match.id}
                id={`match-card-${match.id}`}
                className="bg-white border border-[#E8E4D9] rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 group relative overflow-hidden"
              >
                {/* Top Badge Strip for 100% match */}
                {match.isFullMatch && (
                  <div className="absolute top-0 right-0 left-0 h-1 bg-[#8A9A5B]" />
                )}

                {/* Card Top: Date & Match Pill */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      style={{
                        backgroundColor: match.groupBgLight,
                        color: match.groupTextColor,
                        borderColor: match.groupBorderColor,
                      }}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border truncate max-w-[170px]"
                    >
                      {match.groupName}
                    </span>

                    {match.isFullMatch ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F3F6EC] text-[#485526] border border-[#C9D6A8] shrink-0">
                        <Sparkles className="w-2.5 h-2.5 text-[#8A9A5B]" />
                        <span>100%</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F7F3EB] text-[#5C574F] border border-[#E8E4D9] shrink-0">
                        {match.freeCount}/{match.totalMembers} ({match.matchScore}%)
                      </span>
                    )}
                  </div>

                  {/* Main Date Display */}
                  <div>
                    <h3 className="text-base font-bold text-[#3D3A35] font-serif">
                      {match.dayOfWeekName}, {match.formattedDate}
                    </h3>
                  </div>
                </div>

                {/* Available Friends Avatars Row */}
                <div className="p-2.5 bg-[#FDFCF8] border border-[#E8E4D9] rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-[#5C574F] font-semibold">
                    <span>Free:</span>
                    <span className="text-[#8A9A5B] font-bold">
                      {match.availableMembers.length} friends
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {match.availableMembers.map((m) => (
                      <div
                        key={m.id}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-white border border-[#E8E4D9] text-[10px] text-[#3D3A35]"
                        title={`${m.name} is free`}
                      >
                        <span className="text-xs">{m.avatarEmoji || '🌿'}</span>
                        <span className="font-medium truncate max-w-[80px]">{m.name}</span>
                        <CheckCircle2 className="w-2.5 h-2.5 text-[#8A9A5B]" />
                      </div>
                    ))}
                  </div>

                  {/* Busy members list if any */}
                  {match.busyMembers.length > 0 && (
                    <div className="pt-1.5 border-t border-[#E8E4D9]/60">
                      <div className="space-y-1">
                        {match.busyMembers.map(({ member, reason }) => (
                          <div
                            key={member.id}
                            className="text-[10px] text-[#8E8A81] flex items-center gap-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D48C70]" />
                            <span className="font-medium text-[#5C574F]">{member.name}:</span>
                            <span className="truncate max-w-[130px] italic">{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Suggested Time Windows */}
                {match.suggestedSlots.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold text-[#8E8A81] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Slots:</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {match.suggestedSlots.slice(0, 2).map((slot, idx) => (
                        <button
                          key={idx}
                          onClick={() => onPlanMeetupForMatch(match, slot)}
                          className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-[#F7F3EB] hover:bg-[#8A9A5B]/15 text-left text-xs text-[#3D3A35] border border-[#E8E4D9] hover:border-[#8A9A5B] transition-colors cursor-pointer group/slot"
                        >
                          <span className="font-medium truncate text-xs">{slot.timeLabel}</span>
                          <span className="text-[10px] font-bold text-[#8A9A5B] shrink-0 ml-1">
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Primary Action Button: 1-Click Plan */}
                <button
                  id={`btn-plan-for-${match.id}`}
                  onClick={() => onPlanMeetupForMatch(match)}
                  className="w-full py-2 px-3 rounded-xl bg-[#8A9A5B] hover:bg-[#78884d] text-white text-xs font-semibold shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Plan Meetup</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
