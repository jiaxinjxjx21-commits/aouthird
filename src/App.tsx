import { useState, useEffect, useMemo, useRef, Dispatch, SetStateAction } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Task, 
  CalendarEvent, 
  FriendGroup, 
  ProjectCategory, 
  NotificationItem, 
  CheckInStatus,
  ProposedTimeSlot,
  FreeDateMatch,
  MatchedTimeSlot,
  UserProfile,
  FriendMember
} from './types';
import { 
  INITIAL_PROJECTS
} from './data/initialData';
import { 
  auth, 
  signOutFirebase, 
  syncUserToFirestore, 
  saveGroupToFirestore, 
  deleteGroupFromFirestore, 
  saveEventToFirestore, 
  deleteEventFromFirestore, 
  saveTaskToFirestore, 
  deleteTaskFromFirestore, 
  saveNotificationToFirestore,
  deleteNotificationFromFirestore,
  saveInviteToFirestore,
  deleteInviteFromFirestore,
  joinGroupWithInvite,
  JoinError,
  InviteRecord,
  subscribeOwned,
  subscribeGroups,
  subscribeOwnedInvites,
  CollectionChange,
  getOrCreateUserProfile
} from './lib/firebase';
import { useCloudSync } from './lib/useCloudSync';
import {
  getStoredUser,
  saveStoredUser,
  clearStoredUser,
  createGuestUser,
  loadScoped,
  clearScoped,
  clearLegacyData,
  getLargeTextMode,
  saveLargeTextMode,
  savePendingJoinCode,
  takePendingJoinCode
} from './lib/storage';
import { usePersistedCollection } from './hooks/usePersistedCollection';
import { useViewNavigation } from './hooks/useViewNavigation';
import { generateInviteCode } from './utils/inviteCode';
import { onAuthStateChanged } from 'firebase/auth';
import { getTodayDateString } from './utils/calendarUtils';
import { Header } from './components/layout/Header';
import { LoginPage } from './components/auth/LoginPage';
import { UpcomingBanner } from './components/layout/UpcomingBanner';
import { CalendarView } from './components/calendar/CalendarView';
import { FreeDateMatcherView } from './components/matcher/FreeDateMatcherView';
import { FriendGroupsView } from './components/groups/FriendGroupsView';
import { MeetingVerificationModal } from './components/calendar/MeetingVerificationModal';
import { EventDetailModal } from './components/calendar/EventDetailModal';
import { NewEventModal } from './components/calendar/NewEventModal';
import { JoinCodeModal } from './components/auth/JoinCodeModal';
import { NewTaskModal } from './components/calendar/NewTaskModal';
import { NotificationDrawer } from './components/layout/NotificationDrawer';
import { ToastContainer, ToastMessage } from './components/layout/Toast';

