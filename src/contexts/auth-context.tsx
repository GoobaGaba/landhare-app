
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
  signInWithPopup
} from 'firebase/auth';
import { auth as firebaseAuthInstance, isPrototypeMode } from '@/lib/firebase'; 
import type { ReactNode} from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  createUserProfile, 
  getUserById, 
  updateUserProfile, 
  addBookmarkToList,
  removeBookmarkFromList,
  ADMIN_EMAILS
} from '@/lib/mock-data'; 
import type { User as AppUserType, SubscriptionStatus } from '@/lib/types';

interface AuthCredentials {
  email: string;
  password?: string; 
  displayName?: string;
}

export interface CurrentUser extends FirebaseUserType {
  appProfile: AppUserType;
}

interface AuthContextType {
  currentUser: CurrentUser | null; 
  loading: boolean;
  authError: string | null; 
  subscriptionStatus: SubscriptionStatus;
  signUpWithEmailAndPassword: (credentials: Required<AuthCredentials>) => Promise<void>;
  signInWithEmailPassword: (credentials: Pick<Required<AuthCredentials>, 'email' | 'password'>) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
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

  const handleAuthChange = useCallback(async (firebaseUser: FirebaseUserType | null) => {
    setLoading(true);
    if (firebaseUser) {
      try {
        let appProfile = await getUserById(firebaseUser.uid);
      
        if (!appProfile) {
          console.log(`No app profile found for UID ${firebaseUser.uid}. Creating one.`);
          appProfile = await createUserProfile(firebaseUser);
        }

        const isAdmin = ADMIN_EMAILS.includes(appProfile.email);
        if (isAdmin && (appProfile.subscriptionStatus !== 'premium' || !appProfile.isAdmin)) {
          appProfile = await updateUserProfile(firebaseUser.uid, { subscriptionStatus: 'premium', isAdmin: true }) || appProfile;
        }

        setCurrentUser({ ...firebaseUser, appProfile });
        setSubscriptionStatus(appProfile.subscriptionStatus || 'standard');

      } catch (error: any) {
        console.error("Critical error during authentication process:", error);
        setAuthError("Could not load or create your user profile. Please contact support.");
        setCurrentUser(null);
        setSubscriptionStatus('standard');
        if (firebaseAuthInstance) {
          await firebaseSignOut(firebaseAuthInstance);
        }
      }
    } else {
      setCurrentUser(null);
      setSubscriptionStatus('standard');
    }
    setLoading(false);
  }, []);


