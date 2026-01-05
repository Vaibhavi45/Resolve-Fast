import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';

/**
 * Hook to handle FCM token cleanup on logout
 * Add this to your logout handler
 */
export function useLogoutCleanup() {
    const { isAuthenticated } = useAuthStore();

    useEffect(() => {
        // When user logs out (isAuthenticated becomes false)
        if (!isAuthenticated) {
            const fcmToken = localStorage.getItem('fcm_token');

            if (fcmToken) {
                // Unregister FCM token
                import('@/lib/firebase/messaging').then(({ unregisterFCMToken }) => {
                    unregisterFCMToken(fcmToken).catch(console.error);
                });
            }
        }
    }, [isAuthenticated]);
}
