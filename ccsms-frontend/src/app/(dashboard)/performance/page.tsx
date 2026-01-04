'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/lib/api/services/analytics.service';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Star, MessageSquare, User, TrendingUp, Award, Target, Clock, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export default function PerformancePage() {
  const { user } = useAuthStore();
  const [dateRange, setDateRange] = useState('30');

  const { data: feedback, isLoading } = useQuery({
    queryKey: ['feedback-analysis', dateRange],
    queryFn: () => analyticsService.getFeedbackAnalysis(dateRange),
    enabled: !!user,
  });

  const { data: agentPerformance } = useQuery({
    queryKey: ['agent-performance', dateRange],
    queryFn: () => analyticsService.getAgentPerformance(dateRange),
    enabled: user?.role === 'ADMIN',
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1da9c3]"></div>
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';

  // Calculate stats
  const avgRating = feedback?.length > 0 
    ? (feedback.reduce((sum: number, f: any) => sum + (f.agent_rating || f.rating), 0) / feedback.length).toFixed(1)
    : '0.0';
  
  const totalFeedback = feedback?.length || 0;
  const positiveCount = feedback?.filter((f: any) => (f.agent_rating || f.rating) >= 4).length || 0;
  const positiveRate = totalFeedback > 0 ? Math.round((positiveCount / totalFeedback) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">
            {isAdmin ? 'Agent Performance Analysis' : 'My Performance'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isAdmin ? 'Monitor team performance and customer satisfaction' : 'Track your ratings and customer feedback'}
          </p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Star size={24} className="opacity-80" />
            <span className="text-sm opacity-80">Rating</span>
          </div>
          <div className="text-3xl font-bold mb-1">{avgRating}</div>
          <div className="text-sm opacity-90">Average Rating</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle size={24} className="opacity-80" />
            <span className="text-sm opacity-80">Positive</span>
          </div>
          <div className="text-3xl font-bold mb-1">{positiveRate}%</div>
          <div className="text-sm opacity-90">Satisfaction Rate</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare size={24} className="opacity-80" />
            <span className="text-sm opacity-80">Total</span>
          </div>
          <div className="text-3xl font-bold mb-1">{totalFeedback}</div>
          <div className="text-sm opacity-90">Feedback Received</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Award size={24} className="opacity-80" />
            <span className="text-sm opacity-80">Rank</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {avgRating >= '4.5' ? 'A+' : avgRating >= '4.0' ? 'A' : avgRating >= '3.5' ? 'B' : 'C'}
          </div>
          <div className="text-sm opacity-90">Performance Grade</div>
        </div>
      </div>

      {/* Agent Performance Table (Admin Only) */}
      {isAdmin && agentPerformance && agentPerformance.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold dark:text-white">Team Performance Overview</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Agent</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Assigned</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Resolved</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Rating</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {agentPerformance.map((agent: any) => {
                  const rating = agent.customer_satisfaction_avg || 0;
                  const grade = rating >= 4.5 ? 'A+' : rating >= 4.0 ? 'A' : rating >= 3.5 ? 'B' : 'C';
                  return (
                    <tr key={agent.agent_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#1da9c3] rounded-full flex items-center justify-center text-white font-medium">
                            {agent.agent_name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-medium dark:text-white">{agent.agent_name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{agent.agent_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium dark:text-white">{agent.total_assigned}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">{agent.resolved_count}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star size={14} className="fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium dark:text-white">{rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          grade === 'A+' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          grade === 'A' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          grade === 'B' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {grade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feedback List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="p-6 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-white">Customer Feedback</h2>
        </div>
        <div className="divide-y dark:divide-gray-700">
          {feedback && feedback.length > 0 ? (
            feedback.map((fb: any) => (
              <div key={fb.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#1da9c3] to-[#1dc3e3] rounded-full flex items-center justify-center text-white font-bold">
                      {fb.customer_name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-semibold dark:text-white">{fb.customer_name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Complaint #{fb.complaint_number}
                        {isAdmin && <span className="ml-2">• Agent: {fb.agent_name}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          className={star <= (fb.agent_rating || fb.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(fb.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {fb.comment && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{fb.comment}"</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400">
              <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
              <p>No feedback available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
