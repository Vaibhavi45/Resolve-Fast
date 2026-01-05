import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useNotificationStore } from '@/lib/stores/notification.store';

export const useWebSocket = () => {
  const { user, accessToken } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user || !accessToken) return;

    const connect = () => {
      try {
        // Skip WebSocket connection in development if server doesn't support it
        ws.current = new WebSocket(`ws://localhost:8000/ws/notifications/${user.id}/`);
        
        ws.current.onopen = () => {
          console.log('WebSocket connected');
        };

        ws.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            addNotification({
              id: Date.now().toString(),
              title: data.title,
              message: data.message,
              type: data.type || 'info',
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.current.onclose = () => {
          console.log('WebSocket disconnected');
          // Don't auto-reconnect in development to avoid spam
          // reconnectTimeout.current = setTimeout(connect, 5000);
        };

        ws.current.onerror = (error) => {
          console.log('WebSocket connection failed - running without real-time notifications');
        };
      } catch (error) {
        console.log('WebSocket not available - running without real-time notifications');
      }
    };

    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [user, accessToken, addNotification]);
};