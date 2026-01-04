'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersService } from '@/lib/api/services/users.service';
import { useAuthStore } from '@/lib/stores/auth.store';
import { User, MapPin, Mail, Star, TrendingUp, CheckCircle, Clock, Search, Filter } from 'lucide-react';

export default function AgentsPage() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedAgent, setSelectedAgent] = useState<any>(null);

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: usersService.getAgents,
    enabled: user?.role === 'ADMIN',
  });

  if (user?.role !== 'ADMIN') {
    return (
      <div className="text-center py-10 text-red-600 dark:text-red-400">Access denied</div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1da9c3]"></div>
      </div>
    );
  }

  const agentsList = Array.isArray(agents) ? agents : [];
  
  // Filter agents
  let filteredAgents = agentsList.filter((agent: any) => {
    const matchesSearch = searchQuery === '' || 
      agent.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'ALL' ||
      (filterStatus === 'ACTIVE' && agent.is_active) ||
      (filterStatus === 'VERIFIED' && agent.is_verified) ||
      (filterStatus === 'BUSY' && agent.is_busy);
    
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: agentsList.length,
    active: agentsList.filter((a: any) => a.is_active).length,
    verified: agentsList.filter((a: any) => a.is_verified).length,
    busy: agentsList.filter((a: any) => a.is_busy).length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Agent Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and monitor all service agents</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm opacity-90">Agents</div>
            </div>
            <User size={32} className="opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{stats.active}</div>
              <div className="text-sm opacity-90">Online</div>
            </div>
            <CheckCircle size={32} className="opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{stats.verified}</div>
              <div className="text-sm opacity-90">Registered</div>
            </div>
            <Star size={32} className="opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{stats.busy}</div>
              <div className="text-sm opacity-90">Busy</div>
            </div>
            <Clock size={32} className="opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search agents by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#1da9c3] focus:border-transparent transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#1da9c3] focus:border-transparent transition-all min-w-[140px]"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="VERIFIED">Verified</option>
              <option value="BUSY">Busy</option>
            </select>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map((agent: any) => (
          <div 
            key={agent.id} 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
            onClick={() => setSelectedAgent(agent)}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1da9c3] to-[#1dc3e3] p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-2xl font-bold">
                  {agent.first_name?.[0]}{agent.last_name?.[0]}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{agent.first_name} {agent.last_name}</h3>
                  <p className="text-sm opacity-90">{agent.service_type || 'General Agent'}</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail size={14} />
                  <span className="truncate">{agent.email}</span>
                </div>
                {agent.pincode && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin size={14} />
                    <span>Pincode: {agent.pincode}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t dark:border-gray-700">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#1da9c3]">{agent.current_active_cases || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{agent.total_resolved_cases || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Resolved</div>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                {agent.is_verified && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full flex items-center gap-1">
                    <CheckCircle size={12} />
                    Verified
                  </span>
                )}
                {agent.is_active && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                    Active
                  </span>
                )}
                {agent.is_busy && (
                  <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs rounded-full">
                    Busy
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <User size={48} className="mx-auto mb-3 opacity-30" />
          <p>No agents found</p>
        </div>
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedAgent(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#1da9c3] to-[#1dc3e3] p-6 text-white">
              <h2 className="text-2xl font-bold">{selectedAgent.first_name} {selectedAgent.last_name}</h2>
              <p className="opacity-90">{selectedAgent.email}</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Service Type</label>
                  <p className="font-medium dark:text-white">{selectedAgent.service_type || 'General'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Pincode</label>
                  <p className="font-medium dark:text-white">{selectedAgent.pincode || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Active Cases</label>
                  <p className="font-medium dark:text-white">{selectedAgent.current_active_cases || 0}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Total Resolved</label>
                  <p className="font-medium dark:text-white">{selectedAgent.total_resolved_cases || 0}</p>
                </div>
              </div>

              {/* Assigned Complaints */}
              {selectedAgent.assigned_complaints && selectedAgent.assigned_complaints.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold dark:text-white mb-3">Assigned Complaints</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedAgent.assigned_complaints.map((complaint: any) => (
                      <div key={complaint.id} className="p-3 border dark:border-gray-700 rounded-lg flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[#1da9c3]">{complaint.complaint_number}</p>
                          <p className="text-sm text-gray-900 dark:text-white">{complaint.title}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          complaint.status === 'OPEN' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                          complaint.status === 'IN_PROGRESS' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                          complaint.status === 'RESOLVED' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                          {complaint.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedAgent(null)}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
