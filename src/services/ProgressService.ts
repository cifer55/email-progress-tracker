/**
 * ProgressService
 * Frontend service for interacting with the progress tracking API
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2
 */

export interface FeatureProgress {
  featureId: string;
  currentStatus: string;
  percentComplete: number;
  lastUpdate: Update | null;
  updateCount: number;
}

export interface Update {
  id: string;
  featureId: string;
  timestamp: Date;
  sender: string;
  summary: string;
  status: string;
  percentComplete: number | null;
  blockers: string[];
  actionItems: string[];
  sentiment: string | null;
  urgency: string | null;
  source: 'email' | 'manual';
  emailId: string | null;
  createdBy: string | null;
}

export interface UpdateHistoryResponse {
  updates: Update[];
  total: number;
}

export interface CreateUpdateRequest {
  summary: string;
  status?: string;
  percentComplete?: number;
  blockers?: string[];
  actionItems?: string[];
}

export interface UpdateStatusRequest {
  status: string;
  reason?: string;
}

export class ProgressService {
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
   * Get feature progress
   * Requirements: 5.1, 5.2, 5.3, 5.4
   */
  async getFeatureProgress(featureId: string): Promise<FeatureProgress> {
    const response = await fetch(`${this.baseUrl}/api/progress/${featureId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get feature progress: ${response.statusText}`);
    }

    const data = await response.json();

    // Convert timestamp strings to Date objects
    if (data.lastUpdate && data.lastUpdate.timestamp) {
      data.lastUpdate.timestamp = new Date(data.lastUpdate.timestamp);
    }

    return data;
  }

  /**
   * Get update history for a feature
   * Requirements: 6.1, 6.2
   */
  async getUpdateHistory(
    featureId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<UpdateHistoryResponse> {
    const params = new URLSearchParams();

    if (options?.startDate) {
      params.append('startDate', options.startDate.toISOString());
    }
    if (options?.endDate) {
      params.append('endDate', options.endDate.toISOString());
    }
    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }
    if (options?.offset) {
      params.append('offset', options.offset.toString());
    }

    const url = `${this.baseUrl}/api/progress/${featureId}/updates${
      params.toString() ? `?${params.toString()}` : ''
    }`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get update history: ${response.statusText}`);
    }

    const data = await response.json();

    // Convert timestamp strings to Date objects
    data.updates = data.updates.map((update: Update) => ({
      ...update,
      timestamp: new Date(update.timestamp),
    }));

    return data;
  }

  /**
   * Create a manual update for a feature
   * Requirements: 5.3, 6.3
   */
  async createManualUpdate(
    featureId: string,
    update: CreateUpdateRequest
  ): Promise<Update> {
    const response = await fetch(`${this.baseUrl}/api/progress/${featureId}/updates`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(update),
    });

    if (!response.ok) {
      throw new Error(`Failed to create manual update: ${response.statusText}`);
    }

    const data = await response.json();

    // Convert timestamp string to Date object
    if (data.timestamp) {
      data.timestamp = new Date(data.timestamp);
    }

    return data;
  }

  /**
   * Update feature status
   * Requirements: 5.4, 5.5
   */
  async updateFeatureStatus(
    featureId: string,
    statusUpdate: UpdateStatusRequest
  ): Promise<{ success: boolean; status: string }> {
    const response = await fetch(`${this.baseUrl}/api/progress/${featureId}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(statusUpdate),
    });

    if (!response.ok) {
      throw new Error(`Failed to update feature status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check if the service is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
