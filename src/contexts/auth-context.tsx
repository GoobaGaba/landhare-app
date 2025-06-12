
'use client';

import type { User as FirebaseUserType, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile 
} from 'firebase/auth';
import { auth as firebaseAuthInstance, db as firestoreInstance, firebaseInitializationError } from '@/lib/firebase'; 
import type { ReactNode} from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createUserProfile, getUserById, updateUserProfile as updateAppUserProfileDb, mockUsers } from '@/lib/mock-data'; 
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
  updateCurrentAppUserProfile: (data: Partial<AppUserType>) => Promise<CurrentUser | null>; // Now accepts full AppUserType partial
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// This remains the primary mock user for testing premium features AFTER mock login
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
      // Use a mock user's profile if in full preview and the ID matches the main mock user
      let userProfile: AppUserType | undefined;
      if (firebaseInitializationError && firebaseUser.uid === MOCK_USER_FOR_UI_TESTING.uid) {
          userProfile = MOCK_USER_FOR_UI_TESTING.appProfile;
      } else if (firebaseInitializationError) {
          // Attempt to find other mock users if Firebase is down
          userProfile = mockUsers.find(u => u.id === firebaseUser.uid);
      } else {
         userProfile = await getUserById(firebaseUser.uid);
      }
      
      setSubscriptionStatus(userProfile?.subscriptionStatus || 'free');
      
      const appProfileWithDefaults: AppUserType = {
        id: firebaseUser.uid,
        name: userProfile?.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: userProfile?.email || firebaseUser.email || 'no-email@example.com',
        avatarUrl: userProfile?.avatarUrl || firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(userProfile?.name || firebaseUser.displayName || firebaseUser.email || 'U').charAt(0)}`,
        subscriptionStatus: userProfile?.subscriptionStatus || 'free',
        createdAt: userProfile?.createdAt || (firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime) : new Date()),
        bio: userProfile?.bio || '',
        stripeCustomerId: userProfile?.stripeCustomerId,
      };
      
      return { ...firebaseUser, appProfile: appProfileWithDefaults } as CurrentUser;
    } catch (profileError) {
      console.error("Error fetching user profile:", profileError);
      setSubscriptionStatus('free'); 
      toast({ title: "Profile Error", description: "Could not load your complete user profile.", variant: "destructive"});
      const minimalAppProfile: AppUserType = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: firebaseUser.email || 'no-email@example.com',
        subscriptionStatus: 'free',
        createdAt: firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime) : new Date(),
      };
      return { ...firebaseUser, appProfile: minimalAppProfile } as CurrentUser;
    }
  }, [toast]);


  useEffect(() => {
    if (firebaseInitializationError) {
      console.warn("Auth Context: Firebase not available. Initializing with NO user signed in.");
      setCurrentUser(null); // Start with no user signed in for preview mode
      setSubscriptionStatus('free'); // Default for a non-logged-in state
      setLoading(false);
      setAuthError(firebaseInitializationError); 
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
      // Use the createUserProfile from mock-data which now handles adding to the mockUsers array
      const newMockAppUser = await createUserProfile(mockId, credentials.email, credentials.displayName);
      const newMockCurrentUser: CurrentUser = {
        uid: mockId,
        email: credentials.email,
        displayName: credentials.displayName,
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
        await updateFirebaseProfile(firebaseUser, { 
          displayName: credentials.displayName || credentials.email.split('@')[0],
        });
        const userWithProfile = await fetchAndSetAppProfile(firebaseUser);
        // onAuthStateChanged will also call fetchAndSetAppProfile, but setting here ensures immediate availability
        setCurrentUser(userWithProfile); 
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
      // In preview mode, attempt to "log in" the MOCK_USER_FOR_UI_TESTING if credentials match
      if (credentials.email === MOCK_USER_FOR_UI_TESTING.email) {
        // Fetch the latest appProfile for the mock user (in case it was updated, e.g., subscription change)
        const latestMockAppProfile = await getUserById(MOCK_USER_FOR_UI_TESTING.uid);
        const userToSignIn: CurrentUser = {
          ...MOCK_USER_FOR_UI_TESTING,
          appProfile: latestMockAppProfile || MOCK_USER_FOR_UI_TESTING.appProfile,
        };
        setCurrentUser(userToSignIn);
        setSubscriptionStatus(userToSignIn.appProfile?.subscriptionStatus || 'free');
        toast({ title: "Mock Login Successful", description: `Welcome back, ${userToSignIn.displayName} (mock).`});
        return userToSignIn;
      } else {
        // If credentials don't match the main mock user, simulate a generic login failure for preview
        const genericError = "Invalid mock credentials. Try 'mocktester@example.com'.";
        setAuthError(genericError);
        toast({ title: "Mock Login Failed", description: genericError, variant: "destructive"});
        throw new Error(genericError);
      }
    }
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuthInstance, credentials.email, credentials.password);
      // onAuthStateChanged will handle setting user and profile
      const userWithProfile = await fetchAndSetAppProfile(userCredential.user);
      setCurrentUser(userWithProfile);
      return userWithProfile;
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
    if (currentUser) { 
        setLoading(true);
        const userWithFreshProfile = await fetchAndSetAppProfile(currentUser); 
        setCurrentUser(userWithFreshProfile); 
        setLoading(false);
    }
  }, [currentUser, fetchAndSetAppProfile]);

  const updateCurrentAppUserProfile = async (data: Partial<AppUserType>): Promise<CurrentUser | null> => {
    if (!currentUser) {
        toast({ title: "Error", description: "Not logged in.", variant: "destructive"});
        return null;
    }
    setAuthError(null);
    setLoading(true);
    try {
        const updatedAppProfile = await updateAppUserProfileDb(currentUser.uid, data);
        
        if (updatedAppProfile) {
            if (data.name && firebaseAuthInstance && currentUser.displayName !== data.name) {
               await updateFirebaseProfile(currentUser, { displayName: data.name });
            }
            if (data.avatarUrl && firebaseAuthInstance && currentUser.photoURL !== data.avatarUrl) {
               await updateFirebaseProfile(currentUser, { photoURL: data.avatarUrl });
            }

            const refreshedUser = await fetchAndSetAppProfile(currentUser); 
            setCurrentUser(refreshedUser); 
            toast({ title: "Profile Updated", description: "Your profile information has been saved."});
            return refreshedUser;
        }
        throw new Error("App profile update returned undefined.");
    } catch (error: any) {
        console.error("Error updating app user profile:", error);
        setAuthError(error.message || "Failed to update profile.");
        toast({ title: "Update Failed", description: error.message || "Could not update profile.", variant: "destructive"});
        return currentUser; 
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

    