import { CalendarEvent } from '../types';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  
  return date.toLocaleDateString(undefined, defaultOptions);
}

export function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
  
  return `${displayHours}:${displayMinutes} ${period}`;
}

export function formatLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatRelativeEventTime(dateStr: string, timeStr?: string): string {
  const today = getTodayDateString();
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatLocalDateString(tomorrow);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatLocalDateString(yesterday);

  let dayLabel = '';
  if (dateStr === today) {
    dayLabel = 'Today';
  } else if (dateStr === tomorrowStr) {
    dayLabel = 'Tomorrow';
  } else if (dateStr === yesterdayStr) {
    dayLabel = 'Yesterday';
  } else {
    dayLabel = formatDate(dateStr, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  if (timeStr) {
    return `${dayLabel} at ${formatTime(timeStr)}`;
  }
  return dayLabel;
}

export function getMonthDays(year: number, month: number): {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}[] {
  const today = getTodayDateString();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
  const totalDaysInMonth = lastDayOfMonth.getDate();

  const days: {
    date: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isWeekend: boolean;
  }[] = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const prevDate = new Date(year, month - 1, dayNum);
    const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayOfWeek = prevDate.getDay();
    days.push({
      date: dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === today,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // Current month days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const curDate = new Date(year, month, d);
    const dayOfWeek = curDate.getDay();
    days.push({
      date: dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === today,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  // Next month leading days to complete grid (multiples of 7, up to 35 or 42)
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextDate = new Date(year, month + 1, d);
    const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = nextDate.getDay();
    days.push({
      date: dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === today,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    });
  }

  return days;
}

export function getWeekDays(selectedDate: string): {
  date: string;
  dayName: string;
  dayNameFull: string;
  dayNumber: number;
  isToday: boolean;
  isWeekend: boolean;
}[] {
  const parts = selectedDate.split('-');
  const base = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const dayOfWeek = base.getDay(); // 0 is Sunday
  const today = getTodayDateString();

  const sunday = new Date(base);
  sunday.setDate(base.getDate() - dayOfWeek);

  const week: { date: string; dayName: string; dayNameFull: string; dayNumber: number; isToday: boolean; isWeekend: boolean }[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (let i = 0; i < 7; i++) {
    const current = new Date(sunday);
    current.setDate(sunday.getDate() + i);
    const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    
    week.push({
      date: dateStr,
      dayName: dayNames[i],
      dayNameFull: dayNamesFull[i],
      dayNumber: current.getDate(),
      isToday: dateStr === today,
      isWeekend: i === 0 || i === 6,
    });
  }

  return week;
}

export function getPreviousWeekDate(selectedDate: string): string {
  const parts = selectedDate.split('-');
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  d.setDate(d.getDate() - 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getNextWeekDate(selectedDate: string): string {
  const parts = selectedDate.split('-');
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getWeekRangeString(selectedDate: string): string {
  const weekDays = getWeekDays(selectedDate);
  if (!weekDays.length) return '';
  const first = weekDays[0];
  const last = weekDays[6];

  const firstParts = first.date.split('-');
  const lastParts = last.date.split('-');

  const firstDate = new Date(parseInt(firstParts[0], 10), parseInt(firstParts[1], 10) - 1, parseInt(firstParts[2], 10));
  const lastDate = new Date(parseInt(lastParts[0], 10), parseInt(lastParts[1], 10) - 1, parseInt(lastParts[2], 10));

  const firstMonth = firstDate.toLocaleDateString(undefined, { month: 'short' });
  const lastMonth = lastDate.toLocaleDateString(undefined, { month: 'short' });

  if (firstParts[0] !== lastParts[0]) {
    // Crosses year
    return `${firstMonth} ${firstDate.getDate()}, ${firstParts[0]} – ${lastMonth} ${lastDate.getDate()}, ${lastParts[0]}`;
  }

  if (firstMonth === lastMonth) {
    return `${firstMonth} ${firstDate.getDate()} – ${lastDate.getDate()}, ${firstParts[0]}`;
  }

  return `${firstMonth} ${firstDate.getDate()} – ${lastMonth} ${lastDate.getDate()}, ${firstParts[0]}`;
}

export function generateICSContent(event: CalendarEvent): string {
  const formatICSDate = (dateStr: string, timeStr?: string) => {
    const cleanDate = dateStr.replace(/-/g, '');
    if (!timeStr) return `${cleanDate}T090000`;
    const cleanTime = timeStr.replace(/:/g, '') + '00';
    return `${cleanDate}T${cleanTime}`;
  };

  const start = formatICSDate(event.date, event.startTime);
  const end = formatICSDate(event.date, event.endTime || event.startTime);
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//NaddD Gathering Planner//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${event.id}@naddd.app
DTSTAMP:${now}
DTSTART:${start}
DTEND:${end}
SUMMARY:${event.title}
DESCRIPTION:${event.description || 'Scheduled via NaddD'}
LOCATION:${event.location || ''}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
}

export const generateICSFile = generateICSContent;
export function downloadICSFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadICS(event: CalendarEvent): void {
  const content = generateICSContent(event);
  const cleanTitle = (event.title || 'gathering').toLowerCase().replace(/[^a-z0-9]/g, '_');
  downloadICSFile(content, `${cleanTitle}_${event.date}.ics`);
}

