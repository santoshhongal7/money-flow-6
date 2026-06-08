import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../stores/authStore';
import type { UserProfile } from '../types';

export function useAuthInit() {
  const { setUser, setProfile, setInitialized, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data();
            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              displayName: firebaseUser.displayName ?? '',
              currency: 'INR',
              createdAt: data.createdAt?.toDate() ?? new Date(),
              updatedAt: data.updatedAt?.toDate() ?? new Date(),
            });
          } else {
            const profile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              displayName: firebaseUser.displayName ?? '',
              currency: 'INR',
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            await setDoc(userRef, {
              ...profile,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            setProfile(profile);
          }
        } catch (e) {
          console.error('Failed to load user profile', e);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
      setInitialized(true);
    });

    return unsubscribe;
  }, [setUser, setProfile, setInitialized, setLoading]);
}

export function useAuth() {
  return useAuthStore();
}
