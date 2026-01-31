// Database model types

export type EmailStatus = 'pending' | 'processed' | 'failed' | 'unmatched';

export type ProgressStatus =
  | 'not-started'
  | 'in-progress'
  | 'blocked'
  | 'delayed'
  | 'complete'
  | 'on-hold';

export type UpdateSource = 'email' | 'manual';

export type NotificationType = 'blocked' | 'delayed' | 'status_change' | 'manual_review';

export interface EmailRecord {
  id: string;
  from_address: string;
  subject: string;
  body: string;
  html_body?: string;
  received_at: Date;
  processed_at?: Date;
  status: EmailStatus;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateRecord {
  id: string;
  feature_id: string;
  email_id?: string;
  timestamp: Date;
  sender: string;
  summary: string;
  status?: ProgressStatus;
  percent_complete?: number;
  blockers: string[];
  action_items: string[];
  source: UpdateSource;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface FeatureProgressRecord {
  feature_id: string;
  current_status: ProgressStatus;
  percent_complete: number;
  last_update_id?: string;
  last_update_at?: Date;
  update_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface EmailConfigRecord {
  id: string;
  provider: 'gmail' | 'outlook' | 'imap' | 'pop3';
  host: string;
  port: number;
  username: string;
  password_encrypted: string;
  poll_interval: number;
  ssl: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLogRecord {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface NotificationRecord {
  id: string;
  feature_id: string;
  type: NotificationType;
  message: string;
  is_read: boolean;
  created_at: Date;
}
