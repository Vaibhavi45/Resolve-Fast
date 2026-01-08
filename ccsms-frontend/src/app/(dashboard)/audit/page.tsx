'use client';

import { useQuery } from '@tanstack/react-query';
import { auditService } from '@/lib/api/services/audit.service';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useState } from 'react';
import { Shield, Download, Clock, User, Activity } from 'lucide-react';

export default function AuditPage() {
  const { user } = useAuthStore();
  const [dateRange, setDateRange] = useState('7');

  const [showAllLogs, setShowAllLogs] = useState(false);

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['audit-logs', dateRange],
    queryFn: () => auditService.getAuditLogs(dateRange),
    enabled: user?.role === 'ADMIN',
  });

  // Calculate statistics from real data
  const stats = {
    total: auditLogs?.length || 0,
    active_users: new Set(auditLogs?.map((log: any) => log.user?.email || 'system')).size || 0,
    failed_logins: auditLogs?.filter((log: any) => log.action === 'LOGIN' && log.changes?.success === false).length || 0,
    exports: auditLogs?.filter((log: any) => log.action === 'EXPORT').length || 0,
  };

  const mockRetentionPolicies = [
    { id: 1, resource_type: 'Complaints', retention_days: 2555, is_active: true, auto_delete: false, last_cleanup: '2024-01-15' },
    { id: 2, resource_type: 'Attachments', retention_days: 1825, is_active: true, auto_delete: true, last_cleanup: '2024-01-10' },
    { id: 3, resource_type: 'Audit Logs', retention_days: 365, is_active: true, auto_delete: false, last_cleanup: null },
    { id: 4, resource_type: 'User Data', retention_days: 2190, is_active: true, auto_delete: false, last_cleanup: null },
  ];

  const exportComplianceReport = async (type: string) => {
    try {
      let blob: Blob;
      let filename: string;

      switch (type) {
        case 'data_export':
          blob = await auditService.exportUserData();
          filename = `user-data-export-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'retention':
          blob = await auditService.exportRetentionReport();
          filename = `retention-report-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'access_log':
          blob = await auditService.exportAccessLogs();
          filename = `access-logs-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'gdpr':
          blob = await auditService.exportGDPRReport();
          filename = `gdpr-report-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        default:
          throw new Error('Invalid export type');
      }

      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert(`${type} report exported successfully`);
    } catch (error: any) {
      console.error('Export error:', error);

      let errorMsg = 'Failed to export report';

      if (error?.response?.status === 500) {
        errorMsg = 'Server error occurred. Please check the backend logs.';
      } else if (error?.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error?.message) {
        errorMsg = error.message;
      }

      alert(`Error: ${errorMsg}`);
    }
  };

  if (user?.role !== 'ADMIN') {
    return <div className="text-center py-10 text-red-600 dark:text-red-400">Access denied</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit & Compliance</h1>
      </div>

      <div>
        <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">OVERVIEW</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Actions</span>
              <span className="text-sm text-green-600">+8%</span>
            </div>
            <div className="text-2xl font-bold dark:text-white">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active Users</span>
              <span className="text-sm text-blue-600">#1</span>
            </div>
            <div className="text-2xl font-bold dark:text-white">{stats.active_users}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Failed Logins</span>
              <span className="text-sm text-red-600">{stats.failed_logins > 0 ? '! Alert' : '✓'}</span>
            </div>
            <div className="text-2xl font-bold dark:text-white">{stats.failed_logins}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Data Exports</span>
              <span className="text-sm text-blue-600">↗</span>
            </div>
            <div className="text-2xl font-bold dark:text-white">{stats.exports}</div>
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold dark:text-white uppercase tracking-wider text-[11px] text-slate-500">System Activity Logs</h2>
            <button
              onClick={() => setShowAllLogs(!showAllLogs)}
              className="text-[#1da9c3] text-sm font-medium hover:underline"
            >
              {showAllLogs ? 'Show Less' : 'View All'}
            </button>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-400">
            <span className={dateRange === '1' ? 'text-[#1da9c3] font-bold cursor-pointer' : 'cursor-pointer'} onClick={() => setDateRange('1')}>24h</span>
            <span className={dateRange === '7' ? 'text-[#1da9c3] font-bold cursor-pointer' : 'cursor-pointer'} onClick={() => setDateRange('7')}>7d</span>
            <span className={dateRange === '30' ? 'text-[#1da9c3] font-bold cursor-pointer' : 'cursor-pointer'} onClick={() => setDateRange('30')}>30d</span>
          </div>
        </div>
        <div className="divide-y dark:divide-gray-700">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 animate-pulse">
              Fetching audit trail...
            </div>
          ) : auditLogs && auditLogs.length > 0 ? (
            (showAllLogs ? auditLogs : auditLogs.slice(0, 3)).map((log: any) => (
              <div key={log.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${log.action === 'LOGIN' ? 'bg-blue-500' :
                  log.action === 'UPDATE' ? 'bg-amber-500' :
                    log.action === 'DELETE' ? 'bg-red-500' :
                      log.action === 'CREATE' ? 'bg-green-500' : 'bg-slate-500'
                  }`}>
                  {log.action.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="font-medium dark:text-white text-sm">
                    {log.action === 'LOGIN' ? 'Security access granted' :
                      log.action === 'UPDATE' ? 'Record modified' :
                        log.action === 'DELETE' ? 'Data removal executed' :
                          log.action === 'EXPORT' ? 'CSV Report Generated' : log.action}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    User: {log.user?.email || 'System'}
                  </div>
                </div>
                <div className="text-xs text-gray-400 italic">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">No activity logs for this period</div>
          )}
        </div>
      </div>

      {/* Data Retention Policies */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-white uppercase tracking-wider text-[11px] text-slate-500">Data Retention Policies</h2>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                📄
              </div>
              <div>
                <div className="font-medium dark:text-white text-sm">Complaints Data</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 text-xs">Auto Delete • Enabled</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase">7 Years Retention</div>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 rounded-full font-bold">
              ACTIVE
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs">
                👤
              </div>
              <div>
                <div className="font-medium dark:text-white text-sm">User Personal Data</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 text-xs">Retention • Indefinite</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase">Manual Cleanup Only</div>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 rounded-full font-bold">
              RESTRICTED
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4 uppercase tracking-wider text-[11px]">System Quick Actions</h2>
        <div className="space-y-3">
          <button
            onClick={() => exportComplianceReport('data_export')}
            className="w-full flex items-center justify-between p-4 bg-[#1da9c3] text-white rounded-lg hover:bg-[#178a9f] transition-colors shadow-lg shadow-[#1da9c3]/20"
          >
            <div className="flex items-center gap-3">
              <Download size={20} />
              <div className="text-left">
                <div className="font-medium">Export User Data</div>
                <div className="text-sm opacity-90 text-[11px]">Download all stored personal profiles for a specific user (GDPR Request).</div>
              </div>
            </div>
            <Activity size={18} className="opacity-50" />
          </button>

          <button
            onClick={() => exportComplianceReport('retention')}
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all border-l-4 border-l-blue-500"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Clock className="text-blue-600 dark:text-blue-400" size={16} />
              </div>
              <div className="text-left">
                <div className="font-medium dark:text-white text-sm">Retention Report</div>
                <div className="text-[11px] text-slate-500">Summary of data ageing and scheduled cleanup cycles.</div>
              </div>
            </div>
            <Shield size={18} className="text-slate-300 dark:text-slate-700" />
          </button>

          <button
            onClick={() => exportComplianceReport('access_log')}
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all border-l-4 border-l-green-500"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Shield className="text-green-600 dark:text-green-400" size={16} />
              </div>
              <div className="text-left">
                <div className="font-medium dark:text-white text-sm">View Access Logs</div>
                <div className="text-[11px] text-slate-500">Detailed security log of login attempts and unauthorized access alerts.</div>
              </div>
            </div>
            <Shield size={18} className="text-slate-300 dark:text-slate-700" />
          </button>
        </div>
      </div>
    </div>
  );
}