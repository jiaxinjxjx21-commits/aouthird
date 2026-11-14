import { useCallback, useEffect, useRef } from 'react';
import { auth } from './firebase';

/**
 * Mirrors a list of { id } items to Firestore for real (Firebase-authenticated) users.
 * - new / changed items are upserted, removed items are deleted
 * - guests and local-only (email/demo) users are skipped: they have no Firebase session
 * - failures are logged, never thrown, so the UI keeps working from localStorage
 */
export function useCloudSync<T extends { id: string }>(
  items: T[],
  userId: string | null | undefined,
  enabled: boolean,
  save: (item: T) => Promise<void>,
  remove: (id: string) => Promise<void>
) {
  const syncedRef = useRef<Map<string, string>>(new Map());
  const userRef = useRef<string | null | undefined>(null);

  /** Record items that came *from* the cloud so they are not written straight back. */
  const markSynced = useCallback((incoming: T[], removedIds: string[] = []) => {
    incoming.forEach((item) => syncedRef.current.set(item.id, JSON.stringify(item)));
    removedIds.forEach((id) => syncedRef.current.delete(id));
  }, []);

  useEffect(() => {
    if (userRef.current !== userId) {
      userRef.current = userId;
      syncedRef.current = new Map();
    }
    if (!enabled || !userId || !auth.currentUser || auth.currentUser.uid !== userId) return;

    const timer = setTimeout(() => {
      const synced = syncedRef.current;
      const currentIds = new Set<string>();

      items.forEach((item) => {
        currentIds.add(item.id);
        const json = JSON.stringify(item);
        if (synced.get(item.id) === json) return;
        synced.set(item.id, json);
        save(item).catch((err) => {
          synced.delete(item.id); // retry on next change
          console.warn('Cloud save failed:', err);
        });
      });

      Array.from(synced.keys()).forEach((id) => {
        if (currentIds.has(id)) return;
        synced.delete(id);
        remove(id).catch((err) => console.warn('Cloud delete failed:', err));
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [items, userId, enabled]);

  return { markSynced };
}
