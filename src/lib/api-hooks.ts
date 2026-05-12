import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { toast } from 'sonner';

type QueryParam = string | number | boolean | undefined | null;

const toQueryString = (params: Record<string, QueryParam>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  return query.toString();
};

export interface Category {
  _id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CategoryInput = {
  name: string;
  icon: string;
  color: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export interface Worker {
  _id: string;
  id?: string;
  fullName: string;
  phone: string;
  email?: string | null;
  profileImage?: string;
  cnicNumber?: string;
  cnicFrontImage?: string;
  cnicBackImage?: string;
  category: string;
  skills: string[];
  hourlyRate: number;
  bio?: string;
  experience: number;
  city: string;
  address: string;
  isAvailable: boolean;
  isVerified: boolean;
  isActive: boolean;
  rating: number;
  totalReviews: number;
  totalJobs: number;
  totalEarnings: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminBooking {
  _id: string;
  customer?: {
    _id: string;
    fullName: string;
    phone?: string;
    profileImage?: string;
  };
  worker?: {
    _id: string;
    fullName: string;
    phone?: string;
    profileImage?: string;
  };
  category: string;
  scheduledDate: string;
  scheduledTime?: string;
  totalAmount: number;
  status: string;
  paymentStatus?: string;
  createdAt?: string;
}

// --- Dashboard Queries ---
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => api.get<any>('/admin/dashboard/stats'),
  });
};

// --- Job Queries & Mutations ---
export const useJobs = (params: { page?: number; limit?: number; search?: string; status?: string } = {}) => {
  const query = new URLSearchParams(params as any).toString();
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: () => api.get<any>(`/admin/jobs?${query}`),
  });
};

export const useJobDetails = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => api.get<any>(`/admin/jobs/${id}`),
    enabled,
  });
};

export const useDeleteJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/jobs/${id}`),
    onSuccess: () => {
      toast.success('Job deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete job');
    },
  });
};

// --- Bookings Queries ---
export const useBookings = (params: { page?: number; limit?: number; status?: string; workerId?: string; customerId?: string } = {}) => {
  const query = toQueryString(params);
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: () => api.get<AdminBooking[]>(`/admin/bookings${query ? `?${query}` : ''}`),
  });
};

export const useBookingDetails = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.get<any>(`/admin/bookings/${id}`),
    enabled,
  });
};

// --- Users Queries ---
export const useUsers = (params: { page?: number; limit?: number; search?: string } = {}) => {
  const query = new URLSearchParams(params as any).toString();
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => api.get<any>(`/admin/users?${query}`),
  });
};

export const useUserDetails = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => api.get<any>(`/admin/users/${id}`),
    enabled,
  });
};

export const useToggleUserStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/admin/users/${id}/status`, {}),
    onSuccess: () => {
      toast.success('User status updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user status');
    }
  });
};

// --- Workers Queries ---
export const useWorkers = (params: { page?: number; limit?: number; search?: string; status?: string; verified?: boolean; city?: string; category?: string } = {}) => {
  const query = toQueryString(params);
  return useQuery({
    queryKey: ['workers', params],
    queryFn: () => api.get<Worker[]>(`/admin/workers${query ? `?${query}` : ''}`),
  });
};

export const useWorkerDetails = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['worker', id],
    queryFn: () => api.get<Worker>(`/admin/workers/${id}`),
    enabled,
  });
};

export const useToggleWorkerStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch<Worker>(`/admin/workers/${id}/status`, { isActive }),
    onSuccess: (_data, variables) => {
      toast.success('Worker status updated');
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['worker', variables.id] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update worker status');
    },
  });
};

export const useVerifyWorker = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isVerified }: { id: string; isVerified: boolean }) => api.patch<Worker>(`/admin/workers/${id}/verify`, { isVerified }),
    onSuccess: (_data, variables) => {
      toast.success('Worker verification updated');
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['worker', variables.id] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update worker verification');
    },
  });
};

// --- Categories Queries ---
export const useCategories = (params: { page?: number; limit?: number; search?: string; active?: boolean } = { limit: 100 }) => {
  const qs = toQueryString(params);

  return useQuery({
    queryKey: ['categories', params],
    queryFn: () => api.get<Category[]>(`/admin/categories${qs ? `?${qs}` : ''}`),
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryInput) => api.post<Category>(`/admin/categories`, data),
    onSuccess: () => {
      toast.success('Category created successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create category');
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: CategoryInput & { id: string }) => api.patch<Category>(`/admin/categories/${id}`, data),
    onSuccess: () => {
      toast.success('Category updated successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update category');
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => {
      toast.success('Category deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete category');
    },
  });
};

// --- Reviews Queries ---
export const useReviews = (params: { page?: number; limit?: number } = {}) => {
  const query = new URLSearchParams(params as any).toString();
  return useQuery({
    queryKey: ['reviews', params],
    queryFn: () => api.get<any>(`/admin/reviews?${query}`),
  });
};

export const useDeleteReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/reviews/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  });
};
