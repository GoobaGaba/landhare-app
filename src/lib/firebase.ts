
'use client';

import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from "firebase/analytics";


const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Added for Analytics
};

let appInstance: FirebaseApp;
let authInstance: Auth;
let firestoreInstance: Firestore;
let storageInstance = null;
let analyticsInstance: Analytics | null = null;
let firebaseInitializationError: string | null = null;

// This flag is now permanently false. The app's mode is determined by the presence of valid keys.
export const isPrototypeMode = false;

try {
  // Check for placeholder values to determine if Firebase is configured.
  const isConfigured = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('...');
  
  if (!isConfigured) {
    throw new Error("Firebase configuration values are missing or are placeholders. Please check your .env.local file or App Hosting environment variables.");
  }

  appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  
  // Initialize Auth differently for client/server
  if (typeof window !== 'undefined') {
    authInstance = initializeAuth(appInstance, {
      persistence: browserLocalPersistence,
    });
  } else {
    authInstance = getAuth(appInstance);
  }
  
  firestoreInstance = getFirestore(appInstance);
  storageInstance = getStorage(appInstance);
  
  // Initialize Analytics only on the client side where it is supported
  if (typeof window !== 'undefined') {
    isAnalyticsSupported().then((supported) => {
      if (supported && firebaseConfig.measurementId) {
        analyticsInstance = getAnalytics(appInstance);
        console.log("Firebase Analytics initialized.");
      }
    });
  }

} catch (error: any) {
  console.error("CRITICAL: Firebase initialization failed.", error);
  firebaseInitializationError = error.message;
}

export { 
  appInstance as app, 
  authInstance as auth, 
  firestoreInstance as db, 
  storageInstance as storage, 
  analyticsInstance as analytics,
  firebaseInitializationError 
};
