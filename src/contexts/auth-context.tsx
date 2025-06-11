
'use client';

import type { User, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { ReactNode} from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

interface AuthCredentials {
  email: string;
  password?: string; // Optional for password reset
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signUpWithEmailPassword: (credentials: Required<AuthCredentials>) => Promise<User | null>;
  signInWithEmailPassword: (credentials: Required<AuthCredentials>) => Promise<User | null>;
  logoutUser: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe; // Unsubscribe on component unmount
  }, []);

  const signUpWithEmailPassword = async (credentials: Required<AuthCredentials>): Promise<User | null> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
      return userCredential.user;
    } catch (error) {
      // console.error("Error signing up:", error);
      throw error as AuthError;
    }
  };

  const signInWithEmailPassword = async (credentials: Required<AuthCredentials>): Promise<User | null> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      return userCredential.user;
    } catch (error) {
      // console.error("Error signing in:", error);
      throw error as AuthError;
    }
  };

  const logoutUser = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      // console.error("Error signing out:", error);
      throw error as AuthError;
    }
  };
  
  const sendPasswordReset = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error as AuthError;
    }
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    signUpWithEmailPassword,
    signInWithEmailPassword,
    logoutUser,
    sendPasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
