
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
  addBookmarkToList,
  removeBookmarkFromList,
  ADMIN_EMAILS,
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
      setSubscriptionStatus('standard'); 
      return null;
    }
  
    try {
      let appProfileData: AppUserType | undefined;
      const isUserAdmin = firebaseUser.email ? ADMIN_EMAILS.includes(firebaseUser.email) : false;

      if (firebaseInitializationError) {
          appProfileData = mockUsers.find(u => u.id === firebaseUser.uid);
          if (!appProfileData && firebaseUser.email) {
            appProfileData = await dbCreateUserProfile(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName, firebaseUser.photoURL);
          }
      } else { 
         appProfileData = await getUserById(firebaseUser.uid);
         if (!appProfileData && firebaseUser.email) { 
            appProfileData = await dbCreateUserProfile(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName, firebaseUser.photoURL);
         }
      }

      if (isUserAdmin && appProfileData && appProfileData.subscriptionStatus !== 'premium') {
        if (!firebaseInitializationError) {
            console.log(`Admin user ${firebaseUser.uid} detected with non-premium status. Correcting now.`);
            appProfileData = await updateAppUserProfileDb(firebaseUser.uid, { subscriptionStatus: 'premium' });
            toast({ title: "Admin Status Synced", description: "Your premium admin permissions have been applied.", variant: "default" });
        }
      }
      
      const currentSubStatus = appProfileData?.subscriptionStatus || 'standard';
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
        walletBalance: appProfileData?.walletBalance ?? (isUserAdmin ? 10000 : 2500),
        isAdmin: isUserAdmin,
      };
      
      return { ...firebaseUser, appProfile: finalAppProfile } as CurrentUser;

    } catch (profileError: any) {
      console.error("Error fetching or creating app profile:", profileError);
      setSubscriptionStatus('standard'); 
      toast({ title: "Profile Error", description: "Could not load or create your user profile.", variant: "destructive"});
      
      const isUserAdmin = firebaseUser.email ? ADMIN_EMAILS.includes(firebaseUser.email) : false;
      const minimalAppProfile: AppUserType = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: firebaseUser.email || 'no-email@example.com',
        subscriptionStatus: isUserAdmin ? 'premium' : 'standard',
        createdAt: firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime) : new Date(),
        bookmarkedListingIds: [],
        walletBalance: isUserAdmin ? 10000 : 2500,
        isAdmin: isUserAdmin,
      };
      return { ...firebaseUser, appProfile: minimalAppProfile } as CurrentUser;
    }
  }, [toast]);


  useEffect(() => {
    setLoading(true); 
    setAuthError(null); 

    if (firebaseInitializationError) {
      setCurrentUser(null); 
      setSubscriptionStatus('standard'); 
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
      console.error("Firebase auth state error:", error);
      setAuthError(error.message || "Error in auth state listener.");
      setCurrentUser(null);
      setSubscriptionStatus('standard');
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
      setSubscriptionStatus(newMockAppUser.subscriptionStatus || 'standard');
      setLoading(false);
      toast({ title: "Signup Successful (Mock Mode)", description: "Account created."});
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

    if (isMockLoginAttempt) {
      const userToSignInAppProfile = mockUsers.find(u => u.email === credentials.email);
      if (!userToSignInAppProfile) {
          const genericError = `Mock user with email ${credentials.email} not found.`;
          setAuthError(genericError);
          setLoading(false);
          throw new Error(genericError);
      }
      
      const isUserAdmin = ADMIN_EMAILS.includes(userToSignInAppProfile.email || '');
      const fullMockUser: CurrentUser = {
          uid: userToSignInAppProfile.id,
          email: userToSignInAppProfile.email,
          displayName: userToSignInAppProfile.name,
          photoURL: userToSignInAppProfile.avatarUrl,
          emailVerified: true, isAnonymous: false, 
          getIdToken: async () => 'mock-token', getIdTokenResult: async () => ({ token: 'mock-token', claims: {}, expirationTime: '', issuedAtTime: '', signInProvider: null, signInSecondFactor: null}),
          reload: async () => {}, delete: async () => {}, toJSON: () => ({}),
          metadata: { creationTime: (userToSignInAppProfile.createdAt instanceof Date ? userToSignInAppProfile.createdAt : new Date()).toISOString(), lastSignInTime: new Date().toISOString() },
          providerData: [], refreshToken: 'mock-refresh-token', tenantId: null,
          appProfile: {...userToSignInAppProfile, isAdmin: isUserAdmin },
      } as CurrentUser;

      setCurrentUser(fullMockUser);
      setSubscriptionStatus(fullMockUser.appProfile?.subscriptionStatus || 'standard');
      setLoading(false);
      toast({ title: "Login Successful", description: `Welcome back, ${fullMockUser.displayName}.`});
      return fullMockUser;
    }

    if (firebaseInitializationError || !firebaseAuthInstance) {
      const genericError = "Invalid credentials. This app is in preview mode and only accepts known mock user emails.";
      setAuthError(genericError);
      setLoading(false);
      throw new Error(genericError);
    }
    
    try {
      await firebaseSignInWithEmailAndPassword(firebaseAuthInstance, credentials.email, credentials.password);
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
      const mockUser = await fetchAndSetAppProfile(MOCK_GOOGLE_USER_FOR_UI_TESTING as any);
      setCurrentUser(mockUser);
      setLoading(false);
      return mockUser;
    }

    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(firebaseAuthInstance, provider);
      const userWithProfile = await fetchAndSetAppProfile(result.user);
      setCurrentUser(userWithProfile);
      setLoading(false);
      return userWithProfile;
    } catch (err) {
      const firebaseErr = err as AuthError;
      if (firebaseErr.code === 'auth/operation-not-allowed') {
        const helpfulError = "Google Sign-In is not enabled for this project. Please enable it in your Firebase Authentication settings.";
        setAuthError(helpfulError);
        toast({ title: "Configuration Error", description: helpfulError, variant: "destructive", duration: 8000 });
      } else if (firebaseErr.code === 'auth/popup-closed-by-user') {
        setAuthError("Sign-in process cancelled by user.");
      } else if (firebaseErr.code === 'auth/account-exists-with-different-credential') {
        setAuthError("An account already exists with this email. Try signing in with the original method.");
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
      setSubscriptionStatus('standard');
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
        const updatedAppProfileFromDb = await updateAppUserProfileDb(currentUser.uid, data);
        if (!updatedAppProfileFromDb) {
            throw new Error("Failed to update user profile in the database.");
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
        setSubscriptionStatus(updatedAppProfileFromDb.subscriptionStatus || 'standard');
        toast({ title: "Profile Updated", description: "Your profile information has been saved."});
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
