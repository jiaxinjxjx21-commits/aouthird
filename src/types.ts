export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  ownerId?: string;
  title: string;
  description?: string;
  priority: PriorityLevel;
  status: TaskStatus;
  isDailyTopPriority?: boolean; // For Today's Top 3 priorities
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  projectId: string;
  estimatedMinutes?: number;
  subtasks: SubTask[];
  createdAt: string;
}

export interface ProjectCategory {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface MemberBusySlot {
  id: string;
  dayOfWeek?: number; // 0=Sunday, 1=Monday... 6=Saturday (for recurring)
  specificDate?: string; // YYYY-MM-DD (for one-off busy date)
  title: string; // e.g. "Work Shift", "Evening Classes", "Family Duty"
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  allDay?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarEmoji?: string;
  avatarUrl?: string;
  phone?: string;
  role?: 'admin' | 'member';
  tagline?: string;
  createdAt?: string;
  authProvider?: 'google' | 'email' | 'guest';
  googleEmail?: string;
  isGoogleLinked?: boolean;
}

export interface GroupInviteCode {
  code: string; // e.g., 'NADD-7294'
  createdAt: string;
  expiresAt: string | null; // null for permanent, ISO date string for 7 days
  expirationType?: '7days' | 'permanent';
  isUsed: boolean;
  invitedEmail?: string;
  invitedName?: string;
  usedBy?: string;
}

export interface FriendMember {
  id: string;
  name: string;
  avatarColor: string;
  avatarEmoji?: string;
  email?: string;
  phone?: string;
  role?: 'admin' | 'member';
  status?: 'active' | 'invited' | 'pending';
  inviteCode?: string;
  invitedAt?: string;
  busySchedule?: MemberBusySlot[]; // Known recurring/one-off busy commitments
}

export interface FriendGroup {
  id: string;
  name: string;
  description?: string;
  color: string; // Hex or tailwind identifier
  textColor: string;
  bgLightColor: string;
  borderColor: string;
  icon: string;
  members: FriendMember[];
  inviteCodes?: GroupInviteCode[];
  createdAt: string;
  /** Firebase uid of the creator (set by cloud sync). */
  ownerId?: string;
  /** Firebase uids of everyone in the circle; drives sharing and security rules. */
  memberIds?: string[];
  /** Last invite code used to join (required by security rules; managed by cloud sync). */
  joinCode?: string;
}

export interface TimeSlotVote {
  memberId: string;
  memberName: string;
  available: boolean;
}

export interface ProposedTimeSlot {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  votes: TimeSlotVote[];
}

export type RSVPStatus = 'accepted' | 'tentative' | 'declined' | 'pending';
export type EventStatus = 'proposed' | 'confirmed' | 'rescheduled' | 'cancelled';

export type CheckInStatus = 'unverified' | 'attending' | 'on_the_way' | 'running_late' | 'cannot_make_it';

export interface CalendarEvent {
  id: string;
  ownerId?: string;
  title: string;
  description?: string;
  groupId?: string; // If tied to a friend group, inherits group color
  groupName?: string;
  isPersonal?: boolean; // True for user's personal commitments (Doctor, Work, Gym, Personal errands)
  personalCategory?: 'work' | 'personal' | 'health' | 'family' | 'errand';
  color?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location?: string;
  locationType?: 'in_person' | 'online' | 'tbd';
  locationUrl?: string;
  status: EventStatus;
  proposedSlots?: ProposedTimeSlot[];
  selectedSlotId?: string;
  attendees: {
    memberId: string;
    name: string;
    avatarColor: string;
    status: 'accepted' | 'tentative' | 'declined' | 'pending';
    checkInStatus?: CheckInStatus;
    checkInNote?: string;
    checkInTime?: string;
  }[];
  reminders: {
    type: '15min' | '1hour' | '1day' | 'custom';
    enabled: boolean;
  }[];
  notes?: string;
  changeHistory?: {
    timestamp: string;
    author: string;
    action: string;
  }[];
  userVerificationPromptSent?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MatchedTimeSlot {
  timeLabel: string; // e.g. "Morning Coffee & Brunch (10:00 AM - 1:00 PM)"
  startTime: string;
  endTime: string;
  period: 'morning' | 'afternoon' | 'evening' | 'all_day';
}

export interface FreeDateMatch {
  id: string;
  groupId: string;
  groupName: string;
  groupColor: string;
  groupTextColor: string;
  groupBgLight: string;
  groupBorderColor: string;
  date: string; // YYYY-MM-DD
  dayOfWeekName: string; // e.g. "Saturday"
  formattedDate: string; // e.g. "Aug 29, 2026"
  isFullMatch: boolean; // Everyone in group + user is free
  matchScore: number; // Percentage (e.g. 100, 80)
  totalMembers: number;
  freeCount: number;
  availableMembers: FriendMember[];
  busyMembers: { member: FriendMember; reason: string }[];
  userIsFree: boolean;
  userConflictReason?: string;
  suggestedSlots: MatchedTimeSlot[];
}

export interface NotificationItem {
  id: string;
  ownerId?: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'event_invite' | 'event_update' | 'event_reminder' | 'task_reminder' | 'poll_update' | 'attendance_verification' | 'free_date_match';
  read: boolean;
  eventId?: string;
  taskId?: string;
  groupId?: string;
  matchedDate?: string;
  needsAction?: boolean;
}

export type ViewMode = 'calendar' | 'matcher' | 'groups';
export type CalendarViewType = 'month' | 'week' | 'day' | 'agenda';
