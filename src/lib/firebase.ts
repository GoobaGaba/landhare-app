
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

// This flag is now determined ONLY by the presence of valid keys.
// If the keys are placeholders or missing, this will be true.
const isPrototypeMode = !firebaseConfig.apiKey || firebaseConfig.apiKey.includes('YOUR_API_KEY');

try {
  if (isPrototypeMode) {
    // If keys are missing, we throw an error to signal prototype mode.
    // The UI will show a banner, but the app won't crash.
    throw new Error("Firebase configuration values are missing or are placeholders. The application is running in a limited prototype mode.");
  }

  // If keys are present, initialize Firebase services.
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  
  if (typeof window !== 'undefined') {
    // Use initializeAuth for persistence settings on the client.
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence,
    });
  } else {
    // Use getAuth for server environments.
    auth = getAuth(app);
  }
  
  db = getFirestore(app);
  storage = getStorage(app);
  
  // Initialize Analytics only on the client-side and if it's supported.
  if (typeof window !== 'undefined') {
    isAnalyticsSupported().then((supported) => {
      if (supported && firebaseConfig.measurementId) {
        analytics = getAnalytics(app);
      }
    });
  }

} catch (error: any) {
  // Catch the initialization error to display the prototype banner.
  console.error("Firebase Initialization Status:", error.message);
  firebaseInitializationError = error.message;
}

export { 
  app, 
  auth, 
  db, 
  storage, 
  analytics,
  firebaseInitializationError, // This will be non-null in prototype mode.
  isPrototypeMode
};
