'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Bell, Smartphone, Mail, Monitor, Volume2 } from 'lucide-react';
import RecentNotifications from '@/components/dashboard/RecentNotifications';

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState({
    push_notifications: true,
    email_notifications: true,
    sms_notifications: false,
    desktop_notifications: true,
    sound_alerts: true,
  });

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [activeTab, setActiveTab] = useState<'activity' | 'settings'>('activity');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        new Notification('ResolveFast Notifications', {
          body: 'You will now receive real-time notifications!',
          icon: '/favicon.ico'
        });
      }
    }
  };

  const updateSetting = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'activity'
                ? 'bg-white dark:bg-gray-700 text-[#1da9c3] shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            Recent Activity
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'settings'
                ? 'bg-white dark:bg-gray-700 text-[#1da9c3] shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            Settings
          </button>
        </div>
      </div>

      {activeTab === 'activity' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold dark:text-white">Activity History</h2>
            <button className="text-sm text-[#1da9c3] hover:underline">Mark all as read</button>
          </div>
          <RecentNotifications />
        </div>
      ) : (
        <>
          {/* Permission Status */}
          <div className={`p-4 rounded-lg border ${permission === 'granted' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
              permission === 'denied' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-medium ${permission === 'granted' ? 'text-green-800 dark:text-green-200' :
                    permission === 'denied' ? 'text-red-800 dark:text-red-200' :
                      'text-yellow-800 dark:text-yellow-200'
                  }`}>
                  Browser Notifications: {permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Not Enabled'}
                </h3>
                <p className={`text-sm ${permission === 'granted' ? 'text-green-600 dark:text-green-300' :
                    permission === 'denied' ? 'text-red-600 dark:text-red-300' :
                      'text-yellow-600 dark:text-yellow-300'
                  }`}>
                  {permission === 'granted' ? 'You will receive real-time notifications' :
                    permission === 'denied' ? 'Notifications are blocked. Please enable in browser settings.' :
                      'Click to enable real-time notifications'}
                </p>
              </div>
              {permission !== 'granted' && (
                <button
                  onClick={requestNotificationPermission}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Enable Notifications
                </button>
              )}
            </div>
          </div>

          {/* Notification Channels */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold dark:text-white mb-4">Notification Channels</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Monitor className="text-[#1da9c3]" size={24} />
                  <div>
                    <h3 className="font-medium dark:text-white">Push Notifications</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Real-time browser notifications</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.push_notifications}
                    onChange={(e) => updateSetting('push_notifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1da9c3]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="text-blue-500" size={24} />
                  <div>
                    <h3 className="font-medium dark:text-white">Email Notifications</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Email alerts for important updates</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.email_notifications}
                    onChange={(e) => updateSetting('email_notifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1da9c3]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Smartphone className="text-green-500" size={24} />
                  <div>
                    <h3 className="font-medium dark:text-white">SMS Notifications</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Text messages for critical alerts</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.sms_notifications}
                    onChange={(e) => updateSetting('sms_notifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1da9c3]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Volume2 className="text-purple-500" size={24} />
                  <div>
                    <h3 className="font-medium dark:text-white">Sound Alerts</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Audio notifications for new events</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.sound_alerts}
                    onChange={(e) => updateSetting('sound_alerts', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1da9c3]"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => alert('Notification settings saved successfully!')}
              className="px-6 py-2 bg-[#1da9c3] text-white rounded-lg hover:bg-[#178a9f]"
            >
              Save Settings
            </button>
          </div>
        </>
      )}
    </div>
  );
}