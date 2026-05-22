import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBCUAzbzp7l-0qeJgYxiU5TzuB4DbvLg_k",
  authDomain: "smartlearn-8067e.firebaseapp.com",
  projectId: "smartlearn-8067e",
  storageBucket: "smartlearn-8067e.firebasestorage.app",
  messagingSenderId: "926584501751",
  appId: "1:926584501751:web:32d3bdc850891116d6eaf2",
  measurementId: "G-8VVF9VS3KH",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export default app;
