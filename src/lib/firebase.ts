
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let appInstance: FirebaseApp;
let authInstance: Auth;
let firestoreInstance: Firestore;
let storageInstance = null;
let firebaseInitializationError: string | null = null;
export let isPrototypeMode = false; // This is now permanently false.

try {
  appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  
  if (typeof window !== 'undefined') {
    authInstance = initializeAuth(appInstance, {
      persistence: browserLocalPersistence,
    });
  } else {
    authInstance = getAuth(appInstance);
  }
  
  firestoreInstance = getFirestore(appInstance);
  storageInstance = getStorage(appInstance);

} catch (error: any) {
  console.error("CRITICAL: Firebase initialization failed.", error);
  firebaseInitializationError = error.message;
  // Even on failure, we no longer enable prototype mode. The app will show errors, which is correct for a production environment with bad config.
}

export { appInstance as app, authInstance as auth, firestoreInstance as db, storageInstance as storage, firebaseInitializationError };
