
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

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let analytics: Analytics | null = null;
let firebaseInitializationError: string | null = null;

const isConfigIncomplete = !firebaseConfig.apiKey || 
                           firebaseConfig.apiKey.includes('YOUR_KEY_HERE') ||
                           !firebaseConfig.projectId ||
                           firebaseConfig.projectId.includes('YOUR_PROJECT_ID_HERE');

// isPrototypeMode is true if the config is incomplete.
export const isPrototypeMode = isConfigIncomplete;

try {
  if (isPrototypeMode) {
    throw new Error("Firebase configuration values are missing or are placeholders. The application is running in a limited prototype mode.");
  }

  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  
  if (typeof window !== 'undefined') {
    // Use initializeAuth for the client-side with persistence.
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
  } else {
    // For server-side rendering (though most of our app is client-side)
    auth = getAuth(app);
  }
  
  db = getFirestore(app);
  storage = getStorage(app);
  
  // Initialize Analytics only on the client side where it is supported
  if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    isAnalyticsSupported().then((supported) => {
      if (supported) {
        analytics = getAnalytics(app as FirebaseApp);
      }
    });
  }

} catch (error: any) {
  // We log this error to the console for developers to see.
  console.error("Firebase Initialization Status:", error.message);
  // This variable can be used to show a banner in the UI.
  firebaseInitializationError = error.message;
}

export { 
  app, 
  auth, 
  db, 
  storage, 
  analytics,
  firebaseInitializationError
};
