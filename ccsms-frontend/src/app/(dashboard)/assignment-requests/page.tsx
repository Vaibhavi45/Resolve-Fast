'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complaintsService } from '@/lib/api/services/complaints.service';
import { useAuthStore } from '@/lib/stores/auth.store';
import Link from 'next/link';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AssignmentRequestsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['assignment-requests'],
    queryFn: complaintsService.getAssignmentRequests,
    enabled: user?.role === 'ADMIN' || user?.role === 'AGENT',
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      complaintsService.reviewAssignmentRequest(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-requests'] });
      alert('Request reviewed successfully');
    },
  });

  if (user?.role !== 'ADMIN' && user?.role !== 'AGENT') {
    return <div className="text-center py-10 dark:text-white">Access denied</div>;
  }

  if (isLoading) {
    return <div className="text-center py-10 dark:text-white">Loading...</div>;
  }

  // Agent View - Show incoming assignment requests from admin
  if (user?.role === 'AGENT') {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 dark:text-white">Assignment Requests</h1>

        <div className="space-y-8">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold dark:text-slate-300 flex items-center gap-2">
                Requests from Admin
                <span className="text-sm font-normal text-slate-500">(Tickets assigned to you)</span>
              </h2>
            </div>
            {requests?.incoming?.length > 0 ? (
              <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 shadow rounded-lg overflow-hidden">
                <div className="divide-y dark:divide-slate-800">
                  {requests.incoming.map((request: any) => (
                    <div key={request.id} className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Link
                              href={`/complaints/${request.complaint}`}
                              className="text-lg font-semibold text-[#1da9c3] hover:underline"
                            >
                              #{request.complaint_number}
                            </Link>
                            <span className={`px-2 py-1 text-xs rounded-full ${request.status === 'PENDING'
                              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                              : request.status === 'APPROVED'
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                              }`}>
                              {request.status === 'PENDING' ? 'Pending' : request.status === 'APPROVED' ? 'Accepted' : 'Rejected'}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 mb-2">{request.complaint_title}</p>
                          <div className="text-sm text-slate-500 space-y-1">
                            <p><strong>Assigned by:</strong> Admin</p>
                            <p><strong>Assigned at:</strong> {new Date(request.created_at).toLocaleString()}</p>
                            {request.message && (
                              <p className="mt-2"><strong>Message:</strong> {request.message}</p>
                            )}
                          </div>
                        </div>
                        {request.status === 'PENDING' && (
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => reviewMutation.mutate({ id: request.id, action: 'approve' })}
                              disabled={reviewMutation.isPending}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                            >
                              <CheckCircle size={16} />
                              Accept
                            </button>
                            <button
                              onClick={() => reviewMutation.mutate({ id: request.id, action: 'reject' })}
                              disabled={reviewMutation.isPending}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                            >
                              <XCircle size={16} />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed dark:border-slate-800 rounded-lg p-8 text-center text-slate-500">
                No assignment requests from admin
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // Admin View - Show outgoing assignment requests to agents
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 dark:text-white">Assignment Requests</h1>

      <div className="space-y-8">
        {/* Outgoing Requests Section (Admin assigns to Agents) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold dark:text-slate-300 flex items-center gap-2">
              Assigned to Agents
              <span className="text-sm font-normal text-slate-500">(Awaiting agent response)</span>
            </h2>
          </div>
          {requests?.outgoing?.length > 0 ? (
            <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 shadow rounded-lg overflow-hidden">
              <div className="divide-y dark:divide-slate-800">
                {requests.outgoing.map((request: any) => (
                  <div key={request.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Link href={`/complaints/${request.complaint}`} className="text-lg font-semibold text-[#1da9c3] hover:underline">
                            #{request.complaint_number}
                          </Link>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${request.status === 'APPROVED'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : request.status === 'REJECTED'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                            }`}>
                            {request.status === 'APPROVED' ? 'Accepted' : request.status === 'REJECTED' ? 'Rejected' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 mb-2">{request.complaint_title}</p>
                        <div className="text-sm space-y-1 text-slate-500">
                          <p><strong>Agent:</strong> {request.agent.first_name} {request.agent.last_name} ({request.agent.email})</p>
                          <p><strong>Assigned:</strong> {new Date(request.created_at).toLocaleString()}</p>
                          {request.reviewed_at && (
                            <p><strong>Responded:</strong> {new Date(request.reviewed_at).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {request.status === 'PENDING' ? (
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded-full inline-flex items-center gap-1">
                            <Clock size={12} />
                            Awaiting Response
                          </span>
                        ) : request.status === 'APPROVED' ? (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full inline-flex items-center gap-1">
                            ✓ Accepted by Agent
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded-full inline-flex items-center gap-1">
                            ✗ Rejected by Agent
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed dark:border-slate-800 rounded-lg p-8 text-center text-slate-500">
              No pending assignment requests
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
