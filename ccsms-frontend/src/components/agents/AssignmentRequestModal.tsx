'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api/axios';

interface AssignmentRequest {
  id: string;
  complaint_number: string;
  complaint_title: string;
  priority: string;
  category: string;
  admin_name: string;
  message: string;
  expires_at: string;
  created_at: string;
}

interface AssignmentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AssignmentRequestModal({ isOpen, onClose }: AssignmentRequestModalProps) {
  const [requests, setRequests] = useState<AssignmentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPendingRequests();
    }
  }, [isOpen]);

  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/agent-management/pending-requests/');
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId: string, response: 'accept' | 'reject') => {
    try {
      await api.post(`/complaints/agent-assignment-requests/${requestId}/respond/`, {
        action: response,
        response: responseMessage
      });

      alert(`Assignment request ${response}ed successfully`);
      setResponseMessage('');
      setSelectedRequest(null);
      fetchPendingRequests(); // Refresh the list
      onClose(); // Close the modal after successful response
    } catch (error: any) {
      console.error(`Failed to ${response} assignment request:`, error);
      alert(`Failed to ${response} assignment request: ${error.response?.data?.error || error.message}`);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assignment Requests</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1da9c3]"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.length === 0 ? (
              <Card className="dark:bg-[#030712] dark:border-slate-800">
                <CardContent className="p-12 text-center">
                  <p className="text-slate-600 dark:text-slate-400">No pending assignment requests</p>
                </CardContent>
              </Card>
            ) : (
              requests.map((request) => (
                <Card key={request.id} className="border-l-4 border-l-[#1da9c3] dark:bg-[#030712] dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-lg dark:text-white">
                      <span>{request.complaint_number}</span>
                      <div className="flex gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase ${getPriorityColor(request.priority)}`}>
                          {request.priority}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] border dark:border-slate-700 dark:text-slate-400">
                          {formatTimeRemaining(request.expires_at)}
                        </span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="font-semibold dark:text-slate-200">{request.complaint_title}</p>
                      <div className="mt-1 space-y-0.5">
                        <p className="text-xs text-slate-500">Category: <span className="text-slate-700 dark:text-slate-300">{request.category}</span></p>
                        <p className="text-xs text-slate-500">Assigned by: <span className="text-slate-700 dark:text-slate-300">{request.admin_name}</span></p>
                      </div>
                    </div>

                    {request.message && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border dark:border-slate-800">
                        <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">Admin Message:</p>
                        <p className="text-sm dark:text-slate-300 italic">"{request.message}"</p>
                      </div>
                    )}

                    {selectedRequest === request.id ? (
                      <div className="space-y-3 pt-2">
                        <Textarea
                          placeholder="Optional response message..."
                          value={responseMessage}
                          onChange={(e) => setResponseMessage(e.target.value)}
                          className="text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                        />
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleResponse(request.id, 'accept')}
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8"
                          >
                            Accept
                          </Button>
                          <Button
                            onClick={() => handleResponse(request.id, 'reject')}
                            variant="destructive"
                            className="font-semibold px-8"
                          >
                            Reject
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedRequest(null);
                              setResponseMessage('');
                            }}
                            variant="outline"
                            className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 pt-2 border-t dark:border-slate-800">
                        <Button
                          onClick={() => setSelectedRequest(request.id)}
                          className="bg-[#1da9c3] hover:bg-[#1da9c3]/90 text-white font-medium"
                        >
                          Respond to Assignment
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}