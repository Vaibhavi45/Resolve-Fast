'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { initializeFCM, onForegroundMessage } from '@/lib/firebase/messaging';

/**
 * FCM Initializer Component
 * Initializes Firebase Cloud Messaging for all authenticated users
 * Shows browser pop-up notifications when messages are received
 */
export default function FCMInitializer() {
    const { isAuthenticated, user } = useAuthStore();

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        let unsubscribe: (() => void) | undefined;

        const setupFCM = async () => {
            try {
                console.log(`[FCM] Initializing for ${user.role}:`, user.email);

                // Request permission and get FCM token
                const token = await initializeFCM();

                if (token) {
                    console.log('[FCM] Token registered successfully');

                    // Listen for foreground messages (when app is open)
                    unsubscribe = onForegroundMessage((payload) => {
                        console.log('[FCM] Foreground message received:', payload);

                        // The onForegroundMessage function already shows the notification
                        // But we can add custom handling here if needed
                        if (payload.notification) {
                            console.log(`[FCM] Showing notification: ${payload.notification.title}`);
                        }
                    });
                } else {
                    console.warn('[FCM] Failed to get token - user may have denied permission');
                }
            } catch (error) {
                console.error('[FCM] Setup error:', error);
            }
        };

        setupFCM();

        // Cleanup on unmount
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [isAuthenticated, user]);

    return null; // This component doesn't render anything
}
