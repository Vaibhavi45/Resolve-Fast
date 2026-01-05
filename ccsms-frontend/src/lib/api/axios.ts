import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  if (
    typeof window !== 'undefined' &&
    !config.url?.includes('/auth/register') &&
    !config.url?.includes('/auth/login')
  ) {
    try {
      const authStorage = sessionStorage.getItem('auth-session');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        // Zustand persist stores data as { state: {...}, version: 0 }
        const state = parsed?.state || parsed;
        const token = state?.accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error('Error reading auth token:', error);
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Build details manually to ensure we see them (AxiosError properties are sometimes not enumerable)
    const errorDetails = {
      name: error.name,
      code: error.code || 'N/A',
      message: error.message || 'No message',
      url: originalRequest?.url || 'N/A',
      method: originalRequest?.method?.toUpperCase() || 'N/A',
      status: error.response?.status || 'N/A',
      statusText: error.response?.statusText || 'N/A',
      responseData: error.response?.data,
      timestamp: new Date().toISOString()
    };

    // eslint-disable-next-line no-console
    console.group('🚀 API Error: ' + (originalRequest?.url || 'Unknown URL'));
    // eslint-disable-next-line no-console
    console.error('Error Object:', error);
    // eslint-disable-next-line no-console
    console.dir(errorDetails); // Use console.dir for better object inspection

    if (error.response?.data) {
      if (error.response.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          let serverError = '';
          try {
            const data = JSON.parse(text);
            serverError = data.error || data.detail || text;
          } catch {
            serverError = text.length < 500 ? text : error.response.statusText;
          }
          // eslint-disable-next-line no-console
          console.error('Server Error message:', serverError);
          // eslint-disable-next-line no-console
          console.groupEnd();
          return Promise.reject(new Error(serverError));
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Server Error (Blob unreadable):', error.response.statusText);
        }
      } else {
        const serverError = error.response.data.error || error.response.data.detail || JSON.stringify(error.response.data);
        // eslint-disable-next-line no-console
        console.error('Server Error message:', serverError);
      }
    }
    // eslint-disable-next-line no-console
    console.groupEnd();

    // Handle network errors
    if (
      error.code === 'ECONNABORTED' ||
      error.message === 'Network Error' ||
      !error.response
    ) {
      return Promise.reject(new Error('Network Error: Unable to connect to server'));
    }

    // Handle HTML error pages from backend
    if (error.response?.headers['content-type']?.includes('text/html')) {
      return Promise.reject(new Error(`Server Error (${error.response.status}): The server returned an HTML error page.`));
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const authStorage = sessionStorage.getItem('auth-session');
        if (!authStorage) {
          // No auth data, redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(new Error('Please log in to continue'));
        }

        const parsed = JSON.parse(authStorage);
        // Zustand persist stores data as { state: {...}, version: 0 }
        const state = parsed?.state || parsed;
        if (!state?.refreshToken) {
          // No refresh token, redirect to login
          sessionStorage.removeItem('auth-session');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(new Error('Please log in to continue'));
        }

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/auth/refresh/`,
          { refresh: state.refreshToken }
        );

        const { access } = response.data;
        // Update Zustand format properly
        const updatedState = { ...state, accessToken: access };
        const updatedStorage = parsed?.version !== undefined
          ? { state: updatedState, version: parsed.version }
          : updatedState;
        sessionStorage.setItem('auth-session', JSON.stringify(updatedStorage));

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        sessionStorage.removeItem('auth-session');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(new Error('Please log in to continue'));
      }
    }

    // Handle 401 errors by redirecting to login
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(new Error('Please log in to continue'));
    }

    return Promise.reject(error);
  }
);

export default api;