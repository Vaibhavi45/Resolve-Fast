import api from '../axios';

export const complaintsService = {
  getAll: async (params?: any) => {
    const response = await api.get('/complaints/', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/complaints/${id}/`);
    return response.data;
  },

  create: async (data: FormData | any) => {
    const config = data instanceof FormData ? {
      headers: { 'Content-Type': 'multipart/form-data' },
    } : {};
    const response = await api.post('/complaints/', data, config);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.patch(`/complaints/${id}/`, data);
    return response.data;
  },

  assign: async (id: string, assignedTo: string) => {
    const response = await api.post(`/complaints/${id}/assign/`, { assigned_to: assignedTo });
    return response.data;
  },

  resolve: async (id: string, resolutionNotes: string) => {
    const response = await api.post(`/complaints/${id}/resolve/`, { resolution_notes: resolutionNotes });
    return response.data;
  },

  close: async (id: string) => {
    const response = await api.post(`/complaints/${id}/close/`);
    return response.data;
  },

  resolveWithFiles: async (id: string, formData: FormData) => {
    const response = await api.post(`/complaints/${id}/resolve/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  addComment: async (id: string, content: string, isInternal: boolean = false) => {
    const response = await api.post(`/complaints/${id}/comments/`, { content, is_internal: isInternal });
    return response.data;
  },

  addFeedback: async (id: string, data: {
    rating: number;
    agent_professionalism_rating?: number;
    resolution_speed_rating?: number;
    comment?: string;
  }) => {
    const response = await api.post(`/complaints/${id}/feedback/`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/complaints/${id}/`);
    return response.data;
  },

  requestAssignment: async (id: string, message?: string) => {
    const response = await api.post(`/complaints/${id}/request-assignment/`, { message });
    return response.data;
  },

  getAssignmentRequests: async () => {
    const response = await api.get('/complaints/assignment-requests/');
    return response.data;
  },

  reviewAssignmentRequest: async (id: string, action: 'approve' | 'reject') => {
    const response = await api.post(`/complaints/assignment-requests/${id}/review/`, { action });
    return response.data;
  },

  requestAgentAssignment: async (complaintId: string, agentId: string, message?: string) => {
    const response = await api.post(`/complaints/${complaintId}/request-agent-assignment/`, {
      agent_id: agentId,
      message
    });
    return response.data;
  },

  respondToAssignmentRequest: async (id: string, action: 'accept' | 'reject') => {
    const response = await api.post(`/complaints/assignment-requests/${id}/review/`, { action });
    return response.data;
  },

  reopen: async (id: string, reason?: string) => {
    const response = await api.post(`/complaints/${id}/reopen/`, { reason });
    return response.data;
  },

  getTemplates: async () => {
    const response = await api.get('/complaints/templates/');
    return response.data;
  },

  getTemplate: async (id: string) => {
    const response = await api.get(`/complaints/templates/${id}/`);
    return response.data;
  },

  createFromTemplate: async (templateId: string, data: any) => {
    const formData = new FormData();
    formData.append('template_id', templateId);
    formData.append('title', data.title || '');
    formData.append('description', data.description || '');
    formData.append('priority', data.priority || '');
    formData.append('location', data.location || '');

    if (data.attachments) {
      data.attachments.forEach((file: File) => {
        formData.append('attachments', file);
      });
    }

    const response = await api.post('/complaints/from-template/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
