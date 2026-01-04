'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { complaintsService } from '@/lib/api/services/complaints.service';
import { useAuthStore } from '@/lib/stores/auth.store';
import Link from 'next/link';
import { Clock, AlertCircle, CheckCircle, TrendingUp, Bell } from 'lucide-react';
import AssignmentRequestModal from '@/components/agents/AssignmentRequestModal';
import { useAgentWebSocket } from '@/lib/hooks/useAgentWebSocket';
import { Button } from '@/components/ui/button';

export default function AgentDashboard() {
  const { user } = useAuthStore();
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [hasNewRequest, setHasNewRequest] = useState(false);

  const { data: complaints } = useQuery({
    queryKey: ['agent-complaints', user?.id],
    queryFn: () => complaintsService.getAll(),
    enabled: !!user,
  });

  const complaintsList = Array.isArray(complaints) ? complaints : (complaints?.results || []);
  // Only show complaints assigned to this agent
  const myComplaints = complaintsList.filter((c: any) => c.assigned_to?.id === user?.id);
  
  const newTickets = myComplaints.filter((c: any) => c.status === 'OPEN').length || 0;
  const assignedToMe = myComplaints.length || 0;
  const overdue = myComplaints.filter((c: any) => c.sla_breached).length || 0;
  const resolved = myComplaints.filter((c: any) => c.status === 'RESOLVED').length || 0;

  const criticalComplaints = myComplaints.filter((c: any) => 
    c.priority === 'CRITICAL' || c.sla_breached
  );

  const myTasks = myComplaints.filter((c: any) => 
    c.status !== 'RESOLVED' && c.status !== 'CLOSED'
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Good morning,</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">{user?.first_name} {user?.last_name}</p>
        </div>
        <Button 
          onClick={() => {
            setShowAssignmentModal(true);
            setHasNewRequest(false);
          }}
          className="relative"
        >
          <Bell className="mr-2" size={16} />
          Assignment Requests
          {hasNewRequest && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              !
            </span>
          )}
        </Button>
      </div>



      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          value={newTickets}
          label="New Tickets"
          icon={<Clock className="text-[#1da9c3]" />}
          trend="+2%"
        />
        <StatCard
          value={assignedToMe}
          label="Assigned to Me"
          icon={<TrendingUp className="text-green-600 dark:text-green-400" />}
        />
        <StatCard
          value={overdue}
          label="Overdue"
          icon={<AlertCircle className="text-red-600 dark:text-red-400" />}
          alert
        />
        <StatCard
          value={resolved}
          label="Resolved"
          icon={<CheckCircle className="text-green-600 dark:text-green-400" />}
        />
      </div>



      {/* Tabs */}
      <div className="flex gap-4 border-b dark:border-gray-700">
        <button className="px-4 py-2 border-b-2 border-[#1da9c3] text-[#1da9c3] font-medium">
          My Tasks
        </button>
        <Link href="/complaints?status=RESOLVED" className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
          Resolved
        </Link>
      </div>

      {/* Critical Attention */}
      {criticalComplaints.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 dark:border-red-500 p-4 rounded">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-3 flex items-center gap-2">
            <AlertCircle className="text-red-600 dark:text-red-400" />
            Critical Attention
          </h2>
          <div className="space-y-3">
            {criticalComplaints.slice(0, 2).map((complaint: any) => (
              <Link
                key={complaint.id}
                href={`/complaints/${complaint.id}`}
                className="block bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{complaint.complaint_number}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{complaint.title}</p>
                  </div>
                  {complaint.sla_breached && (
                    <span className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded">
                      -{Math.floor(Math.random() * 24)}h late
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{complaint.description?.substring(0, 100) || 'No description'}...</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    complaint.status === 'OPEN' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                  }`}>
                    {complaint.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All Tasks */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-white">All Tasks</h2>
        </div>
        <div className="divide-y dark:divide-gray-700">
          {myTasks.length > 0 ? (
            myTasks.map((complaint: any) => (
              <Link
                key={complaint.id}
                href={`/complaints/${complaint.id}`}
                className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {complaint.complaint_number}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {complaint.customer.first_name} {complaint.customer.last_name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{complaint.title}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        complaint.status === 'IN_PROGRESS' 
                          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' 
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      }`}>
                        {complaint.status === 'IN_PROGRESS' ? 'In Progress' : complaint.status}
                      </span>
                      {complaint.sla_breached && (
                        <span className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>
                  {complaint.sla_deadline && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(complaint.sla_deadline).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400 dark:text-gray-500">
              No tasks assigned
            </div>
          )}
        </div>
      </div>

      <AssignmentRequestModal
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
      />
    </div>
  );
}

function StatCard({ value, label, icon, trend, alert }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div className="flex items-center justify-between mb-2">
        <div className={`text-2xl font-bold ${alert ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
          {value}
        </div>
        {icon}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      {trend && <p className="text-xs text-green-600 dark:text-green-400 mt-1">{trend}</p>}
    </div>
  );
}
