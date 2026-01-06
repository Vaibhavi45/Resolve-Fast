import { getToken, onMessage, deleteToken } from 'firebase/messaging';
import { messaging } from './config';
import api from '../api/axios';

// VAPID key from Firebase Console (Cloud Messaging → Web Push certificates)
// Get from: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Generate key pair
// Set NEXT_PUBLIC_FIREBASE_VAPID_KEY in .env.local
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

// Validate VAPID key format (should be base64 string starting with 'B' and ~88 characters)
const isValidVapidKey = (key: string): boolean => {
    if (!key || key.length < 80) return false;

    // Regular expression for standard or URL-safe base64
    const base64Regex = /^[A-Za-z0-9+/=_-]+$/;
    return base64Regex.test(key);
};

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
    try {
        if (!messaging) {
            console.warn('Firebase messaging not supported');
            return null;
        }

        // Request permission
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            console.log('Notification permission granted');

            // Register service worker if not already registered
            let registration;
            if ('serviceWorker' in navigator) {
                try {
                    registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
                    if (!registration) {
                        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                        console.log('Service Worker newly registered:', registration);
                    } else {
                        console.log('Service Worker already registered:', registration);
                    }

                    await navigator.serviceWorker.ready;
                } catch (swError) {
                    console.warn('Service Worker registration failed - desktop notifications will not work:', swError);
                    return null;
                }
            }

            // Get FCM token
            try {
                // Validate VAPID key before attempting to get token
                if (!isValidVapidKey(VAPID_KEY)) {
                    console.warn('Invalid or missing VAPID key. Desktop notifications disabled.');
                    console.info('To enable: Set NEXT_PUBLIC_FIREBASE_VAPID_KEY in .env.local');
                    return null;
                }

                const token = await getToken(messaging, {
                    vapidKey: VAPID_KEY,
                    serviceWorkerRegistration: registration
                });

                if (token) {
                    console.log('✅ FCM Token retrieved successfully - desktop notifications enabled!');
                    return token;
                }

                console.warn('No FCM token received - desktop notifications disabled');
                return null;
            } catch (tokenError: any) {
                // Handle push service errors gracefully
                if (tokenError.message?.includes('push service error') ||
                    tokenError.message?.includes('Registration failed') ||
                    tokenError.code === 'messaging/failed-serviceworker-registration') {
                    console.warn('⚠️ Browser push service unavailable - desktop notifications disabled');
                    console.info('This is usually due to browser settings or extensions blocking push notifications');
                    console.info('The app will continue to work normally with in-app notifications');
                    return null;
                }

                console.warn('Failed to get FCM token:', tokenError.message);
                console.info('Desktop notifications disabled - app will use in-app notifications only');
                return null;
            }
        } else {
            console.warn('Notification permission denied or dismissed');
            return null;
        }
    } catch (error: any) {
        console.warn('Notification setup failed:', error.message);
        console.info('App will continue with in-app notifications only');
        return null;
    }
}

/**
 * Register FCM token with backend
 */
export async function registerFCMToken(token: string): Promise<boolean> {
    try {
        const response = await api.post('notifications/fcm/register/', {
            token,
            device_type: 'WEB',
            device_name: navigator.userAgent.substring(0, 100)
        });

        console.log('FCM token registered:', response.data);
        return true;
    } catch (error) {
        console.error('Error registering FCM token:', error);
        return false;
    }
}

/**
 * Unregister FCM token from backend
 */
export async function unregisterFCMToken(token: string): Promise<boolean> {
    try {
        await api.delete('notifications/fcm/unregister/', {
            data: { token }
        });

        if (messaging) {
            await deleteToken(messaging);
        }

        console.log('FCM token unregistered');
        return true;
    } catch (error) {
        console.error('Error unregistering FCM token:', error);
        return false;
    }
}

/**
 * Listen for foreground messages and show desktop notifications
 */
export function onForegroundMessage(callback: (payload: any) => void) {
    if (!messaging) {
        console.warn('Firebase messaging not supported');
        return () => { };
    }

    return onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        callback(payload);

        // Always show desktop notification for foreground messages
        if (payload.notification) {
            const notificationTitle = payload.notification.title || 'New Notification';
            const notificationOptions: NotificationOptions = {
                body: payload.notification.body || '',
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                data: payload.data,
                tag: payload.data?.type || 'notification',
                requireInteraction: false // Auto-dismiss after a few seconds
            };

            // Check if we have permission
            if (Notification.permission === 'granted') {
                const notification = new Notification(notificationTitle, notificationOptions);

                // Handle notification click
                notification.onclick = (event) => {
                    event.preventDefault();
                    window.focus();

                    // Navigate to complaint if complaint_id is present
                    if (payload.data?.complaint_id) {
                        window.location.href = `/complaints/${payload.data.complaint_id}`;
                    }

                    notification.close();
                };
            } else {
                console.warn('Notification permission not granted. Current permission:', Notification.permission);
            }
        }
    });
}

/**
 * Initialize FCM for the current user
 */
export async function initializeFCM(): Promise<string | null> {
    try {
        if (!('Notification' in window)) {
            console.warn('Notifications not supported');
            return null;
        }

        const token = await requestNotificationPermission();

        if (token) {
            await registerFCMToken(token);
            return token;
        }

        return null;
    } catch (error) {
        console.error('Error initializing FCM:', error);
        return null;
    }
}