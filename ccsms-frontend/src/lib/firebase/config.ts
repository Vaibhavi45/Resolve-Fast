import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDxQxH9fZ8vZ9fZ8vZ9fZ8vZ9fZ8vZ9fZ8",
  authDomain: "resolve-fast.firebaseapp.com",
  projectId: "resolve-fast",
  storageBucket: "resolve-fast.firebasestorage.app",
  messagingSenderId: "689892721656",
  appId: "1:689892721656:web:35037711c3cd85963d0c0d",
  measurementId: "G-LTQLR7JZEZ"
};

let app: FirebaseApp;
let messaging: Messaging | null = null;

if (typeof window !== 'undefined') {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });
}

export { app, messaging, firebaseConfig };
