'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { usePathname } from 'next/navigation';

interface NotificationContextType {
    notifications: any[];
    unreadCount: number;
    loading: boolean;
    fcmToken: string | null;
    permission: NotificationPermission;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    refreshNotifications: () => Promise<void>;
    requestPermission: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register');
    const isLandingPage = pathname === '/';

    // Don't initialize on auth pages or landing page
    if (isAuthPage || isLandingPage) {
        const emptyValue: NotificationContextType = {
            notifications: [],
            unreadCount: 0,
            loading: false,
            fcmToken: null,
            permission: 'default',
            markAsRead: async () => { },
            markAllAsRead: async () => { },
            refreshNotifications: async () => { },
            requestPermission: async () => { },
        };

        return (
            <NotificationContext.Provider value={emptyValue}>
                {children}
            </NotificationContext.Provider>
        );
    }

    return <NotificationProviderInner>{children}</NotificationProviderInner>;
}

function NotificationProviderInner({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fcmToken, setFcmToken] = useState<string | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [initialized, setInitialized] = useState(false);

    // Memoized functions to prevent re-creation
    const refreshNotifications = useMemo(() => async () => {
        if (typeof window === 'undefined') return;

        try {
            const { default: api } = await import('@/lib/api/axios');
            const [notifRes, countRes] = await Promise.all([
                api.get('notifications/').catch(() => ({ data: { results: [] } })),
                api.get('notifications/unread-count/').catch(() => ({ data: { unread_count: 0 } })),
            ]);

            setNotifications(notifRes.data.results || notifRes.data || []);
            setUnreadCount(countRes.data.unread_count || 0);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }, []);

    const markAsRead = useMemo(() => async (id: string) => {
        try {
            const { default: api } = await import('@/lib/api/axios');
            await api.put(`notifications/${id}/read/`);
            await refreshNotifications();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }, [refreshNotifications]);

    const markAllAsRead = useMemo(() => async () => {
        try {
            const { default: api } = await import('@/lib/api/axios');
            await api.put('notifications/mark-all-read/');
            await refreshNotifications();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }, [refreshNotifications]);

    const requestPermission = useMemo(() => async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            console.warn('Notifications not supported in this browser');
            return;
        }

        try {
            console.log('Current notification permission:', Notification.permission);

            if (Notification.permission === 'granted') {
                console.log('Notification permission already granted');
                setPermission('granted');

                // Initialize FCM
                const { initializeFCM } = await import('@/lib/firebase/messaging');
                const token = await initializeFCM();
                console.log('FCM initialized with token:', token ? 'Token received' : 'No token');
                setFcmToken(token);
                return;
            }

            if (Notification.permission === 'denied') {
                console.warn('Notification permission denied. Please enable in browser settings.');
                setPermission('denied');
                return;
            }

            // Request permission
            console.log('Requesting notification permission...');
            const permission = await Notification.requestPermission();
            console.log('Permission result:', permission);
            setPermission(permission);

            if (permission === 'granted') {
                console.log('Permission granted! Initializing FCM...');
                const { initializeFCM } = await import('@/lib/firebase/messaging');
                const token = await initializeFCM();
                console.log('FCM Token:', token ? 'Received' : 'Failed');
                setFcmToken(token);

                // Show a test notification
                new Notification('Notifications Enabled!', {
                    body: 'You will now receive desktop notifications for complaint updates.',
                    icon: '/favicon.ico'
                });
            } else {
                console.warn('Notification permission not granted:', permission);
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    }, []);

    // Initialize once
    useEffect(() => {
        if (initialized || typeof window === 'undefined') return;

        setInitialized(true);

        // Check existing permission
        if ('Notification' in window) {
            setPermission(Notification.permission);
            const storedToken = localStorage.getItem('fcm_token');
            if (storedToken) setFcmToken(storedToken);

            // Auto-request permission if not yet asked
            if (Notification.permission === 'default') {
                console.log('Auto-requesting notification permission...');
                setTimeout(() => requestPermission(), 1000); // Delay to avoid blocking page load
            } else if (Notification.permission === 'granted' && !storedToken) {
                // Permission granted but no token, initialize FCM
                console.log('Permission granted, initializing FCM...');
                requestPermission();
            }
        }

        // Initial fetch
        refreshNotifications();
    }, [initialized, refreshNotifications, requestPermission]);

    // Setup foreground listener once
    useEffect(() => {
        if (!fcmToken || typeof window === 'undefined') return;

        let unsubscribe: (() => void) | null = null;

        import('@/lib/firebase/messaging').then(({ onForegroundMessage }) => {
            unsubscribe = onForegroundMessage((payload: any) => {
                console.log('Foreground notification received:', payload);
                refreshNotifications();
            });
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [fcmToken, refreshNotifications]);

    const value = useMemo<NotificationContextType>(() => ({
        notifications,
        unreadCount,
        loading,
        fcmToken,
        permission,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        requestPermission,
    }), [notifications, unreadCount, loading, fcmToken, permission, markAsRead, markAllAsRead, refreshNotifications, requestPermission]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotificationContext() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotificationContext must be used within a NotificationProvider');
    }
    return context;
}
