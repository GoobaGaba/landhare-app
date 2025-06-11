
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
import { createUserProfile, getUserById } from '@/lib/mock-data'; // Using Firestore version
import type { User as AppUserType, SubscriptionStatus } from '@/lib/types'; // Import AppUserType and SubscriptionStatus

interface AuthCredentials {
  email: string;
  password?: string; 
  displayName?: string;
}

// Combines Firebase user with our app-specific user data
export interface CurrentUser extends FirebaseUserType {
  appProfile?: AppUserType; // To hold Firestore profile data like subscriptionStatus
}

interface AuthContextType {
  currentUser: CurrentUser | null; 
  loading: boolean;
  authError: string | null; 
  subscriptionStatus: SubscriptionStatus | 'loading'; // Add subscription status
  signUpWithEmailPassword: (credentials: Required<AuthCredentials>) => Promise<CurrentUser | null>;
  signInWithEmailPassword: (credentials: Pick<Required<AuthCredentials>, 'email' | 'password'>) => Promise<CurrentUser | null>;
  logoutUser: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>; // Added to refresh profile data
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

const MOCK_USER_FOR_UI_TESTING: CurrentUser = {
  uid: 'mock-user-uid-12345', 
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
  appProfile: { // Mocked app profile data
    id: 'mock-user-uid-12345',
    name: 'Mock UI Tester',
    email: 'mocktester@example.com',
    subscriptionStatus: 'free', // Default mock status
    createdAt: new Date(),
  }
} as unknown as CurrentUser; 


export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null); 
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | 'loading'>('loading');
  const { toast } = useToast();

  const fetchAndSetAppProfile = async (firebaseUser: FirebaseUserType | null): Promise<CurrentUser | null> => {
    if (!firebaseUser) {
      setSubscriptionStatus('free'); // Or handle as appropriate for logged-out state
      return null;
    }

    setSubscriptionStatus('loading');
    try {
      if (firestoreInstance) {
        const userProfile = await getUserById(firebaseUser.uid);
        setSubscriptionStatus(userProfile?.subscriptionStatus || 'free');
        return { ...firebaseUser, appProfile: userProfile } as CurrentUser;
      } else {
         // Firestore not available, use auth display name and default free status for appProfile
        setSubscriptionStatus('free');
        return { 
          ...firebaseUser, 
          appProfile: { 
            id: firebaseUser.uid, 
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User', 
            email: firebaseUser.email || '',
            subscriptionStatus: 'free',
            createdAt: new Date(firebaseUser.metadata.creationTime || Date.now())
          } 
        } as CurrentUser;
      }
    } catch (profileError) {
      console.error("Error fetching user profile:", profileError);
      setSubscriptionStatus('free'); // Default to free on error
      toast({ title: "Profile Error", description: "Could not load your complete user profile.", variant: "destructive"});
      return { ...firebaseUser, appProfile: undefined } as CurrentUser; // Return Firebase user even if profile fetch fails
    }
  };


  useEffect(() => {
    if (firebaseInitializationError) {
      console.warn(
        "Auth Context: Firebase Auth/Firestore is not available due to initialization error. " +
        "Simulating a mock user for UI testing purposes. Real authentication is disabled."
      );
      setCurrentUser(MOCK_USER_FOR_UI_TESTING);
      setSubscriptionStatus(MOCK_USER_FOR_UI_TESTING.appProfile?.subscriptionStatus || 'free');
      setLoading(false);
      setAuthError(firebaseInitializationError);
      return; 
    }

    setAuthError(null); 

    const unsubscribe = onAuthStateChanged(firebaseAuthInstance!, async (user) => {
      setLoading(true);
      if (user) {
        const userWithProfile = await fetchAndSetAppProfile(user);
        setCurrentUser(userWithProfile);
      } else {
        setCurrentUser(null);
        setSubscriptionStatus('free'); 
      }
      setLoading(false);
    }, (error) => {
      console.error("Auth State Listener Error:", error);
      setAuthError(error.message || "Error in auth state listener.");
      setCurrentUser(null);
      setSubscriptionStatus('free');
      setLoading(false);
    });

    return unsubscribe; 
  }, [toast]); 

  const guardAuthOperation = async <T,>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    if (!firebaseAuthInstance || firebaseInitializationError || !firestoreInstance) {
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

  const signUpWithEmailPassword = async (credentials: Required<AuthCredentials>): Promise<CurrentUser | null> => {
    return guardAuthOperation(async () => {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance!, credentials.email, credentials.password);
      const firebaseUser = userCredential.user;
      if (firebaseUser) {
        await updateProfile(firebaseUser, {
          displayName: credentials.displayName || credentials.email.split('@')[0],
        });
        if (firestoreInstance) {
           const appProfile = await createUserProfile(firebaseUser.uid, firebaseUser.email!, credentials.displayName);
           setSubscriptionStatus(appProfile.subscriptionStatus || 'free');
           return { ...firebaseUser, appProfile } as CurrentUser;
        }
         // Fallback if firestoreInstance not available after all checks
        setSubscriptionStatus('free');
        return { ...firebaseUser, appProfile: undefined } as CurrentUser;
      }
      return null;
    }, 'sign up');
  };

  const signInWithEmailPassword = async (credentials: Pick<Required<AuthCredentials>, 'email' | 'password'>): Promise<CurrentUser | null> => {
     return guardAuthOperation(async () => {
      const userCredential = await signInWithEmailAndPassword(firebaseAuthInstance!, credentials.email, credentials.password);
      const firebaseUser = userCredential.user;
      if (firebaseUser) {
        return await fetchAndSetAppProfile(firebaseUser);
      }
      return null;
    }, 'sign in');
  };

  const logoutUser = async (): Promise<void> => {
    if (firebaseInitializationError) {
      setCurrentUser(null);
      setSubscriptionStatus('free');
      toast({ title: 'Mock Logout', description: 'Simulated logout (Firebase not available).' });
      return Promise.resolve();
    }
    return guardAuthOperation(async () => {
      await firebaseSignOut(firebaseAuthInstance!);
      // onAuthStateChanged will handle setting currentUser to null and resetting subscriptionStatus
    }, 'logout');
  };
  
  const sendPasswordReset = async (email: string): Promise<void> => {
    return guardAuthOperation(async () => {
      await sendPasswordResetEmail(firebaseAuthInstance!, email);
    }, 'password reset');
  };

  const refreshUserProfile = async (): Promise<void> => {
    if (currentUser && !firebaseInitializationError && firestoreInstance) {
        setLoading(true);
        const userWithProfile = await fetchAndSetAppProfile(currentUser); // Pass the FirebaseUser part
        setCurrentUser(userWithProfile);
        setLoading(false);
    }
  };


  const value: AuthContextType = {
    currentUser,
    loading,
    authError,
    subscriptionStatus,
    signUpWithEmailPassword,
    signInWithEmailPassword,
    logoutUser,
    sendPasswordReset,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
