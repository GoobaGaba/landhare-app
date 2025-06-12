
'use client';

import type { User as FirebaseUserType, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile // Renamed to avoid conflict
} from 'firebase/auth';
import { auth as firebaseAuthInstance, db as firestoreInstance, firebaseInitializationError } from '@/lib/firebase'; 
import type { ReactNode} from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
// Using mock-data which now has conditional logic for Firestore or mock arrays
import { createUserProfile, getUserById, updateUserProfile as updateAppUserProfile } from '@/lib/mock-data'; 
import type { User as AppUserType, SubscriptionStatus } from '@/lib/types';

interface AuthCredentials {
  email: string;
  password?: string; 
  displayName?: string;
}

export interface CurrentUser extends FirebaseUserType {
  appProfile?: AppUserType;
}

interface AuthContextType {
  currentUser: CurrentUser | null; 
  loading: boolean;
  authError: string | null; 
  subscriptionStatus: SubscriptionStatus;
  signUpWithEmailPassword: (credentials: Required<AuthCredentials>) => Promise<CurrentUser | null>;
  signInWithEmailPassword: (credentials: Pick<Required<AuthCredentials>, 'email' | 'password'>) => Promise<CurrentUser | null>;
  logoutUser: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  updateCurrentAppUserProfile: (data: Partial<Pick<AppUserType, 'name' | 'bio' | 'avatarUrl'>>) => Promise<CurrentUser | null>;
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
  photoURL: 'https://placehold.co/100x100.png?text=MT',
  emailVerified: true,
  isAnonymous: false,
  getIdToken: async () => 'mock-token',
  getIdTokenResult: async () => ({ token: 'mock-token', claims: {}, expirationTime: '', issuedAtTime: '', signInProvider: null, signInSecondFactor: null}),
  reload: async () => {},
  delete: async () => {},
  toJSON: () => ({ uid: 'mock-user-uid-12345', email: 'mocktester@example.com', displayName: 'Mock UI Tester' }),
  metadata: { creationTime: new Date('2023-01-01T10:00:00Z').toISOString(), lastSignInTime: new Date().toISOString() },
  providerData: [{ providerId: 'password', uid: 'mocktester@example.com', displayName: 'Mock UI Tester', email: 'mocktester@example.com', photoURL: null, phoneNumber: null }],
  refreshToken: 'mock-refresh-token',
  tenantId: null,
  appProfile: {
    id: 'mock-user-uid-12345',
    name: 'Mock UI Tester',
    email: 'mocktester@example.com',
    subscriptionStatus: 'premium',
    createdAt: new Date('2023-01-01T10:00:00Z'),
    bio: 'I am the main mock user for testing purposes with premium status.',
    avatarUrl: 'https://placehold.co/100x100.png?text=MT',
  }
} as unknown as CurrentUser; 


