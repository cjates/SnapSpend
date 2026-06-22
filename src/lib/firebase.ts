import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import localConfig from "../../firebase-applet-config.json";

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || localConfig?.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || localConfig?.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || localConfig?.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || localConfig?.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || localConfig?.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || localConfig?.appId,
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || localConfig?.measurementId
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app, metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || localConfig?.firestoreDatabaseId || "(default)");

export default app;
