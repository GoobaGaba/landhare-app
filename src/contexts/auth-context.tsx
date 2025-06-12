
'use client';

import type { User as FirebaseUserType, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo
} from 'firebase/auth';
import { auth as firebaseAuthInstance, db as firestoreInstance, firebaseInitializationError } from '@/lib/firebase'; 
import type { ReactNode} from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  createUserProfile as dbCreateUserProfile, 
  getUserById, 
  updateUserProfile as updateAppUserProfileDb, 
  mockUsers, 
  MOCK_GOOGLE_USER_FOR_UI_TESTING,
  MOCK_USER_FOR_UI_TESTING,
  incrementMockDataVersion 
} from '@/lib/mock-data'; 
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
  signInWithGoogle: () => Promise<CurrentUser | null>;
  logoutUser: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  updateCurrentAppUserProfile: (data: Partial<AppUserType>) => Promise<CurrentUser | null>;
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
  
    try {
      let userProfile: AppUserType | undefined;
      if (firebaseInitializationError) {
          // Prioritize specific mock users if their UIDs match
          if (firebaseUser.uid === MOCK_USER_FOR_UI_TESTING.uid) {
              userProfile = MOCK_USER_FOR_UI_TESTING.appProfile;
          } else if (firebaseUser.uid === MOCK_GOOGLE_USER_FOR_UI_TESTING.id) {
              userProfile = MOCK_GOOGLE_USER_FOR_UI_TESTING.appProfile;
          } else {
             // Fallback to finding by ID in the general mockUsers list
             userProfile = mockUsers.find(u => u.id === firebaseUser.uid);
          }
          // console.log(`[AuthContext] fetchAndSetAppProfile (mock mode) for UID ${firebaseUser.uid}, profile found:`, !!userProfile);
          // If still not found, and it's a "new" mock user, try to create it.
          if (!userProfile && firebaseUser.email) {
            // console.log(`[AuthContext] fetchAndSetAppProfile (mock mode): Profile for ${firebaseUser.uid} not in existing mocks, attempting to create/get from dbCreateUserProfile (mock path).`);
            userProfile = await dbCreateUserProfile(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName, firebaseUser.photoURL);
          }
      } else {
         userProfile = await getUserById(firebaseUser.uid);
         if (!userProfile && firebaseUser.email) { // If real user not found in DB (e.g., first Google sign-in)
            // console.log(`[AuthContext] fetchAndSetAppProfile (live mode): Profile for ${firebaseUser.uid} not in DB, creating.`);
            userProfile = await dbCreateUserProfile(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName, firebaseUser.photoURL);
         }
      }
      
      const currentSubStatus = userProfile?.subscriptionStatus || 'free';
      setSubscriptionStatus(currentSubStatus); 
      
      const appProfileWithDefaults: AppUserType = {
        id: firebaseUser.uid,
        name: userProfile?.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: userProfile?.email || firebaseUser.email || 'no-email@example.com',
        avatarUrl: userProfile?.avatarUrl || firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(userProfile?.name || firebaseUser.displayName || firebaseUser.email || 'U').charAt(0).toUpperCase()}`,
        subscriptionStatus: currentSubStatus,
        createdAt: userProfile?.createdAt || (firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime) : new Date()),
        bio: userProfile?.bio || '',
        stripeCustomerId: userProfile?.stripeCustomerId,
        bookmarkedListingIds: userProfile?.bookmarkedListingIds || [],
      };
      
      return { ...firebaseUser, appProfile: appProfileWithDefaults } as CurrentUser;
    } catch (profileError) {
      console.error("[AuthContext] Error fetching/creating user profile:", profileError);
      setSubscriptionStatus('free'); 
      toast({ title: "Profile Error", description: "Could not load or create your user profile.", variant: "destructive"});
      const minimalAppProfile: AppUserType = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: firebaseUser.email || 'no-email@example.com',
        subscriptionStatus: 'free',
        createdAt: firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime) : new Date(),
        bookmarkedListingIds: [],
      };
      return { ...firebaseUser, appProfile: minimalAppProfile } as CurrentUser;
    }
  }, [toast]);


  useEffect(() => {
    // console.log("[AuthContext] useEffect for onAuthStateChanged: Initializing. Firebase error state:", firebaseInitializationError);
    setLoading(true); 
    setAuthError(null); 

    if (firebaseInitializationError) {
      console.warn("[AuthContext] onAuthStateChanged: Firebase not available. Operating in Preview Mode. No real auth listener.");
      setCurrentUser(null); 
      setSubscriptionStatus('free'); 
      setAuthError(firebaseInitializationError); 
      setLoading(false);
      return; 
    }
    
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance!, async (user) => {
      // console.log("[AuthContext] onAuthStateChanged callback fired. User:", user ? user.uid : 'null');
      setLoading(true); 
      const userWithProfile = await fetchAndSetAppProfile(user);
      setCurrentUser(userWithProfile);
      setLoading(false); 
      // console.log("[AuthContext] onAuthStateChanged: loading set to false. CurrentUser updated:", userWithProfile ? userWithProfile.uid : 'null');
    }, (error) => {
      console.error("[AuthContext] Auth State Listener Error:", error);
      setAuthError(error.message || "Error in auth state listener.");
      setCurrentUser(null);
      setSubscriptionStatus('free');
      setLoading(false);
    });
    return unsubscribe; 
  }, [fetchAndSetAppProfile]); 

  const signUpWithEmailPassword = async (credentials: Required<AuthCredentials>): Promise<CurrentUser | null> => {
    setAuthError(null);
    setLoading(true);
    if (firebaseInitializationError || !firebaseAuthInstance) {
      // console.warn("[AuthContext] signUpWithEmailPassword (mock): Simulating mock sign up.");
      const mockId = `mock-user-${Date.now()}`;
      const newMockAppUser = await dbCreateUserProfile(mockId, credentials.email, credentials.displayName); 
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
      incrementMockDataVersion('signUpWithEmailPassword_mock');
      setLoading(false);
      return newMockCurrentUser;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, credentials.email, credentials.password);
      const firebaseUser = userCredential.user;
      await updateFirebaseProfile(firebaseUser, { 
        displayName: credentials.displayName || credentials.email.split('@')[0],
      });
      // fetchAndSetAppProfile will be called by onAuthStateChanged
      setLoading(false); 
      return null; 
    } catch (err) {
      const firebaseErr = err as AuthError;
      console.error("[AuthContext] Firebase sign up error:", firebaseErr);
      setAuthError(firebaseErr.message || "Error during sign up.");
      setLoading(false);
      throw firebaseErr;
    }
  };

  const signInWithEmailPassword = async (credentials: Pick<Required<AuthCredentials>, 'email' | 'password'>): Promise<CurrentUser | null> => {
    setAuthError(null);
    setLoading(true);
     if (firebaseInitializationError || !firebaseAuthInstance) {
      // console.warn("[AuthContext] signInWithEmailPassword (mock): Simulating mock login.");
      let userToSignIn: CurrentUser | null = null;
      if (credentials.email === MOCK_USER_FOR_UI_TESTING.email) {
        const latestMockAppProfile = await getUserById(MOCK_USER_FOR_UI_TESTING.uid); 
        userToSignIn = {
          ...MOCK_USER_FOR_UI_TESTING, 
          appProfile: latestMockAppProfile || MOCK_USER_FOR_UI_TESTING.appProfile,
        } as CurrentUser;
      } else {
        const foundMockUser = mockUsers.find(u => u.email === credentials.email);
        if (foundMockUser) {
            userToSignIn = {
                uid: foundMockUser.id, email: foundMockUser.email, displayName: foundMockUser.name, photoURL: foundMockUser.avatarUrl,
                emailVerified: true, isAnonymous: false, 
                getIdToken: async () => 'mock-token', getIdTokenResult: async () => ({ token: 'mock-token', claims: {}, expirationTime: '', issuedAtTime: '', signInProvider: null, signInSecondFactor: null}),
                reload: async () => {}, delete: async () => {}, toJSON: () => ({}),
                metadata: { creationTime: (foundMockUser.createdAt instanceof Date ? foundMockUser.createdAt : (foundMockUser.createdAt as any)?.toDate() || new Date()).toISOString(), lastSignInTime: new Date().toISOString() },
                providerData: [], refreshToken: 'mock-refresh-token', tenantId: null,
                appProfile: foundMockUser,
            } as CurrentUser;
        }
      }

      if (userToSignIn) {
        setCurrentUser(userToSignIn);
        setSubscriptionStatus(userToSignIn.appProfile?.subscriptionStatus || 'free');
        toast({ title: "Mock Login Successful", description: `Welcome back, ${userToSignIn.displayName} (mock).`});
        incrementMockDataVersion('signInWithEmailPassword_mock');
        setLoading(false);
        return userToSignIn;
      } else {
        const genericError = "Invalid mock credentials. Try 'mocktester@example.com' or other mock user emails.";
        setAuthError(genericError);
        toast({ title: "Mock Login Failed", description: genericError, variant: "destructive"});
        setLoading(false);
        throw new Error(genericError);
      }
    }
    try {
      await signInWithEmailAndPassword(firebaseAuthInstance, credentials.email, credentials.password);
      // onAuthStateChanged will handle setting user and profile.
      setLoading(false); 
      return null; 
    } catch (err) {
      const firebaseErr = err as AuthError;
      console.error("[AuthContext] Firebase sign in error:", firebaseErr);
      setAuthError(firebaseErr.message || "Error during sign in.");
      setLoading(false);
      throw firebaseErr;
    }
  };

  const signInWithGoogle = async (): Promise<CurrentUser | null> => {
    setAuthError(null);
    setLoading(true);
    if (firebaseInitializationError || !firebaseAuthInstance) {
      // console.warn("[AuthContext] signInWithGoogle (mock): Simulating Google sign in.");
      const mockGoogleUserFirebasePart = {
        uid: MOCK_GOOGLE_USER_FOR_UI_TESTING.id, 
        email: MOCK_GOOGLE_USER_FOR_UI_TESTING.email,
        displayName: MOCK_GOOGLE_USER_FOR_UI_TESTING.name,
        photoURL: MOCK_GOOGLE_USER_FOR_UI_TESTING.avatarUrl,
        emailVerified: true, isAnonymous: false,
        getIdToken: async () => 'mock-google-token',
        getIdTokenResult: async () => ({ token: 'mock-google-token', claims: {}, expirationTime: '', issuedAtTime: '', signInProvider: 'google.com', signInSecondFactor: null}),
        reload: async () => {}, delete: async () => {}, toJSON: () => ({}),
        metadata: { creationTime: new Date().toISOString(), lastSignInTime: new Date().toISOString() },
        providerData: [{ providerId: 'google.com', uid: MOCK_GOOGLE_USER_FOR_UI_TESTING.id, displayName: MOCK_GOOGLE_USER_FOR_UI_TESTING.name, email: MOCK_GOOGLE_USER_FOR_UI_TESTING.email, photoURL: MOCK_GOOGLE_USER_FOR_UI_TESTING.avatarUrl, phoneNumber: null }],
        refreshToken: 'mock-google-refresh-token', tenantId: null,
      } as FirebaseUserType;

      let appProfile = mockUsers.find(u => u.id === MOCK_GOOGLE_USER_FOR_UI_TESTING.id) || MOCK_GOOGLE_USER_FOR_UI_TESTING.appProfile;
      if (!appProfile) { // If not found, create it
        appProfile = await dbCreateUserProfile(MOCK_GOOGLE_USER_FOR_UI_TESTING.id, MOCK_GOOGLE_USER_FOR_UI_TESTING.email, MOCK_GOOGLE_USER_FOR_UI_TESTING.name, MOCK_GOOGLE_USER_FOR_UI_TESTING.avatarUrl);
      }
      
      const userToSignIn: CurrentUser = {
        ...mockGoogleUserFirebasePart,
        appProfile: appProfile,
      } as CurrentUser;

      setCurrentUser(userToSignIn);
      setSubscriptionStatus(userToSignIn.appProfile?.subscriptionStatus || 'free');
      toast({ title: "Mock Google Sign-In Successful", description: `Welcome, ${userToSignIn.displayName} (mock Google user).`});
      incrementMockDataVersion('signInWithGoogle_mock');
      setLoading(false);
      // console.log("[AuthContext] signInWithGoogle (mock): loading set to false. CurrentUser:", userToSignIn.uid);
      return userToSignIn;
    }

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(firebaseAuthInstance, provider);
      // onAuthStateChanged will handle setting user and profile.
      setLoading(false); 
      return null; 
    } catch (err) {
      const firebaseErr = err as AuthError;
      console.error("[AuthContext] Firebase Google sign in error:", firebaseErr);
      if (firebaseErr.code === 'auth/popup-closed-by-user') {
        setAuthError("Sign-in process cancelled by user.");
      } else if (firebaseErr.code === 'auth/account-exists-with-different-credential') {
        setAuthError("An account already exists with the same email address but different sign-in credentials. Try signing in with the original method.");
      } else {
        setAuthError(firebaseErr.message || "Error during Google sign in.");
      }
      setLoading(false);
      throw firebaseErr;
    }
  };

  const logoutUser = async (): Promise<void> => {
    setAuthError(null);
    setLoading(true);
    if (firebaseInitializationError || !firebaseAuthInstance) {
      // console.warn("[AuthContext] logoutUser (mock): Simulating mock logout.");
      setCurrentUser(null);
      setSubscriptionStatus('free');
      toast({ title: 'Mock Logout', description: 'Simulated logout.' });
      incrementMockDataVersion('logoutUser_mock');
      setLoading(false);
      return;
    }
    try {
      await firebaseSignOut(firebaseAuthInstance);
      // onAuthStateChanged will handle setting currentUser to null, loading to false, and subscriptionStatus to 'free'.
      setLoading(false); 
    } catch (err) {
      const firebaseErr = err as AuthError;
      console.error("[AuthContext] Firebase logout error:", firebaseErr);
      setAuthError(firebaseErr.message || "Error during logout.");
      setLoading(false); 
      throw firebaseErr;
    }
  };
  
  const sendPasswordReset = async (email: string): Promise<void> => {
     setAuthError(null);
    if (firebaseInitializationError || !firebaseAuthInstance) {
      toast({ title: "Feature Unavailable", description: "Password reset is not available in mock mode.", variant: "default"});
      // console.warn("[AuthContext] sendPasswordReset (mock): Firebase not available. Mock password reset requested.");
      return;
    }
    try {
      await sendPasswordResetEmail(firebaseAuthInstance, email);
      toast({ title: "Password Reset Email Sent", description: "Check your inbox for instructions."});
    } catch (err) {
       const firebaseErr = err as AuthError;
      console.error("[AuthContext] Firebase password reset error:", firebaseErr);
      setAuthError(firebaseErr.message || "Error sending password reset.");
      throw firebaseErr;
    }
  };

  const refreshUserProfile = useCallback(async (): Promise<void> => {
    if (currentUser) { 
        // console.log("[AuthContext] refreshUserProfile: Refreshing profile for user:", currentUser.uid);
        setLoading(true);
        const userWithFreshProfile = await fetchAndSetAppProfile(currentUser); 
        setCurrentUser(userWithFreshProfile); 
        if (firebaseInitializationError) { 
          incrementMockDataVersion('refreshUserProfile_mock');
        }
        setLoading(false);
        // console.log("[AuthContext] refreshUserProfile: Profile refreshed. New user state:", userWithFreshProfile);
    } else {
        // console.log("[AuthContext] refreshUserProfile: No current user to refresh.");
    }
  }, [currentUser, fetchAndSetAppProfile]);

  const updateCurrentAppUserProfile = async (data: Partial<AppUserType>): Promise<CurrentUser | null> => {
    if (!currentUser?.uid) {
        toast({ title: "Error", description: "Not logged in or user ID missing.", variant: "destructive"});
        return null;
    }
    setLoading(true);
    setAuthError(null);
    try {
        const updatedAppProfileFromDb = await updateAppUserProfileDb(currentUser.uid, data);

        if (!updatedAppProfileFromDb) {
            throw new Error("Failed to update user profile in the database.");
        }
        
        if (!firebaseInitializationError && firebaseAuthInstance) {
            if (data.name && currentUser.displayName !== data.name) {
               await updateFirebaseProfile(currentUser, { displayName: data.name });
            }
            if (data.avatarUrl && currentUser.photoURL !== data.avatarUrl) {
               await updateFirebaseProfile(currentUser, { photoURL: data.avatarUrl });
            }
        }
        
        const newCurrentUserState: CurrentUser = {
            ...(currentUser as FirebaseUserType), 
            appProfile: updatedAppProfileFromDb, 
            displayName: updatedAppProfileFromDb.name,
            photoURL: updatedAppProfileFromDb.avatarUrl,
            email: updatedAppProfileFromDb.email, 
        } as CurrentUser;


        setCurrentUser(newCurrentUserState); 
        setSubscriptionStatus(updatedAppProfileFromDb.subscriptionStatus || 'free');
        toast({ title: "Profile Updated", description: "Your profile information has been saved."});
        setLoading(false);
        return newCurrentUserState;

    } catch (error: any) {
        console.error("[AuthContext] Error updating app user profile:", error);
        const errorMessage = error.message || "Failed to update profile.";
        setAuthError(errorMessage);
        toast({ title: "Update Failed", description: errorMessage, variant: "destructive"});
        setLoading(false);
        return null; 
    }
  };


  const value: AuthContextType = {
    currentUser,
    loading,
    authError,
    subscriptionStatus,
    signUpWithEmailPassword,
    signInWithEmailPassword,
    signInWithGoogle,
    logoutUser,
    sendPasswordReset,
    refreshUserProfile,
    updateCurrentAppUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

