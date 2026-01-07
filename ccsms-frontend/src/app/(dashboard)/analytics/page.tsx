'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/lib/api/services/analytics.service';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useState } from 'react';
import { TrendingUp, Download, Calendar, BarChart3, PieChart, FileText, Clock } from 'lucide-react';

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const [dateRange, setDateRange] = useState('30');
  const [reportType, setReportType] = useState('all');
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly');

  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => analyticsService.getDashboardStats(),
    enabled: user?.role === 'ADMIN',
  });

  const { data: complaintsVolume } = useQuery({
    queryKey: ['complaints-volume', dateRange],
    queryFn: () => analyticsService.getComplaintsVolume(dateRange),
    enabled: user?.role === 'ADMIN',
  });

  const { data: categoryData } = useQuery({
    queryKey: ['complaints-by-category', dateRange],
    queryFn: () => analyticsService.getComplaintsByCategory(dateRange),
    enabled: user?.role === 'ADMIN',
  });

  const { data: trends } = useQuery({
    queryKey: ['trends', dateRange],
    queryFn: () => analyticsService.getTrends(dateRange),
    enabled: user?.role === 'ADMIN',
  });

  const handleExportReport = async () => {
    try {
      const blob = await analyticsService.exportReport(dateRange);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `complaints-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      alert('Report exported successfully');
    } catch (error: any) {
      alert(error?.message || 'Failed to export report');
    }
  };

  const handleScheduleReport = async () => {
    try {
      const result = await analyticsService.scheduleReport({
        type: reportType,
        frequency: scheduleFrequency,
        email: user?.email
      });
      alert(result.message || 'Report scheduled successfully');
    } catch (error: any) {
      alert(error?.response?.data?.message || error?.message || 'Failed to schedule report');
    }
  };

  if (user?.role !== 'ADMIN') {
    return <div className="text-center py-10 text-red-600 dark:text-red-400">Access denied</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics & Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Insights and trends from complaint data</p>
      </div>

      {/* Filter & Export Bar */}
      <div className="flex items-center gap-3">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1da9c3] transition-all"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <button
          onClick={handleExportReport}
          className="px-4 py-2 bg-[#1da9c3] text-white rounded-lg hover:bg-[#178a9f] flex items-center gap-2 transition-colors"
        >
          <Download size={18} />
          Export
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{dashboardStats?.total_complaints || 0}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Complaints</p>
            </div>
            <BarChart3 size={32} className="text-blue-500 opacity-80" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">SLA</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{dashboardStats?.sla_breaches || 0}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Breaches</p>
            </div>
            <TrendingUp size={32} className="text-orange-500 opacity-80" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Resolved</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{dashboardStats?.resolved || 0}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Cases</p>
            </div>
            <FileText size={32} className="text-green-500 opacity-80" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Active</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{dashboardStats?.open || 0}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Open Cases</p>
            </div>
            <Clock size={32} className="text-purple-500 opacity-80" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Complaints Volume Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold dark:text-white">Complaints Volume</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last {dateRange} days trend</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-[#1da9c3]">{dashboardStats?.total_complaints || 0}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
            </div>
          </div>
          <div className="h-64">
            {complaintsVolume && complaintsVolume.length > 0 ? (
              <div className="h-full flex flex-col">
                {/* Y-axis labels */}
                <div className="flex-1 flex">
                  <div className="w-8 flex flex-col justify-between text-[10px] text-gray-500 dark:text-gray-400 pr-2 pb-2">
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((val) => (
                      <div key={val}>{val}</div>
                    ))}
                  </div>
                  {/* Chart bars */}
                  <div className="flex-1 flex items-end justify-between gap-2 border-l border-b dark:border-gray-700 pl-2 pb-2">
                    {complaintsVolume.slice(-7).map((item: any, idx: number) => {
                      const maxCount = 10;
                      const height = ((item.count || 0) / maxCount) * 100;

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center group h-full justify-end">
                          <div
                            className="bg-gradient-to-t from-[#1da9c3] to-[#1dc3e3] w-full rounded-t transition-all hover:from-[#178a9f] hover:to-[#1da9c3] cursor-pointer relative flex items-center justify-center min-h-[4px]"
                            style={{ height: `${Math.min(height, 100)}%` }}
                          >
                            <span className="text-white font-semibold text-[10px]">{item.count}</span>
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {new Date(item.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* X-axis labels */}
                <div className="flex ml-8 mt-2">
                  {complaintsVolume.slice(-7).map((item: any, idx: number) => {
                    const date = new Date(item.date);
                    const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
                    return (
                      <div key={idx} className="flex-1 text-center text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {dayLabel}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">No data available</div>
            )}
          </div>
        </div>

        {/* Trending Issues */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-red-500" />
            <h3 className="text-lg font-bold dark:text-white">Trending Issues</h3>
          </div>
          {trends && trends.recurring_issues && trends.recurring_issues.length > 0 ? (
            <div className="space-y-3">
              {trends.recurring_issues.slice(0, 5).map((issue: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm dark:text-white truncate">{issue.category.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {issue.resolved} resolved • {issue.count - issue.resolved} pending
                    </p>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-xl font-bold text-red-600 dark:text-red-400">{issue.count}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <TrendingUp size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">No trending issues</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Category */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={20} className="text-[#1da9c3]" />
            <h3 className="text-lg font-bold dark:text-white">By Category</h3>
          </div>
          <div className="space-y-3">
            {categoryData && categoryData.length > 0 ? (
              categoryData.map((cat: any, idx: number) => {
                const colors = ['bg-[#1da9c3]', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500'];
                const total = categoryData.reduce((sum: number, c: any) => sum + c.count, 0);
                const percentage = total > 0 ? Math.round((cat.count / total) * 100) : 0;
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 ${colors[idx]} rounded-full`}></div>
                        <span className="text-sm font-medium dark:text-gray-300">{cat.category.replace('_', ' ')}</span>
                      </div>
                      <span className="text-sm font-bold dark:text-white">{cat.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className={`${colors[idx]} h-2 rounded-full transition-all`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-400">No data available</div>
            )}
          </div>
        </div>

        {/* Schedule Report */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={20} className="text-[#1da9c3]" />
            <h3 className="text-lg font-bold dark:text-white">Schedule Reports</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium dark:text-white mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1da9c3]"
              >
                <option value="all">All Reports</option>
                <option value="trends">Trend Analysis</option>
                <option value="performance">Agent Performance</option>
                <option value="sla">SLA Compliance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium dark:text-white mb-2">Frequency</label>
              <div className="flex gap-2">
                {['daily', 'weekly', 'monthly'].map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setScheduleFrequency(freq)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${scheduleFrequency === freq
                        ? 'bg-[#1da9c3] text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleScheduleReport}
              disabled={!reportType}
              className="w-full py-2 bg-[#1da9c3] text-white rounded-lg hover:bg-[#178a9f] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              <Calendar size={16} />
              Schedule Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
