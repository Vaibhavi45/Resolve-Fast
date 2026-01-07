'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/lib/api/services/analytics.service';
import { complaintsService } from '@/lib/api/services/complaints.service';
import { reportsService } from '@/lib/api/services/reports.service';
import { useAuthStore } from '@/lib/stores/auth.store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, Users, Clock, FileText, Calendar, Download, Star, Bell, User, CheckSquare } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import Chatbot from '@/components/Chatbot';
import RecentNotifications from '@/components/dashboard/RecentNotifications';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [downloading, setDownloading] = useState(false);

  // Fetch real data
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => analyticsService.getDashboardStats(),
    staleTime: 30000, // 30 seconds
    enabled: !!user, // Only fetch when user is authenticated
  });

  const { data: complaints } = useQuery({
    queryKey: ['complaints'],
    queryFn: () => complaintsService.getComplaints(),
    enabled: user?.role === 'CUSTOMER',
  });

  const { data: categoryData } = useQuery({
    queryKey: ['complaints-by-category'],
    queryFn: () => analyticsService.getComplaintsByCategory('30'),
    enabled: user?.role === 'ADMIN',
  });

  const { data: volumeData } = useQuery({
    queryKey: ['complaints-volume'],
    queryFn: () => analyticsService.getComplaintsVolume('7'),
    enabled: user?.role === 'ADMIN',
  });

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const blob = await reportsService.generateReport({ date_range: '30' });
      const filename = `complaints-report-${new Date().toISOString().split('T')[0]}.csv`;
      reportsService.downloadReport(blob, filename);
    } catch (error) {
      alert('Failed to generate report');
    } finally {
      setDownloading(false);
    }
  };

  if (user?.role === 'ADMIN') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Admin Dashboard</h1>
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
              <span className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full"></span>
              All systems operational
            </p>
          </div>
        </div>

        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="COMPLAINTS"
            value={stats?.total_complaints || 0}
            change="+7.4% this week"
            icon={<FileText className="text-blue-600 dark:text-blue-400" />}
            trend="up"
          />
          <StatCard
            title="AVG TIME"
            value={stats?.avg_resolution_time ? `${Math.floor(stats.avg_resolution_time / 60)}h ${stats.avg_resolution_time % 60}m` : '0h 0m'}
            change="Resolution time"
            icon={<Clock className="text-blue-600 dark:text-blue-400" />}
          />
          <StatCard
            title="SLA BREACHES"
            value={stats?.sla_breaches || 0}
            change="-2.1% vs last week"
            icon={<AlertTriangle className="text-red-600 dark:text-red-400" />}
            trend="down"
            alert
          />
          <StatCard
            title="ACTIVE AGENTS"
            value={stats?.active_agents || 0}
            change="Currently active"
            icon={<Users className="text-blue-600 dark:text-blue-400" />}
          />
        </div>

        {/* Complaint Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold dark:text-white">Complaint Trends</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Volume over time</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-sm bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 border border-blue-600 dark:border-blue-500 rounded">Month</button>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-3xl font-bold dark:text-white">{stats?.total_complaints || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total complaints
            </div>
          </div>

          {volumeData && volumeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={volumeData.slice(-7).map((item: any) => ({
                  name: item.day,
                  value: item.count,
                  date: item.date
                }))}
                margin={{ top: 10, right: 30, left: -10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#999" />
                <YAxis
                  stroke="#999"
                  domain={[0, 10]}
                  ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                  allowDecimals={false}
                />
                <Tooltip labelFormatter={(label, payload) => {
                  const data = payload?.[0]?.payload;
                  return data ? `${label} (${data.date})` : label;
                }} />
                <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500">
              Loading chart data...
            </div>
          )}
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold dark:text-white mb-4">What channels do our customers use most?</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Web</span>
                  <span className="text-sm font-semibold dark:text-white">65%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-[#1da9c3] h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Email</span>
                  <span className="text-sm font-semibold dark:text-white">25%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-[#1da9c3] h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">SMS</span>
                  <span className="text-sm font-semibold dark:text-white">10%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-[#1da9c3] h-2 rounded-full" style={{ width: '10%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold dark:text-white mb-4">First reply time</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">How long customers wait before getting their first response</p>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#1da9c3] mb-2">2.5h</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Average first response time</p>
              <div className="mt-4 flex justify-center gap-4 text-sm">
                <div>
                  <div className="text-lg font-semibold text-green-600 dark:text-green-400">1.2h</div>
                  <div className="text-gray-500 dark:text-gray-400">Best</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-red-600 dark:text-red-400">4.8h</div>
                  <div className="text-gray-500 dark:text-gray-400">Worst</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold dark:text-white mb-4">Monitor team's progress over time</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-[#1da9c3] mb-1">{stats?.active_agents || 0}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Your Active Cases</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">{stats?.resolved || 2}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Resolved This Week</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">92%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Customer Satisfaction</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">3.2h</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Resolution Time</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recurring Issues */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold dark:text-white">Recurring Issues</h2>
              <Link href="/analytics" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {categoryData && categoryData.length > 0 ? (
                categoryData.slice(0, 3).map((cat: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <FileText size={20} className="dark:text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium dark:text-white">{cat.category.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{cat.count} complaints</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 dark:text-gray-500 text-center py-4">No recurring issues</p>
              )}
            </div>
          </div>

          {/* Reporting */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Reporting</h2>
            <div className="space-y-3">
              <button
                onClick={handleDownloadReport}
                disabled={downloading}
                className="w-full flex items-center gap-3 p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 dark:text-white"
              >
                <Download size={20} />
                <span className="font-medium">{downloading ? 'Generating...' : 'Generate Report'}</span>
              </button>
              <Link href="/analytics" className="w-full flex items-center gap-3 p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white">
                <Calendar size={20} />
                <span className="font-medium">View Analytics</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Customer/Agent Dashboard
  const complaintsList = Array.isArray(complaints) ? complaints : (complaints?.results || []);
  const resolvedComplaints = complaintsList.filter((c: any) =>
    (c.status === 'RESOLVED' || c.status === 'CLOSED') && !c.feedback
  );
  const recentComplaints = complaintsList.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.first_name}!
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Here's your overview for today</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {user?.role === 'CUSTOMER' && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Total</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.total_complaints || 0}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Complaints</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <FileText size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Open</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.open || 0}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Cases</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                  <AlertTriangle size={24} className="text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">In Progress</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.in_progress || 0}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Cases</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <Clock size={24} className="text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Resolved</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.resolved || 0}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Cases</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <TrendingUp size={24} className="text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
          </>
        )}

        {user?.role === 'AGENT' && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Assigned</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.assigned_cases || 0}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Cases</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <FileText size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Pending</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.pending || 0}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Cases</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                  <Clock size={24} className="text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Resolved</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.resolved_today || 0}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Today</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <TrendingUp size={24} className="text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">SLA</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.sla_compliance_rate || 0}%</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Compliance</p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Complaints */}
          {recentComplaints.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h3>
                <Link href="/complaints" className="text-sm text-[#1da9c3] hover:underline font-medium">View All</Link>
              </div>
              <div className="space-y-4">
                {recentComplaints.map((complaint: any) => (
                  <Link key={complaint.id} href={`/complaints/${complaint.id}`} className="block p-4 border dark:border-gray-700 rounded-lg hover:border-[#1da9c3] dark:hover:border-[#1da9c3] transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#1da9c3]">{complaint.complaint_number}</p>
                        <p className="text-base font-semibold text-gray-900 dark:text-white mt-1">{complaint.title}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${complaint.status === 'OPEN' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                        complaint.status === 'IN_PROGRESS' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                          complaint.status === 'RESOLVED' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                        {complaint.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${complaint.priority === 'CRITICAL' ? 'bg-red-500' :
                          complaint.priority === 'HIGH' ? 'bg-orange-500' :
                            complaint.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}></span>
                        {complaint.priority}
                      </span>
                      <span>•</span>
                      <span>{complaint.category.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Notifications */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-5">
              <Bell size={20} className="text-[#1da9c3]" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Updates</h3>
            </div>
            <RecentNotifications />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Feedback Card */}
          {user?.role === 'CUSTOMER' && resolvedComplaints.length > 0 && (
            <div className="bg-[#1da9c3] rounded-xl p-6 text-white shadow-lg border border-[#178a9f]">
              <Star size={28} fill="currentColor" className="mb-3" />
              <h3 className="text-lg font-bold mb-2">Rate Your Experience</h3>
              <p className="text-sm text-blue-100 mb-4">
                {resolvedComplaints.length} case{resolvedComplaints.length > 1 ? 's' : ''} waiting for your feedback
              </p>
              <Link
                href={`/complaints/${resolvedComplaints[0].id}`}
                className="block w-full text-center py-3 bg-white text-[#1da9c3] rounded-lg font-bold hover:bg-gray-50 transition-colors"
              >
                Submit Feedback
              </Link>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {user?.role === 'CUSTOMER' && (
                <Link href="/complaints/new" className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-100 dark:border-blue-900/30">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <FileText size={20} className="text-white" />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">New Complaint</span>
                </Link>
              )}
              <Link href="/complaints" className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors border border-green-100 dark:border-green-900/30">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <CheckSquare size={20} className="text-white" />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">My Complaints</span>
              </Link>
              <Link href="/profile" className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors border border-purple-100 dark:border-purple-900/30">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <User size={20} className="text-white" />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">My Profile</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Chatbot for Customers */}
      {user?.role === 'CUSTOMER' && <Chatbot />}
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  icon,
  trend,
  alert
}: {
  title: string;
  value: string | number;
  change?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down';
  alert?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">{title}</div>
          {icon && <div>{icon}</div>}
        </div>
        <div className="flex items-baseline">
          <div className={`text-3xl font-semibold ${alert ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
            {value}
          </div>
        </div>
        {change && (
          <div className={`mt-2 text-sm ${trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
            {change}
          </div>
        )}
      </div>
    </div>
  );
}