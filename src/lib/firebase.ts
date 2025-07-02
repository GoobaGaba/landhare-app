
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// IMPORTANT: Environment Variable Management for Firebase
// ... (The existing long comment about .env.local setup should remain here as it's still vital) ...
// For Firebase to initialize correctly, especially on the client-side,
// your Next.js application needs access to Firebase project configuration
// variables. These variables MUST be:
//
// 1. STORED IN `.env.local` FILE:
//    - Create a file named EXACTLY `.env.local` in the ROOT of your project
//      (same folder as `package.json`).
//    - Add your Firebase config values there. Example:
//      NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyYOUR_API_KEY_HERE
//      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
//      // ... and so on for all required Firebase config keys.
//
// 2. PREFIXED WITH `NEXT_PUBLIC_`:
//    - Only environment variables prefixed with `NEXT_PUBLIC_` are exposed
//      to the browser by Next.js.
//
// 3. SERVER RESTART:
//    - CRITICAL: After creating or modifying the `.env.local` file,
//      you MUST FULLY RESTART your Next.js development server
//      (e.g., stop it with Ctrl+C and rerun `npm run dev`).
//      Next.js only loads these variables at startup.
//


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

// --- New "Force Mock Mode" Flag ---
const forceMockMode = process.env.NEXT_PUBLIC_FORCE_MOCK_MODE === 'true';

// --- Comprehensive Diagnostic Check ---
const configCheck = {
  apiKey: !firebaseConfig.apiKey || firebaseConfig.apiKey.includes('...'),
  authDomain: !firebaseConfig.authDomain || firebaseConfig.authDomain.includes('...'),
  projectId: !firebaseConfig.projectId || firebaseConfig.projectId.includes('...'),
  storageBucket: !firebaseConfig.storageBucket || firebaseConfig.storageBucket.includes('...'),
  messagingSenderId: !firebaseConfig.messagingSenderId || firebaseConfig.messagingSenderId.includes('...'),
  appId: !firebaseConfig.appId || firebaseConfig.appId.includes('...'),
};

const areAnyKeysMissing = Object.values(configCheck).some(isMissing => isMissing);

if (forceMockMode) {
  if (typeof window !== 'undefined') {
    console.warn(
      `
      ******************************************************************
      ** MOCK MODE IS FORCEFULLY ENABLED VIA .env.local               **
      ** App is running in OFFLINE mode. No connection to Firebase.   **
      ******************************************************************
      `
    );
  }
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
  // Only attempt to initialize Firebase if all keys look valid and mock mode is not forced.
  try {
    // Step 1: Initialize the core App
    if (!getApps().length) {
      appInstance = initializeApp(firebaseConfig);
      console.log('%c[DIAGNOSTIC] Firebase App Initialized Successfully.', 'color: green;');
    } else {
      appInstance = getApp();
      console.log('%c[DIAGNOSTIC] Firebase App Retrieved Successfully.', 'color: green;');
    }
    
    // Step 2: Initialize Auth
    try {
      authInstance = initializeAuth(appInstance, {
        persistence: browserLocalPersistence
      });
      console.log('%c[DIAGNOSTIC] Firebase Auth Initialized Successfully.', 'color: green;');
    } catch (authError: any) {
        console.error("%cFirebase Auth Initialization FAILED:", 'color: red; font-weight: bold;', authError);
        firebaseInitializationError = `Firebase Auth Initialization Failed: ${authError.message || "Unknown auth error."}.`;
        authInstance = null;
    }
    
    // Step 3: Initialize Firestore
    try {
        firestoreInstance = getFirestore(appInstance);
        console.log('%c[DIAGNOSTIC] Firebase Firestore Initialized Successfully.', 'color: green;');
    } catch (firestoreError: any) {
        console.error("%cFirebase Firestore Initialization FAILED:", 'color: red; font-weight: bold;', firestoreError);
        // Don't overwrite the main error if auth already failed
        if (!firebaseInitializationError) {
             firebaseInitializationError = `Firebase Firestore Initialization Failed: ${firestoreError.message || "Unknown firestore error."}.`;
        }
        firestoreInstance = null;
    }

  } catch (error: any) {
    console.error("%cFirebase Core App Initialization FAILED:", 'color: red; font-weight: bold;', error);
    firebaseInitializationError = `Firebase Core App Initialization Failed: ${error.message || "Unknown error."}. Check all config keys.`;
    // Ensure all instances are null on failure.
    appInstance = null;
    authInstance = null;
    firestoreInstance = null;
  }
}

export { appInstance as app, authInstance as auth, firestoreInstance as db, firebaseInitializationError };
