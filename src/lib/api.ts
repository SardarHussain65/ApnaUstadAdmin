// The API URL will default to your production domain if no environment variable is set.
// For local development on your Mac, create a .env.local file with VITE_API_URL=http://localhost:5000/api/v1
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

async function handleResponse<T>(response: Response): Promise<T> {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = (data && data.message) || response.statusText;
    throw new ApiError(response.status, message, data);
  }

  return data.data as T; // Assuming backend wraps success responses in { ... successResponse, data: { ... } }
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
  delete: async <T>(endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<T>(response);
  },
};
