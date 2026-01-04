'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api/axios';

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  pincode: string;
  service_type: string;
  is_verified: boolean;
  agent_status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  is_available: boolean;
  current_active_cases: number;
  total_assigned_cases: number;
  total_resolved_cases: number;
  performance_rating: number;
  assigned_complaints: any[];
}

interface AgentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string | null;
  availableComplaints?: any[];
}

export default function AgentDetailModal({
  isOpen,
  onClose,
  agentId,
  availableComplaints = []
}: AgentDetailModalProps) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState('');
  const [assignmentMessage, setAssignmentMessage] = useState('');

  useEffect(() => {
    if (isOpen && agentId) {
      fetchAgentDetails();
    }
  }, [isOpen, agentId]);

  const fetchAgentDetails = async () => {
    if (!agentId) return;

    setLoading(true);
    try {
      const response = await api.get(`/users/agent-management/agent/${agentId}/`);
      setAgent(response.data);
    } catch (error) {
      console.error('Failed to fetch agent details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignComplaint = async () => {
    if (!selectedComplaint || !agent) return;

    try {
      await api.post('/users/agent-management/assign-complaint/', {
        complaint_id: selectedComplaint,
        agent_id: agent.id,
        message: assignmentMessage
      });

      alert('Assignment request sent to agent');
      setSelectedComplaint('');
      setAssignmentMessage('');
      onClose();
    } catch (error) {
      alert('Failed to send assignment request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-green-500';
      case 'BUSY': return 'bg-yellow-500';
      case 'OFFLINE': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!agent && !loading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Agent Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : agent ? (
          <div className="space-y-6">
            <Card className="dark:bg-[#030712] dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 dark:text-white">
                  {agent.name}
                  <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(agent.agent_status)}`}>
                    {agent.agent_status}
                  </span>
                  {agent.is_verified && (
                    <span className="px-2 py-1 rounded text-xs text-green-600 border border-green-600 dark:text-green-400 dark:border-green-400">
                      Verified
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 dark:text-slate-300">
                <div className="space-y-1">
                  <p><strong className="dark:text-white">Email:</strong> {agent.email}</p>
                  <p><strong className="dark:text-white">Phone:</strong> {agent.phone}</p>
                  <p><strong className="dark:text-white">Pincode:</strong> {agent.pincode}</p>
                </div>
                <div className="space-y-1">
                  <p><strong className="dark:text-white">Service Type:</strong> {agent.service_type}</p>
                  <p><strong className="dark:text-white">Active Cases:</strong> {agent.current_active_cases}</p>
                  <p><strong className="dark:text-white">Total Resolved:</strong> {agent.total_resolved_cases}</p>
                </div>
              </CardContent>
            </Card>

            {agent.is_available && availableComplaints.length > 0 && (
              <Card className="dark:bg-[#030712] dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="dark:text-white">Assign New Complaint</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <select
                    value={selectedComplaint}
                    onChange={(e) => setSelectedComplaint(e.target.value)}
                    className="w-full p-2 border rounded-md dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <option value="" className="dark:bg-slate-800">Select a complaint to assign</option>
                    {availableComplaints.map((complaint) => (
                      <option key={complaint.id} value={complaint.id} className="dark:bg-slate-800">
                        {complaint.complaint_number} - {complaint.title}
                      </option>
                    ))}
                  </select>

                  <Textarea
                    placeholder="Optional message for the agent..."
                    value={assignmentMessage}
                    onChange={(e) => setAssignmentMessage(e.target.value)}
                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />

                  <Button
                    onClick={handleAssignComplaint}
                    disabled={!selectedComplaint}
                    className="w-full bg-[#1da9c3] hover:bg-[#1da9c3]/90 text-white"
                  >
                    Send Assignment Request
                  </Button>
                </CardContent>
              </Card>
            )}

            {!agent.is_available && (
              <Card className="dark:bg-[#030712] dark:border-slate-800">
                <CardContent className="p-4 text-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    Agent is currently {agent.agent_status.toLowerCase()} and cannot accept new assignments
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="dark:bg-[#030712] dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">Assigned Complaints ({agent.assigned_complaints.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {agent.assigned_complaints.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400">No complaints assigned</p>
                ) : (
                  <div className="space-y-2">
                    {agent.assigned_complaints.map((complaint) => (
                      <div key={complaint.id} className="flex justify-between items-center p-3 border rounded-lg dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <div>
                          <p className="font-medium dark:text-white">{complaint.complaint_number}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{complaint.title}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded text-xs ${complaint.priority === 'HIGH'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                            {complaint.priority}
                          </span>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{complaint.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}