  useEffect(() => {
    setLoading(true);
    if (isPrototypeMode) {
      console.warn("Auth Provider is in PROTOTYPE MODE. Using mock user.");
      const mockUser: CurrentUser = {
          uid: 'mock-user-uid-12345',
          email: 'Gabrielleunda@gmail.com',
          displayName: 'GoobaGaba',
          photoURL: null,
          emailVerified: true,
          isAnonymous: false,
          metadata: {} as any,
          providerData: [],
          providerId: 'mock',
          tenantId: null,
          delete: async () => {},
          getIdToken: async () => 'mock-token',
          getIdTokenResult: async () => ({ token: 'mock-token' } as any),
          reload: async () => {},
          toJSON: () => ({}),
          appProfile: {
            id: 'mock-user-uid-12345',
            name: 'GoobaGaba',
            email: 'Gabrielleunda@gmail.com',
            isAdmin: true,
            subscriptionStatus: 'premium',
            walletBalance: 10000,
            bookmarkedListingIds: [],
          }
      };
      
      setCurrentUser(mockUser);
      setSubscriptionStatus('premium');
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance!, handleAuthChange, (error) => {
      console.error("Firebase onAuthStateChanged error:", error);
      setAuthError("An error occurred with your session. Please try logging in again.");
      setCurrentUser(null);
      setSubscriptionStatus('standard');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [handleAuthChange]);


  const signUpWithEmailAndPassword = async (credentials: Required<AuthCredentials>) => {
    setLoading(true);
    setAuthError(null);
    if (isPrototypeMode) throw new Error("Cannot sign up in prototype mode.");
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance!, credentials.email, credentials.password);
      await updateFirebaseProfile(userCredential.user, { displayName: credentials.displayName });
      // The onAuthStateChanged listener will handle the rest of the profile creation.
    } catch (err) {
      const firebaseErr = err as AuthError;
      setAuthError(firebaseErr.message);
      setLoading(false);
      throw firebaseErr;
    }
  };

  const signInWithEmailPassword = async (credentials: Pick<Required<AuthCredentials>, 'email' | 'password'>) => {
    setLoading(true);
    setAuthError(null);
    if (isPrototypeMode) throw new Error("Cannot sign in in prototype mode.");
    try {
      await firebaseSignInWithEmailAndPassword(firebaseAuthInstance!, credentials.email, credentials.password);
    } catch (err) {
      const firebaseErr = err as AuthError;
      setAuthError(firebaseErr.message);
      setLoading(false);
      throw firebaseErr;
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setAuthError(null);
    if (isPrototypeMode) throw new Error("Cannot sign in with Google in prototype mode.");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(firebaseAuthInstance!, provider);
    } catch (err) {
      const firebaseErr = err as AuthError;
      toast({
        title: "Google Sign-In Failed",
        description: firebaseErr.code === 'auth/popup-closed-by-user' ? "The sign-in popup was closed." : firebaseErr.message,
        variant: "destructive",
      });
      setAuthError(firebaseErr.message);
      setLoading(false);
      throw firebaseErr;
    }
  };

  const logoutUser = async () => {
    setLoading(true);
    if (isPrototypeMode) {
      handleAuthChange(null);
      return;
    }
    try {
      await firebaseSignOut(firebaseAuthInstance!);
    } catch (err) {
      const firebaseErr = err as AuthError;
      setAuthError(firebaseErr.message);
      setLoading(false);
      throw firebaseErr;
    }
  };

  const sendPasswordReset = async (email: string) => {
    if (isPrototypeMode) {
      toast({ title: "Feature Unavailable", description: "Password reset is not available in prototype mode."});
      return;
    }
    try {
      await sendPasswordResetEmail(firebaseAuthInstance!, email);
      toast({ title: "Password Reset Email Sent", description: "Check your inbox for instructions."});
    } catch (err) {
      const firebaseErr = err as AuthError;
      setAuthError(firebaseErr.message);
      toast({ title: "Password Reset Failed", description: firebaseErr.message, variant: "destructive"});
      throw firebaseErr;
    }
  };

  const refreshUserProfile = useCallback(async () => {
    if (isPrototypeMode) return;
    if (currentUser) {
      setLoading(true);
      const user = await getUserById(currentUser.uid);
      if(user) {
        setCurrentUser(prev => prev ? ({ ...prev, appProfile: user }) : null);
        setSubscriptionStatus(user.subscriptionStatus || 'standard');
      }
      setLoading(false);
    }
  }, [currentUser, isPrototypeMode]);

  const updateCurrentAppUserProfile = async (data: Partial<AppUserType>): Promise<CurrentUser | null> => {
    if (!currentUser?.uid) {
      toast({ title: "Error", description: "Not logged in or user ID missing.", variant: "destructive" });
      return null;
    }
    setLoading(true);
    try {
      const updatedProfile = await updateUserProfile(currentUser.uid, data);
      if (updatedProfile) {
        setCurrentUser(prev => prev ? ({ ...prev, appProfile: updatedProfile }) : null);
        setSubscriptionStatus(updatedProfile.subscriptionStatus || 'standard');
        toast({ title: "Profile Updated", description: "Your profile information has been saved." });
        return { ...currentUser, appProfile: updatedProfile };
      }
      return null;
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
      return null;
    } finally {
        setLoading(false);
    }
  };

  const addBookmark = async (listingId: string) => {
    if (!currentUser?.uid) {
      toast({ title: "Login Required", description: "You must be logged in to bookmark listings." });
      return;
    }
    try {
      const updatedProfile = await addBookmarkToList(currentUser.uid, listingId);
      if (updatedProfile) {
          setCurrentUser(prev => prev ? ({...prev, appProfile: updatedProfile}) : null);
          toast({ title: "Bookmarked!", description: "Listing added to your bookmarks." });
      }
    } catch (error: any)
       {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  const removeBookmark = async (listingId: string) => {
    if (!currentUser?.uid) return;
    try {
      const updatedProfile = await removeBookmarkFromList(currentUser.uid, listingId);
      if (updatedProfile) {
        setCurrentUser(prev => prev ? ({...prev, appProfile: updatedProfile}) : null);
        toast({ title: "Bookmark Removed" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    authError,
    subscriptionStatus,
    signUpWithEmailAndPassword,
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
