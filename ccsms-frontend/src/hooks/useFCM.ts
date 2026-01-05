import { useState, useEffect, useCallback } from 'react';

interface UseFCMReturn {
    fcmToken: string | null;
    permission: NotificationPermission;
    isSupported: boolean;
    requestPermission: () => Promise<void>;
    unregisterToken: () => Promise<void>;
}

export function useFCM(): UseFCMReturn {
    const [fcmToken, setFcmToken] = useState<string | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setIsSupported(true);
            setPermission(Notification.permission);

            const storedToken = localStorage.getItem('fcm_token');
            if (storedToken) {
                setFcmToken(storedToken);
            }
        }
    }, []);

    const requestPermission = useCallback(async () => {
        if (!isSupported) return;

        try {
            const { initializeFCM } = await import('@/lib/firebase/messaging');
            const token = await initializeFCM();

            if (token) {
                setFcmToken(token);
                setPermission('granted');
                localStorage.setItem('fcm_token', token);
            } else {
                setPermission(Notification.permission);
            }
        } catch (error) {
            console.error('Error requesting FCM permission:', error);
        }
    }, [isSupported]);

    const unregisterToken = useCallback(async () => {
        if (!fcmToken) return;

        try {
            const { unregisterFCMToken } = await import('@/lib/firebase/messaging');
            await unregisterFCMToken(fcmToken);

            setFcmToken(null);
            localStorage.removeItem('fcm_token');
        } catch (error) {
            console.error('Error unregistering FCM token:', error);
        }
    }, [fcmToken]);

    return {
        fcmToken,
        permission,
        isSupported,
        requestPermission,
        unregisterToken,
    };
}
