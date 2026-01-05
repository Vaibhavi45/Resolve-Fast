import api from '../axios';

export const reportsService = {
  generateReport: async (filters?: any) => {
    const response = await api.get('/analytics/export/', { 
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  },

  downloadReport: (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
