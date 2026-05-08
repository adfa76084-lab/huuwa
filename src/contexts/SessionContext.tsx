import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { subscribeToAuthChanges, migrateMyEmailToPrivate } from '@/services/firebase/auth';
import { getUserProfile, restoreAccount } from '@/services/api/userService';
import { useAuthStore } from '@/stores/authStore';

interface SessionContextType {
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType>({
  firebaseUser: null,
  isLoading: true,
});

export function useSession() {
  return useContext(SessionContext);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (fbUser) => {
      // Set loading first so screens that gate on (firebaseUser && !profile)
      // don't redirect mid-fetch — without this, React can re-render between
      // setFirebaseUser and setUser and the redirect fires before the profile
      // arrives (pushing existing users into the new-user setup screen).
      if (fbUser) setIsLoading(true);
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          let profile = await getUserProfile(fbUser.uid);
          if (profile?.disabled) {
            await restoreAccount(fbUser.uid);
            profile = await getUserProfile(fbUser.uid);
          }
          // Best-effort: move legacy email field out of public users doc.
          // Idempotent and silent — runs in background.
          migrateMyEmailToPrivate().catch(() => {});
          setUser(profile);
        } catch (e) {
          console.error('[Session] profile fetch failed:', e);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, [setUser]);

  return (
    <SessionContext.Provider value={{ firebaseUser, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}
