'use client';

import { useQuery } from '@tanstack/react-query';
import { complaintsService } from '@/lib/api/services/complaints.service';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth.store';
import { FileText } from 'lucide-react';

export default function ComplaintsPage() {
  const { user } = useAuthStore();
  const { data: complaints, isLoading } = useQuery({
    queryKey: ['complaints', user?.id],
    queryFn: () => complaintsService.getAll(),
    enabled: !!user,
    refetchInterval: 5000,
  });

  if (isLoading) {
    return <div className="text-center py-10">Loading complaints...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Complaints</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and track all complaints</p>
        </div>
        {user?.role === 'CUSTOMER' && (
          <Link
            href="/complaints/new"
            className="px-6 py-3 bg-[#1da9c3] text-white rounded-lg hover:bg-[#178a9f] font-medium transition-colors shadow-md hover:shadow-lg"
          >
            New Complaint
          </Link>
        )}
      </div>

      {(() => {
        const complaintsList = Array.isArray(complaints) ? complaints : (complaints?.results || []);
        const filteredComplaints = user?.role === 'AGENT' 
          ? complaintsList.filter((c: any) => c.assigned_to?.id === user?.id)
          : complaintsList;
        
        return filteredComplaints.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Complaint</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredComplaints.map((complaint: any) => (
                    <tr key={complaint.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => window.location.href = `/complaints/${complaint.id}`}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-[#1da9c3]">{complaint.complaint_number}</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{complaint.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{complaint.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            complaint.priority === 'CRITICAL' ? 'bg-red-500' :
                            complaint.priority === 'HIGH' ? 'bg-orange-500' :
                            complaint.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}></span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{complaint.priority}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{complaint.category.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={complaint.status} />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{new Date(complaint.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        {complaint.assigned_to ? (
                          <span className="text-sm text-gray-700 dark:text-gray-300">{complaint.assigned_to.first_name}</span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500 italic">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-12 text-center">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <FileText size={64} className="mx-auto opacity-30" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {user?.role === 'AGENT' 
                ? 'No complaints assigned to you yet.' 
                : user?.role === 'CUSTOMER' 
                  ? 'No complaints found. Create your first complaint!' 
                  : 'No complaints found.'}
            </p>
          </div>
        );
      })()}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    IN_PROGRESS: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    RESOLVED: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    CLOSED: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    ESCALATED: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  };

  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${colors[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
