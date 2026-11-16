import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  getDocFromServer,
  collection,
  setDoc,
  getDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
  arrayUnion,
  arrayRemove,
  updateDoc,
  Query,
  Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, FriendGroup, FriendMember, CalendarEvent, Task, NotificationItem } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with database ID (CRITICAL: Required for named firestoreDatabaseId)
// ignoreUndefinedProperties: optional fields (e.g. description?: string) are often `undefined`,
// and Firestore rejects undefined values unless this is enabled.
export const db = initializeFirestore(
  app,
  { ignoreUndefinedProperties: true },
  firebaseConfig.firestoreDatabaseId
);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Operation Types for error logging
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

let pendingProfileWrite: Promise<void> | null = null;

function buildProfileFromFirebaseUser(fbUser: { uid: string; displayName: string | null; email: string | null }): UserProfile {
  return {
    id: fbUser.uid,
    name: fbUser.displayName || 'Friend',
    email: fbUser.email || '',
    avatarColor: '#8A9A5B',
    avatarEmoji: '🌿',
    role: 'member',
    tagline: 'Gathering organizer',
    authProvider: 'google',
    createdAt: new Date().toISOString().split('T')[0],
  };
}

/** Load (or create) the Firestore profile for a signed-in Firebase user. Never throws. */
export async function getOrCreateUserProfile(fbUser: { uid: string; displayName: string | null; email: string | null }): Promise<UserProfile> {
  // During sign-up the profile doc is written right after the account is created;
  // wait for it so we don't create a default profile first.
  if (pendingProfileWrite) await pendingProfileWrite;
  const userDocRef = doc(db, 'users', fbUser.uid);
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) return snap.data() as UserProfile;
    const profile = buildProfileFromFirebaseUser(fbUser);
    await setDoc(userDocRef, profile);
    return profile;
  } catch (err) {
    // Firestore unreachable / rules rejected: don't block sign-in, fall back to a local profile.
    console.warn('Firestore profile unavailable, using local profile:', err);
    return buildProfileFromFirebaseUser(fbUser);
  }
}

// --- Auth Helper Functions ---
export async function signInWithGoogle(): Promise<UserProfile | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return await getOrCreateUserProfile(result.user);
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    throw error;
  }
}

export interface EmailSignUpInput {
  name: string;
  email: string;
  password: string;
  avatarColor: string;
  phone?: string;
  tagline?: string;
}

/** Create a real Firebase Auth account (email + password) and its profile document. */
export async function signUpWithEmail(input: EmailSignUpInput): Promise<UserProfile> {
  let release!: () => void;
  pendingProfileWrite = new Promise<void>((resolve) => (release = resolve));
  try {
    const cred = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
    await updateProfile(cred.user, { displayName: input.name }).catch(() => undefined);
    const profile: UserProfile = {
      id: cred.user.uid,
      name: input.name,
      email: cred.user.email || input.email.trim(),
      phone: input.phone,
      avatarColor: input.avatarColor,
      role: 'admin',
      authProvider: 'email',
      tagline: input.tagline || 'Active organizer & friend',
      createdAt: new Date().toISOString().split('T')[0],
    };
    try {
      await setDoc(doc(db, 'users', cred.user.uid), profile);
    } catch (err) {
      console.warn('Could not save profile to Firestore:', err);
    }
    return profile;
  } finally {
    release();
    pendingProfileWrite = null;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<UserProfile> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return getOrCreateUserProfile(cred.user);
}

export async function sendResetEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/** Human-readable message for Firebase Auth / Firestore errors. */
export function describeAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/email-already-in-use': return 'This email is already registered. Try signing in instead.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/weak-password': return 'Password should be at least 6 characters.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Incorrect email or password.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed': return 'Network error. Check your connection and try again.';
    case 'auth/operation-not-allowed': return 'This sign-in method is not enabled in the Firebase console (Authentication > Sign-in method).';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request': return 'Sign-in was cancelled.';
    case 'auth/popup-blocked': return 'The sign-in popup was blocked by your browser.';
    case 'auth/unauthorized-domain': return 'This domain is not authorized in Firebase (Authentication > Settings > Authorized domains).';
    default: return 'Something went wrong. Please try again.';
  }
}

export async function signOutFirebase(): Promise<void> {
  await fbSignOut(auth);
}

