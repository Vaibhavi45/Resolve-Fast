'use client';

import { useEffect, useRef, useState } from 'react';

interface AssignmentRequestData {
  request_id: string;
  complaint_number: string;
  complaint_title: string;
  priority: string;
  admin_name: string;
  message: string;
  expires_at: string;
}

interface AssignmentResponseData {
  complaint_number: string;
  agent_name: string;
  response: 'accept' | 'reject';
  message: string;
  agent_message: string;
}

interface UseAgentWebSocketProps {
  userRole: 'AGENT' | 'ADMIN';
  onAssignmentRequest?: (data: AssignmentRequestData) => void;
  onAssignmentResponse?: (data: AssignmentResponseData) => void;
}

export function useAgentWebSocket({ 
  userRole, 
  onAssignmentRequest, 
  onAssignmentResponse 
}: UseAgentWebSocketProps) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Skip WebSocket connection for now - use polling instead
    console.log(`${userRole} WebSocket disabled - using polling`);
    setIsConnected(false);
    
    return () => {
      // Cleanup if needed
    };
  }, [userRole, onAssignmentRequest, onAssignmentResponse]);

  const updateAgentStatus = (status: 'AVAILABLE' | 'BUSY') => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'status_update',
        status: status
      }));
    }
  };

  return {
    isConnected,
    updateAgentStatus
  };
}