export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null); 
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('loading');
  const { toast } = useToast();

  const fetchAndSetAppProfile = useCallback(async (firebaseUser: FirebaseUserType | null): Promise<CurrentUser | null> => {
    if (!firebaseUser) {
      setSubscriptionStatus('free');
      return null;
    }

    setSubscriptionStatus('loading');
    try {
      // getUserById will use mock or Firestore based on firebaseInitializationError
      const userProfile = await getUserById(firebaseUser.uid); 
      setSubscriptionStatus(userProfile?.subscriptionStatus || 'free');
      return { ...firebaseUser, appProfile: userProfile } as CurrentUser;
    } catch (profileError) {
      console.error("Error fetching user profile:", profileError);
      setSubscriptionStatus('free');
      toast({ title: "Profile Error", description: "Could not load your complete user profile.", variant: "destructive"});
      return { ...firebaseUser, appProfile: undefined } as CurrentUser;
    }
  }, [toast]);


  useEffect(() => {
    if (firebaseInitializationError) {
      console.warn("Auth Context: Firebase not available. Using MOCK_USER_FOR_UI_TESTING.");
      setCurrentUser(MOCK_USER_FOR_UI_TESTING);
      setSubscriptionStatus(MOCK_USER_FOR_UI_TESTING.appProfile?.subscriptionStatus || 'free');
      setLoading(false);
      setAuthError(firebaseInitializationError); // Keep the error message
      return; 
    }

    setAuthError(null); 
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance!, async (user) => {
      setLoading(true);
      const userWithProfile = await fetchAndSetAppProfile(user);
      setCurrentUser(userWithProfile);
      setLoading(false);
    }, (error) => {
      console.error("Auth State Listener Error:", error);
      setAuthError(error.message || "Error in auth state listener.");
      setCurrentUser(null);
      setSubscriptionStatus('free');
      setLoading(false);
    });
    return unsubscribe; 
  }, [toast, fetchAndSetAppProfile]); 

  const signUpWithEmailPassword = async (credentials: Required<AuthCredentials>): Promise<CurrentUser | null> => {
    setAuthError(null);
    if (firebaseInitializationError || !firebaseAuthInstance) {
      console.warn("Firebase not available. Simulating mock sign up.");
      const mockId = `mock-user-${Date.now()}`;
      const newMockAppUser = await createUserProfile(mockId, credentials.email, credentials.displayName);
      const newMockCurrentUser: CurrentUser = {
        uid: mockId,
        email: credentials.email,
        displayName: credentials.displayName,
        // ... other necessary FirebaseUserType fields mocked ...
        emailVerified: false, isAnonymous: false, photoURL: null,
        getIdToken: async () => 'mock-token', getIdTokenResult: async () => ({ token: 'mock-token', claims: {}, expirationTime: '', issuedAtTime: '', signInProvider: null, signInSecondFactor: null}),
        reload: async () => {}, delete: async () => {}, toJSON: () => ({}),
        metadata: { creationTime: new Date().toISOString(), lastSignInTime: new Date().toISOString() },
        providerData: [], refreshToken: 'mock-refresh-token', tenantId: null,
        appProfile: newMockAppUser,
      } as CurrentUser;
      setCurrentUser(newMockCurrentUser);
      setSubscriptionStatus(newMockAppUser.subscriptionStatus || 'free');
      toast({ title: "Mock Signup Successful", description: "Account created in mock environment."});
      return newMockCurrentUser;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, credentials.email, credentials.password);
      const firebaseUser = userCredential.user;
      if (firebaseUser) {
        await updateFirebaseProfile(firebaseUser, { // Renamed import
          displayName: credentials.displayName || credentials.email.split('@')[0],
        });
        const appProfile = await createUserProfile(firebaseUser.uid, firebaseUser.email!, credentials.displayName);
        const userWithProfile = { ...firebaseUser, appProfile } as CurrentUser;
        setCurrentUser(userWithProfile); // onAuthStateChanged should also pick this up
        setSubscriptionStatus(appProfile.subscriptionStatus || 'free');
        return userWithProfile;
      }
      return null;
    } catch (err) {
      const firebaseErr = err as AuthError;
      console.error("Firebase sign up error:", firebaseErr);
      setAuthError(firebaseErr.message || "Error during sign up.");
      throw firebaseErr;
    }
  };

  const signInWithEmailPassword = async (credentials: Pick<Required<AuthCredentials>, 'email' | 'password'>): Promise<CurrentUser | null> => {
    setAuthError(null);
     if (firebaseInitializationError || !firebaseAuthInstance) {
      console.warn("Firebase not available. Simulating mock sign in with MOCK_USER_FOR_UI_TESTING.");
      // For simplicity in mock mode, always "log in" the MOCK_USER_FOR_UI_TESTING
      // A more complex mock would try to find user in mockUsers array by email/pass
      const userProfile = await getUserById(MOCK_USER_FOR_UI_TESTING.uid); // refresh mock profile
      const updatedMockUser = {...MOCK_USER_FOR_UI_TESTING, appProfile: userProfile};
      setCurrentUser(updatedMockUser);
      setSubscriptionStatus(userProfile?.subscriptionStatus || 'free');
      toast({ title: "Mock Login Successful", description: `Welcome back, ${MOCK_USER_FOR_UI_TESTING.displayName} (mock).`});
      return updatedMockUser;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuthInstance, credentials.email, credentials.password);
      const firebaseUser = userCredential.user;
      // onAuthStateChanged will handle setting user and profile
      return firebaseUser ? { ...firebaseUser, appProfile: (await getUserById(firebaseUser.uid)) } as CurrentUser : null;
    } catch (err) {
      const firebaseErr = err as AuthError;
      console.error("Firebase sign in error:", firebaseErr);
      setAuthError(firebaseErr.message || "Error during sign in.");
      throw firebaseErr;
    }
  };

  const logoutUser = async (): Promise<void> => {
    setAuthError(null);
    if (firebaseInitializationError || !firebaseAuthInstance) {
      console.warn("Firebase not available. Simulating mock logout.");
      setCurrentUser(null);
      setSubscriptionStatus('free');
      toast({ title: 'Mock Logout', description: 'Simulated logout.' });
      return;
    }
    try {
      await firebaseSignOut(firebaseAuthInstance);
      // onAuthStateChanged will handle setting currentUser to null and subscriptionStatus
    } catch (err) {
      const firebaseErr = err as AuthError;
      console.error("Firebase logout error:", firebaseErr);
      setAuthError(firebaseErr.message || "Error during logout.");
      throw firebaseErr;
    }
  };
  
  const sendPasswordReset = async (email: string): Promise<void> => {
     setAuthError(null);
    if (firebaseInitializationError || !firebaseAuthInstance) {
      toast({ title: "Feature Unavailable", description: "Password reset is not available in mock mode.", variant: "default"});
      console.warn("Firebase not available. Mock password reset requested.");
      return;
    }
    try {
      await sendPasswordResetEmail(firebaseAuthInstance, email);
      toast({ title: "Password Reset Email Sent", description: "Check your inbox for instructions."});
    } catch (err) {
       const firebaseErr = err as AuthError;
      console.error("Firebase password reset error:", firebaseErr);
      setAuthError(firebaseErr.message || "Error sending password reset.");
      throw firebaseErr;
    }
  };

  const refreshUserProfile = useCallback(async (): Promise<void> => {
    if (currentUser) { // currentUser here is FirebaseUser with potentially stale appProfile
        setLoading(true);
        // Re-fetch and set the app profile part
        const userWithFreshProfile = await fetchAndSetAppProfile(currentUser); // currentUser is FirebaseUser part
        setCurrentUser(userWithFreshProfile); // Update the full CurrentUser object
        setLoading(false);
    }
  }, [currentUser, fetchAndSetAppProfile]);

  const updateCurrentAppUserProfile = async (data: Partial<Pick<AppUserType, 'name' | 'bio' | 'avatarUrl'>>): Promise<CurrentUser | null> => {
    if (!currentUser) {
        toast({ title: "Error", description: "Not logged in.", variant: "destructive"});
        return null;
    }
    setAuthError(null);
    setLoading(true);
    try {
        const updatedAppProfile = await updateAppUserProfile(currentUser.uid, data);
        if (updatedAppProfile) {
            // If Firebase Auth profile also needs update (e.g. displayName, photoURL)
            if (data.name && firebaseAuthInstance && currentUser.displayName !== data.name) {
               await updateFirebaseProfile(currentUser, { displayName: data.name });
            }
            if (data.avatarUrl && firebaseAuthInstance && currentUser.photoURL !== data.avatarUrl) {
               await updateFirebaseProfile(currentUser, { photoURL: data.avatarUrl });
            }

            const refreshedUser = await fetchAndSetAppProfile(currentUser); // Re-fetch to get latest FB auth data too
            setCurrentUser(refreshedUser);
            toast({ title: "Profile Updated", description: "Your profile information has been saved."});
            return refreshedUser;
        }
        throw new Error("App profile update returned undefined.");
    } catch (error: any) {
        console.error("Error updating app user profile:", error);
        setAuthError(error.message || "Failed to update profile.");
        toast({ title: "Update Failed", description: error.message || "Could not update profile.", variant: "destructive"});
        return currentUser; // Return old state
    } finally {
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
    updateCurrentAppUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
