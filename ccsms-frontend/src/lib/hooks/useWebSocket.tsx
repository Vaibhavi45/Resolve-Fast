import { useEffect, useRef } from 'react';
import { useNotificationStore } from '@/lib/stores/notification.store';
import { useAuthStore } from '@/lib/stores/auth.store';

const WS_URL = (path = '/ws/notifications/', token?: string) => {
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.hostname || 'localhost';
  const port = '8000';
  const qs = token ? `?token=${token}` : '';
  return `${protocol}://${host}:${port}${path}${qs}`;
};

export function useWebSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  // WebSocket disabled for performance - backend not running
  return socketRef;
}
