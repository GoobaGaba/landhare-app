
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
// If these are not set up correctly, Firebase initialization will fail,
// typically with an "auth/invalid-api-key" error or similar.


const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

const firebaseConfig: FirebaseOptions = {
  apiKey: apiKey,
  authDomain: authDomain,
  projectId: projectId,
  storageBucket: storageBucket,
  messagingSenderId: messagingSenderId,
  appId: appId,
};

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let firebaseInitializationError: string | null = null;

// Proactive check to see if the API key is missing or is a placeholder.
const isApiKeyEffectivelyMissing = !apiKey || apiKey.includes("AIzaSy..._YOUR_API_KEY") || apiKey.includes("PLACEHOLDER");

if (isApiKeyEffectivelyMissing) {
  const warningMessage = `
  ***************************************************************************************************
  ** WARNING: FIREBASE CLIENT-SIDE CONFIG ISSUE DETECTED                                           **
  **-----------------------------------------------------------------------------------------------**
  ** The 'NEXT_PUBLIC_FIREBASE_API_KEY' is MISSING, UNDEFINED, or still a PLACEHOLDER.             **
  ** Firebase features (like Authentication and Firestore) will be DISABLED until this is corrected. **
  **                                                                                               **
  ** TO FIX THIS (these steps are crucial and MUST be done by YOU in YOUR local environment):      **
  ** 1. CREATE/VERIFY '.env.local' FILE:                                                           **
  **    - Ensure a file named EXACTLY '.env.local' exists in the ROOT directory of your project.   **
  **    - This is NOT '.env'. It MUST be '.env.local'.                                             **
  ** 2. CHECK VARIABLE NAME & VALUE:                                                               **
  **    - Inside '.env.local', copy the keys from '.env.example' and fill in your values.          **
  **    - The value for 'NEXT_PUBLIC_FIREBASE_API_KEY' MUST be your ACTUAL API key.                **
  **    - DO NOT use placeholder values like "AIzaSy...".                                          **
  ** 3. RESTART DEVELOPMENT SERVER:                                                                **
  **    - FULLY RESTART your Next.js server (Ctrl+C, then 'npm run dev') after ANY changes        **
  **      to '.env.local'. Next.js loads these variables only at startup.                          **
  **                                                                                               **
  ** The app will continue to run in a mock mode, but real Firebase functionality is disabled.     **
  ***************************************************************************************************
  `;
  if (typeof window !== 'undefined') {
    console.warn(warningMessage);
  } else {
    // This message will appear in the server logs during build/startup if the key is missing.
    console.warn("FIREBASE SERVER-SIDE WARNING: NEXT_PUBLIC_FIREBASE_API_KEY is missing or a placeholder. This will disable client-side Firebase features. Please check your .env.local file and restart the server.");
  }
  // Set the error message that the rest of the app can use to enter a safe "mock" mode.
  firebaseInitializationError = "Firebase API Key is missing or a placeholder. Firebase features are disabled.";
} else {
  // Only attempt to initialize Firebase if the API key looks valid.
  try {
    if (!getApps().length) {
      appInstance = initializeApp(firebaseConfig);
    } else {
      appInstance = getApp();
    }
    // Use initializeAuth to explicitly set persistence which is better for SSR frameworks like Next.js
    authInstance = initializeAuth(appInstance, {
      persistence: browserLocalPersistence
    });
    firestoreInstance = getFirestore(appInstance);
  } catch (error: any) {
    console.error("Firebase Initialization Failed (even with presumed API key):", error);
    firebaseInitializationError = `Firebase Initialization Failed: ${error.message || "Unknown error."}. Firebase features are disabled.`;
    // Ensure all instances are null on failure.
    appInstance = null;
    authInstance = null;
    firestoreInstance = null;
  }
}

export { appInstance as app, authInstance as auth, firestoreInstance as db, firebaseInitializationError };
