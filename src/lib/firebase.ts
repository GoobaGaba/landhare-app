
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

// This flag determines if we are running in a local, mocked environment.
export let isPrototypeMode = false;

// Check if any required Firebase configuration keys are missing or placeholders.
// This is the primary trigger for enabling prototype/mock mode.
const areAnyKeysMissing = Object.values(firebaseConfig).some(
  (value) => !value || String(value).includes('YOUR_')
);

if (areAnyKeysMissing) {
  const warningMessage = `
  ***************************************************************************************************
  ** PROTOTYPE MODE ENABLED                                                                        **
  **-----------------------------------------------------------------------------------------------**
  ** Firebase keys are missing or are placeholders. The app is running in OFFLINE/MOCK mode.       **
  ** This is expected for local development if you haven't set up your .env.local file.            **
  ** Live features like real authentication will be disabled.                                      **
  ***************************************************************************************************
  `;
  if (typeof window !== 'undefined') {
    console.warn(warningMessage);
  }
  firebaseInitializationError = "Firebase keys missing; app in offline mode.";
  isPrototypeMode = true;

} else {
  // If all keys are present, attempt to initialize Firebase services.
  try {
    appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
    authInstance = initializeAuth(appInstance, {
      persistence: browserLocalPersistence,
    });
    firestoreInstance = getFirestore(appInstance);
    console.log("[DIAGNOSTIC] Firebase services initialized successfully.");
    isPrototypeMode = false;

  } catch (error: any) {
    console.error("Firebase Core App Initialization FAILED:", error);
    firebaseInitializationError = `Firebase Init Failed: ${error.message}.`;
    appInstance = null;
    authInstance = null;
    firestoreInstance = null;
    isPrototypeMode = true; // Fallback to prototype mode on initialization failure.
  }
}

export { appInstance as app, authInstance as auth, firestoreInstance as db, firebaseInitializationError };
