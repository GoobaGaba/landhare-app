
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

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
let firebaseInitializationError: string | null = null;

const forceMockMode = process.env.NEXT_PUBLIC_FORCE_MOCK_MODE === 'true';

const areAnyKeysMissing = Object.values(firebaseConfig).some(value => !value || String(value).includes('...'));

if (forceMockMode) {
  firebaseInitializationError = "Mock mode is forcefully enabled.";
} else if (areAnyKeysMissing) {
  const warningMessage = `
  ***************************************************************************************************
  ** WARNING: FIREBASE CONFIGURATION ERROR                                                         **
  **-----------------------------------------------------------------------------------------------**
  ** One or more 'NEXT_PUBLIC_FIREBASE_*' keys are MISSING or INVALID in your environment.         **
  ** The app is running in OFFLINE/MOCK mode. Real authentication and database features are OFF.   **
  **                                                                                               **
  ** TO FIX THIS:                                                                                  **
  ** 1. CHECK YOUR '.env.local' FILE in the project root. Ensure it exists and has no typos.       **
  ** 2. VERIFY ALL KEYS are copied correctly from your Firebase project settings.                  **
  ** 3. >>> RESTART THE SERVER <<< This step is ESSENTIAL. Next.js only reads .env.local on startup.**
  **    (Click STOP, then RUN at the top of the editor).                                           **
  ***************************************************************************************************
  `;
  if (typeof window !== 'undefined') {
    console.warn(warningMessage);
  }
  firebaseInitializationError = "One or more Firebase config keys are missing. App is in offline mode.";
} else {
  try {
    appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
    authInstance = initializeAuth(appInstance, {
      persistence: browserLocalPersistence
    });
    firestoreInstance = getFirestore(appInstance);
  } catch (error: any) {
    console.error("Firebase Core App Initialization FAILED:", error);
    firebaseInitializationError = `Firebase Core App Initialization Failed: ${error.message || "Unknown error."}. Check all config keys.`;
    appInstance = null;
    authInstance = null;
    firestoreInstance = null;
  }
}

export { appInstance as app, authInstance as auth, firestoreInstance as db, firebaseInitializationError };
