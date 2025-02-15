import { initializeApp } from 'firebase/app';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  // Your Firebase config here
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);
const firestore = getFirestore(app);
const auth = getAuth(app);
const database = getDatabase(app);

// For backward compatibility
const db = firestore;

// Only connect Functions to emulator in development
if (process.env.NODE_ENV === 'development') {
  connectFunctionsEmulator(functions, '127.0.0.1', 5003);
}

export { 
  app, 
  functions, 
  firestore, 
  auth, 
  database,
  db  // For backward compatibility
};