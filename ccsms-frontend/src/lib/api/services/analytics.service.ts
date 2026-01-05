import api from '../axios';

export const analyticsService = {
  getDashboardStats: async () => {
    const response = await api.get('/analytics/dashboard/');
    return response.data;
  },

  getComplaintsByCategory: async (dateRange?: string) => {
    const response = await api.get('/analytics/complaints-by-category/', { params: { date_range: dateRange } });
    return response.data;
  },

  getComplaintsByStatus: async (dateRange?: string) => {
    const response = await api.get('/analytics/complaints-by-status/', { params: { date_range: dateRange } });
    return response.data;
  },

  getComplaintsByPriority: async (dateRange?: string) => {
    const response = await api.get('/analytics/complaints-by-priority/', { params: { date_range: dateRange } });
    return response.data;
  },

  getSLAReport: async (dateRange?: string) => {
    const response = await api.get('/analytics/sla-report/', { params: { date_range: dateRange } });
    return response.data;
  },

  getFeedbackAnalysis: async (dateRange?: string) => {
    const response = await api.get('/analytics/feedback-analysis/', { params: { date_range: dateRange } });
    return response.data;
  },

  getAgentPerformance: async (dateRange?: string) => {
    const response = await api.get('/analytics/agent-performance/', { params: { date_range: dateRange } });
    return response.data;
  },

  exportReport: async (dateRange?: string) => {
    const response = await api.get('/analytics/export/', {
      params: { date_range: dateRange || '30' },
      responseType: 'blob'
    });
    return response.data;
  },

  getTrends: async (dateRange?: string) => {
    const response = await api.get('/analytics/trend-detection/', { params: { date_range: dateRange } });
    return response.data;
  },

  scheduleReport: async (scheduleData: { type: string; frequency: string; email?: string }) => {
    const response = await api.post('/analytics/schedule-report/', scheduleData);
    return response.data;
  },

  getAgentLocations: async () => {
    const response = await api.get('/users/agents/');
    return response.data;
  },

  getComplaintsVolume: async (dateRange?: string) => {
    const response = await api.get('/analytics/complaints-volume/', { params: { date_range: dateRange } });
    return response.data;
  },
};
