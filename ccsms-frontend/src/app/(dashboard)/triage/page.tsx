'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complaintsService } from '@/lib/api/services/complaints.service';
import { usersService } from '@/lib/api/services/users.service';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useState } from 'react';
import { Clock, AlertTriangle, User, Zap, Target, MapPin, Sparkles, TrendingUp } from 'lucide-react';

export default function TriagePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [filterPriority, setFilterPriority] = useState('ALL');

  const { data: complaints } = useQuery({
    queryKey: ['complaints'],
    queryFn: () => complaintsService.getAll(),
    enabled: user?.role === 'ADMIN',
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: usersService.getAgents,
    enabled: user?.role === 'ADMIN',
  });

  const triageMutation = useMutation({
    mutationFn: ({ complaintId, agentId, message }: any) =>
      complaintsService.requestAgentAssignment(complaintId, agentId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      setSelectedComplaint(null);
      alert('Assignment request sent successfully');
    },
  });

  const getSLAStatus = (complaint: any) => {
    if (!complaint.sla_deadline) return { status: 'none', timeLeft: 'No SLA', color: 'gray' };

    const now = new Date();
    const deadline = new Date(complaint.sla_deadline);
    const timeLeft = deadline.getTime() - now.getTime();

    if (timeLeft < 0) return { status: 'breached', timeLeft: 'Overdue', color: 'red' };
    if (timeLeft < 2 * 60 * 60 * 1000) return { status: 'critical', timeLeft: `${Math.floor(timeLeft / (60 * 1000))}m`, color: 'orange' };
    if (timeLeft < 24 * 60 * 60 * 1000) return { status: 'warning', timeLeft: `${Math.floor(timeLeft / (60 * 60 * 1000))}h`, color: 'yellow' };

    return { status: 'good', timeLeft: `${Math.floor(timeLeft / (24 * 60 * 60 * 1000))}d`, color: 'green' };
  };

  if (user?.role !== 'ADMIN') {
    return <div className="text-center py-10 text-red-600 dark:text-red-400">Access denied</div>;
  }

  const complaintsList = Array.isArray(complaints) ? complaints : (complaints?.results || []);
  const unassignedComplaints = complaintsList.filter((c: any) => !c.assigned_to);

  // Calculate stats from all unassigned complaints (before filter)
  const stats = {
    total: unassignedComplaints.length,
    critical: unassignedComplaints.filter((c: any) => c.priority === 'CRITICAL').length,
    high: unassignedComplaints.filter((c: any) => c.priority === 'HIGH').length,
    breached: unassignedComplaints.filter((c: any) => getSLAStatus(c).status === 'breached').length,
  };

  // Apply priority filter for display
  let filteredComplaints = unassignedComplaints;
  if (filterPriority !== 'ALL') {
    filteredComplaints = filteredComplaints.filter((c: any) => c.priority === filterPriority);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Triage & Assignment</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Smart complaint routing and manual assignment</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm opacity-90">Unassigned</div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
          <div className="text-2xl font-bold">{stats.critical}</div>
          <div className="text-sm opacity-90">Critical</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
          <div className="text-2xl font-bold">{stats.high}</div>
          <div className="text-sm opacity-90">High Priority</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="text-2xl font-bold">{stats.breached}</div>
          <div className="text-sm opacity-90">SLA Breached</div>
        </div>
      </div>

      {/* Triage Rules */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-[#1da9c3]" size={20} />
          <h2 className="text-lg font-semibold dark:text-white">Auto Assignment Rules</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="text-red-500" size={18} />
              <span className="font-medium text-red-900 dark:text-red-200 text-sm">Priority-Based</span>
            </div>
            <p className="text-xs text-red-800 dark:text-red-300">
              Critical → Senior agents • High → Experienced • Auto-escalate on SLA breach
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="text-blue-500" size={18} />
              <span className="font-medium text-blue-900 dark:text-blue-200 text-sm">Location-Based</span>
            </div>
            <p className="text-xs text-blue-800 dark:text-blue-300">
              Match pincode • Service type compatibility • Nearest available agent
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-green-500" size={18} />
              <span className="font-medium text-green-900 dark:text-green-200 text-sm">Workload Balance</span>
            </div>
            <p className="text-xs text-green-800 dark:text-green-300">
              Distribute evenly • Consider active cases • Agent availability status
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Complaints List */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="p-6 border-b dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold dark:text-white">Unassigned Queue</h2>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-3 py-1 text-sm border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
          <div className="divide-y dark:divide-gray-700 max-h-[600px] overflow-y-auto">
            {filteredComplaints.length > 0 ? (
              filteredComplaints.map((complaint: any) => {
                const sla = getSLAStatus(complaint);
                return (
                  <div
                    key={complaint.id}
                    className={`p-4 cursor-pointer transition-colors ${selectedComplaint?.id === complaint.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-[#1da9c3]'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    onClick={() => setSelectedComplaint(complaint)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm dark:text-white">{complaint.complaint_number}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${complaint.priority === 'CRITICAL' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            complaint.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                              complaint.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            }`}>
                            {complaint.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{complaint.title}</p>
                      </div>
                      <div className={`px-2 py-1 text-xs font-medium rounded ${sla.color === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        sla.color === 'orange' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          sla.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                        <Clock size={12} className="inline mr-1" />
                        {sla.timeLeft}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Target size={12} />
                        {complaint.category.replace('_', ' ')}
                      </span>
                      {complaint.pincode && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {complaint.pincode}
                        </span>
                      )}
                      <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Zap size={48} className="mx-auto mb-3 opacity-30" />
                <p>No unassigned complaints</p>
              </div>
            )}
          </div>
        </div>

        {/* Assignment Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold dark:text-white">Assign Agent</h2>
          </div>
          <div className="p-6">
            {selectedComplaint ? (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-sm dark:text-white mb-2">{selectedComplaint.complaint_number}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{selectedComplaint.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-white dark:bg-gray-800 text-xs rounded">{selectedComplaint.category.replace('_', ' ')}</span>
                    <span className="px-2 py-1 bg-white dark:bg-gray-800 text-xs rounded">{selectedComplaint.priority}</span>
                    {selectedComplaint.pincode && (
                      <span className="px-2 py-1 bg-white dark:bg-gray-800 text-xs rounded flex items-center gap-1">
                        <MapPin size={10} />
                        {selectedComplaint.pincode}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium dark:text-white mb-3">Available Agents</label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {Array.isArray(agents) && agents.length > 0 ? (
                      agents
                        .filter((agent: any) => agent.is_active)
                        .map((agent: any) => (
                          <div
                            key={agent.id}
                            className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => {
                              triageMutation.mutate({
                                complaintId: selectedComplaint.id,
                                agentId: agent.id,
                                message: `Assignment request for ${selectedComplaint.complaint_number}`
                              });
                            }}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium dark:text-white">{agent.first_name} {agent.last_name}</p>
                                {agent.service_type && (
                                  <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                                    {agent.service_type}
                                  </span>
                                )}
                                {agent.is_busy && (
                                  <span className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-0.5 rounded">
                                    Busy
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {agent.pincode || 'No location'} • {agent.current_active_cases || 0} active
                              </p>
                            </div>
                            <User size={16} className="text-[#1da9c3]" />
                          </div>
                        ))
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No agents available</p>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300 dark:border-gray-600"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">Or</span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    console.log('[Auto Assignment] Button clicked for:', selectedComplaint.id);
                    try {
                      await complaintsService.assign(selectedComplaint.id, '');
                      alert('✅ Auto Assignment successful!');
                      queryClient.invalidateQueries({ queryKey: ['complaints'] });
                      setSelectedComplaint(null);
                    } catch (error: any) {
                      console.error('[Auto Assignment] Error:', error);
                      alert('❌ ' + (error.response?.data?.error || 'Failed to auto-assign'));
                    }
                  }}
                  disabled={triageMutation.isPending}
                  className="w-full px-4 py-3 bg-gradient-to-r from-[#1da9c3] to-blue-600 text-white rounded-lg hover:from-[#178a9f] hover:to-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm font-bold shadow-md"
                >
                  <Sparkles size={18} />
                  Auto Assignment
                </button>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <User size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a complaint to assign</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