// --- Firestore Sync Helpers ---
export async function syncUserToFirestore(user: UserProfile): Promise<void> {
  // Only sync to Firestore if user is authenticated in Firebase Auth and UID matches
  if (!auth.currentUser || auth.currentUser.uid !== user.id) {
    return;
  }
  try {
    await setDoc(doc(db, 'users', user.id), user, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.id}`);
  }
}

export async function saveGroupToFirestore(group: FriendGroup): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  // memberIds / joinCode are managed by the join flow; never overwrite them with a stale copy.
  const { memberIds: _memberIds, joinCode: _joinCode, ...data } = group;
  try {
    await setDoc(
      doc(db, 'groups', group.id),
      { ...data, ownerId: group.ownerId ?? user.uid, memberIds: arrayUnion(user.uid) },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `groups/${group.id}`);
  }
}

export async function deleteGroupFromFirestore(groupId: string): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await deleteDoc(doc(db, 'groups', groupId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `groups/${groupId}`);
  }
}

export async function saveEventToFirestore(event: CalendarEvent): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, 'events', event.id), { ...event, ownerId: event.ownerId ?? auth.currentUser.uid }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `events/${event.id}`);
  }
}

/** Read one event by id (a plain get, which security rules allow for circle members). */
export async function fetchEventById(eventId: string): Promise<CalendarEvent | null> {
  if (!auth.currentUser) return null;
  try {
    const snap = await getDoc(doc(db, 'events', eventId));
    return snap.exists() ? (snap.data() as CalendarEvent) : null;
  } catch (error) {
    console.warn(`Could not read event ${eventId}:`, error);
    return null;
  }
}

export async function deleteEventFromFirestore(eventId: string): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await deleteDoc(doc(db, 'events', eventId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `events/${eventId}`);
  }
}

export async function saveTaskToFirestore(task: Task): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, 'tasks', task.id), { ...task, ownerId: task.ownerId ?? auth.currentUser.uid }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `tasks/${task.id}`);
  }
}

export async function deleteTaskFromFirestore(taskId: string): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tasks/${taskId}`);
  }
}

export async function saveNotificationToFirestore(notif: NotificationItem): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, 'notifications', notif.id), { ...notif, ownerId: notif.ownerId ?? auth.currentUser.uid }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `notifications/${notif.id}`);
  }
}

// --- Invites (doc id = invite code) ---
export interface InviteRecord {
  id: string; // the code
  code: string;
  groupId: string;
  groupName: string;
  expiresAt: string | null;
  expiresAtMs: number | null;
  expirationType: string | null;
  isUsed: boolean;
  usedBy: string | null;
  createdAt: string;
}

export async function saveInviteToFirestore(invite: InviteRecord): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(db, 'invites', invite.id);
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      // Never reset isUsed/usedBy from a local copy: a friend may have claimed the code meanwhile.
      await setDoc(ref, { groupName: invite.groupName, expiresAt: invite.expiresAt, expiresAtMs: invite.expiresAtMs }, { merge: true });
    } else {
      await setDoc(ref, { ...invite, isUsed: false, usedBy: null, ownerId: user.uid });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `invites/${invite.id}`);
  }
}

export async function deleteInviteFromFirestore(code: string): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await deleteDoc(doc(db, 'invites', code));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `invites/${code}`);
  }
}

export type JoinErrorCode =
  | 'invalid'
  | 'used'
  | 'expired'
  | 'already-member'
  | 'not-signed-in'
  | 'group-missing'
  | 'denied'
  | 'offline'
  | 'failed';

export class JoinError extends Error {
  code: JoinErrorCode;
  constructor(code: JoinErrorCode) {
    super(code);
    this.code = code;
  }
}

const errCode = (err: unknown): string => (err as { code?: string })?.code || '';

