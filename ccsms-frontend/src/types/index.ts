export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'CUSTOMER' | 'AGENT' | 'ADMIN';
  avatar?: string;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
}

export interface Complaint {
  id: string;
  complaint_number: string;
  title: string;
  description: string;
  category: 'TECHNICAL' | 'BILLING' | 'PRODUCT_QUALITY' | 'DELIVERY' | 'SERVICE' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ESCALATED' | 'REOPENED';
  customer: User;
  assigned_to?: User;
  sla_deadline?: string;
  sla_breached: boolean;
  resolved_at?: string;
  closed_at?: string;
  resolution_notes?: string;
  root_cause?: string;
  estimated_resolution_time?: string;
  can_reopen: boolean;
  created_at: string;
  updated_at: string;
  attachments?: Attachment[];
  comments?: Comment[];
  timeline?: TimelineEvent[];
  feedback?: Feedback;
}

export interface Attachment {
  id: string;
  file: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  uploaded_by: User;
  uploaded_at: string;
}

export interface Comment {
  id: string;
  user: User;
  content: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  action: string;
  description: string;
  performed_by?: User;
  metadata?: any;
  created_at: string;
}

export interface Feedback {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: 'EMAIL' | 'PUSH' | 'SMS';
  is_read: boolean;
  sent_at: string;
  read_at?: string;
  complaint?: string;
}

export interface DashboardStats {
  total_complaints?: number;
  open?: number;
  in_progress?: number;
  resolved?: number;
  assigned_cases?: number;
  pending?: number;
  resolved_today?: number;
  sla_breaches?: number;
  avg_resolution_time?: number;
  resolution_rate?: number;
  customer_satisfaction?: number;
  sla_compliance_rate?: number;
}
