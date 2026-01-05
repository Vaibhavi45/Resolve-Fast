import api from '../axios';

export const auditService = {
  getAuditLogs: async (dateRange?: string) => {
    const response = await api.get('/audit/', {
      params: {
        ordering: '-timestamp',
        ...(dateRange && { date_range: dateRange })
      }
    });
    return response.data.results || response.data;
  },

  getComplaintAuditLogs: async (complaintId: string) => {
    const response = await api.get(`/audit/complaint/${complaintId}/`);
    return response.data;
  },

  exportUserData: async () => {
    const response = await api.get('/audit/export/user-data/', {
      responseType: 'blob'
    });
    return response.data;
  },

  exportAccessLogs: async () => {
    const response = await api.get('/audit/export/access-logs/', {
      responseType: 'blob'
    });
    return response.data;
  },

  exportRetentionReport: async () => {
    try {
      const response = await api.get('/audit/export/retention-report/', {
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 500) {
        // Try to read error message from blob if it's JSON
        try {
          const text = await error.response.data.text();
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || 'Server error');
        } catch {
          throw new Error('Server error - check backend logs');
        }
      }
      throw error;
    }
  },

  exportGDPRReport: async () => {
    const response = await api.get('/audit/export/gdpr-report/', {
      responseType: 'blob'
    });
    return response.data;
  },
};
