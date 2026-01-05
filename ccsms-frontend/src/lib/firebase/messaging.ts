import { getToken, onMessage, deleteToken } from 'firebase/messaging';
import { messaging } from './config';
import api from '../api/axios';

// Replace with your VAPID key from Firebase Console
const VAPID_KEY = 'BJPYozlY2qhBhLrMVpQqVDNxLLBdwJLqzGxfGFOXaJFfFJbHdxCathBcuas1qXElM';

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
                    console.error('Service Worker registration failed:', swError);
                }
            }

            // Get FCM token
            try {
                const token = await getToken(messaging, {
                    vapidKey: VAPID_KEY,
                    serviceWorkerRegistration: registration
                });
                console.log('FCM Token retrieved:', token);
                return token;
            } catch (tokenError: any) {
                console.error('Error getting FCM token details:', tokenError);

                if (tokenError.message?.includes('push service error') || tokenError.code === 'messaging/failed-serviceworker-registration') {
                    console.warn('Push service error detected, trying to unregister and re-register SW...');
                    if (registration) {
                        await registration.unregister();
                        const newRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                        await navigator.serviceWorker.ready;
                        return await getToken(messaging, {
                            vapidKey: VAPID_KEY,
                            serviceWorkerRegistration: newRegistration
                        });
                    }
                }

                return null;
            }
        } else {
            console.log('Notification permission denied');
            return null;
        }
    } catch (error) {
        console.error('Error getting notification permission:', error);
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
 * Listen for foreground messages
 */
export function onForegroundMessage(callback: (payload: any) => void) {
    if (!messaging) {
        console.warn('Firebase messaging not supported');
        return () => { };
    }

    return onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        callback(payload);

        if (payload.notification) {
            new Notification(payload.notification.title || 'New Notification', {
                body: payload.notification.body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                data: payload.data
            });
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