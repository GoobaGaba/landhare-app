
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
      let appProfileData: AppUserType | undefined;

      if (firebaseInitializationError) {
          // MOCK MODE
          if (firebaseUser.uid === MOCK_USER_FOR_UI_TESTING.id) {
              appProfileData = MOCK_USER_FOR_UI_TESTING; // Use the direct constant for primary mock user
          } else if (firebaseUser.uid === MOCK_GOOGLE_USER_FOR_UI_TESTING.id) {
              appProfileData = MOCK_GOOGLE_USER_FOR_UI_TESTING; // Use the direct constant for Google mock user
          } else {
             appProfileData = mockUsers.find(u => u.id === firebaseUser.uid);
          }
          
          if (!appProfileData && firebaseUser.email) {
            // Attempt to "create" if not found in initial mocks - useful for dynamic mock user creation
            appProfileData = await dbCreateUserProfile(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName, firebaseUser.photoURL);
          }
      } else {
         // LIVE MODE
         appProfileData = await getUserById(firebaseUser.uid);
         if (!appProfileData && firebaseUser.email) { 
            // console.log(`[AuthContext] fetchAndSetAppProfile (live mode): Profile for ${firebaseUser.uid} not in DB, creating.`);
            appProfileData = await dbCreateUserProfile(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName, firebaseUser.photoURL);
         }
      }
      
      const currentSubStatus = appProfileData?.subscriptionStatus || 'free';
      setSubscriptionStatus(currentSubStatus); 
      
      // Construct the appProfile with fallbacks if some Firestore fields are missing
      const finalAppProfile: AppUserType = {
        id: firebaseUser.uid,
        name: appProfileData?.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User",
        email: appProfileData?.email || firebaseUser.email || "no-email@example.com",
        avatarUrl: appProfileData?.avatarUrl || firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(appProfileData?.name || firebaseUser.displayName || firebaseUser.email || 'U').charAt(0).toUpperCase()}`,
        subscriptionStatus: currentSubStatus,
        createdAt: appProfileData?.createdAt || (firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime) : new Date()),
        bio: appProfileData?.bio || '',
        stripeCustomerId: appProfileData?.stripeCustomerId,
        bookmarkedListingIds: appProfileData?.bookmarkedListingIds || [],
      };
      
      return { ...firebaseUser, appProfile: finalAppProfile } as CurrentUser;

    } catch (profileError: any) {
      console.error("[AuthContext] Error fetching/creating user profile:", profileError.message, profileError.stack);
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
    setLoading(true); 
    setAuthError(null); 

    if (firebaseInitializationError) {
      // console.warn("[AuthContext] onAuthStateChanged: Firebase not available. Operating in Preview Mode. No real auth listener.");
      setCurrentUser(null); 
      setSubscriptionStatus('free'); 
      setAuthError(firebaseInitializationError); 
      setLoading(false);
      return; 
    }
    
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance!, async (user) => {
      setLoading(true); 
      const userWithProfile = await fetchAndSetAppProfile(user);
      setCurrentUser(userWithProfile);
      setLoading(false); 
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
      const mockId = `mock-user-${Date.now()}`;
      // Create profile in mockUsers array via dbCreateUserProfile's mock path
      const newMockAppUser = await dbCreateUserProfile(mockId, credentials.email, credentials.displayName); 
      const newMockCurrentUser: CurrentUser = {
        uid: mockId,
        email: credentials.email,
        displayName: credentials.displayName,
        emailVerified: false, isAnonymous: false, photoURL: newMockAppUser.avatarUrl || null,
        getIdToken: async () => 'mock-token', getIdTokenResult: async () => ({ token: 'mock-token', claims: {}, expirationTime: '', issuedAtTime: '', signInProvider: null, signInSecondFactor: null}),
        reload: async () => {}, delete: async () => {}, toJSON: () => ({}),
        metadata: { creationTime: (newMockAppUser.createdAt instanceof Date ? newMockAppUser.createdAt : new Date()).toISOString(), lastSignInTime: new Date().toISOString() },
        providerData: [], refreshToken: 'mock-refresh-token', tenantId: null,
        appProfile: newMockAppUser,
      } as CurrentUser;
      setCurrentUser(newMockCurrentUser);
      setSubscriptionStatus(newMockAppUser.subscriptionStatus || 'free');
      incrementMockDataVersion('signUpWithEmailPassword_mock');
      setLoading(false);
      toast({ title: "Mock Signup Successful", description: "Account created in mock environment."});
      return newMockCurrentUser;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, credentials.email, credentials.password);
      const firebaseUser = userCredential.user;
      await updateFirebaseProfile(firebaseUser, { 
        displayName: credentials.displayName || credentials.email.split('@')[0],
      });
      // Firestore profile creation is handled by onAuthStateChanged -> fetchAndSetAppProfile if it doesn't exist
      // No need to call setLoading(false) here, onAuthStateChanged will handle it.
      return null; // Let onAuthStateChanged handle setting the currentUser
    } catch (err) {
      const firebaseErr = err as AuthError;
      setAuthError(firebaseErr.message || "Error during sign up.");
      setLoading(false);
      throw firebaseErr;
    }
  };

  const signInWithEmailPassword = async (credentials: Pick<Required<AuthCredentials>, 'email' | 'password'>): Promise<CurrentUser | null> => {
    setAuthError(null);
    setLoading(true);
     if (firebaseInitializationError || !firebaseAuthInstance) {
      let userToSignInAppProfile = mockUsers.find(u => u.email === credentials.email);
      let firebaseUserPart: Partial<FirebaseUserType> = {};

      if (credentials.email === MOCK_USER_FOR_UI_TESTING.email) {
        userToSignInAppProfile = MOCK_USER_FOR_UI_TESTING;
        firebaseUserPart = { uid: MOCK_USER_FOR_UI_TESTING.id, email: MOCK_USER_FOR_UI_TESTING.email, displayName: MOCK_USER_FOR_UI_TESTING.name, photoURL: MOCK_USER_FOR_UI_TESTING.avatarUrl };
      } else if (userToSignInAppProfile) {
        firebaseUserPart = { uid: userToSignInAppProfile.id, email: userToSignInAppProfile.email, displayName: userToSignInAppProfile.name, photoURL: userToSignInAppProfile.avatarUrl };
      }

      if (userToSignInAppProfile && firebaseUserPart.uid) {
        const fullMockUser: CurrentUser = {
            ...(firebaseUserPart as FirebaseUserType), // Cast to satisfy FirebaseUserType part
            emailVerified: true, isAnonymous: false, 
            getIdToken: async () => 'mock-token', getIdTokenResult: async () => ({ token: 'mock-token', claims: {}, expirationTime: '', issuedAtTime: '', signInProvider: null, signInSecondFactor: null}),
            reload: async () => {}, delete: async () => {}, toJSON: () => ({}),
            metadata: { creationTime: (userToSignInAppProfile.createdAt instanceof Date ? userToSignInAppProfile.createdAt : new Date()).toISOString(), lastSignInTime: new Date().toISOString() },
            providerData: [], refreshToken: 'mock-refresh-token', tenantId: null,
            appProfile: userToSignInAppProfile,
        } as CurrentUser;

        setCurrentUser(fullMockUser);
        setSubscriptionStatus(fullMockUser.appProfile?.subscriptionStatus || 'free');
        incrementMockDataVersion('signInWithEmailPassword_mock');
        setLoading(false);
        toast({ title: "Mock Login Successful", description: `Welcome back, ${fullMockUser.displayName} (mock).`});
        return fullMockUser;
      } else {
        const genericError = "Invalid mock credentials. Try 'mocktester@example.com' or other mock user emails.";
        setAuthError(genericError);
        setLoading(false);
        throw new Error(genericError);
      }
    }
    try {
      await signInWithEmailAndPassword(firebaseAuthInstance, credentials.email, credentials.password);
      // onAuthStateChanged will handle setting user and profile.
      // No need to call setLoading(false) here, onAuthStateChanged will handle it.
      return null; 
    } catch (err) {
      const firebaseErr = err as AuthError;
      setAuthError(firebaseErr.message || "Error during sign in.");
      setLoading(false);
      throw firebaseErr;
    }
  };

  const signInWithGoogle = async (): Promise<CurrentUser | null> => {
    setAuthError(null);
    setLoading(true);
    if (firebaseInitializationError || !firebaseAuthInstance) {
      const mockGoogleAppProfile = await dbCreateUserProfile(MOCK_GOOGLE_USER_FOR_UI_TESTING.id, MOCK_GOOGLE_USER_FOR_UI_TESTING.email, MOCK_GOOGLE_USER_FOR_UI_TESTING.name, MOCK_GOOGLE_USER_FOR_UI_TESTING.avatarUrl);
      const userToSignIn: CurrentUser = {
        uid: MOCK_GOOGLE_USER_FOR_UI_TESTING.id, 
        email: MOCK_GOOGLE_USER_FOR_UI_TESTING.email,
        displayName: MOCK_GOOGLE_USER_FOR_UI_TESTING.name,
        photoURL: MOCK_GOOGLE_USER_FOR_UI_TESTING.avatarUrl,
        emailVerified: true, isAnonymous: false,
        getIdToken: async () => 'mock-google-token',
        getIdTokenResult: async () => ({ token: 'mock-google-token', claims: {}, expirationTime: '', issuedAtTime: '', signInProvider: 'google.com', signInSecondFactor: null}),
        reload: async () => {}, delete: async () => {}, toJSON: () => ({}),
        metadata: { creationTime: (mockGoogleAppProfile.createdAt instanceof Date ? mockGoogleAppProfile.createdAt : new Date()).toISOString(), lastSignInTime: new Date().toISOString() },
        providerData: [{ providerId: 'google.com', uid: MOCK_GOOGLE_USER_FOR_UI_TESTING.id, displayName: MOCK_GOOGLE_USER_FOR_UI_TESTING.name, email: MOCK_GOOGLE_USER_FOR_UI_TESTING.email, photoURL: MOCK_GOOGLE_USER_FOR_UI_TESTING.avatarUrl, phoneNumber: null }],
        refreshToken: 'mock-google-refresh-token', tenantId: null,
        appProfile: mockGoogleAppProfile,
      } as CurrentUser;

      setCurrentUser(userToSignIn);
      setSubscriptionStatus(userToSignIn.appProfile?.subscriptionStatus || 'free');
      incrementMockDataVersion('signInWithGoogle_mock');
      setLoading(false);
      toast({ title: "Mock Google Sign-In Successful", description: `Welcome, ${userToSignIn.displayName} (mock Google user).`});
      return userToSignIn;
    }

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(firebaseAuthInstance, provider);
      // onAuthStateChanged will handle setting user and profile.
      // No need to call setLoading(false) here, onAuthStateChanged will handle it.
      return null; 
    } catch (err) {
      const firebaseErr = err as AuthError;
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
      setCurrentUser(null);
      setSubscriptionStatus('free');
      incrementMockDataVersion('logoutUser_mock');
      setLoading(false);
      toast({ title: 'Mock Logout', description: 'Simulated logout.' });
      return;
    }
    try {
      await firebaseSignOut(firebaseAuthInstance);
      // onAuthStateChanged will handle setting currentUser to null, loading to false, and subscriptionStatus to 'free'.
    } catch (err) {
      const firebaseErr = err as AuthError;
      setAuthError(firebaseErr.message || "Error during logout.");
      setLoading(false); 
      throw firebaseErr;
    }
  };
  
  const sendPasswordReset = async (email: string): Promise<void> => {
     setAuthError(null);
    if (firebaseInitializationError || !firebaseAuthInstance) {
      toast({ title: "Feature Unavailable", description: "Password reset is not available in mock mode.", variant: "default"});
      return;
    }
    try {
      await sendPasswordResetEmail(firebaseAuthInstance, email);
      toast({ title: "Password Reset Email Sent", description: "Check your inbox for instructions."});
    } catch (err) {
       const firebaseErr = err as AuthError;
      setAuthError(firebaseErr.message || "Error sending password reset.");
      throw firebaseErr;
    }
  };

  const refreshUserProfile = useCallback(async (): Promise<void> => {
    if (currentUser) { 
        setLoading(true);
        const userWithFreshProfile = await fetchAndSetAppProfile(currentUser); 
        setCurrentUser(userWithFreshProfile); 
        if (firebaseInitializationError) { 
          incrementMockDataVersion('refreshUserProfile_mock');
        }
        setLoading(false);
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
        // Update Firestore profile first
        const updatedAppProfileFromDb = await updateAppUserProfileDb(currentUser.uid, data);
        if (!updatedAppProfileFromDb) {
            throw new Error("Failed to update user profile in the database.");
        }
        
        // If live mode, and name/avatarUrl changed, update Firebase Auth profile
        if (!firebaseInitializationError && firebaseAuthInstance) {
            const firebaseProfileUpdates: { displayName?: string; photoURL?: string } = {};
            if (data.name && currentUser.displayName !== data.name) {
               firebaseProfileUpdates.displayName = data.name;
            }
            // Assuming avatarUrl updates are handled by directly setting photoURL in Firebase Auth
            // if (data.avatarUrl && currentUser.photoURL !== data.avatarUrl) {
            //    firebaseProfileUpdates.photoURL = data.avatarUrl;
            // }
            if (Object.keys(firebaseProfileUpdates).length > 0) {
              await updateFirebaseProfile(currentUser, firebaseProfileUpdates);
            }
        }
        
        // Construct the new currentUser state, prioritizing the fresh data from Firestore
        const newCurrentUserState: CurrentUser = {
            ...(currentUser as FirebaseUserType), // Base Firebase user object
            appProfile: updatedAppProfileFromDb, // The latest profile from Firestore
            // Update FirebaseUserType fields if they changed in appProfile
            displayName: updatedAppProfileFromDb.name || currentUser.displayName,
            photoURL: updatedAppProfileFromDb.avatarUrl || currentUser.photoURL,
            email: updatedAppProfileFromDb.email || currentUser.email, 
        } as CurrentUser;

        setCurrentUser(newCurrentUserState); 
        setSubscriptionStatus(updatedAppProfileFromDb.subscriptionStatus || 'free');
        toast({ title: "Profile Updated", description: "Your profile information has been saved."});
        if (firebaseInitializationError) {
            incrementMockDataVersion('updateCurrentAppUserProfile_mock');
        }
        setLoading(false);
        return newCurrentUserState;

    } catch (error: any) {
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
