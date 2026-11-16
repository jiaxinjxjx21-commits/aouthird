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
  leaveGroupInFirestore,
  removeMemberInFirestore,
  saveEventToFirestore, 
  deleteEventFromFirestore, 
  saveTaskToFirestore, 
  deleteTaskFromFirestore, 
  saveNotificationToFirestore,
  fetchEventById,
  deleteNotificationFromFirestore,
  saveInviteToFirestore,
  deleteInviteFromFirestore,
  joinGroupWithInvite,
  buildInviteRecord,
  sendNotificationToMembers,
  ensureInviteLive,
  InviteStatus,
  JoinError,
  InviteRecord,
  subscribeOwned,
  subscribeGroups,
  subscribeGroupEvents,
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
import { generateInviteCode, normalizeInviteCode } from './utils/inviteCode';
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

interface JoinResult {
  ok: boolean;
  error?: string;
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
        .filter((g) => !!g.roomCode && (!g.ownerId || g.ownerId === currentUser?.id))
        .map(buildInviteRecord),
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

  // Notification ids already shown as a pop-up (so a re-delivered snapshot never toasts twice)
  const toastedNotifIds = useRef<Set<string>>(new Set());

  // Latest events, readable from long-lived listeners
  const eventsRef = useRef<CalendarEvent[]>(events);
  eventsRef.current = events;
  const pullingEventIds = useRef<Set<string>>(new Set());

