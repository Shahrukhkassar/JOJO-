'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  auth,
  db,
  signInWithGoogle,
  logOut,
  syncUserProfile,
  UserProfileData,
  handleFirestoreError,
  OperationType,
} from '@/lib/firebase';

interface FirebaseContextType {
  user: User | null;
  userProfile: UserProfileData | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  updateSettings: (settings: Partial<UserProfileData>) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  userProfile: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  updateSettings: async () => {},
});

export const useFirebase = () => useContext(FirebaseContext);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      // Sync user profile upon sign in
      try {
        await syncUserProfile({
          userId: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || 'Friend',
          photoURL: currentUser.photoURL || undefined,
        });
      } catch (err) {
        console.warn('Could not sync user profile immediately:', err);
      }

      // Subscribe to user profile document
      const userDocPath = `users/${currentUser.uid}`;
      const unsubscribeDoc = onSnapshot(
        doc(db, 'users', currentUser.uid),
        (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfileData);
          }
          setLoading(false);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, userDocPath);
        }
      );

      return () => unsubscribeDoc();
    });

    return () => unsubscribeAuth();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Sign-in failed:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      setUser(null);
      setUserProfile(null);
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  const updateSettings = async (settings: Partial<UserProfileData>) => {
    if (!user) return;
    await syncUserProfile({
      userId: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Friend',
      ...settings,
    });
  };

  return (
    <FirebaseContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signIn: handleSignIn,
        signOut: handleSignOut,
        updateSettings,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}
