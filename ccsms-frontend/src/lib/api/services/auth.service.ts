import api from '../axios';

export const authService = {
  register: async (data: {
    email: string;
    password: string;
    confirm_password: string;
    first_name: string;
    last_name: string;
    phone: string;
    role: string;
    pincode?: string;
    service_type?: string;
    service_card_id?: string;
  }) => {
    const response = await api.post('/auth/register/', data);
    return response.data;
  },

  login: async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login/', { email, password });
      return response.data;
    } catch (error: any) {
      console.error('Login error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
      throw error;
    }
  },

  logout: async () => {
    const response = await api.post('/auth/logout/');
    return response.data;
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    const response = await api.post('/auth/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  },
};
