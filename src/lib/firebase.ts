
'use client';

import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from "firebase/analytics";

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
let isPrototypeMode = false; // This will now be determined by the keys, not a manual flag.

try {
  const isConfigured = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('YOUR_API_KEY');
  
  if (!isConfigured) {
    isPrototypeMode = true;
    throw new Error("Firebase configuration values are missing or are placeholders. The application will run in a limited prototype mode.");
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
  
  if (typeof window !== 'undefined') {
    isAnalyticsSupported().then((supported) => {
      if (supported && firebaseConfig.measurementId) {
        analytics = getAnalytics(app);
      }
    });
  }

} catch (error: any) {
  console.error("Firebase initialization failed:", error.message);
  firebaseInitializationError = error.message;
}

export { 
  app, 
  auth, 
  db, 
  storage, 
  analytics,
  firebaseInitializationError,
  isPrototypeMode
};
