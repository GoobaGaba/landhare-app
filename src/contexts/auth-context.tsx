
'use client';

import type { User as FirebaseUserType, AuthError } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword, 
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
  incrementMockDataVersion,
  addBookmarkToList,
  removeBookmarkFromList,
  createSubscriptionTransaction,
  createRefundTransaction,
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
  addBookmark: (listingId: string) => Promise<void>;
  removeBookmark: (listingId: string) => Promise<void>;
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
          if (firebaseUser.uid === MOCK_USER_FOR_UI_TESTING.id) {
              appProfileData = MOCK_USER_FOR_UI_TESTING;
          } else if (firebaseUser.uid === MOCK_GOOGLE_USER_FOR_UI_TESTING.id) {
              appProfileData = MOCK_GOOGLE_USER_FOR_UI_TESTING;
          } else {
             appProfileData = mockUsers.find(u => u.id === firebaseUser.uid);
          }
          
          if (!appProfileData && firebaseUser.email) {
            appProfileData = await dbCreateUserProfile(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName, firebaseUser.photoURL);
          }
      } else {
         appProfileData = await getUserById(firebaseUser.uid);
         if (!appProfileData && firebaseUser.email) { 
            appProfileData = await dbCreateUserProfile(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName, firebaseUser.photoURL);
         }
      }
      
      const currentSubStatus = appProfileData?.subscriptionStatus || 'free';
      setSubscriptionStatus(currentSubStatus); 
      
      const finalAppProfile: AppUserType = {
        id: firebaseUser.uid,
        name: appProfileData?.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User",
        email: appProfileData?.email || firebaseUser.email || "no-email@example.com",
        avatarUrl: appProfileData?.avatarUrl || firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${(appProfileData?.name || firebaseUser.displayName || firebaseUser.email || 'U').charAt(0).toUpperCase()}`,
        subscriptionStatus: currentSubStatus,
        createdAt: appProfileData?.createdAt || (firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime) : new Date()),
        bio: appProfileData?.bio || '',
        bookmarkedListingIds: appProfileData?.bookmarkedListingIds || [],
        walletBalance: appProfileData?.walletBalance ?? 10000,
      };
      
      return { ...firebaseUser, appProfile: finalAppProfile } as CurrentUser;

    } catch (profileError: any) {
      setSubscriptionStatus('free'); 
      toast({ title: "Profile Error", description: "Could not load or create your user profile.", variant: "destructive"});
      const minimalAppProfile: AppUserType = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: firebaseUser.email || 'no-email@example.com',
        subscriptionStatus: 'free',
        createdAt: firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime) : new Date(),
        bookmarkedListingIds: [],
        walletBalance: 10000,
      };
      return { ...firebaseUser, appProfile: minimalAppProfile } as CurrentUser;
    }
  }, [toast]);


  useEffect(() => {
    setLoading(true); 
    setAuthError(null); 

    if (firebaseInitializationError) {
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
      // Only increment mockDataVersion if a mock user is identified from onAuthStateChanged
      // This avoids incrementing when live Firebase auth state changes, which shouldn't affect mock data displays
      if (firebaseInitializationError && user && (user.uid === MOCK_USER_FOR_UI_TESTING.id || user.uid === MOCK_GOOGLE_USER_FOR_UI_TESTING.id)) {
         // This path might be less common now as mock users are set directly in signIn functions
         // incrementMockDataVersion('onAuthStateChanged_mock_user_identified');
      }
      setLoading(false); 
    }, (error) => {
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
      toast({ title: "Signup Successful", description: "Account created."});
      return newMockCurrentUser;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, credentials.email, credentials.password);
      const firebaseUser = userCredential.user;
      await updateFirebaseProfile(firebaseUser, { 
        displayName: credentials.displayName || credentials.email.split('@')[0],
      });
      return null; 
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
    
    const mockUserEmails = mockUsers.map(u => u.email);
    const isMockLoginAttempt = mockUserEmails.includes(credentials.email);

    // --- MOCK/ADMIN LOGIN PATH ---
    // If the email matches a known mock user, ALWAYS use the mock logic, regardless of Firebase connection status.
    if (isMockLoginAttempt) {
      const userToSignInAppProfile = mockUsers.find(u => u.email === credentials.email);
      if (!userToSignInAppProfile) {
          const genericError = `Mock user with email ${credentials.email} not found.`;
          setAuthError(genericError);
          setLoading(false);
          throw new Error(genericError);
      }

      const firebaseUserPart: Partial<FirebaseUserType> = {
          uid: userToSignInAppProfile.id,
          email: userToSignInAppProfile.email,
          displayName: userToSignInAppProfile.name,
          photoURL: userToSignInAppProfile.avatarUrl
      };

      const fullMockUser: CurrentUser = {
          ...(firebaseUserPart as FirebaseUserType), 
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
      toast({ title: "Login Successful", description: `Welcome back, ${fullMockUser.displayName}.`});
      return fullMockUser;
    }

    // --- LIVE FIREBASE LOGIN PATH ---
    // If not a mock user, proceed with live logic ONLY if Firebase is configured.
    if (firebaseInitializationError || !firebaseAuthInstance) {
      const genericError = "Invalid credentials. This app is in preview mode and only accepts known mock user emails.";
      setAuthError(genericError);
      setLoading(false);
      throw new Error(genericError);
    }
    
    try {
      await firebaseSignInWithEmailAndPassword(firebaseAuthInstance, credentials.email, credentials.password);
      // The onAuthStateChanged listener will handle setting the current user.
      return null;
    } catch (err) {
      const firebaseErr = err as AuthError;
      setAuthError(firebaseErr.message || "Error during sign in.");
      setLoading(false);
      throw firebaseErr; // Re-throw to be caught by the login page UI
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
      toast({ title: "Google Sign-In Successful", description: `Welcome, ${userToSignIn.displayName}.`});
      return userToSignIn;
    }

    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(firebaseAuthInstance, provider);
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
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      return;
    }
    try {
      await firebaseSignOut(firebaseAuthInstance);
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
        const wasPremium = currentUser.appProfile?.subscriptionStatus === 'premium';
        const updatedAppProfileFromDb = await updateAppUserProfileDb(currentUser.uid, data);
        if (!updatedAppProfileFromDb) {
            throw new Error("Failed to update user profile in the database.");
        }
        
        const isNowPremium = updatedAppProfileFromDb.subscriptionStatus === 'premium';
        const isNowFree = updatedAppProfileFromDb.subscriptionStatus === 'free';
        
        if (wasPremium && isNowFree) {
            await createRefundTransaction(currentUser.uid);
        } else if (!wasPremium && isNowPremium) {
            await createSubscriptionTransaction(currentUser.uid);
        }

        if (!firebaseInitializationError && firebaseAuthInstance && firebaseAuthInstance.currentUser) {
            const firebaseProfileUpdates: { displayName?: string; photoURL?: string } = {};
            if (data.name && currentUser.displayName !== data.name) {
               firebaseProfileUpdates.displayName = data.name;
            }
            if (Object.keys(firebaseProfileUpdates).length > 0) {
              await updateFirebaseProfile(firebaseAuthInstance.currentUser, firebaseProfileUpdates);
            }
        }
        
        const newCurrentUserState: CurrentUser = {
            ...(currentUser as FirebaseUserType), 
            appProfile: updatedAppProfileFromDb, 
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

  const addBookmark = async (listingId: string): Promise<void> => {
    if (!currentUser || !currentUser.appProfile) {
      toast({ title: "Login Required", description: "Please log in to bookmark listings.", variant: "default" });
      return;
    }
    try {
      const updatedUser = await addBookmarkToList(currentUser.uid, listingId);
      if (updatedUser && updatedUser.bookmarkedListingIds) {
        setCurrentUser(prev => prev ? ({ ...prev, appProfile: { ...prev.appProfile!, bookmarkedListingIds: updatedUser.bookmarkedListingIds } }) : null);
        toast({ title: "Bookmarked!", description: "Listing added to your bookmarks." });
      }
    } catch (error: any) {
      toast({ title: "Error Bookmarking", description: error.message || "Could not add bookmark.", variant: "destructive" });
    }
  };

  const removeBookmark = async (listingId: string): Promise<void> => {
    if (!currentUser || !currentUser.appProfile) {
      // Should not happen if UI is correct, but good to check
      return;
    }
    try {
      const updatedUser = await removeBookmarkFromList(currentUser.uid, listingId);
      if (updatedUser && updatedUser.bookmarkedListingIds) {
         setCurrentUser(prev => prev ? ({ ...prev, appProfile: { ...prev.appProfile!, bookmarkedListingIds: updatedUser.bookmarkedListingIds } }) : null);
        toast({ title: "Bookmark Removed", description: "Listing removed from your bookmarks." });
      }
    } catch (error: any) {
      toast({ title: "Error Removing Bookmark", description: error.message || "Could not remove bookmark.", variant: "destructive" });
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
    addBookmark,
    removeBookmark,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
