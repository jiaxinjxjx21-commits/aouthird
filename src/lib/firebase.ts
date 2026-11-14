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

export type JoinErrorCode = 'invalid' | 'used' | 'expired' | 'already-member' | 'not-signed-in' | 'failed';

export class JoinError extends Error {
  code: JoinErrorCode;
  constructor(code: JoinErrorCode) {
    super(code);
    this.code = code;
  }
}

/** Join a friend's circle with an invite code. Adds the signed-in user to the shared group. */
export async function joinGroupWithInvite(code: string, member: FriendMember): Promise<{ groupId: string; groupName: string }> {
  const user = auth.currentUser;
  if (!user) throw new JoinError('not-signed-in');

  const inviteRef = doc(db, 'invites', code);
  let invite;
  try {
    invite = await getDoc(inviteRef);
  } catch {
    throw new JoinError('failed');
  }
  if (!invite.exists()) throw new JoinError('invalid');
  const data = invite.data() as { groupId: string; groupName: string; isUsed: boolean; expiresAtMs: number | null };
  if (data.isUsed) throw new JoinError('used');
  if (data.expiresAtMs && Date.now() > data.expiresAtMs) throw new JoinError('expired');

  const batch = writeBatch(db);
  batch.update(doc(db, 'groups', data.groupId), {
    memberIds: arrayUnion(user.uid),
    members: arrayUnion({ ...member, id: user.uid }),
    joinCode: code,
    updatedAt: new Date().toISOString(),
  });
  batch.update(inviteRef, { isUsed: true, usedBy: user.uid, usedByName: member.name });
  try {
    await batch.commit();
  } catch (error) {
    // Rules reject the write when the user is already in the circle or the code is no longer valid.
    console.warn('Join failed:', error);
    throw new JoinError((error as { code?: string })?.code === 'permission-denied' ? 'already-member' : 'failed');
  }
  return { groupId: data.groupId, groupName: data.groupName };
}

// --- Realtime subscriptions ---
export interface CollectionChange<T> {
  upserts: T[];
  removedIds: string[];
}

function subscribeQuery<T>(q: Query, label: string, onChange: (change: CollectionChange<T>) => void): Unsubscribe {
  return onSnapshot(
    q,
    (snap) => {
      const upserts: T[] = [];
      const removedIds: string[] = [];
      snap.docChanges().forEach((change) => {
        if (change.type === 'removed') removedIds.push(change.doc.id);
        // Skip echoes of our own not-yet-acknowledged writes so they can't clobber newer local edits.
        else if (!change.doc.metadata.hasPendingWrites) upserts.push(change.doc.data() as T);
      });
      if (upserts.length || removedIds.length) onChange({ upserts, removedIds });
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
