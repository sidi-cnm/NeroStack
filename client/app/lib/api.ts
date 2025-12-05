/**
 * API Service for backend communication
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  details?: Record<string, string[]>;
}

// ============ Types ============

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  mayan_user_id?: number;
}

export interface TemporaryAccess {
  id: number;
  user_id: number;
  document_id: number | null;
  cabinet_id: number | null;
  start_date: string;
  end_date: string;
  access_type: 'read' | 'write' | 'admin';
  is_active: boolean;
  is_valid: boolean;
  is_expired: boolean;
  is_pending: boolean;
  time_remaining: number;
  reason: string | null;
  created_by: number;
  created_at: string;
  user?: Partial<User>;
}

export interface Document {
  id: number;
  label: string;
  description?: string;
  datetime_created: string;
  file_latest?: {
    id: number;
    filename: string;
    mimetype: string;
    size: number;
  };
  document_type?: {
    id: number;
    label: string;
  };
}

export interface DocumentAnalysis {
  id: number;
  document_id: number;
  summary: string | null;
  keywords: string[];
  key_points: string[];
  model_used: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  processing_time: number | null;
  created_at: string;
  completed_at: string | null;
}

interface LoginResponse {
  message: string;
  user: User;
  access_token: string;
  refresh_token: string;
  mayan_token?: string;
}

interface RegisterResponse {
  message: string;
  user: User;
  access_token: string;
  refresh_token: string;
}

interface PaginatedResponse<T> {
  total: number;
  page: number;
  per_page: number;
  pages: number;
  items?: T[];
}

interface UsersResponse extends PaginatedResponse<User> {
  users: User[];
}

interface AccessesResponse extends PaginatedResponse<TemporaryAccess> {
  accesses: TemporaryAccess[];
}

interface DocumentsResponse extends PaginatedResponse<Document> {
  documents: Document[];
}

// ============ API Service ============

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.headers) {
      const existingHeaders = options.headers as Record<string, string>;
      Object.assign(headers, existingHeaders);
    }

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error || 'Une erreur est survenue',
          details: data.details,
        };
      }

      return { data };
    } catch (error) {
      console.error('API Error:', error);
      return {
        error: 'Impossible de contacter le serveur',
      };
    }
  }

  // ============ Auth ============

  async login(username: string, password: string): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async register(data: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }): Promise<ApiResponse<RegisterResponse>> {
    return this.request<RegisterResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/auth/logout', {
      method: 'POST',
    });
  }

  async getMe(): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/api/auth/me');
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  // ============ Users (Admin) ============

  async getUsers(params?: {
    page?: number;
    per_page?: number;
    role?: string;
    active?: boolean;
    search?: string;
  }): Promise<ApiResponse<UsersResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString());
    if (params?.role) searchParams.set('role', params.role);
    if (params?.active !== undefined) searchParams.set('active', params.active.toString());
    if (params?.search) searchParams.set('search', params.search);

    const query = searchParams.toString();
    return this.request<UsersResponse>(`/api/users${query ? `?${query}` : ''}`);
  }

  async getUser(userId: number): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>(`/api/users/${userId}`);
  }

  async createUser(data: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    role?: 'user' | 'admin';
  }): Promise<ApiResponse<{ message: string; user: User }>> {
    return this.request<{ message: string; user: User }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(userId: number, data: Partial<{
    email: string;
    first_name: string;
    last_name: string;
    role: 'user' | 'admin';
    is_active: boolean;
  }>): Promise<ApiResponse<{ message: string; user: User }>> {
    return this.request<{ message: string; user: User }>(`/api/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(userId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async activateUser(userId: number): Promise<ApiResponse<{ message: string; user: User }>> {
    return this.request<{ message: string; user: User }>(`/api/users/${userId}/activate`, {
      method: 'POST',
    });
  }

  async deactivateUser(userId: number): Promise<ApiResponse<{ message: string; user: User }>> {
    return this.request<{ message: string; user: User }>(`/api/users/${userId}/deactivate`, {
      method: 'POST',
    });
  }

  async resetUserPassword(userId: number, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword }),
    });
  }

  // ============ Access Management ============

  async getAccesses(params?: {
    page?: number;
    per_page?: number;
    user_id?: number;
    document_id?: number;
    active?: boolean;
    valid?: boolean;
  }): Promise<ApiResponse<AccessesResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString());
    if (params?.user_id) searchParams.set('user_id', params.user_id.toString());
    if (params?.document_id) searchParams.set('document_id', params.document_id.toString());
    if (params?.active !== undefined) searchParams.set('active', params.active.toString());
    if (params?.valid !== undefined) searchParams.set('valid', params.valid.toString());

    const query = searchParams.toString();
    return this.request<AccessesResponse>(`/api/access${query ? `?${query}` : ''}`);
  }

  async getAccess(accessId: number): Promise<ApiResponse<{ access: TemporaryAccess }>> {
    return this.request<{ access: TemporaryAccess }>(`/api/access/${accessId}`);
  }

  async createAccess(data: {
    user_id: number;
    document_id?: number | null;
    cabinet_id?: number | null;
    start_date: string;
    end_date: string;
    access_type?: 'read' | 'write' | 'admin';
    reason?: string;
  }): Promise<ApiResponse<{ message: string; access: TemporaryAccess }>> {
    return this.request<{ message: string; access: TemporaryAccess }>('/api/access', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAccess(accessId: number, data: Partial<{
    start_date: string;
    end_date: string;
    access_type: 'read' | 'write' | 'admin';
    is_active: boolean;
    reason: string;
  }>): Promise<ApiResponse<{ message: string; access: TemporaryAccess }>> {
    return this.request<{ message: string; access: TemporaryAccess }>(`/api/access/${accessId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAccess(accessId: number): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/api/access/${accessId}`, {
      method: 'DELETE',
    });
  }

  async revokeAccess(accessId: number): Promise<ApiResponse<{ message: string; access: TemporaryAccess }>> {
    return this.request<{ message: string; access: TemporaryAccess }>(`/api/access/${accessId}/revoke`, {
      method: 'POST',
    });
  }

  async getMyAccesses(validOnly?: boolean): Promise<ApiResponse<{ accesses: TemporaryAccess[] }>> {
    const query = validOnly ? '?valid_only=true' : '';
    return this.request<{ accesses: TemporaryAccess[] }>(`/api/access/my-accesses${query}`);
  }

  async checkDocumentAccess(documentId: number): Promise<ApiResponse<{
    has_access: boolean;
    reason: string;
    access_type?: string;
    expires_at?: string;
    time_remaining?: number;
  }>> {
    return this.request(`/api/access/check/${documentId}`);
  }

  async getAccessDashboard(): Promise<ApiResponse<{
    dashboard: {
      active: { count: number; accesses: TemporaryAccess[] };
      pending: { count: number; accesses: TemporaryAccess[] };
      expired: { count: number; accesses: TemporaryAccess[] };
      revoked: { count: number; accesses: TemporaryAccess[] };
      total: number;
    };
  }>> {
    return this.request('/api/access/dashboard');
  }

  // ============ Documents ============

  async getDocuments(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    document_type?: number;
  }): Promise<ApiResponse<DocumentsResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.document_type) searchParams.set('document_type', params.document_type.toString());

    const query = searchParams.toString();
    return this.request<DocumentsResponse>(`/api/documents${query ? `?${query}` : ''}`);
  }

  async getDocument(documentId: number): Promise<ApiResponse<{ document: Document }>> {
    return this.request<{ document: Document }>(`/api/documents/${documentId}`);
  }

  async searchDocuments(query: string): Promise<ApiResponse<{ documents: Document[] }>> {
    return this.request<{ documents: Document[] }>(`/api/documents/search?q=${encodeURIComponent(query)}`);
  }

  // ============ AI Analysis ============

  async analyzeDocument(documentId: number, options?: {
    language?: string;
    force_refresh?: boolean;
  }): Promise<ApiResponse<{ analysis: DocumentAnalysis; cached?: boolean }>> {
    const searchParams = new URLSearchParams();
    if (options?.language) searchParams.set('language', options.language);
    if (options?.force_refresh) searchParams.set('force_refresh', 'true');

    const query = searchParams.toString();
    return this.request<{ analysis: DocumentAnalysis; cached?: boolean }>(
      `/api/ai/analyze/${documentId}${query ? `?${query}` : ''}`,
      {
        method: 'GET',
      }
    );
  }

  async getDocumentAnalysis(documentId: number): Promise<ApiResponse<{ analysis: DocumentAnalysis | null }>> {
    return this.request<{ analysis: DocumentAnalysis | null }>(`/api/ai/analysis/document/${documentId}`);
  }

  async askQuestion(documentId: number, question: string): Promise<ApiResponse<{
    answer: string;
    sources?: string[];
  }>> {
    return this.request(`/api/ai/ask/${documentId}`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }
}

export const api = new ApiService();
