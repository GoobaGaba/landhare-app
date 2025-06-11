
'use client';

import type { User as FirebaseUserType, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth as firebaseAuthInstance, db as firestoreInstance, firebaseInitializationError } from '@/lib/firebase'; 
import type { ReactNode} from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createUserProfile } from '@/lib/mock-data'; // Now using Firestore version

interface AuthCredentials {
  email: string;
  password?: string; 
  displayName?: string; // Added for signup
}

interface AuthContextType {
  currentUser: FirebaseUserType | null; // Using FirebaseUserType directly
  loading: boolean;
  authError: string | null; 
  signUpWithEmailPassword: (credentials: Required<AuthCredentials>) => Promise<FirebaseUserType | null>;
  signInWithEmailPassword: (credentials: Pick<Required<AuthCredentials>, 'email' | 'password'>) => Promise<FirebaseUserType | null>;
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

const MOCK_USER_FOR_UI_TESTING = {
  uid: 'mock-user-uid-12345', // Ensure this matches a landownerId in mock-data for testing listings/bookings
  email: 'mocktester@example.com',
  displayName: 'Mock UI Tester',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  getIdToken: async () => 'mock-token',
  getIdTokenResult: async () => ({ token: 'mock-token', claims: {}, expirationTime: '', issuedAtTime: '', signInProvider: null, signInSecondFactor: null}),
  reload: async () => {},
  delete: async () => {},
  toJSON: () => ({ uid: 'mock-user-uid-12345', email: 'mocktester@example.com', displayName: 'Mock UI Tester' }),
  metadata: { creationTime: new Date().toISOString(), lastSignInTime: new Date().toISOString() },
  providerData: [{ providerId: 'password', uid: 'mocktester@example.com', displayName: 'Mock UI Tester', email: 'mocktester@example.com', photoURL: null, phoneNumber: null }],
  refreshToken: 'mock-refresh-token',
  tenantId: null,
} as unknown as FirebaseUserType; 


export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null); 
  const { toast } = useToast();

  useEffect(() => {
    if (firebaseInitializationError) {
      console.warn(
        "Auth Context: Firebase Auth is not available due to initialization error. " +
        "Simulating a mock user for UI testing purposes. Real authentication is disabled."
      );
      setCurrentUser(MOCK_USER_FOR_UI_TESTING);
      setLoading(false);
      setAuthError(firebaseInitializationError);
      return; 
    }

    setAuthError(null); 

    const unsubscribe = onAuthStateChanged(firebaseAuthInstance!, (user) => {
      setCurrentUser(user);
      setLoading(false);
    }, (error) => {
      console.error("Auth State Listener Error:", error);
      setAuthError(error.message || "Error in auth state listener.");
      setCurrentUser(null);
      setLoading(false);
    });

    return unsubscribe; 
  }, []); 

  const guardAuthOperation = async <T,>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    if (!firebaseAuthInstance || firebaseInitializationError || !firestoreInstance) { // Check firestoreInstance too
      const errorMessage = firebaseInitializationError || `Firebase not initialized. Cannot perform ${operationName}.`;
      console.error(`Auth Operation Guard: ${errorMessage}`);
      setAuthError(errorMessage); 
      throw new Error(errorMessage); 
    }
    setAuthError(null); 
    try {
      return await operation();
    } catch (err) {
      const firebaseErr = err as AuthError;
      console.error(`Firebase ${operationName} error:`, firebaseErr);
      setAuthError(firebaseErr.message || `Error during ${operationName}.`);
      throw firebaseErr; 
    }
  };

  const signUpWithEmailPassword = async (credentials: Required<AuthCredentials>): Promise<FirebaseUserType | null> => {
    return guardAuthOperation(async () => {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance!, credentials.email, credentials.password);
      if (userCredential.user) {
        // Update Firebase Auth profile
        await updateProfile(userCredential.user, {
          displayName: credentials.displayName || credentials.email.split('@')[0],
        });
        // Create user profile in Firestore
        if (firestoreInstance) { // Ensure firestore is initialized
           await createUserProfile(userCredential.user.uid, userCredential.user.email!, credentials.displayName);
        } else {
            console.warn("Firestore not initialized, skipping profile creation in DB for new user.");
        }
      }
      return userCredential.user;
    }, 'sign up');
  };

  const signInWithEmailPassword = async (credentials: Pick<Required<AuthCredentials>, 'email' | 'password'>): Promise<FirebaseUserType | null> => {
     return guardAuthOperation(async () => {
      const userCredential = await signInWithEmailAndPassword(firebaseAuthInstance!, credentials.email, credentials.password);
      return userCredential.user;
    }, 'sign in');
  };

  const logoutUser = async (): Promise<void> => {
    if (firebaseInitializationError) {
      setCurrentUser(null);
      toast({ title: 'Mock Logout', description: 'Simulated logout (Firebase not available).' });
      return Promise.resolve();
    }
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
    authError,
    signUpWithEmailPassword,
    signInWithEmailPassword,
    logoutUser,
    sendPasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
