
'use client';

import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from "firebase/analytics";


const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.AIzaSyBveb_bw0HDWXh-P4IpFfgtPAlLhkliEZM,
  authDomain: process.env.landshare-connect.firebaseapp.com,
  projectId: process.env.landshare-connect,
  storageBucket: process.env.landshare-connect.firebasestorage.app,
  messagingSenderId: process.env.800704761619,
  appId: process.env.1:800704761619:web:a1e7b0a1788320715154e6,
  measurementId: process.env.G-5F4384ZEEV, // Added for Analytics
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
