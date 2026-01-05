import { useState, useCallback } from 'react';
import axios from 'axios';

interface Notification {
    id: string;
    title: string;
    message: string;
    category: string;
    is_read: boolean;
    sent_at: string;
    notification_type: string;
}

interface UseNotificationsReturn {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    refreshNotifications: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const refreshNotifications = useCallback(async () => {
        if (typeof window === 'undefined') return;

        setLoading(true);
        try {
            const [notifRes, countRes] = await Promise.all([
                axios.get('/api/notifications/').catch(() => ({ data: { results: [] } })),
                axios.get('/api/notifications/unread-count/').catch(() => ({ data: { unread_count: 0 } })),
            ]);

            setNotifications(notifRes.data.results || notifRes.data || []);
            setUnreadCount(countRes.data.unread_count || 0);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const markAsRead = useCallback(async (id: string) => {
        try {
            await axios.put(`/api/notifications/${id}/read/`);
            await refreshNotifications();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }, [refreshNotifications]);

    const markAllAsRead = useCallback(async () => {
        try {
            await axios.put('/api/notifications/mark-all-read/');
            await refreshNotifications();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }, [refreshNotifications]);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
    };
}
