
'use client';

import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from "firebase/analytics";

// This configuration is now solely dependent on the environment variables.
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let analytics: Analytics | null = null;
let firebaseInitializationError: string | null = null;

// The app is now considered in "prototype mode" ONLY if the API keys are missing or invalid.
// This logic is now robust for production.
const isPrototypeMode = !firebaseConfig.apiKey || firebaseConfig.apiKey.includes('YOUR_KEY_HERE');

try {
  if (isPrototypeMode) {
    // This error will be caught below and used to display the banner, but won't crash the app.
    throw new Error("Firebase configuration values are missing or are placeholders. The application is running in a limited prototype mode.");
  }

  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  
  if (typeof window !== 'undefined') {
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
  } else {
    auth = getAuth(app);
  }
  
  db = getFirestore(app);
  storage = getStorage(app);
  
  // Initialize Analytics only on the client-side and if it's supported and configured.
  if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    isAnalyticsSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    });
  }

} catch (error: any) {
  // This catch block handles the case where Firebase keys are missing.
  // It allows the app to run in a read-only "prototype" state.
  console.error("Firebase Initialization Status:", error.message);
  firebaseInitializationError = error.message;
}

// Export the initialized services, which might be null in prototype mode.
export { 
  app, 
  auth, 
  db, 
  storage, 
  analytics,
  firebaseInitializationError, // This will be non-null in prototype mode.
  isPrototypeMode
};
