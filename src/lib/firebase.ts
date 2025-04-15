// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBgfY9OqFxZldDkSdTrmn3kGadY6bThwVk",
  authDomain: "pjotters-bv.firebaseapp.com",
  projectId: "pjotters-bv",
  storageBucket: "pjotters-bv.appspot.com", // Let op: ik heb dit aangepast naar het juiste formaat
  messagingSenderId: "783220574478",
  appId: "1:783220574478:web:b9dbf64274161b7758ef5f",
  measurementId: "G-L5FX9YH21W"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
// Analytics alleen initialiseren aan de client-kant om SSR problemen te voorkomen
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, auth, db, storage, analytics };
