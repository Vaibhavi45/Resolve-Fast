'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complaintsService } from '@/lib/api/services/complaints.service';
import { usersService } from '@/lib/api/services/users.service';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useState } from 'react';
import { FileText, Phone, Mail, User, Clock, MessageSquare, Send, Star, Sparkles, Bot } from 'lucide-react';
import FeedbackForm from '@/components/complaints/FeedbackForm';

import React from 'react';

function ComplaintDetailPageContent({ params }: { params: { id: string } }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  const { data: complaint, isLoading } = useQuery({
    queryKey: ['complaint', params.id],
    queryFn: () => complaintsService.getById(params.id),
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: usersService.getAgents,
    enabled: user?.role === 'ADMIN',
  });

  const assignMutation = useMutation({
    mutationFn: (agentId: string) => complaintsService.assign(params.id, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaint', params.id] });
      alert('Agent assigned successfully');
    },
  });

  const requestAssignmentMutation = useMutation({
    mutationFn: (message: string) => complaintsService.requestAssignment(params.id, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaint', params.id] });
      alert('Assignment request sent to admin');
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: (priority: string) => complaintsService.update(params.id, { priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaint', params.id] });
      setSelectedPriority('');
      alert('Priority updated successfully');
    },
    onError: (error: any) => {
      const errorMsg = error.response?.data?.detail || error.response?.data?.error || 'Failed to update priority';
      alert(errorMsg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => complaintsService.delete(params.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      alert('Complaint deleted successfully');
      window.location.href = '/complaints';
    },
    onError: (error: any) => {
      console.error('Delete error:', error);
      const errorMsg = error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        'Failed to delete complaint. Make sure it is resolved first.';
      alert(`Error: ${errorMsg}`);
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => complaintsService.addComment(params.id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaint', params.id] });
      setComment('');
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (notes: string) => complaintsService.resolve(params.id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaint', params.id] });
      alert('Complaint marked as resolved');
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || 'Failed to resolve complaint');
    },
  });

  const reopenMutation = useMutation({
    mutationFn: (reason: string) => complaintsService.reopen(params.id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaint', params.id] });
      alert('Complaint reopened successfully');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Failed to reopen complaint');
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => complaintsService.close(params.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaint', params.id] });
      alert('Complaint closed successfully');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Failed to close complaint');
    },
  });

  if (isLoading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading complaint details...</p>
      </div>
    );
  }
  if (!complaint) {
    return (
      <div className="text-center py-10">
        <p className="text-red-600 dark:text-red-400">Complaint not found</p>
      </div>
    );
  }

  const isAgent = user?.role === 'AGENT';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold dark:text-white mb-1">Complaint Details</h1>
            <p className="text-[#1da9c3] font-semibold text-sm">{complaint.complaint_number}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={complaint.status} />
            {user?.role === 'AGENT' && !complaint.assigned_to && (
              <button
                onClick={() => {
                  if (requestAssignmentMutation.isPending) return;
                  const message = prompt('Optional message for admin:');
                  if (message !== null) {
                    requestAssignmentMutation.mutate(message || '');
                  }
                }}
                disabled={requestAssignmentMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {requestAssignmentMutation.isPending ? 'Requesting...' : 'Request Assignment'}
              </button>
            )}
            {user?.role === 'ADMIN' && complaint.status === 'RESOLVED' && (
              <button
                onClick={() => {
                  if (deleteMutation.isPending) return;
                  if (confirm('Are you sure you want to delete this complaint? (Permanent)')) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            )}
            {(user?.role === 'ADMIN' || user?.role === 'CUSTOMER') && complaint.status !== 'CLOSED' && (
              <button
                onClick={() => {
                  if (closeMutation.isPending) return;
                  if (confirm('Are you sure you want to close this case? This marks it as finished.')) {
                    closeMutation.mutate();
                  }
                }}
                disabled={closeMutation.isPending}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {closeMutation.isPending ? 'Closing...' : 'Close Case'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="w-8 h-8 bg-[#1da9c3] rounded-lg flex items-center justify-center flex-shrink-0">
              <Phone className="text-white" size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Call</p>
              <p className="text-sm font-semibold dark:text-gray-200 truncate">{complaint.customer.phone || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Mail className="text-white" size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
              <p className="text-sm font-semibold dark:text-gray-200 truncate">{complaint.customer.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <User className="text-white" size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Assigned Agent</p>
              <p className="text-sm font-semibold dark:text-gray-200 truncate">
                {complaint.assigned_to ?
                  `${complaint.assigned_to.first_name} ${complaint.assigned_to.last_name}` :
                  'Unassigned'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="flex border-b dark:border-gray-700">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 font-semibold transition-colors ${activeTab === 'overview' ? 'border-b-2 border-[#1da9c3] text-[#1da9c3]' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('processing')}
                className={`px-6 py-4 font-semibold transition-colors ${activeTab === 'processing' ? 'border-b-2 border-[#1da9c3] text-[#1da9c3]' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
              >
                Processing
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-6 py-4 font-semibold transition-colors ${activeTab === 'activity' ? 'border-b-2 border-[#1da9c3] text-[#1da9c3]' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
              >
                Activity
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold mb-2 dark:text-white">{complaint.title}</h3>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{complaint.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Category</p>
                      <p className="font-semibold text-sm dark:text-gray-200">{complaint.category.replace('_', ' ')}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Priority</p>
                      <p className="font-semibold text-sm dark:text-gray-200">{complaint.priority}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created</p>
                      <p className="font-semibold text-sm dark:text-gray-200">{new Date(complaint.created_at).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">SLA Deadline</p>
                      <p className="font-semibold text-sm dark:text-gray-200">{complaint.sla_deadline ? new Date(complaint.sla_deadline).toLocaleString() : 'N/A'}</p>
                    </div>
                  </div>

                  {/* Resolution Details */}
                  {complaint.status === 'RESOLVED' && complaint.resolution_notes && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">Resolution Details</h4>
                      <p className="text-sm text-green-800 dark:text-green-300 whitespace-pre-wrap">{complaint.resolution_notes}</p>
                      {complaint.resolved_at && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                          Resolved on: {new Date(complaint.resolved_at).toLocaleString()}
                        </p>
                      )}
                      {complaint.assigned_to && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Resolved by: {complaint.assigned_to.first_name} {complaint.assigned_to.last_name}
                        </p>
                      )}

                      {/* Agent Resolution Attachments */}
                      {complaint.resolution_attachments && complaint.resolution_attachments.length > 0 && (
                        <div className="mt-4">
                          <h5 className="font-medium text-green-900 dark:text-green-200 mb-2">Proof of Work by Agent</h5>
                          <div className="grid grid-cols-2 gap-3">
                            {complaint.resolution_attachments.map((att: any) => (
                              <div key={att.id} className="border border-green-300 dark:border-green-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                                {att.mime_type?.startsWith('image/') ? (
                                  <img src={att.file} alt={att.original_filename} className="w-full h-32 object-cover rounded mb-2" />
                                ) : (
                                  <div className="w-full h-32 bg-green-100 dark:bg-green-800 rounded mb-2 flex items-center justify-center">
                                    <FileText size={40} className="text-green-600 dark:text-green-400" />
                                  </div>
                                )}
                                <p className="text-xs text-green-700 dark:text-green-300 truncate">{att.original_filename}</p>
                                <a href={att.file} target="_blank" className="text-xs text-green-600 dark:text-green-400 hover:underline">Download</a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {complaint.attachments && complaint.attachments.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-3 dark:text-white">Attachments ({complaint.attachments.length})</p>
                      <div className="grid grid-cols-2 gap-3">
                        {complaint.attachments.map((att: any) => (
                          <div key={att.id} className="border dark:border-gray-700 rounded-lg p-3">
                            {att.mime_type?.startsWith('image/') ? (
                              <img src={att.file} alt={att.original_filename} className="w-full h-32 object-cover rounded mb-2" />
                            ) : (
                              <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded mb-2 flex items-center justify-center">
                                <FileText size={40} className="text-gray-400 dark:text-gray-500" />
                              </div>
                            )}
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{att.original_filename}</p>
                            <a href={att.file} target="_blank" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Download</a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'processing' && isAgent && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 dark:text-white">Root Cause Analysis</label>
                    <textarea
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="Describe the technical issue..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 dark:text-white">Actions Taken</label>
                    <textarea
                      value={actionsTaken}
                      onChange={(e) => setActionsTaken(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="Enter actions taken"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 dark:text-white">Estimated Resolution Time</label>
                    <input
                      type="text"
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(e.target.value)}
                      className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., 2 hours"
                    />
                  </div>

                  {user?.role === 'ADMIN' && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold mb-2 dark:text-white">Assign Agent</label>
                        <div className="flex gap-2">
                          <select
                            value={selectedAgent}
                            onChange={(e) => setSelectedAgent(e.target.value)}
                            className="flex-1 px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">Select agent</option>
                            {Array.isArray(agents) && agents.map((agent: any) => (
                              <option key={agent.id} value={agent.id}>
                                {agent.first_name} {agent.last_name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => selectedAgent && assignMutation.mutate(selectedAgent)}
                            disabled={!selectedAgent || assignMutation.isPending}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                          >
                            Assign
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2 dark:text-white">Update Priority</label>
                        <div className="flex gap-2">
                          <select
                            value={selectedPriority}
                            onChange={(e) => setSelectedPriority(e.target.value)}
                            className="flex-1 px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">Select priority</option>
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="CRITICAL">Critical</option>
                          </select>
                          <button
                            onClick={() => selectedPriority && updatePriorityMutation.mutate(selectedPriority)}
                            disabled={!selectedPriority || updatePriorityMutation.isPending}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-4">
                  <h3 className="font-semibold dark:text-white">Activity Timeline</h3>
                  {complaint.timeline?.map((event: any) => (
                    <div key={event.id} className="flex gap-3 pb-4 border-b dark:border-gray-700 last:border-0">
                      <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="font-medium dark:text-white">{event.action}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{event.description}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(event.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Messaging with AI Assist */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 dark:text-white">
              <MessageSquare size={20} />
              Messaging
            </h3>

            {/* AI Auto Assist Suggestion */}
            {isAgent && complaint.status !== 'RESOLVED' && complaint.comments?.length === 0 && (
              <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Bot className="text-[#1da9c3] flex-shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Auto Assist Suggestion</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      Thank you for sharing your complaint details! I've reviewed your {complaint.category.toLowerCase().replace('_', ' ')} issue.
                      Let me help you resolve this right away.
                      <br /><br />
                      <strong>Complaint ID:</strong> {complaint.complaint_number}<br />
                      <strong>Customer Name:</strong> {complaint.customer.first_name} {complaint.customer.last_name}<br />
                      <strong>Issue Type:</strong> {complaint.category.replace('_', ' ')}<br />
                      <strong>Priority:</strong> {complaint.priority}<br />
                      <strong>Location:</strong> {complaint.location || complaint.pincode || 'Not specified'}
                    </p>
                    <button
                      onClick={() => setComment(`Thank you for sharing your complaint details! I've reviewed your ${complaint.category.toLowerCase().replace('_', ' ')} issue. Let me help you resolve this right away.\n\nComplaint ID: ${complaint.complaint_number}\nCustomer Name: ${complaint.customer.first_name} ${complaint.customer.last_name}\nIssue Type: ${complaint.category.replace('_', ' ')}\nPriority: ${complaint.priority}\nLocation: ${complaint.location || complaint.pincode || 'Not specified'}`)}
                      className="text-xs text-[#1da9c3] hover:text-[#178a9f] font-medium"
                    >
                      Use this message
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
              {complaint.comments?.map((c: any) => (
                <div key={c.id} className={`flex gap-3 ${c.user.id === user?.id ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center dark:text-white">
                    {c.user.first_name[0]}
                  </div>
                  <div className={`flex-1 ${c.user.id === user?.id ? 'text-right' : ''}`}>
                    <div className={`inline-block px-4 py-2 rounded-lg ${c.user.id === user?.id ? 'bg-[#1da9c3] text-white' : 'bg-gray-100 dark:bg-gray-700 dark:text-white'
                      }`}>
                      <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(c.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Type a message"
                rows={3}
                className="flex-1 px-4 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 resize-none"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && comment) {
                    e.preventDefault();
                    commentMutation.mutate(comment);
                  }
                }}
              />
              <button
                onClick={() => {
                  if (comment && !commentMutation.isPending) {
                    commentMutation.mutate(comment);
                  }
                }}
                disabled={!comment || commentMutation.isPending}
                className="px-4 py-2 bg-[#1da9c3] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-[#178a9f] transition-colors self-end"
              >
                {commentMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          {isAgent && complaint.status !== 'RESOLVED' && (
            <div className="space-y-4">
              {/* Proof of Work Upload */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h3 className="font-medium text-yellow-900 dark:text-yellow-200 mb-2">Proof of Work Required</h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
                  Please upload proof of work (photos, documents, etc.) before marking this case as resolved.
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#1da9c3] file:text-white hover:file:bg-[#178a9f]"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (resolveMutation.isPending) return;
                    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                    if (!fileInput?.files?.length) {
                      alert('Please upload proof of work before resolving the case.');
                      return;
                    }
                    const notes = prompt('Enter resolution notes:');
                    if (notes) {
                      const formData = new FormData();
                      formData.append('resolution_notes', notes);
                      Array.from(fileInput.files).forEach(file => {
                        formData.append('resolution_files', file);
                      });
                      try {
                        await complaintsService.resolveWithFiles(params.id, formData);
                        queryClient.invalidateQueries({ queryKey: ['complaint', params.id] });
                        alert('Complaint resolved successfully');
                      } catch (error: any) {
                        alert(error.response?.data?.detail || 'Failed to resolve complaint');
                      }
                    }
                  }}
                  disabled={resolveMutation.isPending}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {resolveMutation.isPending ? 'Resolving...' : 'Mark as Resolved'}
                </button>
              </div>
            </div>
          )}
          {isAdmin && complaint.status === 'OPEN' && !complaint.assigned_to && (
            <div className="space-y-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-4">Admin Actions</h3>

              {/* Assign Agent */}
              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-white">Assign to Agent</label>
                <div className="flex gap-2">
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="flex-1 px-4 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select an agent</option>
                    {Array.isArray(agents) && agents.map((agent: any) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.first_name} {agent.last_name} ({agent.service_type || 'General'})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (selectedAgent && !assignMutation.isPending) {
                        assignMutation.mutate(selectedAgent);
                        setSelectedAgent('');
                      }
                    }}
                    disabled={!selectedAgent || assignMutation.isPending}
                    className="px-6 py-2 bg-[#1da9c3] text-white rounded-lg font-medium hover:bg-[#178a9f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {assignMutation.isPending ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              </div>

              {/* Change Priority */}
              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-white">Update Priority</label>
                <div className="flex gap-2">
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="flex-1 px-4 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select priority level</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                  <button
                    onClick={() => {
                      if (selectedPriority && !updatePriorityMutation.isPending) {
                        updatePriorityMutation.mutate(selectedPriority);
                      }
                    }}
                    disabled={!selectedPriority || updatePriorityMutation.isPending}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {updatePriorityMutation.isPending ? 'Updating...' : 'Update Priority'}
                  </button>
                </div>
              </div>

              {/* Resolution Notes */}
              <div>
                <label className="block text-sm font-semibold mb-2 dark:text-white">Resolution Notes</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  placeholder="Enter resolution notes..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (resolveMutation.isPending) return;
                    const notes = resolutionNotes || prompt('Enter resolution notes:');
                    if (notes) resolveMutation.mutate(notes);
                  }}
                  disabled={resolveMutation.isPending}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {resolveMutation.isPending ? 'Resolving...' : 'Mark as Resolved'}
                </button>
              </div>
            </div>
          )}

          {/* Admin override resolution for assigned/in-progress tickets if needed */}
          {isAdmin && (complaint.status === 'IN_PROGRESS' || (complaint.status === 'OPEN' && complaint.assigned_to)) && (
            <div className="bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-lg p-6">
              <h3 className="font-semibold text-slate-900 dark:text-slate-200 mb-2">Complaint Status</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                This complaint is currently being handled by **{complaint.assigned_to?.first_name} {complaint.assigned_to?.last_name}**.
                Direct admin actions are disabled while the agent is working on it.
              </p>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to unassign the current agent and reset this complaint?')) {
                    assignMutation.mutate(''); // Pass empty string or null to unassign if logic allows
                  }
                }}
                className="text-sm text-red-600 hover:underline"
              >
                Change Assignment
              </button>
            </div>
          )}


          {(complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') && complaint.can_reopen && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="font-medium text-orange-900 dark:text-orange-200 mb-2">Reopen Case Window</h3>
                  <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
                    This case can be reopened within 30 days of resolution if the same issue reproduces.
                    {complaint.resolved_at && (
                      <span className="block mt-1">
                        Resolved: {new Date(complaint.resolved_at).toLocaleDateString()}
                        (Window expires: {new Date(new Date(complaint.resolved_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()})
                      </span>
                    )}
                  </p>
                  <button
                    onClick={() => {
                      if (reopenMutation.isPending) return;
                      const reason = prompt('Reason for reopening (required for same issue reproduction):');
                      if (reason !== null && reason.trim()) {
                        reopenMutation.mutate(reason);
                      } else if (reason !== null) {
                        alert('Please provide a reason for reopening the case.');
                      }
                    }}
                    disabled={reopenMutation.isPending}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {reopenMutation.isPending ? 'Reopening...' : 'Reopen Case (Same Issue)'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Complaint Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
            <h3 className="text-lg font-bold mb-4 dark:text-white">Timeline</h3>
            <div className="space-y-4">
              <TimelineItem
                title="Complaint Received"
                time={new Date(complaint.created_at).toLocaleString()}
              />
              {complaint.assigned_to && (
                <TimelineItem
                  title="Agent Assigned"
                  time={new Date(complaint.updated_at).toLocaleString()}
                />
              )}
              {complaint.status === 'RESOLVED' && (
                <TimelineItem
                  title="Resolution Proposed"
                  time={complaint.resolved_at ? new Date(complaint.resolved_at).toLocaleString() : 'N/A'}
                />
              )}
            </div>
          </div>

          {/* Internal Notes - Only for Agents/Admins */}
          {isAgent && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
              <h3 className="font-semibold mb-2 text-yellow-900 dark:text-yellow-200">Internal Notes</h3>
              <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3 whitespace-pre-wrap">
                {complaint.resolution_notes || 'No internal notes yet'}
              </p>
              {complaint.status !== 'RESOLVED' && (
                <button
                  onClick={async () => {
                    const note = prompt('Enter internal note (only visible to agents/admins):');
                    if (note) {
                      try {
                        const currentNotes = complaint.resolution_notes || '';
                        const newNotes = currentNotes ? `${currentNotes}\n\n${new Date().toLocaleString()}: ${note}` : `${new Date().toLocaleString()}: ${note}`;
                        await complaintsService.update(complaint.id, { resolution_notes: newNotes });
                        queryClient.invalidateQueries({ queryKey: ['complaint', params.id] });
                        alert('Internal note added successfully');
                      } catch (error) {
                        console.error('Error adding note:', error);
                        alert('Failed to add internal note');
                      }
                    }
                  }}
                  className="text-sm text-yellow-900 dark:text-yellow-200 underline hover:text-yellow-700 dark:hover:text-yellow-300"
                >
                  Add a private note
                </button>
              )}
            </div>
          )}

          {/* Feedback Section - For Customers */}
          {user?.role === 'CUSTOMER' && (complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') && (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="font-semibold mb-2 dark:text-white flex items-center gap-2">
                <Star className="text-yellow-500" size={20} />
                Share Your Feedback
              </h3>
              {complaint.feedback ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Overall Rating: {complaint.feedback.rating}/5 ⭐
                  </p>
                  {complaint.feedback.comment && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                      "{complaint.feedback.comment}"
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Thank you for your feedback!
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                    Help us improve by sharing your experience with this service resolution.
                  </p>
                  <button
                    onClick={() => setShowFeedbackForm(true)}
                    className="w-full sankey-gradient text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Star size={20} />
                    Submit Feedback
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Feedback Form Modal */}
      {showFeedbackForm && complaint && (
        <FeedbackForm
          complaint={{
            id: complaint.id,
            complaint_number: complaint.complaint_number,
            title: complaint.title,
            status: complaint.status,
            resolved_at: complaint.resolved_at,
            assigned_to: complaint.assigned_to,
          }}
          onClose={() => setShowFeedbackForm(false)}
          onSuccess={() => {
            setShowFeedbackForm(false);
            queryClient.invalidateQueries({ queryKey: ['complaint', params.id] });
            alert('Thank you for your feedback!');
          }}
        />
      )}
    </div>
  );
}

export default function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  return <ComplaintDetailPageContent params={resolvedParams} />;
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
    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${colors[status]}`}>
      {status}
    </span>
  );
}

function TimelineItem({ title, time }: { title: string; time: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-2"></div>
      <div>
        <p className="font-medium text-sm dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{time}</p>
      </div>
    </div>
  );
}
