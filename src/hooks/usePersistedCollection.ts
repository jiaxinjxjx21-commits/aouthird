import { useEffect } from 'react';
import { saveScoped, ScopedCollection } from '../lib/storage';

/** Persists a user-scoped collection to localStorage whenever it changes. */
export function usePersistedCollection(
  uid: string | null | undefined,
  collection: ScopedCollection,
  value: unknown[]
) {
  useEffect(() => {
    if (uid) saveScoped(uid, collection, value);
  }, [uid, collection, value]);
}