interface NewEventConfig {
  isOpen: boolean;
  groupId?: string;
  startWithPoll?: boolean;
  date?: string;
  startTime?: string;
  endTime?: string;
  title?: string;
  isPersonal?: boolean;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getStoredUser);

  // --- Scoped persistent state: starts clean for new users ---
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadScoped<CalendarEvent>(getStoredUser()?.id, 'events'));
  const [tasks, setTasks] = useState<Task[]>(() => loadScoped<Task>(getStoredUser()?.id, 'tasks'));
  const [friendGroups, setFriendGroups] = useState<FriendGroup[]>(() => loadScoped<FriendGroup>(getStoredUser()?.id, 'groups'));
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    loadScoped<NotificationItem>(getStoredUser()?.id, 'notifications')
  );

  const [projects] = useState<ProjectCategory[]>(INITIAL_PROJECTS);

  // --- Active Navigation & UI Filters ---
  const { currentView, slideDirection, selectView: handleSelectView, swipeHandlers } = useViewNavigation();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLargeTextMode, setIsLargeTextMode] = useState<boolean>(getLargeTextMode);

  // --- Modals State (Consolidated & Simplified) ---
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [newEventConfig, setNewEventConfig] = useState<NewEventConfig>({ isOpen: false });
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<CalendarEvent | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [eventToVerify, setEventToVerify] = useState<CalendarEvent | null>(null);
  const [isJoinCodeModalOpen, setIsJoinCodeModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // --- Helper to Load Scoped User Data (Ensures pristine clean slate for new users) ---
  const loadUserData = (user: UserProfile | null) => {
    const uid = user?.id;
    setEvents(loadScoped<CalendarEvent>(uid, 'events'));
    setFriendGroups(loadScoped<FriendGroup>(uid, 'groups'));
    setTasks(loadScoped<Task>(uid, 'tasks'));
    setNotifications(loadScoped<NotificationItem>(uid, 'notifications'));
  };

  // --- LocalStorage & Firestore Sync (User Scoped) ---
  usePersistedCollection(currentUser?.id, 'events', events);
  usePersistedCollection(currentUser?.id, 'tasks', tasks);
  usePersistedCollection(currentUser?.id, 'groups', friendGroups);
  usePersistedCollection(currentUser?.id, 'notifications', notifications);

  useEffect(() => {
    saveStoredUser(currentUser);
    if (currentUser && auth.currentUser && auth.currentUser.uid === currentUser.id) {
      syncUserToFirestore(currentUser);
    }
  }, [currentUser]);

  // Mirror local data to Firestore (only for real Firebase-signed-in users)
  const isCloudUser = !!currentUser && currentUser.id !== 'guest';
  const eventsSync = useCloudSync(events, currentUser?.id, isCloudUser, saveEventToFirestore, deleteEventFromFirestore);
  const tasksSync = useCloudSync(tasks, currentUser?.id, isCloudUser, saveTaskToFirestore, deleteTaskFromFirestore);
  const groupsSync = useCloudSync(friendGroups, currentUser?.id, isCloudUser, saveGroupToFirestore, deleteGroupFromFirestore);
  const notificationsSync = useCloudSync(notifications, currentUser?.id, isCloudUser, saveNotificationToFirestore, deleteNotificationFromFirestore);

  // Invite codes of circles I own, derived from the groups so each code exists as /invites/{code}
  const ownedInvites = useMemo<InviteRecord[]>(
    () =>
      friendGroups
        .filter((g) => !g.ownerId || g.ownerId === currentUser?.id)
        .flatMap((g) =>
          (g.inviteCodes || []).map((c) => ({
            id: c.code,
            code: c.code,
            groupId: g.id,
            groupName: g.name,
            expiresAt: c.expiresAt,
            expiresAtMs: c.expiresAt ? Date.parse(c.expiresAt) : null,
            expirationType: c.expirationType ?? null,
            isUsed: c.isUsed,
            usedBy: c.usedBy ?? null,
            createdAt: c.createdAt,
          }))
        ),
    [friendGroups, currentUser?.id]
  );
  useCloudSync(ownedInvites, currentUser?.id, isCloudUser, saveInviteToFirestore, deleteInviteFromFirestore);

  // Apply realtime changes from Firestore: cloud wins per id, local-only items are kept (and pushed up)
  const applyChange = <T extends { id: string }>(
    change: CollectionChange<T>,
    setter: Dispatch<SetStateAction<T[]>>,
    markSynced: (items: T[], removedIds?: string[]) => void
  ) => {
    markSynced(change.upserts, change.removedIds);
    setter((prev) => {
      const map = new Map<string, T>(prev.map((i) => [i.id, i]));
      change.removedIds.forEach((id) => map.delete(id));
      change.upserts.forEach((i) => map.set(i.id, i));
      return Array.from(map.values());
    });
  };

  // Always call the latest join handler from inside the auth listener
  const joinHandlerRef = useRef<(code: string, name: string) => Promise<boolean>>(async () => false);

  // Firebase Auth State Listener + realtime subscriptions
  useEffect(() => {
    let cancelled = false;
    let unsubscribers: Array<() => void> = [];
    const stopSubscriptions = () => {
      unsubscribers.forEach((u) => u());
      unsubscribers = [];
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      stopSubscriptions();
      if (!fbUser) return;
      const userData = await getOrCreateUserProfile(fbUser);
      if (cancelled || auth.currentUser?.uid !== fbUser.uid) return;
      setCurrentUser(userData);
      loadUserData(userData);

      unsubscribers = [
        subscribeOwned<CalendarEvent>('events', (c) => applyChange(c, setEvents, eventsSync.markSynced)),
        subscribeOwned<Task>('tasks', (c) => applyChange(c, setTasks, tasksSync.markSynced)),
        subscribeOwned<NotificationItem>('notifications', (c) => applyChange(c, setNotifications, notificationsSync.markSynced)),
        subscribeGroups((c) => applyChange(c, setFriendGroups, groupsSync.markSynced)),
        // A friend used one of my codes: reflect it in my circle's invite list
        subscribeOwnedInvites(({ upserts }) => {
          const used = new Map(upserts.filter((i) => i.isUsed).map((i) => [i.code, i]));
          if (!used.size) return;
          setFriendGroups((prev) =>
            prev.map((g) => ({
              ...g,
              inviteCodes: (g.inviteCodes || []).map((c) =>
                used.has(c.code) && !c.isUsed ? { ...c, isUsed: true, usedBy: used.get(c.code)!.usedByName || 'a friend' } : c
              ),
            }))
          );
        }),
      ];

      // Apply an invite code the user entered before signing in
      const pendingCode = takePendingJoinCode();
      if (pendingCode) joinHandlerRef.current(pendingCode, userData.name);
    });

    return () => {
      cancelled = true;
      stopSubscriptions();
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    saveLargeTextMode(isLargeTextMode);
    if (isLargeTextMode) {
      document.documentElement.classList.add('text-lg');
    } else {
      document.documentElement.classList.remove('text-lg');
    }
  }, [isLargeTextMode]);

  // --- Toast Helper ---
  const addToast = (title: string, message: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // --- Modal Helpers ---
  const openNewEvent = (config: Partial<NewEventConfig> = {}) => {
    setNewEventConfig({
      isOpen: true,
      date: selectedDate || getTodayDateString(),
      startTime: '11:00',
      endTime: '13:00',
      ...config,
    });
  };

  const closeNewEvent = () => setNewEventConfig({ isOpen: false });

  // --- Automatic Attendance Check-In Verification Prompt ---
  useEffect(() => {
    const checkUpcomingMeetings = () => {
      const today = getTodayDateString();
      const now = new Date();
      const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

      events.forEach((evt) => {
        if (evt.status !== 'confirmed' || evt.date !== today || !evt.startTime || evt.userVerificationPromptSent) return;
        
        const [evtHours, evtMins] = evt.startTime.split(':').map(Number);
        const diffMinutes = (evtHours * 60 + evtMins) - currentTimeInMinutes;

        // Prompt if starting within 60 minutes
        if (diffMinutes <= 60 && diffMinutes >= -30) {
          setEvents((prev) =>
            prev.map((e) => (e.id === evt.id ? { ...e, userVerificationPromptSent: true } : e))
          );

          setNotifications((prev) => [
            {
              id: `notif-verify-${evt.id}-${Date.now()}`,
              title: `Almost Scheduled Time: ${evt.title}`,
              message: `Starting soon at ${evt.startTime}. Please verify if you are attending so your friends know!`,
              timestamp: 'Just now',
              type: 'attendance_verification',
              read: false,
              eventId: evt.id,
              groupId: evt.groupId,
              needsAction: true,
            },
            ...prev,
          ]);

          addToast('Almost Time! Verify Attendance', `Are you going to ${evt.title}? Tap to check in!`, 'reminder');
          setEventToVerify(evt);
          setIsVerificationModalOpen(true);
        }
      });
    };

    checkUpcomingMeetings();
    const interval = setInterval(checkUpcomingMeetings, 60000);
    return () => clearInterval(interval);
  }, [events]);

  // --- Event & Attendance Handlers ---
  const handleVerifyStatus = (eventId: string, status: CheckInStatus, note?: string) => {
    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventId) return evt;
        const currentUserId = currentUser?.id || 'm-1';
        const currentUserName = currentUser?.name || 'Alex (You)';

        const updatedAttendees = evt.attendees.map((att) =>
          att.memberId === currentUserId
            ? {
                ...att,
                checkInStatus: status,
                checkInNote: note || undefined,
                checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }
            : att
        );

        const statusLabels: Record<CheckInStatus, string> = {
          unverified: 'unverified',
          attending: 'has arrived 📍',
          on_the_way: 'is on the way 🚗',
          running_late: 'is running late ⏱️',
          cannot_make_it: 'cannot make it ✕',
        };

        const historyEntry = {
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: currentUserName,
          action: `Verified attendance: ${statusLabels[status]}${note ? ` ("${note}")` : ''}`,
        };

        return {
          ...evt,
          attendees: updatedAttendees,
          changeHistory: [...(evt.changeHistory || []), historyEntry],
        };
      })
    );

    addToast('Attendance Verified!', 'Your friends have been notified of your status.', 'success');
  };

  const handleCreateEvent = (newEventData: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    const newEvent: CalendarEvent = {
      ...newEventData,
      id: `evt-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setEvents((prev) => [newEvent, ...prev]);

    if (newEvent.isPersonal) {
      addToast('Personal Event Scheduled', `"${newEvent.title}" is now blocking your calendar.`, 'success');
    } else {
      const grp = friendGroups.find((g) => g.id === newEvent.groupId);
      setNotifications((prev) => [
        {
          id: `notif-created-${newEvent.id}`,
          title: `New Gathering: ${newEvent.title}`,
          message: `Scheduled with ${grp?.name || 'group'}. Invitations sent to ${newEvent.attendees.length} friends.`,
          timestamp: 'Just now',
          type: 'event_invite',
          read: false,
          eventId: newEvent.id,
          groupId: newEvent.groupId,
        },
        ...prev,
      ]);
      addToast('Gathering Scheduled', `All members of ${grp?.name || 'group'} have been notified!`, 'success');
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setSelectedEventForDetail(null);
    addToast('Event Removed', 'Event cancelled and calendar updated.', 'info');
  };

  const handleBroadcastChange = (eventId: string, updateMessage: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              changeHistory: [
                ...(e.changeHistory || []),
                {
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  author: currentUser?.name || 'Host',
                  action: updateMessage,
                },
              ],
            }
          : e
      )
    );

    const event = events.find((e) => e.id === eventId);
    setNotifications((prev) => [
      {
        id: `notif-update-${Date.now()}`,
        title: `Update: ${event?.title || 'Gathering'}`,
        message: updateMessage,
        timestamp: 'Just now',
        type: 'event_update',
        read: false,
        eventId,
        groupId: event?.groupId,
      },
      ...prev,
    ]);
    addToast('Broadcast Sent', 'All group members notified of this update.', 'success');
  };

  // --- Polling & Voting Handlers ---
  const handleVoteSlot = (eventId: string, slotId: string, available: boolean) => {
    const currentUserId = currentUser?.id || 'm-1';
    const currentUserName = currentUser?.name || 'Alex (You)';

    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventId || !evt.proposedSlots) return evt;
        const updatedSlots = evt.proposedSlots.map((slot) => {
          if (slot.id !== slotId) return slot;
          const votes = slot.votes.filter((v) => v.memberId !== currentUserId);
          votes.push({ memberId: currentUserId, memberName: currentUserName, available });
          return { ...slot, votes };
        });
        return { ...evt, proposedSlots: updatedSlots };
      })
    );

    addToast('Vote Recorded', available ? "Voted 'I'm Free'." : "Voted 'Busy'.", 'info');
  };

  const handleConfirmSlot = (eventId: string, selectedSlot: ProposedTimeSlot) => {
    setEvents((prev) =>
      prev.map((evt) =>
        evt.id === eventId
          ? {
              ...evt,
              status: 'confirmed',
              date: selectedSlot.date,
              startTime: selectedSlot.startTime,
              endTime: selectedSlot.endTime,
              selectedSlotId: selectedSlot.id,
              changeHistory: [
                ...(evt.changeHistory || []),
                {
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  author: currentUser?.name || 'Host',
                  action: `Confirmed time slot: ${selectedSlot.date} at ${selectedSlot.startTime}`,
                },
              ],
            }
          : evt
      )
    );

    const event = events.find((e) => e.id === eventId);
    setNotifications((prev) => [
      {
        id: `notif-slot-${Date.now()}`,
        title: `Time Locked: ${event?.title}`,
        message: `Finalized for ${selectedSlot.date} from ${selectedSlot.startTime} to ${selectedSlot.endTime}.`,
        timestamp: 'Just now',
        type: 'event_update',
        read: false,
        eventId,
        groupId: event?.groupId,
      },
      ...prev,
    ]);

    addToast('Time Slot Confirmed', `Locked in for ${selectedSlot.date} at ${selectedSlot.startTime}.`, 'success');
  };

  const handleProposeNewSlot = (eventId: string, newSlotData: Omit<ProposedTimeSlot, 'id' | 'votes'>) => {
    const newSlot: ProposedTimeSlot = {
      ...newSlotData,
      id: `slot-${Date.now()}`,
      votes: [{ memberId: currentUser?.id || 'm-1', memberName: currentUser?.name || 'Alex (You)', available: true }],
    };

    setEvents((prev) =>
      prev.map((evt) =>
        evt.id === eventId ? { ...evt, proposedSlots: [...(evt.proposedSlots || []), newSlot] } : evt
      )
    );

    addToast('Time Slot Added', 'Friends can now vote on this option.', 'info');
  };

  // --- Task Handlers ---
  const handleToggleTaskStatus = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t))
    );
  };

  const handleToggleTopPriority = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const newTop = !t.isDailyTopPriority;
        if (newTop) addToast('Star Pinned', `"${t.title}" is in your Top 3 daily priorities.`, 'success');
        return { ...t, isDailyTopPriority: newTop };
      })
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    addToast('Task Deleted', 'Removed from priorities.', 'info');
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((st) => (st.id === subtaskId ? { ...st, completed: !st.completed } : st)),
            }
          : t
      )
    );
  };

  const handleCreateTask = (newTaskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setTasks((prev) => [newTask, ...prev]);
    addToast('Task Added', `"${newTask.title}" added to daily list.`, 'success');
  };

  // --- Group Handlers ---
  const handleCreateGroup = (newGroupData: Omit<FriendGroup, 'id' | 'createdAt'>) => {
    const newGroup: FriendGroup = {
      ...newGroupData,
      id: `grp-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setFriendGroups((prev) => [...prev, newGroup]);
    addToast('Group Created', `"${newGroup.name}" is ready with custom color!`, 'success');
  };

  const handleAddMemberToGroup = (groupId: string, memberData: Omit<FriendGroup['members'][0], 'id'>) => {
    const newMember = { ...memberData, id: `m-${Date.now()}` };
    setFriendGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, members: [...g.members, newMember] } : g))
    );
    if (memberData.status === 'invited') {
      addToast('Invitation Sent', `Invitation created for ${memberData.name} (${memberData.email || 'Invite Code'}).`, 'success');
    } else {
      addToast('Friend Added', `${memberData.name} joined the circle.`, 'success');
    }
  };

  const handleQuickCreateGroup = (name: string, color: string = '#8A9A5B'): string => {
    const newId = `grp-${Date.now()}`;
    const newGroup: FriendGroup = {
      id: newId,
      name: name.trim(),
      color,
      textColor: '#2D5A27',
      bgLightColor: '#F3F6EC',
      borderColor: '#C9D6A8',
      icon: '🌿',
      members: [
        {
          id: currentUser?.id || 'm-1',
          name: currentUser?.name || 'Alex (You)',
          avatarColor: color,
          avatarEmoji: currentUser?.avatarEmoji || '🌿',
          role: 'admin',
          status: 'active',
          busySchedule: [],
        },
      ],
      inviteCodes: [],
      createdAt: new Date().toISOString().split('T')[0],
    };

    setFriendGroups((prev) => {
      return [...prev, newGroup];
    });

    addToast('Circle Created', `"${newGroup.name}" is ready for gathering plans!`, 'success');
    return newId;
  };

  const handleGenerateInviteCode = (
    groupId: string,
    guestName?: string,
    guestEmail?: string,
    expirationType: '7days' | 'permanent' = '7days'
  ): string => {
    const code = generateInviteCode();
    const expiresAt =
      expirationType === 'permanent'
        ? null
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    setFriendGroups((prev) => {
      const updated = prev.map((g) => {
        if (g.id !== groupId) return g;
        const newCode = {
          code,
          createdAt: new Date().toISOString(),
          expiresAt,
          expirationType,
          isUsed: false,
          invitedName: guestName,
          invitedEmail: guestEmail,
        };
        return {
          ...g,
          inviteCodes: [...(g.inviteCodes || []), newCode],
        };
      });

      return updated;
    });
    return code;
  };

  const handleJoinGroupByCode = async (codeToJoin: string, memberName: string, memberEmail?: string): Promise<boolean> => {
    const cleanCode = codeToJoin.trim().toUpperCase();

    // Joining needs a real account so friends are connected through Firebase
    if (!auth.currentUser) {
      savePendingJoinCode(cleanCode);
      addToast(
        'Sign in to join',
        'Create an account or sign in. Your invite code will be applied automatically.',
        'info'
      );
      return true;
    }

    const emojis = ['🌟', '☕', '🎨', '🚀', '📸', '🎵', '🌿', '🧭'];
    const member: FriendMember = {
      id: auth.currentUser.uid,
      name: memberName.trim() || currentUser?.name || 'New Friend',
      email: memberEmail?.trim() || currentUser?.email || undefined,
      avatarColor: currentUser?.avatarColor || '#8A9A5B',
      avatarEmoji: currentUser?.avatarEmoji || emojis[Math.floor(Math.random() * emojis.length)],
      role: 'member',
      status: 'active',
      busySchedule: [],
    };

    try {
      const { groupName } = await joinGroupWithInvite(cleanCode, member);
      addToast('Joined Circle!', `Welcome to ${groupName}!`, 'success');
      return true;
    } catch (err) {
      const code = err instanceof JoinError ? err.code : 'failed';
      const messages: Record<string, [string, string]> = {
        invalid: ['Invalid or Expired Code', 'Please check the invite code and try again.'],
        used: ['Code Already Used', 'This one-time invite code has already been claimed.'],
        expired: ['Code Expired', 'This invite code has expired. Please request a new one.'],
        'already-member': ['Could not join', 'You may already be in this circle, or the code is no longer valid.'],
        failed: ['Could not join', 'Something went wrong. Please try again.'],
      };
      const [title, message] = messages[code] || messages.failed;
      addToast(title, message, 'warning');
      return false;
    }
  };
  joinHandlerRef.current = (code, name) => handleJoinGroupByCode(code, name);

  // --- 1-Click Plan Gathering from Free Date Matcher ---
  const handlePlanMeetupForMatch = (match: FreeDateMatch, slot?: MatchedTimeSlot) => {
    openNewEvent({
      title: `${match.groupName} Gathering`,
      date: match.date,
      startTime: slot ? slot.startTime : '14:00',
      endTime: slot ? slot.endTime : '17:00',
      groupId: match.groupId,
      isPersonal: false,
      startWithPoll: false,
    });
  };

  // --- Search Filters ---
  const searchedEvents = searchQuery.trim()
    ? events.filter(
        (e) =>
          e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.groupName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : events;

  const searchedTasks = searchQuery.trim()
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tasks;

  const handleLoginSuccess = (user: UserProfile) => {
    clearLegacyData(); // purge any old global sample data from previous demo sessions
    setCurrentUser(user);
    loadUserData(user);
    addToast('Welcome to NaddD!', `Signed in as ${user.name}`, 'success');
  };

  const handleContinueAsGuest = () => {
    clearLegacyData();
    setCurrentUser(createGuestUser());
    loadUserData(null); // clean slate for guest
    addToast('Guest Mode Activated', 'Explore gatherings with a clean slate.', 'info');
  };

  const handleSignOut = async () => {
    try {
      await signOutFirebase();
    } catch (e) {
      console.error('Firebase signOut error:', e);
    }
    setCurrentUser(null);
    loadUserData(null);
    clearStoredUser();
    addToast('Signed Out', 'You have been safely signed out.', 'info');
  };

  const handleClearAllData = () => {
    if (currentUser) clearScoped(currentUser.id);
    clearLegacyData();
    loadUserData(null);
    addToast('Clean Slate', 'Your calendar, groups, and plans have been cleared.', 'info');
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // Render Login view if user is not signed in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] text-[#3D3A35] flex flex-col font-sans selection:bg-[#8A9A5B]/20 selection:text-[#3D3A35]">
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onContinueAsGuest={handleContinueAsGuest}
          onOpenJoinCode={() => setIsJoinCodeModalOpen(true)}
        />
        <JoinCodeModal
          isOpen={isJoinCodeModalOpen}
          onClose={() => setIsJoinCodeModalOpen(false)}
          friendGroups={friendGroups}
          onJoinCode={handleJoinGroupByCode}
        />
        <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#FDFCF8] text-[#3D3A35] flex flex-col font-sans selection:bg-[#8A9A5B]/20 selection:text-[#3D3A35] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      
      {/* Main Header */}
      <Header
        currentView={currentView}
        onSelectView={handleSelectView}
        unreadCount={unreadNotificationsCount}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        onOpenNewEvent={() => openNewEvent()}
        onOpenNewTask={() => setIsNewTaskModalOpen(true)}
        onOpenJoinCode={() => setIsJoinCodeModalOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentUser={currentUser}
        onUpdateProfile={(updated) => {
          if (!currentUser) return;
          setCurrentUser({ ...currentUser, ...updated });
          addToast('Profile Updated', 'Your profile details have been saved.', 'success');
        }}
        onSignOut={handleSignOut}
        onOpenLogin={() => setCurrentUser(null)}
        onClearAllData={handleClearAllData}
      />

      {/* Main Content Area */}
      <main 
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"
        {...swipeHandlers}
      >

        {/* Banner for upcoming meeting and quick attendance check-ins (when events exist) */}
        {events.length > 0 && (
          <UpcomingBanner
            events={events}
            friendGroups={friendGroups}
            onOpenEvent={(evt) => setSelectedEventForDetail(evt)}
            onQuickNotify={(evt) => {
              handleBroadcastChange(evt.id, 'Friendly reminder: Gathering is coming up soon!');
            }}
            onOpenVerificationModal={(evt) => {
              setEventToVerify(evt);
              setIsVerificationModalOpen(true);
            }}
          />
        )}

        {/* 3 Core Primary Views with Slide Transition */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: slideDirection * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -slideDirection * 30 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full"
          >
            {currentView === 'calendar' && (
              <CalendarView
                events={searchedEvents}
                tasks={searchedTasks}
                friendGroups={friendGroups}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onOpenEvent={(evt) => setSelectedEventForDetail(evt)}
                onOpenNewEventWithDate={(date, isPersonal = false, groupId) => {
                  setSelectedDate(date);
                  openNewEvent({ date, isPersonal, groupId });
                }}
                onGoToMatcher={() => handleSelectView('matcher')}
                isLargeTextMode={isLargeTextMode}
              />
            )}

            {currentView === 'matcher' && (
              <FreeDateMatcherView
                friendGroups={friendGroups}
                events={events}
                tasks={tasks}
                onPlanMeetupForMatch={handlePlanMeetupForMatch}
                onOpenNewEventWithPoll={() => openNewEvent({ startWithPoll: true })}
                onRefreshMatches={() => {
                  addToast('Scan Completed', 'Mutual free dates updated across all friend groups.', 'success');
                }}
                onNavigateToGroups={() => handleSelectView('groups')}
                isLargeTextMode={isLargeTextMode}
              />
            )}

            {currentView === 'groups' && (
              <FriendGroupsView
                friendGroups={friendGroups}
                events={events}
                onOpenNewEventForGroup={(groupId) => openNewEvent({ groupId, isPersonal: false })}
                onCreateGroup={handleCreateGroup}
                onAddMemberToGroup={handleAddMemberToGroup}
                onGenerateInviteCode={handleGenerateInviteCode}
                onJoinGroupByCode={handleJoinGroupByCode}
                onOpenJoinCode={() => setIsJoinCodeModalOpen(true)}
                onOpenEvent={(evt) => setSelectedEventForDetail(evt)}
                onGoToMatcherForGroup={() => handleSelectView('matcher')}
                isLargeTextMode={isLargeTextMode}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8E4D9] bg-white py-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] mt-12 text-center text-xs text-[#8E8A81]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium">
            <strong className="text-[#3D3A35] font-serif">NaddD</strong> • Personal calendar, mutual friend free date matching & daily task organizer
          </p>
          <div className="flex items-center gap-4 text-[#AFA99E]">
            <span>Clean & Accessible</span>
            <span>•</span>
            <span>Natural Earth Tones</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <JoinCodeModal
        isOpen={isJoinCodeModalOpen}
        onClose={() => setIsJoinCodeModalOpen(false)}
        friendGroups={friendGroups}
        onJoinCode={handleJoinGroupByCode}
        currentUserName={currentUser?.name}
        currentUserEmail={currentUser?.email}
      />

      <MeetingVerificationModal
        isOpen={isVerificationModalOpen}
        event={eventToVerify}
        friendGroup={friendGroups.find((g) => g.id === eventToVerify?.groupId)}
        onClose={() => setIsVerificationModalOpen(false)}
        onVerifyStatus={handleVerifyStatus}
      />

      <EventDetailModal
        isOpen={!!selectedEventForDetail}
        event={selectedEventForDetail}
        friendGroup={friendGroups.find((g) => g.id === selectedEventForDetail?.groupId)}
        currentUserId={currentUser?.id || 'm-1'}
        onClose={() => setSelectedEventForDetail(null)}
        onDeleteEvent={handleDeleteEvent}
        onOpenVerificationModal={(evt) => {
          setSelectedEventForDetail(null);
          setEventToVerify(evt);
          setIsVerificationModalOpen(true);
        }}
        onBroadcastChange={handleBroadcastChange}
        onUpdateEventStatus={(eventId, status) => {
          setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, status } : e)));
        }}
        onVoteSlot={handleVoteSlot}
        onConfirmSlot={handleConfirmSlot}
      />

      <NewEventModal
        isOpen={newEventConfig.isOpen}
        preselectedGroupId={newEventConfig.groupId}
        friendGroups={friendGroups}
        startWithPoll={newEventConfig.startWithPoll}
        initialDate={newEventConfig.date}
        initialStartTime={newEventConfig.startTime}
        initialEndTime={newEventConfig.endTime}
        initialTitle={newEventConfig.title}
        initialIsPersonal={newEventConfig.isPersonal}
        onClose={closeNewEvent}
        onCreateEvent={handleCreateEvent}
        onQuickCreateGroup={handleQuickCreateGroup}
        onGenerateInviteCode={handleGenerateInviteCode}
      />

      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        projects={projects}
        onClose={() => setIsNewTaskModalOpen(false)}
        onCreateTask={handleCreateTask}
      />

      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        notifications={notifications}
        events={events}
        onClose={() => setIsNotificationDrawerOpen(false)}
        onMarkAsRead={(id) => {
          setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        }}
        onMarkAllAsRead={() => {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        }}
        onClearAll={() => setNotifications([])}
        onOpenVerificationModal={(evt) => {
          setEventToVerify(evt);
          setIsVerificationModalOpen(true);
        }}
        onOpenEvent={(evt) => setSelectedEventForDetail(evt)}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

    </div>
  );
}
