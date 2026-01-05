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

    // Don't initialize on auth pages
    if (isAuthPage) {
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
        if (typeof window === 'undefined' || !('Notification' in window)) return;

        try {
            const { initializeFCM } = await import('@/lib/firebase/messaging');
            const token = await initializeFCM();
            if (token) {
                setFcmToken(token);
                setPermission('granted');
                localStorage.setItem('fcm_token', token);
            }
        } catch (error) {
            console.warn('FCM initialization failed:', error);
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
        }

        // Initial fetch
        refreshNotifications();
    }, [initialized, refreshNotifications]);

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
