'use client';

import { useQuery } from '@tanstack/react-query';
import { notificationsService } from '@/lib/api/services/notifications.service';
import { Bell, CheckCircle2, AlertCircle, Info, MessageSquare, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function RecentNotifications() {
    const { data: notifications, isLoading } = useQuery({
        queryKey: ['recent-notifications'],
        queryFn: () => notificationsService.getAll({ limit: 5 }),
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    const getIcon = (category: string) => {
        switch (category) {
            case 'COMPLAINT_RESOLVED':
                return <CheckCircle2 className="text-green-500" size={18} />;
            case 'SLA_BREACH':
            case 'ESCALATION':
                return <ShieldAlert className="text-red-500" size={18} />;
            case 'COMPLAINT_ASSIGNED':
                return <Info className="text-blue-500" size={18} />;
            case 'COMMENT_ADDED':
                return <MessageSquare className="text-purple-500" size={18} />;
            default:
                return <Bell className="text-gray-500" size={18} />;
        }
    };

    if (isLoading) {
        return (
            <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
                ))}
            </div>
        );
    }

    const notificationList = Array.isArray(notifications) ? notifications.slice(0, 5) : (notifications?.results?.slice(0, 5) || []);

    if (notificationList.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed dark:border-gray-700">
                <Bell className="mx-auto mb-2 opacity-20" size={32} />
                <p>No recent updates</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {notificationList.map((notification: any) => (
                <div
                    key={notification.id}
                    className={`flex gap-4 p-4 rounded-lg border transition-all hover:shadow-md ${notification.is_read
                            ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                            : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30'
                        }`}
                >
                    <div className="mt-1 flex-shrink-0">
                        {getIcon(notification.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className={`text-sm font-semibold truncate dark:text-white ${!notification.is_read ? 'text-blue-900' : 'text-gray-900'}`}>
                                {notification.title}
                            </h4>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                                {formatDistanceToNow(new Date(notification.sent_at), { addSuffix: true })}
                            </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                            {notification.message}
                        </p>
                        {notification.complaint && (
                            <Link
                                href={`/complaints/${notification.complaint}`}
                                className="inline-block mt-2 text-[10px] font-medium text-[#1da9c3] hover:underline"
                            >
                                View Details
                            </Link>
                        )}
                    </div>
                </div>
            ))}
            {notificationList.length > 0 && (
                <Link
                    href="/notifications"
                    className="block text-center text-sm font-medium text-[#1da9c3] hover:text-[#178a9f] pt-2"
                >
                    View all notifications
                </Link>
            )}
        </div>
    );
}
