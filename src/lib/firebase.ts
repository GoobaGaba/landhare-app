
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// IMPORTANT: Environment Variable Management for Firebase
//
// For Firebase to initialize correctly, especially on the client-side,
// your Next.js application needs access to Firebase project configuration
// variables. These variables MUST be:
//
// 1. STORED IN `.env.local` file:
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

// Client-side check (will run in the browser)
if (typeof window !== 'undefined' && (!apiKey || apiKey === "your_actual_api_key_from_firebase")) {
  // =====================================================================================
  // !!! ATTENTION: THIS ERROR MESSAGE MEANS YOUR .env.local FILE IS NOT SET UP CORRECTLY !!!
  // =====================================================================================
  const clientErrorMessage = `
  ***************************************************************************************************
  ***************************************************************************************************
  STOP! CRITICAL FIREBASE CLIENT-SIDE CONFIG ERROR: 
  The 'NEXT_PUBLIC_FIREBASE_API_KEY' is MISSING or UNDEFINED or STILL A PLACEHOLDER in your application's client-side code. 
  This is why Firebase is failing to initialize (Error: auth/invalid-api-key). 

  HOW TO FIX THIS (these steps are crucial and MUST be done by YOU in YOUR local environment): 
  1.  **VERIFY '.env.local' FILE**: 
      - Ensure a file named EXACTLY '.env.local' exists in the ROOT directory of your project (the same folder as 'package.json'). 
      - This is NOT the '.env' file. It must be '.env.local'.
  2.  **CHECK VARIABLE NAME & VALUE**: 
      - Inside '.env.local', the variable MUST be named 'NEXT_PUBLIC_FIREBASE_API_KEY'. 
      - The value for 'NEXT_PUBLIC_FIREBASE_API_KEY' MUST be your ACTUAL API key from your Firebase project settings.
      - GET YOUR KEYS HERE: Firebase Console > Project Settings (gear icon) > General > Your apps > Web app > SDK setup and configuration > Config.
      - Ensure ALL other 'NEXT_PUBLIC_FIREBASE_...' variables are also correctly set with their actual values.
      - DO NOT use placeholder values like "your_actual_api_key_from_firebase" in the .env.local file.
  3.  **RESTART DEVELOPMENT SERVER**: 
      - You MUST FULLY RESTART your Next.js development server (e.g., stop it with Ctrl+C and rerun 'npm run dev') AFTER creating or making ANY changes to the '.env.local' file. Next.js only loads these variables at startup. 

  Firebase functionality is currently BROKEN and will remain so until these environment configuration steps are correctly performed. 
  The problem is NOT in the Firebase initialization code itself, but in the MISSING OR INCORRECT API KEY from your environment.
  ***************************************************************************************************
  ***************************************************************************************************
  `;
  console.error(clientErrorMessage);
  // For extremely high visibility if console messages are missed:
  if (document.body) {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '0';
    errorDiv.style.left = '0';
    errorDiv.style.width = '100%';
    errorDiv.style.padding = '20px';
    errorDiv.style.backgroundColor = 'red';
    errorDiv.style.color = 'white';
    errorDiv.style.zIndex = '999999'; // Ensure it's on top
    errorDiv.style.fontSize = '16px';
    errorDiv.style.whiteSpace = 'pre-wrap';
    errorDiv.style.overflowY = 'auto';
    errorDiv.style.maxHeight = '100vh';
    errorDiv.textContent = clientErrorMessage;
    // Prepend to body if body exists, otherwise append to documentElement
    if (document.body.firstChild) {
        document.body.insertBefore(errorDiv, document.body.firstChild);
    } else {
        document.body.appendChild(errorDiv);
    }
  }
}

// Server-side check (will run in your Next.js server console during build/dev)
if (typeof window === 'undefined' && (!apiKey || apiKey === "your_actual_api_key_from_firebase")) {
  console.warn(`
  ****************************************************************************************
  * FIREBASE SERVER-SIDE WARNING:                                                        *
  * NEXT_PUBLIC_FIREBASE_API_KEY is missing, undefined, or a placeholder on the server.  *
  * This is a strong indicator that your .env.local file or environment variables        *
  * are not configured correctly, which WILL break client-side Firebase.                 *
  *                                                                                      *
  * PLEASE VERIFY:                                                                       *
  * 1. You have a '.env.local' file in your project root.                                *
  * 2. It contains ACTUAL values for NEXT_PUBLIC_FIREBASE_API_KEY and other Firebase vars. *
  * 3. You have RESTARTED your Next.js dev server after changes to '.env.local'.         *
  ****************************************************************************************
  `);
}


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
