import { FriendGroup, Task, CalendarEvent, ProjectCategory, NotificationItem, UserProfile } from '../types';

export const NATURAL_PALETTES = [
  { name: 'Terracotta', color: '#D48C70', textColor: '#8C4E36', bgLightColor: '#FBF2EE', borderColor: '#EFC0B0' },
  { name: 'Sage Green', color: '#8A9A5B', textColor: '#485526', bgLightColor: '#F3F6EC', borderColor: '#C9D6A8' },
  { name: 'River Blue', color: '#7096D4', textColor: '#2E4C7E', bgLightColor: '#EEF4FC', borderColor: '#ADC6EE' },
  { name: 'Thistle Purple', color: '#A389D4', textColor: '#583D89', bgLightColor: '#F6F2FB', borderColor: '#CFBEEB' },
  { name: 'Warm Ochre', color: '#C98A4B', textColor: '#74471B', bgLightColor: '#FAF3EB', borderColor: '#E8C59F' },
  { name: 'Earthy Clay', color: '#B57065', textColor: '#6B3830', bgLightColor: '#F8EFEF', borderColor: '#DCB2AC' },
  { name: 'Forest Moss', color: '#5B8C65', textColor: '#274E30', bgLightColor: '#EEF6F0', borderColor: '#A9CDB2' },
];

export const INITIAL_PROJECTS: ProjectCategory[] = [
  { id: 'proj-work', name: 'Work & Projects', color: '#7096D4', icon: 'Briefcase' },
  { id: 'proj-personal', name: 'Personal & Health', color: '#8A9A5B', icon: 'Heart' },
  { id: 'proj-home', name: 'Home & Errands', color: '#D48C70', icon: 'Home' },
  { id: 'proj-study', name: 'Learning & Skills', color: '#A389D4', icon: 'BookOpen' },
];

// Clean slate initial collections - no sample demo data
export const INITIAL_FRIEND_GROUPS: FriendGroup[] = [];
export const INITIAL_EVENTS: CalendarEvent[] = [];
export const INITIAL_TASKS: Task[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const DEFAULT_USER: UserProfile = {
  id: 'user-clean',
  name: 'Gathering Organizer',
  email: 'organizer@naddd.app',
  avatarColor: '#8A9A5B',
  avatarEmoji: '🌿',
  role: 'admin',
  tagline: 'Gathering organizer',
  createdAt: new Date().toISOString().split('T')[0],
};

export const FRESH_NEW_USER: UserProfile = DEFAULT_USER;
export const DEMO_ACCOUNTS: UserProfile[] = [];

// Helper to get relative date string YYYY-MM-DD
export function getRelativeDate(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
