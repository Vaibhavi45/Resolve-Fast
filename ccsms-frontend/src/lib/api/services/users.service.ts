import api from '../axios';

export const usersService = {
  getProfile: async () => {
    const response = await api.get('/users/me/');
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await api.put('/users/me/', data);
    return response.data;
  },

  getById: async (id: string | number) => {
    const response = await api.get(`/users/${id}/`);
    return response.data;
  },

  update: async (id: string | number, data: any) => {
    const response = await api.put(`/users/${id}/`, data);
    return response.data;
  },

  getAll: async (params?: any) => {
    const response = await api.get('/users/', { params });
    return response.data;
  },

  getAgents: async () => {
    const response = await api.get('/users/agents/');
    return response.data.results || response.data;
  },
};
