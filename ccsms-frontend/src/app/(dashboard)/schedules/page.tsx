'use client';

import { useState } from 'react';
import { Calendar, TrendingUp, MapPin, Users, Trash2 } from 'lucide-react';

export default function SchedulesPage() {
  const [schedules] = useState([
    {
      id: 1,
      name: 'Trend Analysis',
      type: 'trends',
      frequency: 'weekly',
      time: '09:00',
      day: 'Monday',
      email: 'admin@example.com',
      status: 'active',
      nextRun: '2025-12-16T09:00:00Z',
      icon: TrendingUp,
      color: 'green'
    },
    {
      id: 2,
      name: 'Location Hotspots',
      type: 'hotspots',
      frequency: 'monthly',
      time: '09:00',
      day: '1st',
      email: 'admin@example.com',
      status: 'active',
      nextRun: '2025-01-01T09:00:00Z',
      icon: MapPin,
      color: 'blue'
    },
    {
      id: 3,
      name: 'Agent Performance',
      type: 'performance',
      frequency: 'weekly',
      time: '10:00',
      day: 'Friday',
      email: 'admin@example.com',
      status: 'paused',
      nextRun: '2025-12-20T10:00:00Z',
      icon: Users,
      color: 'purple'
    }
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Scheduled Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage automated report schedules</p>
        </div>
        <button className="px-4 py-2 bg-[#1da9c3] text-white rounded-lg hover:bg-[#178a9f] flex items-center gap-2">
          <Calendar size={16} />
          New Schedule
        </button>
      </div>

      <div className="grid gap-4">
        {schedules.map((schedule) => {
          const IconComponent = schedule.icon;
          const bgColor = schedule.color === 'green' ? 'bg-green-500' : 
                         schedule.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500';
          const statusColor = schedule.status === 'active' ? 'text-green-600' : 'text-yellow-600';
          
          return (
            <div key={schedule.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${bgColor} rounded-full flex items-center justify-center`}>
                    <IconComponent className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold dark:text-white">{schedule.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)} • {schedule.day} at {schedule.time}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Next run: {new Date(schedule.nextRun).toLocaleDateString()} at {schedule.time}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`text-sm font-medium ${statusColor}`}>
                      {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      To: {schedule.email}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      className={`px-3 py-1 text-sm rounded ${
                        schedule.status === 'active' 
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {schedule.status === 'active' ? 'Pause' : 'Resume'}
                    </button>
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold dark:text-white mb-4">Schedule Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">2</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active Schedules</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">1</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Paused Schedules</div>
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">12</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Reports Sent This Month</div>
          </div>
        </div>
      </div>
    </div>
  );
}