import api from '../axios';

export const notificationsService = {
  getAll: async (params?: any) => {
    const response = await api.get('/notifications/', { params });
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await api.put(`/notifications/${id}/read/`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/mark-all-read/');
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count/');
    return response.data;
  },
};
