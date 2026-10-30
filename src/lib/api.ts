// The API URL will default to your production domain if no environment variable is set.
// For local development on your Mac, create a .env.local file with VITE_API_URL=http://localhost:5001/api/v1
// export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.apnaustad.app/api/v1';
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

export interface ApiPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: ApiPagination;
}

interface ApiEnvelope<T> {
  data: T;
  pagination?: ApiPagination;
}

function notifyUnauthorized(response: Response) {
  if (response.status !== 401 || typeof window === 'undefined') return;

  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');

  if (window.location.pathname !== '/login' && window.location.pathname !== '/admin') {
    window.dispatchEvent(new Event('admin:unauthorized'));
  }
}

async function handleEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const text = await response.text();
  const data = isJson && text ? JSON.parse(text) : text;

  notifyUnauthorized(response);

  if (!response.ok) {
    const message = (data && data.message) || response.statusText;
    throw new ApiError(response.status, message, data);
  }

  if (data && typeof data === 'object' && 'data' in data) {
    return data as ApiEnvelope<T>;
  }

  return { data: data as T };
}

async function handleResponse<T>(response: Response): Promise<T> {
  return (await handleEnvelope<T>(response)).data;
}

function fallbackPagination(itemCount: number): ApiPagination {
  return {
    currentPage: 1,
    totalPages: 1,
    totalItems: itemCount,
    itemsPerPage: itemCount || 1,
  };
}

function getAuthHeaders() {
  const token = localStorage.getItem('adminToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  get: async <T>(endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse<T>(response);
  },
  getPaginated: async <T>(endpoint: string): Promise<PaginatedResult<T>> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const envelope = await handleEnvelope<T[]>(response);
    const items = envelope.data || [];
    return {
      items,
      pagination: envelope.pagination || fallbackPagination(items.length),
    };
  },
  post: async <T>(endpoint: string, body: any) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
  },
  patch: async <T>(endpoint: string, body: any) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
  },
  delete: async <T>(endpoint: string, body?: any) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return handleResponse<T>(response);
  },
  downloadExport: async (entity: string, params?: { from?: string; to?: string }): Promise<void> => {
    const token = localStorage.getItem('adminToken');
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const response = await fetch(`${API_BASE_URL}/admin/export/${entity}${qs}`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      let msg = `Export failed with status ${response.status}`;
      try {
        const err = await response.json();
        if (err.message) msg = err.message;
      } catch {
        // ignore
      }
      throw new ApiError(response.status, msg);
    }
    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition');
    let filename = `${entity}-export-${new Date().toISOString().slice(0, 10)}.csv`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};

