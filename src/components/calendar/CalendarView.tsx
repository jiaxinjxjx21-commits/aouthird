import React, { useState } from 'react';
import { 
  CalendarEvent, 
  FriendGroup, 
  CalendarViewType, 
  Task,
  FreeDateMatch 
} from '../../types';
import { 
  getMonthDays, 
  getWeekDays, 
  getPreviousWeekDate,
  getNextWeekDate,
  getWeekRangeString,
  formatDate, 
  formatTime, 
  getTodayDateString,
  downloadICS 
} from '../../utils/calendarUtils';
import { findMatchingFreeDates, getMatchesForSpecificDate } from '../../utils/scheduleMatcher';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  Plus, 
  Download,
  Filter,
  CheckCircle,
  CalendarCheck2,
  Sparkles,
  User,
} from 'lucide-react';

interface CalendarViewProps {
  events: CalendarEvent[];
  tasks: Task[];
  friendGroups: FriendGroup[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  onOpenEvent: (event: CalendarEvent) => void;
  onOpenNewEventWithDate: (date: string, isPersonal?: boolean, groupId?: string) => void;
  onGoToMatcher?: () => void;
  isLargeTextMode: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  tasks,
  friendGroups,
  selectedDate,
  onSelectDate,
  onOpenEvent,
  onOpenNewEventWithDate,
  onGoToMatcher,
  isLargeTextMode,
}) => {
  const [viewType, setViewType] = useState<CalendarViewType>('month');
  const [selectedGroupIdFilter, setSelectedGroupIdFilter] = useState<string | 'all' | 'personal'>('all');
  const [mobileWeekMode, setMobileWeekMode] = useState<'day_focus' | 'all_days'>('day_focus');

  const todayStr = getTodayDateString();

  // Compute all free date matches across groups for calendar day highlights
  const allFreeMatches = findMatchingFreeDates(friendGroups, events, tasks, 35);
  const dayMatchesMap = new Map<string, FreeDateMatch[]>();
  allFreeMatches.forEach((m) => {
    if (m.isFullMatch) {
      const list = dayMatchesMap.get(m.date) || [];
      list.push(m);
      dayMatchesMap.set(m.date, list);
    }
  });

  // Matches for currently selected date in Day view
  const selectedDateMatches = getMatchesForSpecificDate(selectedDate, friendGroups, events, tasks).filter(
    (m) => m.isFullMatch
  );

  // Derive current viewing year and month from selectedDate
  const dateParts = selectedDate.split('-');
  const currentYear = parseInt(dateParts[0] || '2026', 10);
  const currentMonth = parseInt(dateParts[1] || '8', 10) - 1; // 0-indexed

  // Date / Period navigation
  const handlePrev = () => {
    if (viewType === 'week') {
      onSelectDate(getPreviousWeekDate(selectedDate));
    } else if (viewType === 'day') {
      const parts = selectedDate.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() - 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      onSelectDate(`${y}-${m}-${day}`);
    } else {
      const prevDate = new Date(currentYear, currentMonth - 1, 1);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      onSelectDate(`${y}-${m}-01`);
    }
  };

  const handleNext = () => {
    if (viewType === 'week') {
      onSelectDate(getNextWeekDate(selectedDate));
    } else if (viewType === 'day') {
      const parts = selectedDate.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      d.setDate(d.getDate() + 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      onSelectDate(`${y}-${m}-${day}`);
    } else {
      const nextDate = new Date(currentYear, currentMonth + 1, 1);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      onSelectDate(`${y}-${m}-01`);
    }
  };

  const handleGoToday = () => {
    onSelectDate(todayStr);
  };

  // Filter events based on active friend group filter or personal
  const filteredEvents = events.filter((e) => {
    if (selectedGroupIdFilter === 'all') return true;
    if (selectedGroupIdFilter === 'personal') return e.isPersonal;
    return e.groupId === selectedGroupIdFilter && !e.isPersonal;
  });

  const monthName = new Date(currentYear, currentMonth, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  let displayTitle = monthName;
  if (viewType === 'week') {
    displayTitle = getWeekRangeString(selectedDate);
  } else if (viewType === 'day') {
    displayTitle = formatDate(selectedDate, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  const monthDays = getMonthDays(currentYear, currentMonth);
  const weekDays = getWeekDays(selectedDate);

  // Helper to get group styling
  const getGroupStyle = (evt: CalendarEvent) => {
    if (evt.isPersonal) {
      return {
        bg: '#F7F3EB',
        text: '#5C574F',
        border: '#E8E4D9',
        color: evt.color || '#8A9A5B',
        name: 'Personal Life',
        isPersonal: true,
      };
    }
    const grp = friendGroups.find((g) => g.id === evt.groupId);
    if (!grp) {
      return {
        bg: '#F7F3EB',
        text: '#5C574F',
        border: '#E8E4D9',
        color: '#8A9A5B',
        name: 'Gathering',
        isPersonal: false,
      };
    }
    return {
      bg: grp.bgLightColor,
      text: grp.textColor,
      border: grp.borderColor,
      color: grp.color,
      name: grp.name,
      isPersonal: false,
    };
  };

  return (
    <div id="calendar-view-container" className="space-y-4">
      
      {/* Top Controls Bar: View mode tabs, Month navigator, Group Filter */}
      <div className="bg-white border border-[#F0ECE4] rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left: Month / Date navigator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#F7F3EB] p-1 rounded-2xl border border-[#E8E4D9]">
            <button
              id="btn-calendar-prev"
              onClick={handlePrev}
              className="p-1.5 rounded-xl text-[#5C574F] hover:text-[#3D3A35] hover:bg-white transition-colors cursor-pointer"
              aria-label="Previous period"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              id="btn-calendar-today"
              onClick={handleGoToday}
              className="px-3 py-1 text-xs font-bold text-[#4A463F] hover:bg-white rounded-xl transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              id="btn-calendar-next"
              onClick={handleNext}
              className="p-1.5 rounded-xl text-[#5C574F] hover:text-[#3D3A35] hover:bg-white transition-colors cursor-pointer"
              aria-label="Next period"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-base sm:text-xl font-bold text-[#4A463F] font-serif-soft">
            {displayTitle}
          </h2>
        </div>

        {/* Center: View Switcher (Month, Week, Day, Agenda) */}
        <div id="calendar-view-type-selector" className="flex items-center bg-[#F7F3EB] p-1 rounded-2xl border border-[#E8E4D9] self-start sm:self-auto">
          {(['month', 'week', 'day', 'agenda'] as CalendarViewType[]).map((type) => (
            <button
              key={type}
              id={`btn-view-${type}`}
              onClick={() => setViewType(type)}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold capitalize transition-all cursor-pointer ${
                viewType === type
                  ? 'bg-white text-[#3D3A35] shadow-xs'
                  : 'text-[#8E8A81] hover:text-[#3D3A35]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {onGoToMatcher && (
            <button
              id="btn-go-to-matcher-from-cal"
              onClick={onGoToMatcher}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F3F6EC] hover:bg-[#E7EED7] text-[#485526] border border-[#C9D6A8] text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#8A9A5B]" />
              <span>Matcher</span>
            </button>
          )}

          <button
            id="btn-quick-schedule-event"
            onClick={() => onOpenNewEventWithDate(selectedDate)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#8A9A5B] hover:bg-[#78884d] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Event</span>
          </button>
        </div>

      </div>

      {/* Filter Pills */}
      <div className="bg-white border border-[#F0ECE4] rounded-3xl p-3 sm:p-3.5 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
          <div className="flex items-center gap-1 text-[#AFA99E] font-bold uppercase tracking-wider text-[10px] shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <button
            id="filter-group-all"
            onClick={() => setSelectedGroupIdFilter('all')}
            className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedGroupIdFilter === 'all'
                ? 'bg-[#3D3A35] text-white shadow-xs'
                : 'bg-[#F7F3EB] text-[#5C574F] hover:bg-[#E8E4D9] border border-[#E8E4D9]'
            }`}
          >
            All ({events.length})
          </button>

          {/* Personal Life filter */}
          <button
            id="filter-group-personal"
            onClick={() => setSelectedGroupIdFilter(selectedGroupIdFilter === 'personal' ? 'all' : 'personal')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium whitespace-nowrap transition-all border cursor-pointer ${
              selectedGroupIdFilter === 'personal'
                ? 'bg-[#3D3A35] text-white font-bold'
                : 'bg-[#FAF8F5] text-[#5C574F] border-[#E8E4D9] hover:bg-[#F7F3EB]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Personal ({events.filter((e) => e.isPersonal).length})</span>
          </button>

          {friendGroups.map((group) => {
            const count = events.filter((e) => e.groupId === group.id && !e.isPersonal).length;
            const isSelected = selectedGroupIdFilter === group.id;
            return (
              <button
                key={group.id}
                id={`filter-group-${group.id}`}
                onClick={() => setSelectedGroupIdFilter(isSelected ? 'all' : group.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium whitespace-nowrap transition-all border cursor-pointer ${
                  isSelected
                    ? 'shadow-xs font-semibold'
                    : 'hover:opacity-90'
                }`}
                style={{
                  backgroundColor: isSelected ? group.color : group.bgLightColor,
                  borderColor: group.borderColor,
                  color: isSelected ? '#ffffff' : group.textColor,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                  style={{ backgroundColor: isSelected ? '#ffffff' : group.color }}
                />
                <span>{group.name}</span>
                <span className="opacity-75 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MONTH VIEW */}
      {/* ========================================================================= */}
      {viewType === 'month' && (
        <div id="month-calendar-grid" className="bg-white border border-[#F0ECE4] rounded-3xl shadow-sm overflow-hidden">
          
          {/* Day Headers (Sun - Sat) */}
          <div className="grid grid-cols-7 border-b border-[#F0ECE4] bg-[#F7F3EB]/50 text-center text-xs font-bold text-[#8E8A81] py-3 uppercase tracking-wider">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#F0ECE4] min-h-[560px]">
            {monthDays.map((day) => {
              const isSelected = day.date === selectedDate;
              const dayEvents = filteredEvents.filter((e) => e.date === day.date);
              const dayTasks = tasks.filter((t) => t.dueDate === day.date && t.status !== 'done');
              const freeGroupMatches = dayMatchesMap.get(day.date) || [];

              return (
                <div
                  key={day.date}
                  id={`cal-day-${day.date}`}
                  onClick={() => onSelectDate(day.date)}
                  className={`min-h-[115px] sm:min-h-[130px] p-2 sm:p-2.5 flex flex-col transition-colors cursor-pointer group relative ${
                    !day.isCurrentMonth
                      ? 'bg-[#FDFCF8]/40 text-[#AFA99E]'
                      : day.isWeekend
                      ? 'bg-[#FAF8F5]/50'
                      : 'bg-white'
                  } ${
                    isSelected ? 'ring-2 ring-[#8A9A5B] bg-[#F3F6EC]/40 z-10' : 'hover:bg-[#F7F3EB]/60'
                  }`}
                >
                  {/* Day Number Header */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs sm:text-sm font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                        day.isToday
                          ? 'bg-[#8A9A5B] text-white font-bold shadow-xs'
                          : isSelected
                          ? 'bg-[#3D3A35] text-white'
                          : day.isCurrentMonth
                          ? 'text-[#3D3A35]'
                          : 'text-[#AFA99E]'
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* 100% Free Date match indicator */}
                      {freeGroupMatches.length > 0 && day.isCurrentMonth && (
                        <span
                          title={`✨ Perfect Match: ${freeGroupMatches.map((m) => m.groupName).join(', ')} free today!`}
                          className="flex items-center gap-0.5 text-[9px] font-bold text-[#485526] bg-[#F3F6EC] px-1 py-0.5 rounded-md border border-[#C9D6A8]"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-[#8A9A5B]" />
                          <span className="hidden xl:inline">{freeGroupMatches.length} Free</span>
                        </span>
                      )}

                      {/* Task Indicator */}
                      {dayTasks.length > 0 && (
                        <span
                          title={`${dayTasks.length} pending task(s)`}
                          className="flex items-center gap-0.5 text-[10px] font-bold text-[#8A9A5B] bg-[#F3F6EC] px-1.5 py-0.5 rounded-full border border-[#C9D6A8]"
                        >
                          <CheckCircle className="w-2.5 h-2.5" />
                          <span>{dayTasks.length}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Event Badges List */}
                  <div className="flex-1 space-y-1 overflow-y-auto max-h-[85px] scrollbar-none">
                    {dayEvents.map((evt) => {
                      const style = getGroupStyle(evt);
                      return (
                        <div
                          key={evt.id}
                          id={`cal-event-chip-${evt.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenEvent(evt);
                          }}
                          className="px-2 py-1 rounded-lg text-[11px] font-medium border truncate cursor-pointer transition-all hover:scale-[1.02] shadow-2xs flex items-center gap-1.5"
                          style={{
                            backgroundColor: style.bg,
                            color: style.text,
                            borderColor: style.border,
                          }}
                          title={`${evt.title} (${formatTime(evt.startTime)}) - ${style.name}`}
                        >
                          {evt.isPersonal ? (
                            <User className="w-2.5 h-2.5 shrink-0 text-[#8A9A5B]" />
                          ) : (
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: style.color }}
                            />
                          )}
                          <span className="truncate">{evt.title}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Hover Quick-Add "+" button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenNewEventWithDate(day.date);
                    }}
                    className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-[#F7F3EB] hover:bg-[#8A9A5B] hover:text-white text-[#5C574F] transition-all text-xs border border-[#E8E4D9]"
                    title={`Add event on ${day.date}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. WEEK VIEW (Mobile Phone Responsive + Desktop Multi-Column)            */}
      {/* ========================================================================= */}
      {viewType === 'week' && (
        <div id="week-calendar-container" className="space-y-4">
          
          {/* ------------------------------------------------------------------- */}
          {/* MOBILE DISPLAY (< sm / Phone Screen)                                */}
          {/* ------------------------------------------------------------------- */}
          <div className="block sm:hidden space-y-3">
            
            {/* 7-Day Quick Strip Selector */}
            <div className="bg-white border border-[#F0ECE4] rounded-2xl p-2.5 shadow-sm">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-bold text-[#8E8A81] uppercase tracking-wider">
                  Tap Day to View
                </span>
                <div className="flex items-center gap-1 bg-[#F7F3EB] p-0.5 rounded-lg border border-[#E8E4D9] text-[10px]">
                  <button
                    onClick={() => setMobileWeekMode('day_focus')}
                    className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                      mobileWeekMode === 'day_focus' ? 'bg-white text-[#3D3A35] shadow-xs' : 'text-[#8E8A81]'
                    }`}
                  >
                    Day Focus
                  </button>
                  <button
                    onClick={() => setMobileWeekMode('all_days')}
                    className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                      mobileWeekMode === 'all_days' ? 'bg-white text-[#3D3A35] shadow-xs' : 'text-[#8E8A81]'
                    }`}
                  >
                    All 7 Days
                  </button>
                </div>
              </div>

              {/* 7 Days Row */}
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((wDay) => {
                  const isSelected = wDay.date === selectedDate;
                  const dayEvents = filteredEvents.filter((e) => e.date === wDay.date);
                  const freeMatches = dayMatchesMap.get(wDay.date) || [];
                  const hasMatches = freeMatches.length > 0;

                  return (
                    <button
                      key={wDay.date}
                      onClick={() => onSelectDate(wDay.date)}
                      className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-xl transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#8A9A5B] text-white shadow-xs'
                          : wDay.isToday
                          ? 'bg-[#F3F6EC] text-[#485526] border border-[#C9D6A8]'
                          : 'bg-[#F7F3EB]/60 hover:bg-[#F7F3EB] text-[#5C574F]'
                      }`}
                    >
                      <span className={`text-[10px] font-bold uppercase tracking-tight ${
                        isSelected ? 'text-white/90' : 'text-[#8E8A81]'
                      }`}>
                        {wDay.dayName.slice(0, 3)}
                      </span>
                      <span className={`text-sm font-bold mt-0.5 ${
                        isSelected ? 'text-white' : 'text-[#3D3A35]'
                      }`}>
                        {wDay.dayNumber}
                      </span>
                      
                      {/* Indicator Dots */}
                      <div className="flex items-center gap-0.5 mt-1 h-1.5">
                        {hasMatches && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-amber-500'}`} />
                        )}
                        {dayEvents.length > 0 && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#8A9A5B]'}`} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Mode A: Day Focus Card */}
            {mobileWeekMode === 'day_focus' && (
              <div className="bg-white border border-[#F0ECE4] rounded-2xl p-4 shadow-sm space-y-3">
                {/* Header for selected date */}
                <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-[#3D3A35] font-serif-soft">
                        {formatDate(selectedDate, { weekday: 'long', month: 'short', day: 'numeric' })}
                      </h4>
                      {selectedDate === todayStr && (
                        <span className="px-1.5 py-0.5 bg-[#8A9A5B] text-white text-[10px] font-bold rounded-full">
                          Today
                        </span>
                      )}
                    </div>
                    {dayMatchesMap.get(selectedDate)?.length ? (
                      <p className="text-[11px] font-semibold text-[#485526] flex items-center gap-1 mt-0.5">
                        <Sparkles className="w-3 h-3 text-[#8A9A5B]" />
                        <span>Mutual free slot available with friend group!</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#8E8A81] mt-0.5">
                        {filteredEvents.filter((e) => e.date === selectedDate).length} events scheduled
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => onOpenNewEventWithDate(selectedDate)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#8A9A5B] text-white text-xs font-semibold hover:bg-[#78884d] transition-all shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Day's Events */}
                <div className="space-y-2">
                  {filteredEvents.filter((e) => e.date === selectedDate).map((evt) => {
                    const style = getGroupStyle(evt);
                    return (
                      <div
                        key={evt.id}
                        onClick={() => onOpenEvent(evt)}
                        className="p-3 rounded-xl border text-xs shadow-2xs cursor-pointer active:scale-[0.99] transition-transform"
                        style={{
                          backgroundColor: style.bg,
                          borderColor: style.border,
                          color: style.text,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/70">
                            {style.name}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] font-semibold opacity-90">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(evt.startTime)}{evt.endTime ? ` - ${formatTime(evt.endTime)}` : ''}</span>
                          </div>
                        </div>

                        <h5 className="font-bold text-sm text-[#3D3A35] mt-1">
                          {evt.title}
                        </h5>

                        {evt.location && (
                          <div className="flex items-center gap-1 text-[11px] text-[#5C574F] mt-1 truncate">
                            <MapPin className="w-3 h-3 shrink-0 text-[#8A9A5B]" />
                            <span className="truncate">{evt.location}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filteredEvents.filter((e) => e.date === selectedDate).length === 0 && (
                    <div className="text-center py-7 px-4 bg-[#FAF7F2] rounded-xl border border-dashed border-[#E8E4D9]">
                      <CalendarIcon className="w-7 h-7 text-[#AFA99E] mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-[#5C574F]">No events scheduled for this day</p>
                      <p className="text-[11px] text-[#AFA99E] mt-0.5">Your schedule is completely clear.</p>
                      <button
                        onClick={() => onOpenNewEventWithDate(selectedDate)}
                        className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#8A9A5B] text-white text-xs font-semibold shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Schedule Event</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Day's Tasks */}
                {tasks.filter((t) => t.dueDate === selectedDate).length > 0 && (
                  <div className="pt-2 border-t border-[#F0ECE4]">
                    <h6 className="text-[11px] font-bold text-[#8E8A81] uppercase tracking-wider mb-1.5">
                      Tasks Due Today
                    </h6>
                    <div className="space-y-1.5">
                      {tasks.filter((t) => t.dueDate === selectedDate).map((t) => (
                        <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#FAF7F2] border border-[#E8E4D9] text-xs">
                          <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${t.status === 'done' ? 'text-[#8A9A5B]' : 'text-[#AFA99E]'}`} />
                          <span className={`font-medium flex-1 truncate ${t.status === 'done' ? 'line-through text-[#AFA99E]' : 'text-[#3D3A35]'}`}>
                            {t.title}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${
                            t.priority === 'urgent' ? 'bg-rose-100 text-rose-800' : 'bg-[#E8E4D9] text-[#5C574F]'
                          }`}>
                            {t.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Mode B: All 7 Days Vertical Stream */}
            {mobileWeekMode === 'all_days' && (
              <div className="space-y-2.5">
                {weekDays.map((wDay) => {
                  const dayEvents = filteredEvents.filter((e) => e.date === wDay.date);
                  const isCurrent = wDay.date === selectedDate;
                  const freeMatches = dayMatchesMap.get(wDay.date) || [];

                  return (
                    <div
                      key={wDay.date}
                      onClick={() => onSelectDate(wDay.date)}
                      className={`bg-white border rounded-2xl p-3 shadow-xs transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-[#8A9A5B] ring-1 ring-[#8A9A5B]/30'
                          : 'border-[#F0ECE4]'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-[#F0ECE4] mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            wDay.isToday ? 'bg-[#8A9A5B] text-white' : 'bg-[#F7F3EB] text-[#3D3A35]'
                          }`}>
                            {wDay.dayNumber}
                          </span>
                          <span className="font-bold text-xs text-[#3D3A35]">
                            {wDay.dayNameFull}
                          </span>
                          {wDay.isToday && (
                            <span className="text-[10px] font-bold text-[#8A9A5B] bg-[#F3F6EC] px-1.5 py-0.5 rounded-full border border-[#C9D6A8]">
                              Today
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {freeMatches.length > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#485526] bg-[#F3F6EC] px-1.5 py-0.5 rounded-full border border-[#C9D6A8]">
                              <Sparkles className="w-2.5 h-2.5 text-[#8A9A5B]" />
                              <span>Match</span>
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenNewEventWithDate(wDay.date);
                            }}
                            className="p-1 rounded-lg hover:bg-[#F7F3EB] text-[#8E8A81] hover:text-[#3D3A35] cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {dayEvents.length > 0 ? (
                        <div className="space-y-1.5">
                          {dayEvents.map((evt) => {
                            const style = getGroupStyle(evt);
                            return (
                              <div
                                key={evt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenEvent(evt);
                                }}
                                className="p-2 rounded-xl border text-xs flex items-center justify-between gap-2"
                                style={{
                                  backgroundColor: style.bg,
                                  borderColor: style.border,
                                  color: style.text,
                                }}
                              >
                                <span className="font-semibold truncate">{evt.title}</span>
                                <span className="text-[10px] font-medium shrink-0 opacity-85">
                                  {formatTime(evt.startTime)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#AFA99E] py-0.5">No events scheduled</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------------- */}
          {/* TABLET & DESKTOP MULTI-COLUMN (>= sm / 640px+)                      */}
          {/* ------------------------------------------------------------------- */}
          <div className="hidden sm:block bg-white border border-[#F0ECE4] rounded-3xl shadow-sm p-4 md:p-5">
            <div className="grid grid-cols-7 gap-2 md:gap-3">
              {weekDays.map((wDay) => {
                const isSelected = wDay.date === selectedDate;
                const dayEvents = filteredEvents.filter((e) => e.date === wDay.date);
                const freeMatches = dayMatchesMap.get(wDay.date) || [];

                return (
                  <div
                    key={wDay.date}
                    onClick={() => onSelectDate(wDay.date)}
                    className={`rounded-2xl border p-3 min-h-[380px] flex flex-col cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#8A9A5B] bg-[#F3F6EC]/30 ring-1 ring-[#8A9A5B]/40 shadow-xs'
                        : 'border-[#F0ECE4] bg-white hover:border-[#D4CFC7]'
                    }`}
                  >
                    <div className={`text-center pb-2.5 border-b border-[#F0ECE4] mb-2.5 ${wDay.isToday ? 'bg-[#F7F3EB] rounded-xl pt-1' : ''}`}>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${wDay.isToday ? 'text-[#8A9A5B]' : 'text-[#AFA99E]'}`}>
                        {wDay.dayName}
                      </p>
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold mt-1 ${
                          wDay.isToday
                            ? 'bg-[#8A9A5B] text-white shadow-xs'
                            : 'text-[#3D3A35]'
                        }`}
                      >
                        {wDay.dayNumber}
                      </span>

                      {freeMatches.length > 0 && (
                        <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-bold text-[#485526] bg-[#F3F6EC] py-0.5 px-1.5 rounded-full border border-[#C9D6A8]">
                          <Sparkles className="w-2.5 h-2.5 text-[#8A9A5B]" />
                          <span>Match!</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[340px]">
                      {dayEvents.map((evt) => {
                        const style = getGroupStyle(evt);
                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenEvent(evt);
                            }}
                            className="p-2.5 rounded-xl border text-xs shadow-2xs hover:scale-[1.02] transition-transform"
                            style={{
                              backgroundColor: style.bg,
                              borderColor: style.border,
                              color: style.text,
                            }}
                          >
                            <div className="flex items-center gap-1 font-semibold text-xs leading-snug line-clamp-2">
                              {evt.isPersonal && <User className="w-3 h-3 text-[#8A9A5B] shrink-0" />}
                              <span>{evt.title}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] mt-1.5 opacity-90">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{formatTime(evt.startTime)}</span>
                            </div>
                            {evt.location && (
                              <div className="flex items-center gap-1 text-[10px] mt-0.5 opacity-85 truncate">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{evt.location}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {dayEvents.length === 0 && (
                        <div className="text-center py-10 text-[#AFA99E] text-xs">
                          No events
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNewEventWithDate(wDay.date);
                      }}
                      className="w-full py-1.5 mt-2 rounded-xl bg-[#F7F3EB] hover:bg-[#8A9A5B] hover:text-white text-[#5C574F] text-xs font-semibold flex items-center justify-center gap-1 transition-colors border border-[#E8E4D9] cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DAY VIEW */}
      {/* ========================================================================= */}
      {viewType === 'day' && (
        <div id="day-calendar-view" className="bg-white border border-[#F0ECE4] rounded-3xl shadow-sm p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#F0ECE4] pb-3 gap-2">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#4A463F] font-serif-soft">
                {formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenNewEventWithDate(selectedDate, true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F7F3EB] hover:bg-[#EFE9DC] text-[#3D3A35] text-xs font-semibold border border-[#E8E4D9]"
              >
                <User className="w-3.5 h-3.5 text-[#8A9A5B]" />
                <span>+ Personal</span>
              </button>
              <button
                onClick={() => onOpenNewEventWithDate(selectedDate, false)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#8A9A5B] hover:bg-[#78884d] text-white text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Group</span>
              </button>
            </div>
          </div>

          {/* Matched Free Groups Banner on this selected date */}
          {selectedDateMatches.length > 0 && (
            <div className="p-3.5 bg-[#F3F6EC] border border-[#C9D6A8] rounded-2xl space-y-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#8A9A5B]" />
                <span className="text-xs font-bold text-[#485526]">
                  {selectedDateMatches.length} friend group{selectedDateMatches.length > 1 ? 's' : ''} free today
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedDateMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 bg-white rounded-xl border border-[#C9D6A8] flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#3D3A35]">{m.groupName}</p>
                      <p className="text-[10px] text-[#8E8A81]">{m.totalMembers} members free</p>
                    </div>

                    <button
                      onClick={() => onOpenNewEventWithDate(selectedDate, false, m.groupId)}
                      className="px-2.5 py-1 rounded-lg bg-[#8A9A5B] hover:bg-[#78884d] text-white text-xs font-bold shadow-2xs shrink-0 cursor-pointer"
                    >
                      Plan
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Left: Gatherings & Events */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8E8A81] flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-[#8A9A5B]" />
                <span>Events ({filteredEvents.filter((e) => e.date === selectedDate).length})</span>
              </h4>

              {filteredEvents.filter((e) => e.date === selectedDate).length === 0 ? (
                <div className="p-6 text-center bg-[#FDFCF8] rounded-2xl border border-dashed border-[#E8E4D9]">
                  <p className="text-xs text-[#8E8A81]">No events scheduled</p>
                  <button
                    onClick={() => onOpenNewEventWithDate(selectedDate)}
                    className="mt-1.5 text-xs font-semibold text-[#8A9A5B] hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add event
                  </button>
                </div>
              ) : (
                filteredEvents
                  .filter((e) => e.date === selectedDate)
                  .map((evt) => {
                    const style = getGroupStyle(evt);
                    return (
                      <div
                        key={evt.id}
                        onClick={() => onOpenEvent(evt)}
                        className="p-3.5 rounded-2xl border cursor-pointer hover:shadow-md transition-all relative overflow-hidden"
                        style={{
                          backgroundColor: style.bg,
                          borderColor: style.border,
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ backgroundColor: style.color, color: '#ffffff' }}
                          >
                            {style.name}
                          </span>
                          <span className="text-xs font-semibold text-[#5C574F]">
                            {formatTime(evt.startTime)} - {formatTime(evt.endTime)}
                          </span>
                        </div>

                        <h5 className="text-sm font-bold text-[#3D3A35] mt-1 font-serif-soft">{evt.title}</h5>

                        {evt.location && (
                          <p className="text-xs text-[#5C574F] flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-[#AFA99E]" /> {evt.location}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E8E4D9]/80 text-xs text-[#5C574F]">
                          <span className="flex items-center gap-1">
                            {evt.isPersonal ? (
                              <>
                                <User className="w-3 h-3 text-[#8A9A5B]" />
                                <span>Personal</span>
                              </>
                            ) : (
                              <>
                                <Users className="w-3 h-3 text-[#AFA99E]" />
                                <span>{evt.attendees.length} members</span>
                              </>
                            )}
                          </span>
                          <span className="font-semibold text-[#3D3A35] capitalize">
                            {evt.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Right: Tasks Due on this day */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8E8A81] flex items-center gap-1.5">
                <CalendarCheck2 className="w-3.5 h-3.5 text-[#8A9A5B]" />
                <span>Tasks ({tasks.filter((t) => t.dueDate === selectedDate).length})</span>
              </h4>

              {tasks.filter((t) => t.dueDate === selectedDate).length === 0 ? (
                <div className="p-6 text-center bg-[#FDFCF8] rounded-2xl border border-dashed border-[#E8E4D9]">
                  <p className="text-xs text-[#8E8A81]">No tasks due</p>
                </div>
              ) : (
                tasks
                  .filter((t) => t.dueDate === selectedDate)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-[#FDFCF8] border border-[#F0ECE4] rounded-2xl flex items-start gap-2.5 shadow-2xs"
                    >
                      <div className="mt-0.5">
                        <CheckCircle
                          className={`w-3.5 h-3.5 ${
                            task.status === 'done' ? 'text-[#8A9A5B]' : 'text-[#D4CFC7]'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h6
                            className={`text-xs font-semibold truncate ${
                              task.status === 'done' ? 'line-through text-[#AFA99E]' : 'text-[#3D3A35]'
                            }`}
                          >
                            {task.title}
                          </h6>
                          {task.isDailyTopPriority && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#FAF3EB] text-[#C98A4B] border border-[#E8C59F] shrink-0">
                              Top
                            </span>
                          )}
                        </div>
                        {task.dueTime && (
                          <p className="text-[11px] text-[#8E8A81] mt-0.5">Due {formatTime(task.dueTime)}</p>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. AGENDA VIEW */}
      {/* ========================================================================= */}
      {viewType === 'agenda' && (
        <div id="agenda-calendar-view" className="bg-white border border-[#F0ECE4] rounded-3xl shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
            <h3 className="text-base sm:text-lg font-bold text-[#4A463F] font-serif-soft">
              Events ({filteredEvents.length})
            </h3>
            <span className="text-xs text-[#8E8A81]">Chronological</span>
          </div>

          <div className="space-y-2.5">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-10 text-[#AFA99E] text-xs">
                <p>No events found</p>
              </div>
            ) : (
              filteredEvents
                .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))
                .map((evt) => {
                  const style = getGroupStyle(evt);
                  return (
                    <div
                      key={evt.id}
                      onClick={() => onOpenEvent(evt)}
                      className="p-3 sm:p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:shadow-md transition-all"
                      style={{
                        backgroundColor: style.bg,
                        borderColor: style.border,
                      }}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 font-bold shadow-2xs"
                          style={{ backgroundColor: style.color, color: '#ffffff' }}
                        >
                          <span className="text-[9px] uppercase tracking-wider">
                            {new Date(evt.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short' })}
                          </span>
                          <span className="text-sm font-extrabold leading-none">
                            {evt.date.split('-')[2]}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold truncate"
                              style={{ backgroundColor: '#ffffff', color: style.text }}
                            >
                              {style.name}
                            </span>
                            <span className="text-xs font-semibold text-[#5C574F]">
                              {formatTime(evt.startTime)} - {formatTime(evt.endTime)}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-[#3D3A35] mt-0.5 font-serif-soft truncate">{evt.title}</h4>

                          {evt.location && (
                            <p className="text-xs text-[#5C574F] flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 text-[#AFA99E] shrink-0" />
                              <span className="truncate">{evt.location}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadICS(evt);
                          }}
                          className="p-1.5 rounded-xl bg-white/90 hover:bg-white text-[#5C574F] border border-[#E8E4D9] text-xs font-semibold flex items-center gap-1 shadow-2xs"
                          title="Export .ics"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>.ICS</span>
                        </button>

                        <button
                          onClick={() => onOpenEvent(evt)}
                          className="px-3 py-1.5 rounded-full bg-[#3D3A35] hover:bg-[#2A2724] text-white text-xs font-bold shadow-xs"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

    </div>
  );
};
