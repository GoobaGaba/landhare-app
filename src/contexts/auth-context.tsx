
'use client';

import type { User, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail
} from 'firebase/auth';
// Import the potentially null auth instance and the error message
import { auth as firebaseAuthInstance, firebaseInitializationError } from '@/lib/firebase'; 
import type { ReactNode} from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

interface AuthCredentials {
  email: string;
  password?: string; // Optional for password reset
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  authError: string | null; // To signal if Firebase Auth is non-functional
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
  // Initialize authError with any error message from firebase.ts
  const [authError, setAuthError] = useState<string | null>(firebaseInitializationError);

  useEffect(() => {
    // If firebaseAuthInstance is null (meaning Firebase didn't initialize properly in firebase.ts)
    // or if there was an initialization error, then auth features are disabled.
    if (!firebaseAuthInstance || firebaseInitializationError) {
      console.warn("Auth Context: Firebase Auth is not available or not initialized correctly. Authentication features will be disabled.");
      setCurrentUser(null);
      setLoading(false);
      // Ensure authError state reflects the issue if not already set
      if (!authError) {
        setAuthError(firebaseInitializationError || "Firebase Auth not available. Features disabled.");
      }
      return; // No need to subscribe to onAuthStateChanged
    }

    // If we reach here, firebaseAuthInstance is available and no init error was pre-set
    setAuthError(null); // Clear any initial error message

    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe; // Unsubscribe on component unmount
  }, [authError]); // Depend on authError to potentially re-evaluate if it changes

  const guardAuthOperation = async <T,>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    if (!firebaseAuthInstance || authError) {
      const errorMessage = authError || `Firebase not initialized. Cannot perform ${operationName}.`;
      console.error(`Auth Operation Guard: ${errorMessage}`);
      // Potentially update authError state again if a new issue arises or to reinforce
      // setAuthError(errorMessage); 
      throw new Error(errorMessage); // Throw to signal failure to the caller
    }
    // Clear local component error before attempting operation, global init error checked above
    // setAuthError(null); 
    try {
      return await operation();
    } catch (err) {
      const firebaseErr = err as AuthError;
      setAuthError(firebaseErr.message || `Error during ${operationName}.`);
      throw firebaseErr; // Re-throw the original Firebase error
    }
  };

  const signUpWithEmailPassword = async (credentials: Required<AuthCredentials>): Promise<User | null> => {
    return guardAuthOperation(async () => {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance!, credentials.email, credentials.password);
      return userCredential.user;
    }, 'sign up');
  };

  const signInWithEmailPassword = async (credentials: Required<AuthCredentials>): Promise<User | null> => {
     return guardAuthOperation(async () => {
      const userCredential = await signInWithEmailAndPassword(firebaseAuthInstance!, credentials.email, credentials.password);
      return userCredential.user;
    }, 'sign in');
  };

  const logoutUser = async (): Promise<void> => {
    return guardAuthOperation(async () => {
      await firebaseSignOut(firebaseAuthInstance!);
    }, 'logout');
  };
  
  const sendPasswordReset = async (email: string): Promise<void> => {
    return guardAuthOperation(async () => {
      await sendPasswordResetEmail(firebaseAuthInstance!, email);
    }, 'password reset');
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    authError, // Provide the authError state
    signUpWithEmailPassword,
    signInWithEmailPassword,
    logoutUser,
    sendPasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
