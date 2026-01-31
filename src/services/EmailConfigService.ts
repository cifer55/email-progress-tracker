/**
 * EmailConfigService
 * Frontend service for managing email configuration
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

export interface EmailConfig {
  id?: string;
  provider: 'gmail' | 'outlook' | 'imap' | 'pop3';
  host: string;
  port: number;
  username: string;
  password?: string; // Not returned from API for security
  ssl: boolean;
  pollInterval: number;
  enabled: boolean;
  lastPollTime?: Date;
  lastPollStatus?: string;
}

export interface EmailConfigUpdate {
  provider?: 'gmail' | 'outlook' | 'imap' | 'pop3';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  ssl?: boolean;
  pollInterval?: number;
  enabled?: boolean;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  details?: {
    connected: boolean;
    authenticated: boolean;
    mailboxCount?: number;
  };
}

export class EmailConfigService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  /**
   * Set the authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Get headers with authentication
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Get current email configuration
   * Requirements: 1.1, 1.2
   */
  async getEmailConfig(): Promise<EmailConfig> {
    const response = await fetch(`${this.baseUrl}/api/config/email`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get email config: ${response.statusText}`);
    }

    const data = await response.json();

    // Convert timestamp strings to Date objects
    if (data.lastPollTime) {
      data.lastPollTime = new Date(data.lastPollTime);
    }

    return data;
  }

  /**
   * Update email configuration
   * Requirements: 1.3, 1.4
   */
  async updateEmailConfig(config: EmailConfigUpdate): Promise<EmailConfig> {
    const response = await fetch(`${this.baseUrl}/api/config/email`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Failed to update email config: ${response.statusText}`);
    }

    const data = await response.json();

    // Convert timestamp strings to Date objects
    if (data.lastPollTime) {
      data.lastPollTime = new Date(data.lastPollTime);
    }

    return data;
  }

  /**
   * Test email connection
   * Requirements: 1.5
   */
  async testEmailConnection(config?: EmailConfigUpdate): Promise<TestConnectionResponse> {
    const response = await fetch(`${this.baseUrl}/api/config/email/test`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(config || {}),
    });

    if (!response.ok) {
      throw new Error(`Failed to test email connection: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get predefined configurations for common providers
   */
  getProviderDefaults(provider: 'gmail' | 'outlook' | 'imap' | 'pop3'): Partial<EmailConfig> {
    switch (provider) {
      case 'gmail':
        return {
          provider: 'gmail',
          host: 'imap.gmail.com',
          port: 993,
          ssl: true,
          pollInterval: 300000, // 5 minutes
        };
      case 'outlook':
        return {
          provider: 'outlook',
          host: 'outlook.office365.com',
          port: 993,
          ssl: true,
          pollInterval: 300000, // 5 minutes
        };
      case 'imap':
        return {
          provider: 'imap',
          port: 993,
          ssl: true,
          pollInterval: 300000, // 5 minutes
        };
      case 'pop3':
        return {
          provider: 'pop3',
          port: 995,
          ssl: true,
          pollInterval: 300000, // 5 minutes
        };
      default:
        return {};
    }
  }
}