  /**
   * A friend's notification points at a gathering. Make sure that gathering is on my calendar:
   * read it directly (retrying briefly, because the host's save can land a moment after the notification).
   */
  const pullEventFromNotification = async (eventId: string) => {
    if (pullingEventIds.current.has(eventId)) return;
    pullingEventIds.current.add(eventId);
    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        const evt = await fetchEventById(eventId);
        if (evt) {
          eventsSync.markSynced([evt]);
          setEvents((prev) => (prev.some((e) => e.id === evt.id) ? prev.map((e) => (e.id === evt.id ? evt : e)) : [evt, ...prev]));
          return;
        }
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    } finally {
      pullingEventIds.current.delete(eventId);
    }
  };

  /** Sends a notification to the other members of a circle. Returns how many friends it was sent to. */
  const notifyGroupMembers = (
    groupId: string | undefined,
    n: { baseId: string; title: string; message: string; type: NotificationItem['type']; eventId?: string },
    beforeSend?: Promise<unknown>
  ): number => {
    if (!groupId || !auth.currentUser) return 0;
    const group = friendGroups.find((g) => g.id === groupId);
    if (!group) return 0;
    const me = auth.currentUser.uid;
    // memberIds are real accounts; members without an account (old demo entries) can't receive anything
    const recipients = (group.memberIds ?? []).filter((id) => id !== me);
    if (!recipients.length) return 0;
    // Wait for `beforeSend` (e.g. saving the event) so the notification never arrives before its event does
    (beforeSend ?? Promise.resolve())
      .catch(() => undefined)
      .then(() => sendNotificationToMembers(groupId, recipients, { ...n, senderName: currentUser?.name }))
      .catch((e) => console.warn('Notify failed:', e));
    return recipients.length;
  };

  // Always call the latest join handler from inside the auth listener
  const joinHandlerRef = useRef<(code: string, name: string) => Promise<JoinResult>>(async () => ({ ok: false }));

  // Gatherings of every circle I belong to (so friends' events show up on my calendar too)
  const myCircleIdsKey = useMemo(
    () =>
      isCloudUser && currentUser
        ? friendGroups
            .filter((g) => g.memberIds?.includes(currentUser.id))
            .map((g) => g.id)
            .sort()
            .join('|')
        : '',
    [friendGroups, currentUser?.id, isCloudUser]
  );
  useEffect(() => {
    if (!myCircleIdsKey || !auth.currentUser) return;
    const unsubs = myCircleIdsKey
      .split('|')
      .map((gid) => subscribeGroupEvents<CalendarEvent>(gid, (c) => applyChange(c, setEvents, eventsSync.markSynced)));
    return () => unsubs.forEach((u) => u());
  }, [myCircleIdsKey]);

  // A friend who joined after a gathering was created gets their own attendee row (so they can RSVP / check in)
  useEffect(() => {
    if (!isCloudUser || !currentUser || !auth.currentUser || auth.currentUser.uid !== currentUser.id) return;
    const me = currentUser;
    const myCircles = new Set(friendGroups.filter((g) => g.memberIds?.includes(me.id)).map((g) => g.id));
    const missing = events.filter(
      (e) =>
        !e.isPersonal &&
        e.groupId &&
        myCircles.has(e.groupId) &&
        e.status !== 'cancelled' &&
        !e.attendees.some((a) => a.memberId === me.id)
    );
    if (!missing.length) return;
    const ids = new Set(missing.map((e) => e.id));
    setEvents((prev) =>
      prev.map((e) =>
        ids.has(e.id)
          ? {
              ...e,
              attendees: [
                ...e.attendees,
                { memberId: me.id, name: me.name, avatarColor: me.avatarColor, status: 'pending' as const, checkInStatus: 'unverified' as CheckInStatus },
              ],
            }
          : e
      )
    );
  }, [events, friendGroups, currentUser?.id, isCloudUser]);

  // Invite link (?join=NADD-XXXXXX): remember the code until the user is signed in, then join automatically
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const linked = url.searchParams.get('join');
      if (!linked) return;
      savePendingJoinCode(normalizeInviteCode(linked));
      url.searchParams.delete('join');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    } catch {
      /* malformed URL: ignore */
    }
  }, []);

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
        subscribeOwned<NotificationItem>('notifications', (c) => {
          applyChange(c, setNotifications, notificationsSync.markSynced);
          // Make sure gatherings mentioned by friends are on my calendar (covers a missed/blocked live listener)
          c.upserts.forEach((n) => {
            if (n.eventId && n.senderId && n.senderId !== fbUser.uid && n.type !== 'event_reminder' &&
                !eventsRef.current.some((e) => e.id === n.eventId)) {
              pullEventFromNotification(n.eventId);
            }
          });
          // Pop up only brand-new notifications from friends, not what was already there at sign-in
          if (c.initial) return;
          c.upserts.forEach((n) => {
            if (n.read || !n.senderId || n.senderId === fbUser.uid || toastedNotifIds.current.has(n.id)) return;
            toastedNotifIds.current.add(n.id);
            addToast(n.title, n.message, 'info');
          });
        }),
        subscribeGroups((c) => applyChange(c, setFriendGroups, groupsSync.markSynced)),
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
  // Remembered per user on this device (the event itself is shared, so a flag on it would silence everyone else)
  const promptedEventIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = currentUser ? localStorage.getItem(`naddd_${currentUser.id}_prompted`) : null;
      promptedEventIds.current = new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      promptedEventIds.current = new Set();
    }
  }, [currentUser?.id]);

  useEffect(() => {
    const checkUpcomingMeetings = () => {
      const today = getTodayDateString();
      const now = new Date();
      const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

      events.forEach((evt) => {
        if (evt.status !== 'confirmed' || evt.date !== today || !evt.startTime) return;
        if (evt.userVerificationPromptSent || promptedEventIds.current.has(evt.id)) return;
        
        const [evtHours, evtMins] = evt.startTime.split(':').map(Number);
        const diffMinutes = (evtHours * 60 + evtMins) - currentTimeInMinutes;

        // Prompt if starting within 60 minutes
        if (diffMinutes <= 60 && diffMinutes >= -30) {
          promptedEventIds.current.add(evt.id);
          try {
            if (currentUser) {
              localStorage.setItem(`naddd_${currentUser.id}_prompted`, JSON.stringify(Array.from(promptedEventIds.current)));
            }
          } catch {
            /* storage full or blocked: worst case the prompt shows again */
          }

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

    const checkedEvent = events.find((e) => e.id === eventId);
    const labels: Record<CheckInStatus, string> = {
      unverified: 'has not confirmed yet',
      attending: 'has arrived 📍',
      on_the_way: 'is on the way 🚗',
      running_late: 'is running late ⏱️',
      cannot_make_it: 'cannot make it ✕',
    };
    const sentTo = notifyGroupMembers(checkedEvent?.groupId, {
      baseId: `notif-checkin-${Date.now()}`,
      title: `${currentUser?.name || 'A friend'} ${labels[status]}`,
      message: `${checkedEvent?.title || 'Gathering'}${note ? ` — "${note}"` : ''}`,
      type: 'event_update',
      eventId,
    });
    addToast(
      'Attendance Verified!',
      sentTo > 0 ? 'Your friends have been notified of your status.' : 'Saved. No other friends are in this group yet to notify.',
      'success'
    );
  };

  const handleCreateEvent = (newEventData: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    // The planner uses a placeholder id ('m-1') for "me"; store the real account id so friends see who is who
    const meId = currentUser?.id;
    const isMe = (id: string) => !!meId && (id === 'm-1' || id === meId);
    const newEvent: CalendarEvent = {
      ...newEventData,
      id: `evt-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      attendees: newEventData.attendees.map((a) =>
        isMe(a.memberId) ? { ...a, memberId: meId!, name: currentUser?.name || a.name, status: 'accepted' as const } : a
      ),
      proposedSlots: newEventData.proposedSlots?.map((s) => ({
        ...s,
        votes: s.votes.map((v) => (isMe(v.memberId) ? { ...v, memberId: meId!, memberName: currentUser?.name || v.memberName } : v)),
      })),
    };
    setEvents((prev) => [newEvent, ...prev]);

    if (newEvent.isPersonal) {
      addToast('Personal Event Scheduled', `"${newEvent.title}" is now blocking your calendar.`, 'success');
    } else {
      const grp = friendGroups.find((g) => g.id === newEvent.groupId);
      // Save the gathering first, then notify, so friends can open it the moment the notification arrives
      const saved = isCloudUser ? saveEventToFirestore(newEvent).then(() => eventsSync.markSynced([newEvent])) : undefined;
      const sentTo = notifyGroupMembers(newEvent.groupId, {
        baseId: `notif-created-${newEvent.id}`,
        title: `New Gathering: ${newEvent.title}`,
        message: `${currentUser?.name || 'A friend'} planned "${newEvent.title}" for ${newEvent.date} at ${newEvent.startTime}${newEvent.location ? ` · ${newEvent.location}` : ''} (${grp?.name || 'group'}).`,
        type: 'event_invite',
        eventId: newEvent.id,
      }, saved);
      setNotifications((prev) => [
        {
          id: `notif-created-${newEvent.id}`,
          title: `New Gathering: ${newEvent.title}`,
          message: `Scheduled with ${grp?.name || 'group'}. ${sentTo > 0 ? `Notified ${sentTo} friend${sentTo > 1 ? 's' : ''}.` : 'No friends have joined yet.'}`,
          timestamp: 'Just now',
          type: 'event_invite',
          read: false,
          eventId: newEvent.id,
          groupId: newEvent.groupId,
        },
        ...prev,
      ]);
      addToast(
        'Gathering Scheduled',
        sentTo > 0
          ? `${sentTo} friend${sentTo > 1 ? 's' : ''} in ${grp?.name || 'the group'} ${sentTo > 1 ? 'were' : 'was'} notified.`
          : `Saved. Nobody else has joined ${grp?.name || 'this group'} yet, so no one was notified. Share the room code first.`,
        sentTo > 0 ? 'success' : 'info'
      );
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    const target = events.find((e) => e.id === eventId);
    if (target?.ownerId && currentUser && target.ownerId !== currentUser.id) {
      setSelectedEventForDetail(null);
      addToast('Only the host can cancel', 'This gathering belongs to the person who planned it. You can decline it instead.', 'info');
      return;
    }
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
    const sentTo = notifyGroupMembers(event?.groupId, {
      baseId: `notif-update-${Date.now()}`,
      title: `Update: ${event?.title || 'Gathering'}`,
      message: `${currentUser?.name || 'The host'}: ${updateMessage}`,
      type: 'event_update',
      eventId,
    });
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
    addToast(
      sentTo > 0 ? 'Broadcast Sent' : 'No one to notify yet',
      sentTo > 0
        ? `${sentTo} friend${sentTo > 1 ? 's' : ''} notified of this update.`
        : 'No friends have joined this group yet. Share the room code so they can receive updates.',
      sentTo > 0 ? 'success' : 'info'
    );
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
    notifyGroupMembers(event?.groupId, {
      baseId: `notif-slot-${Date.now()}`,
      title: `Time Locked: ${event?.title}`,
      message: `Finalized for ${selectedSlot.date} from ${selectedSlot.startTime} to ${selectedSlot.endTime}.`,
      type: 'event_update',
      eventId,
    });
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
  const buildCreatorMember = (color: string): FriendMember => ({
    id: currentUser?.id || 'm-1',
    name: currentUser?.name || 'Alex (You)',
    avatarColor: color,
    avatarEmoji: currentUser?.avatarEmoji || '🌿',
    role: 'admin',
    status: 'active',
    busySchedule: [],
  });

  const handleCreateGroup = (newGroupData: Omit<FriendGroup, 'id' | 'createdAt'>) => {
    const newGroup: FriendGroup = {
      ...newGroupData,
      id: `grp-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      members: [buildCreatorMember(newGroupData.color)],
      roomCode: generateInviteCode(), // one permanent, reusable code for the whole room
    };
    setFriendGroups((prev) => [...prev, newGroup]);
    addToast('Group Created', `"${newGroup.name}" is ready. Share its room code to invite friends!`, 'success');
  };

  const handleAddMemberToGroup = (groupId: string, memberData: Omit<FriendGroup['members'][0], 'id'>) => {
    const newMember = { ...memberData, id: `m-${Date.now()}` };
    setFriendGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, members: [...g.members, newMember] } : g))
    );
    addToast('Friend Added', `${memberData.name} joined the circle.`, 'success');
  };

  /** Creates a circle on the fly (from the + Event planner). Returns its id AND room code so the code can be shown right away. */
  const handleQuickCreateGroup = (name: string, color: string = '#8A9A5B'): { id: string; roomCode: string } => {
    const newId = `grp-${Date.now()}`;
    const roomCode = generateInviteCode();
    const newGroup: FriendGroup = {
      id: newId,
      name: name.trim(),
      color,
      textColor: '#2D5A27',
      bgLightColor: '#F3F6EC',
      borderColor: '#C9D6A8',
      icon: '🌿',
      members: [buildCreatorMember(color)],
      roomCode,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setFriendGroups((prev) => [...prev, newGroup]);
    addToast('Circle Created', `"${newGroup.name}" is ready for gathering plans!`, 'success');
    return { id: newId, roomCode };
  };

  /** The room's permanent invite code (same every time, never expires). Old circles get one on first use. */
  const handleGenerateInviteCode = (groupId: string): string => {
    const existing = friendGroups.find((g) => g.id === groupId);
    if (existing?.roomCode) return existing.roomCode;
    const code = generateInviteCode();
    setFriendGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, roomCode: g.roomCode || code } : g)));
    return code;
  };

  /** Owner: delete the circle. It disappears for every member (their copy is removed in realtime). */
  const handleDeleteGroup = (groupId: string) => {
    const group = friendGroups.find((g) => g.id === groupId);
    if (!group) return;
    setFriendGroups((prev) => prev.filter((g) => g.id !== groupId));
    setEvents((prev) => prev.filter((e) => e.groupId !== groupId));
    addToast('Group Deleted', `"${group.name}" and its members were removed.`, 'info');
  };

  /** Member: leave a circle that someone else owns. */
  const handleLeaveGroup = (groupId: string) => {
    const group = friendGroups.find((g) => g.id === groupId);
    if (!group) return;
    groupsSync.markSynced([], [groupId]); // don't try to delete the owner's circle from the cloud
    leaveGroupInFirestore(group).catch((e) => console.warn('Leave failed:', e));
    setFriendGroups((prev) => prev.filter((g) => g.id !== groupId));
    eventsSync.markSynced(
      [],
      events.filter((e) => e.groupId === groupId && e.ownerId !== currentUser?.id).map((e) => e.id)
    );
    setEvents((prev) => prev.filter((e) => e.groupId !== groupId));
    addToast('Left Group', `You left "${group.name}".`, 'info');
  };

  /** Owner: remove one member from a circle. */
  const handleRemoveMember = (groupId: string, memberId: string) => {
    const group = friendGroups.find((g) => g.id === groupId);
    const member = group?.members.find((m) => m.id === memberId);
    if (!group || !member) return;
    const remaining = group.members.filter((m) => m.id !== memberId);
    setFriendGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, members: remaining } : g)));
    removeMemberInFirestore(groupId, memberId, remaining).catch((e) => console.warn('Remove member failed:', e));
    addToast('Member Removed', `${member.name} was removed from "${group.name}".`, 'info');
  };

  /** Publishes the room + its code to the cloud and confirms a friend can find it. */
  const handleEnsureInviteLive = (groupId: string): Promise<InviteStatus> => {
    const group = friendGroups.find((g) => g.id === groupId);
    if (!group) return Promise.resolve('missing');
    return ensureInviteLive(group);
  };

  /** Join a circle with its room code (works from any device or account). */
  const handleJoinGroupByCode = async (codeToJoin: string, memberName: string, memberEmail?: string): Promise<JoinResult> => {
    const cleanCode = normalizeInviteCode(codeToJoin);

    // Joining needs a real account so friends are connected through Firebase
    if (!auth.currentUser) {
      savePendingJoinCode(cleanCode);
      addToast(
        'Sign in to join',
        'Create an account or sign in. Your room code will be applied automatically.',
        'info'
      );
      return { ok: true };
    }

    // Already in this circle on this account?
    const mine = friendGroups.find((g) => g.roomCode === cleanCode);
    if (mine && mine.members.some((m) => m.id === auth.currentUser!.uid)) {
      addToast('Already a Member', `You are already in ${mine.name}.`, 'info');
      return { ok: true };
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
      const { groupName, alreadyMember } = await joinGroupWithInvite(cleanCode, member);
      if (alreadyMember) addToast('Already a Member', `You are already in ${groupName}.`, 'info');
      else addToast('Joined Circle!', `Welcome to ${groupName}!`, 'success');
      return { ok: true };
    } catch (err) {
      const code = err instanceof JoinError ? err.code : 'failed';
      const messages: Record<string, [string, string]> = {
        invalid: ['Room code not found', 'No room matches this code. Ask the host to open "Invite Friends" once while online, then try again.'],
        used: ['Code no longer valid', 'This is an old one-time code that was already used. Ask for the room code instead.'],
        expired: ['Code no longer valid', 'This is an old expiring code. Ask the host for the room code instead.'],
        'group-missing': ['Room no longer exists', 'The host may have deleted this room.'],
        denied: ['Not allowed to join', 'The database refused the request. The host needs to deploy the latest firestore.rules (see README), then try again.'],
        offline: ['You seem to be offline', 'Check your connection and try again.'],
        failed: ['Could not join', 'Something went wrong. Please check your connection and try again.'],
      };
      const [title, message] = messages[code] || messages.failed;
      addToast(title, message, 'warning');
      return { ok: false, error: message };
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
            currentUserId={currentUser?.id || 'm-1'}
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
                currentUserId={currentUser?.id}
                onGenerateInviteCode={handleGenerateInviteCode}
                onEnsureInviteLive={handleEnsureInviteLive}
                onDeleteGroup={handleDeleteGroup}
                onLeaveGroup={handleLeaveGroup}
                onRemoveMember={handleRemoveMember}
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
        currentUserId={currentUser?.id || 'm-1'}
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
