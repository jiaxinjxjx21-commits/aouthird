import { CalendarEvent, FriendGroup, FriendMember, Task, FreeDateMatch, MatchedTimeSlot } from '../types';
import { formatDate } from './calendarUtils';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Checks if a specific time range overlaps with another
 */
function isTimeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && endA > startB;
}

/**
 * Evaluates whether the user (Alex) is free on a given date and time slots
 */
export function getUserAvailabilityForDate(
  dateStr: string,
  events: CalendarEvent[],
  tasks: Task[]
): { isFree: boolean; busyEvents: CalendarEvent[]; freePeriods: ('morning' | 'afternoon' | 'evening')[] } {
  // Find all events for the user on this date
  const dayEvents = events.filter((e) => e.date === dateStr && e.status !== 'cancelled');

  const morningBusy = dayEvents.some((e) => isTimeOverlapping(e.startTime, e.endTime, '09:00', '12:30'));
  const afternoonBusy = dayEvents.some((e) => isTimeOverlapping(e.startTime, e.endTime, '13:00', '17:00'));
  const eveningBusy = dayEvents.some((e) => isTimeOverlapping(e.startTime, e.endTime, '18:00', '21:30'));

  const freePeriods: ('morning' | 'afternoon' | 'evening')[] = [];
  if (!morningBusy) freePeriods.push('morning');
  if (!afternoonBusy) freePeriods.push('afternoon');
  if (!eveningBusy) freePeriods.push('evening');

  return {
    isFree: freePeriods.length > 0,
    busyEvents: dayEvents,
    freePeriods,
  };
}

/**
 * Evaluates whether a friend member is free on a given date
 */
export function getMemberAvailabilityForDate(
  member: FriendMember,
  dateStr: string,
  dayOfWeek: number
): { isFree: boolean; reason?: string; busySlot?: any } {
  if (!member.busySchedule || member.busySchedule.length === 0) {
    return { isFree: true };
  }

  // Check one-off specific date blocks
  const specificBlock = member.busySchedule.find((b) => b.specificDate === dateStr);
  if (specificBlock) {
    return {
      isFree: false,
      reason: specificBlock.title || 'Personal commitment',
      busySlot: specificBlock,
    };
  }

  // Check recurring weekly day-of-week blocks
  const weeklyBlock = member.busySchedule.find((b) => b.dayOfWeek === dayOfWeek);
  if (weeklyBlock) {
    const timeInfo = weeklyBlock.startTime ? ` (${weeklyBlock.startTime} - ${weeklyBlock.endTime})` : '';
    return {
      isFree: false,
      reason: `${weeklyBlock.title}${timeInfo}`,
      busySlot: weeklyBlock,
    };
  }

  return { isFree: true };
}

/**
 * Calculates matching free dates across all friend groups or a specific group
 */
export function findMatchingFreeDates(
  friendGroups: FriendGroup[],
  events: CalendarEvent[],
  tasks: Task[],
  daysAhead: number = 21,
  targetGroupId?: string
): FreeDateMatch[] {
  const matches: FreeDateMatch[] = [];
  const today = new Date();

  const groupsToScan = targetGroupId
    ? friendGroups.filter((g) => g.id === targetGroupId)
    : friendGroups;

  for (let i = 0; i < daysAhead; i++) {
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + i);

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const dayOfWeek = targetDate.getDay();
    const dayOfWeekName = DAY_NAMES[dayOfWeek] || 'Day';

    const userAvailability = getUserAvailabilityForDate(dateStr, events, tasks);

    groupsToScan.forEach((group) => {
      // Check if this group already has a confirmed event on this date
      const existingGroupEvent = events.find(
        (e) => e.date === dateStr && e.groupId === group.id && e.status === 'confirmed'
      );

      if (existingGroupEvent) {
        return; // Already planned for this day
      }

      const availableMembers: FriendMember[] = [];
      const busyMembers: { member: FriendMember; reason: string }[] = [];

      group.members.forEach((member) => {
        if (member.id === 'm-1') {
          // Alex (User)
          if (userAvailability.isFree) {
            availableMembers.push(member);
          } else {
            const conflictEvent = userAvailability.busyEvents[0];
            busyMembers.push({
              member,
              reason: conflictEvent ? conflictEvent.title : 'User personal schedule busy',
            });
          }
        } else {
          const avail = getMemberAvailabilityForDate(member, dateStr, dayOfWeek);
          if (avail.isFree) {
            availableMembers.push(member);
          } else {
            busyMembers.push({
              member,
              reason: avail.reason || 'Committed elsewhere',
            });
          }
        }
      });

      const totalMembers = group.members.length;
      const freeCount = availableMembers.length;
      const matchScore = totalMembers > 0 ? Math.round((freeCount / totalMembers) * 100) : 0;
      const isFullMatch = freeCount === totalMembers && userAvailability.isFree;

      // Determine suggested time slots for this date
      const suggestedSlots: MatchedTimeSlot[] = [];

      // Weekend friendly vs Weekday friendly suggestions
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (userAvailability.freePeriods.includes('morning')) {
        suggestedSlots.push({
          timeLabel: isWeekend ? 'Morning Brunch & Coffee' : 'Morning Meetup',
          startTime: '10:00',
          endTime: '12:30',
          period: 'morning',
        });
      }

      if (userAvailability.freePeriods.includes('afternoon')) {
        suggestedSlots.push({
          timeLabel: 'Afternoon Gathering & Activity',
          startTime: '14:00',
          endTime: '16:30',
          period: 'afternoon',
        });
      }

      if (userAvailability.freePeriods.includes('evening')) {
        suggestedSlots.push({
          timeLabel: isWeekend ? 'Evening Dinner & Hangout' : 'After-Work Catchup & Drinks',
          startTime: '18:30',
          endTime: '21:00',
          period: 'evening',
        });
      }

      // If at least 60% members are free or it's a full match
      if (matchScore >= 60 || isFullMatch) {
        matches.push({
          id: `match-${group.id}-${dateStr}`,
          groupId: group.id,
          groupName: group.name,
          groupColor: group.color,
          groupTextColor: group.textColor,
          groupBgLight: group.bgLightColor,
          groupBorderColor: group.borderColor,
          date: dateStr,
          dayOfWeekName,
          formattedDate: formatDate(dateStr),
          isFullMatch,
          matchScore,
          totalMembers,
          freeCount,
          availableMembers,
          busyMembers,
          userIsFree: userAvailability.isFree,
          userConflictReason: userAvailability.busyEvents[0]?.title,
          suggestedSlots,
        });
      }
    });
  }

  // Sort: 100% full matches first, then highest match score, then soonest date
  return matches.sort((a, b) => {
    if (a.isFullMatch && !b.isFullMatch) return -1;
    if (!a.isFullMatch && b.isFullMatch) return 1;
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return a.date.localeCompare(b.date);
  });
}

/**
 * Returns free match recommendations for a specific single calendar date
 */
export function getMatchesForSpecificDate(
  dateStr: string,
  friendGroups: FriendGroup[],
  events: CalendarEvent[],
  tasks: Task[]
): FreeDateMatch[] {
  const allMatches = findMatchingFreeDates(friendGroups, events, tasks, 35);
  return allMatches.filter((m) => m.date === dateStr);
}
