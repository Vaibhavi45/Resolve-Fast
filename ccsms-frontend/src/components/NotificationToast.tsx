'use client';

import { useEffect } from 'react';
import { useNotificationStore } from '@/lib/stores/notification.store';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export default function NotificationToast() {
  const { notifications, removeNotification } = useNotificationStore();

  useEffect(() => {
    if (!notifications?.length) return;
    
    const timers = notifications.map((notification) => 
      setTimeout(() => {
        removeNotification(notification.id);
      }, 5000)
    );
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, removeNotification]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-green-500" size={20} />;
      case 'error': return <AlertCircle className="text-red-500" size={20} />;
      case 'warning': return <AlertTriangle className="text-yellow-500" size={20} />;
      default: return <Info className="text-blue-500" size={20} />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications?.map((notification) => (
        <div
          key={notification.id}
          className={`max-w-sm p-4 rounded-lg border shadow-lg ${getBgColor(notification.type)} animate-in slide-in-from-right duration-300`}
        >
          <div className="flex items-start gap-3">
            {getIcon(notification.type)}
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{notification.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}