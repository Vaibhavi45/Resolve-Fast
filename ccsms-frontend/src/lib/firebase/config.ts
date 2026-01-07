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

let app: FirebaseApp | undefined;
let messaging: Messaging | null = null;

/**
 * Get or initialize the Firebase App instance
 */
export const getAppInstance = (): FirebaseApp | null => {
  if (typeof window === 'undefined') return null;

  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return app;
};

/**
 * Get the Firebase Messaging instance safely
 */
export const getMessagingInstance = async (): Promise<Messaging | null> => {
  if (typeof window === 'undefined') return null;

  if (messaging) return messaging;

  const currentApp = getAppInstance();
  if (!currentApp) return null;

  try {
    const supported = await isSupported();
    if (supported) {
      messaging = getMessaging(currentApp);
      return messaging;
    }
  } catch (err) {
    console.warn('FCM isSupported check failed:', err);
  }

  return null;
};

// Also export for backward compatibility if needed, though they might be null initially
export { app, messaging, firebaseConfig };