/** Join a friend's circle with an invite code. Adds the signed-in user to the shared group. */
export async function joinGroupWithInvite(
  code: string,
  member: FriendMember
): Promise<{ groupId: string; groupName: string; alreadyMember: boolean }> {
  const user = auth.currentUser;
  if (!user) throw new JoinError('not-signed-in');

  const inviteRef = doc(db, 'invites', code);
  let invite;
  try {
    invite = await getDocFromServer(inviteRef);
  } catch (err) {
    console.warn('Reading invite failed:', err);
    const c = errCode(err);
    throw new JoinError(c === 'permission-denied' ? 'denied' : c === 'unavailable' ? 'offline' : 'failed');
  }
  if (!invite.exists()) throw new JoinError('invalid');
  const data = invite.data() as { groupId: string; groupName: string; isUsed: boolean; expiresAtMs: number | null };
  if (data.isUsed) throw new JoinError('used');
  if (data.expiresAtMs && Date.now() > data.expiresAtMs) throw new JoinError('expired');

  const groupRef = doc(db, 'groups', data.groupId);

  // Only members can read a circle, so a successful read means this user is already inside.
  try {
    const existing = await getDocFromServer(groupRef);
    const ids = (existing.data()?.memberIds as string[] | undefined) || [];
    if (existing.exists() && ids.includes(user.uid)) {
      return { groupId: data.groupId, groupName: data.groupName, alreadyMember: true };
    }
  } catch {
    // permission-denied is the normal case for someone who has not joined yet
  }

  // Room codes are reusable: joining only adds this user to the circle; the invite is left untouched.
  try {
    await updateDoc(groupRef, {
      memberIds: arrayUnion(user.uid),
      members: arrayUnion({ ...member, id: user.uid }),
      joinCode: code,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Join failed:', error);
    const c = errCode(error);
    if (c === 'not-found') throw new JoinError('group-missing');
    if (c === 'permission-denied') throw new JoinError('denied');
    if (c === 'unavailable') throw new JoinError('offline');
    throw new JoinError('failed');
  }

  // Tell everyone already in the circle (best effort; joining has already succeeded)
  try {
    const joined = await getDocFromServer(groupRef);
    const ids = (joined.data()?.memberIds as string[] | undefined) || [];
    await sendNotificationToMembers(data.groupId, ids, {
      baseId: `notif-joined-${Date.now()}`,
      title: `${member.name} joined ${data.groupName}`,
      message: `${member.name} joined the circle with the room code.`,
      type: 'event_update',
      senderName: member.name,
    });
  } catch (err) {
    console.warn('Could not announce the new member:', err);
  }

  return { groupId: data.groupId, groupName: data.groupName, alreadyMember: false };
}

export function buildInviteRecord(group: FriendGroup): InviteRecord {
  const code = group.roomCode as string;
  return {
    id: code,
    code,
    groupId: group.id,
    groupName: group.name,
    expiresAt: null, // room codes never expire
    expiresAtMs: null,
    expirationType: 'permanent',
    isUsed: false, // and are reusable by any number of friends
    usedBy: null,
    createdAt: group.createdAt,
  };
}

export type InviteStatus = 'ready' | 'missing' | 'denied' | 'offline' | 'guest';

/**
 * Makes sure a room code really exists in the cloud (so a friend on another phone can use it).
 * The owner publishes the circle + its code; anyone can then verify it from the server.
 */
export async function ensureInviteLive(group: FriendGroup): Promise<InviteStatus> {
  const user = auth.currentUser;
  if (!user) return 'guest';
  if (!group.roomCode) return 'missing';
  const isOwner = !group.ownerId || group.ownerId === user.uid;
  try {
    if (isOwner) {
      await saveGroupToFirestore(group); // the circle must exist before anyone can join it
      await saveInviteToFirestore(buildInviteRecord(group));
    }
    const snap = await getDocFromServer(doc(db, 'invites', group.roomCode));
    return snap.exists() ? 'ready' : 'missing';
  } catch (err) {
    console.warn('Could not verify invite code:', err);
    const text = err instanceof Error ? err.message : String(err);
    if (/permission|insufficient/i.test(text) || errCode(err) === 'permission-denied') return 'denied';
    return 'offline';
  }
}

/** A member leaves a circle (removes only themselves). */
export async function leaveGroupInFirestore(group: FriendGroup): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await updateDoc(doc(db, 'groups', group.id), {
      memberIds: arrayRemove(user.uid),
      members: group.members.filter((m) => m.id !== user.uid),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `groups/${group.id}`);
  }
}

/** The circle owner removes one member: they lose access to the circle immediately. */
export async function removeMemberInFirestore(groupId: string, memberId: string, remainingMembers: FriendMember[]): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await updateDoc(doc(db, 'groups', groupId), {
      memberIds: arrayRemove(memberId),
      members: remainingMembers,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}`);
  }
}

// --- Notifications to friends ---
export interface OutgoingNotification {
  /** Unique base for the doc id; the recipient's uid is appended. */
  baseId: string;
  title: string;
  message: string;
  type: NotificationItem['type'];
  eventId?: string;
  senderName?: string;
}

/**
 * Writes one notification document per recipient (owned by the recipient, so only they can read it).
 * Security rules only allow this between members of the same circle. Resolves to how many were delivered.
 */
export async function sendNotificationToMembers(
  groupId: string,
  recipientIds: string[],
  notif: OutgoingNotification
): Promise<number> {
  const user = auth.currentUser;
  if (!user) return 0;
  const targets = Array.from(new Set(recipientIds)).filter((id) => id && id !== user.uid && /^[A-Za-z0-9_-]+$/.test(id));
  if (!targets.length) return 0;
  const timestamp = new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const { baseId, senderName, ...rest } = notif;
  const results = await Promise.allSettled(
    targets.map((rid) => {
      const id = `${baseId}-${rid}`;
      const body = {
        ...rest,
        id,
        groupId,
        ownerId: rid,
        senderId: user.uid,
        senderName: senderName || user.displayName || 'A friend',
        read: false,
        needsAction: false,
        timestamp,
      };
      return setDoc(doc(db, 'notifications', id), body);
    })
  );
  const failed = results.filter((r) => r.status === 'rejected');
  failed.forEach((r) => console.warn('Could not notify a friend:', (r as PromiseRejectedResult).reason));
  return results.length - failed.length;
}

// --- Realtime subscriptions ---
export interface CollectionChange<T> {
  upserts: T[];
  removedIds: string[];
  /** True for the very first snapshot (what already existed), false for live changes afterwards. */
  initial?: boolean;
}

function subscribeQuery<T>(q: Query, label: string, onChange: (change: CollectionChange<T>) => void): Unsubscribe {
  let first = true;
  return onSnapshot(
    q,
    (snap) => {
      const initial = first;
      first = false;
      const upserts: T[] = [];
      const removedIds: string[] = [];
      snap.docChanges().forEach((change) => {
        if (change.type === 'removed') removedIds.push(change.doc.id);
        // Skip echoes of our own not-yet-acknowledged writes so they can't clobber newer local edits.
        else if (!change.doc.metadata.hasPendingWrites) upserts.push(change.doc.data() as T);
      });
      if (upserts.length || removedIds.length) onChange({ upserts, removedIds, initial });
    },
    (error) => console.warn(`Realtime listener failed for ${label}:`, error)
  );
}

/** Documents the signed-in user created (events, tasks, notifications). */
export function subscribeOwned<T>(collectionName: string, onChange: (change: CollectionChange<T>) => void): Unsubscribe {
  const user = auth.currentUser;
  if (!user) return () => undefined;
  return subscribeQuery<T>(query(collection(db, collectionName), where('ownerId', '==', user.uid)), collectionName, onChange);
}

/** Gatherings of one circle (everyone in the circle sees them, not only the host). */
export function subscribeGroupEvents<T>(groupId: string, onChange: (change: CollectionChange<T>) => void): Unsubscribe {
  if (!auth.currentUser) return () => undefined;
  return subscribeQuery<T>(query(collection(db, 'events'), where('groupId', '==', groupId)), `events of ${groupId}`, onChange);
}

/** Circles the signed-in user belongs to (created or joined). */
export function subscribeGroups(onChange: (change: CollectionChange<FriendGroup>) => void): Unsubscribe {
  const user = auth.currentUser;
  if (!user) return () => undefined;
  return subscribeQuery<FriendGroup>(query(collection(db, 'groups'), where('memberIds', 'array-contains', user.uid)), 'groups', onChange);
}

/** Invites created by the signed-in user (to see when a friend has used a code). */
export function subscribeOwnedInvites(onChange: (change: CollectionChange<InviteRecord & { usedByName?: string }>) => void): Unsubscribe {
  return subscribeOwned('invites', onChange);
}

export async function deleteNotificationFromFirestore(notifId: string): Promise<void> {
  if (!auth.currentUser) return;
  try {
    await deleteDoc(doc(db, 'notifications', notifId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `notifications/${notifId}`);
  }
}
