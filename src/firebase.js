import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDFNkPhGrIMfkFAPKMYuOf46T9jw8RUVlA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "abopay-53bc4.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "abopay-53bc4",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "abopay-53bc4.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "923181784158",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:923181784158:web:2404543da727d44c53a8cf",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-MBH4KPHK5Z",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export let analytics = null;
isSupported().then((supported) => {
  if (supported) analytics = getAnalytics(app);
});

export default app;
