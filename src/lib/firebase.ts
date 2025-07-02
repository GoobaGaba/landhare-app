
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

// --- DIAGNOSTIC LOG ---
if (typeof window !== 'undefined') {
  console.log(
    '%c[DIAGNOSTIC] Firebase Environment Check:',
    'color: blue; font-weight: bold;',
    {
      'NEXT_PUBLIC_FIREBASE_API_KEY (Status)':
        !apiKey ? 'MISSING/UNDEFINED' : (apiKey.includes('AIzaSy') && apiKey.length > 15 ? `Found (starts with ${apiKey.substring(0, 8)}...)` : 'INVALID OR PLACEHOLDER'),
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID': process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'MISSING/UNDEFINED',
    }
  );
}
// --- END DIAGNOSTIC LOG ---

// Proactive check to see if the API key is missing or is a placeholder.
const isApiKeyEffectivelyMissing = !apiKey || apiKey.includes("AIzaSy..._YOUR_API_KEY") || apiKey.length < 20;

if (isApiKeyEffectivelyMissing) {
  const warningMessage = `
  ***************************************************************************************************
  ** WARNING: FIREBASE CONFIGURATION ERROR                                                         **
  **-----------------------------------------------------------------------------------------------**
  ** The 'NEXT_PUBLIC_FIREBASE_API_KEY' is MISSING or INVALID in your environment.                 **
  ** The app is running in OFFLINE/MOCK mode. Real authentication and database features are OFF.   **
  **                                                                                               **
  ** TO FIX THIS:                                                                                  **
  ** 1. CHECK YOUR '.env.local' FILE in the project root. Ensure it exists and has no typos.       **
  ** 2. VERIFY YOUR KEYS are copied correctly from your Firebase project settings.                 **
  ** 3. >>> RESTART THE SERVER <<< This step is ESSENTIAL. Next.js only reads .env.local on startup.**
  **    (Click STOP, then RUN at the top of the editor).                                           **
  ***************************************************************************************************
  `;
  if (typeof window !== 'undefined') {
    console.warn(warningMessage);
  }
  firebaseInitializationError = "Firebase API Key is missing or invalid. App is in offline mode.";
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
