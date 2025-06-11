
'use client';

import type { User, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth as firebaseAuthInstance, firebaseInitializationError } from '@/lib/firebase'; 
import type { ReactNode} from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AuthCredentials {
  email: string;
  password?: string; // Optional for password reset
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  authError: string | null; 
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

// A very simplified mock user for UI testing when Firebase is not initialized
const MOCK_USER_FOR_UI_TESTING = {
  uid: 'mock-user-123',
  email: 'tester@example.com',
  displayName: 'Mock User',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  // --- Start of properties that are methods on a real User object ---
  // We provide dummy implementations or leave them as undefined if not strictly needed
  // by the parts of the UI we are testing. For full User type compatibility,
  // these would need to be proper functions.
  getIdToken: async () => 'mock-token',
  getIdTokenResult: async () => ({ token: 'mock-token', claims: {}, expirationTime: '', issuedAtTime: '', signInProvider: null, signInSecondFactor: null}),
  reload: async () => {},
  delete: async () => {},
  toJSON: () => ({ uid: 'mock-user-123', email: 'tester@example.com', displayName: 'Mock User' }),
  // --- End of method-like properties ---
  metadata: { creationTime: new Date().toISOString(), lastSignInTime: new Date().toISOString() },
  providerData: [{ providerId: 'password', uid: 'tester@example.com', displayName: 'Mock User', email: 'tester@example.com', photoURL: null, phoneNumber: null }],
  refreshToken: 'mock-refresh-token',
  tenantId: null,
} as unknown as User; // Cast to User, acknowledging it's a simplified mock


export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null); // Local auth operation errors
  const { toast } = useToast();

  useEffect(() => {
    if (firebaseInitializationError) {
      console.warn(
        "Auth Context: Firebase Auth is not available due to initialization error. " +
        "Simulating a mock user for UI testing purposes. Real authentication is disabled."
      );
      setCurrentUser(MOCK_USER_FOR_UI_TESTING);
      setLoading(false);
      setAuthError(firebaseInitializationError); // Reflect the persistent Firebase init error
      return; // Skip Firebase onAuthStateChanged listener
    }

    // If no Firebase initialization error, proceed with real Firebase auth
    setAuthError(null); // Clear any overarching init error from local state

    const unsubscribe = onAuthStateChanged(firebaseAuthInstance!, (user) => {
      setCurrentUser(user);
      setLoading(false);
    }, (error) => {
      console.error("Auth State Listener Error:", error);
      setAuthError(error.message || "Error in auth state listener.");
      setCurrentUser(null);
      setLoading(false);
    });

    return unsubscribe; // Unsubscribe on component unmount
  }, []); // Run once on mount, firebaseInitializationError is constant after initial load

  const guardAuthOperation = async <T,>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    if (!firebaseAuthInstance || firebaseInitializationError) {
      const errorMessage = firebaseInitializationError || `Firebase not initialized. Cannot perform ${operationName}.`;
      console.error(`Auth Operation Guard: ${errorMessage}`);
      setAuthError(errorMessage); 
      throw new Error(errorMessage); 
    }
    setAuthError(null); // Clear local component error before attempting operation
    try {
      return await operation();
    } catch (err) {
      const firebaseErr = err as AuthError;
      console.error(`Firebase ${operationName} error:`, firebaseErr);
      setAuthError(firebaseErr.message || `Error during ${operationName}.`);
      throw firebaseErr; 
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
    if (firebaseInitializationError) {
      // If Firebase isn't working, just clear the mock user for UI testing
      setCurrentUser(null);
      toast({ title: 'Mock Logout', description: 'Simulated logout (Firebase not available).' });
      return Promise.resolve();
    }
    // Otherwise, proceed with actual Firebase logout
    return guardAuthOperation(async () => {
      await firebaseSignOut(firebaseAuthInstance!);
      // onAuthStateChanged will set currentUser to null
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
    authError,
    signUpWithEmailPassword,
    signInWithEmailPassword,
    logoutUser,
    sendPasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
