import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingFirebaseEnv = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

let firebaseApp = null;
let firebaseAuth = null;
let firestore = null;
let firebaseStorage = null;

export const getFirebaseApp = () => {
  if (missingFirebaseEnv.length > 0) {
    throw new Error(`Missing Firebase environment variables: ${missingFirebaseEnv.join(', ')}`);
  }

  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
  }

  return firebaseApp;
};

export const getFirebaseAuth = () => {
  if (!firebaseAuth) firebaseAuth = getAuth(getFirebaseApp());
  return firebaseAuth;
};

export const getFirestoreDb = () => {
  if (!firestore) firestore = getFirestore(getFirebaseApp());
  return firestore;
};

export const getFirebaseStorage = () => {
  if (!firebaseStorage) firebaseStorage = getStorage(getFirebaseApp());
  return firebaseStorage;
};

