
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

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let storageInstance = null;
let firebaseInitializationError: string | null = null;

// This flag determines if we are running in a local, mocked environment.
// It is now SOLELY dependent on the validity of the environment variables.
export let isPrototypeMode = false;

// Check if any required Firebase configuration keys are missing or are placeholders.
const areAnyKeysMissing = Object.values(firebaseConfig).some(
  (value) => !value || String(value).includes("YOUR_") || String(value).includes("...")
);

if (areAnyKeysMissing) {
  const reason = "One or more Firebase environment variables are missing or are placeholders.";
  const warningMessage = `
  ***************************************************************************************************
  ** PROTOTYPE MODE ENABLED                                                                        **
  **-----------------------------------------------------------------------------------------------**
  ** Reason: ${reason}. The app is running in OFFLINE/MOCK mode.                                   **
  ** Live features like real authentication will be disabled.                                      **
  ** Action: To disable prototype mode, set all NEXT_PUBLIC_FIREBASE_* variables in your .env.local file. **
  ***************************************************************************************************
  `;
  if (typeof window !== 'undefined') {
    console.warn(warningMessage);
  }
  firebaseInitializationError = "App in offline/prototype mode.";
  isPrototypeMode = true;

} else {
  // If all keys are present, attempt to initialize Firebase services.
  try {
    appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
    // Use initializeAuth for client-side apps to specify persistence
    if (typeof window !== 'undefined') {
      authInstance = initializeAuth(appInstance, {
        persistence: browserLocalPersistence,
      });
    } else {
      authInstance = getAuth(appInstance);
    }
    firestoreInstance = getFirestore(appInstance);
    storageInstance = getStorage(appInstance);
    isPrototypeMode = false; // Explicitly set to false on success
    
    // Only log this message in a browser environment to avoid build log noise.
    if (typeof window !== 'undefined') {
        console.log("Firebase initialized successfully in LIVE mode.");
    }


  } catch (error: any) {
    console.error("Firebase Core App Initialization FAILED:", error);
    firebaseInitializationError = `Firebase Init Failed: ${error.message}.`;
    appInstance = null;
    authInstance = null;
    firestoreInstance = null;
    storageInstance = null;
    isPrototypeMode = true; // Fallback to prototype mode on initialization failure.
  }
}

export { appInstance as app, authInstance as auth, firestoreInstance as db, storageInstance as storage, firebaseInitializationError };
