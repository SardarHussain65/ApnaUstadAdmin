import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { toast } from 'sonner';

type QueryParam = string | number | boolean | undefined | null;
const LIST_STALE_TIME = 30_000;

const toQueryString = (params: Record<string, QueryParam>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  return query.toString();
};

const paginatedPath = (path: string, params: Record<string, QueryParam>) => {
  const query = toQueryString(params);
  return `${path}${query ? `?${query}` : ''}`;
};

const usePaginatedQuery = <T>(key: string, path: string, params: Record<string, QueryParam>) =>
  useQuery({
    queryKey: [key, 'paginated', params],
    queryFn: () => api.getPaginated<T>(paginatedPath(path, params)),
    placeholderData: previousData => previousData,
    staleTime: LIST_STALE_TIME,
  });

export interface Category {
  _id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  additionalCategoryMonthlyFee: number;
  additionalCategoryGraceDays: number;
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
  additionalCategoryMonthlyFee?: number;
  additionalCategoryGraceDays?: number;
};

export interface WorkerSpecialty {
  _id: string;
  categoryId: Category | string;
  priority: number;
  skills: string[];
  hourlyRate: number;
  experience: number;
  bio?: string;
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  subscriptionStatus: 'free' | 'pending_activation' | 'active' | 'payment_due' | 'expired';
  monthlyFeeSnapshot: number;
  autoRenew: boolean;
  requestedAt?: string;
  approvedAt?: string | null;
  currentPeriodEnd?: string | null;
  nextBillingAt?: string | null;
  graceEndsAt?: string | null;
}

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
  specialties?: WorkerSpecialty[];
  skills: string[];
  hourlyRate: number;
  bio?: string;
  experience: number;
  city: string;
  address: string;
  isAvailable: boolean;
  isVerified: boolean;
  isActive: boolean;
  deactivationReason?: string;
  deactivatedAt?: string | null;
  deactivatedBy?: string | null;
  reactivatedAt?: string | null;
  reactivatedBy?: string | null;
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
  agreement?: {
    clientOffer: number;
    agreedPrice: number;
    cashDue: number;
    priceSource: 'accepted_offer' | 'counter_offer' | 'direct_rate';
    commissionRateSnapshot: number;
    commissionAmount: number;
    workerNetIncome: number;
    lockedAt: string;
    pricingVersion: number;
  };
  status: string;
  paymentStatus?: string;
  paymentMethod?: 'cash' | 'card' | 'easypaisa';
  subtotal?: number;
  platformFee?: number;
  workerEarning?: number;
  bookingType?: string;
  estimatedHours?: number;
  address?: string;
  description?: string;
  payment?: AdminPayment | null;
  createdAt?: string;
}

export interface AdminPayment {
  _id: string;
  booking?: AdminBooking | string;
  customer?: {
    _id: string;
    fullName: string;
    phone?: string;
  };
  worker?: {
    _id: string;
    fullName: string;
    phone?: string;
  };
  method: 'cash';
  status: 'pending' | 'payable' | 'paid' | 'cancelled';
  currency: 'PKR';
  amount: number;
  subtotal: number;
  platformFee: number;
  workerEarning: number;
  receiptNumber?: string | null;
  paidAt?: string | null;
  payableAt?: string | null;
  cancelledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// --- Dashboard Queries ---
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => api.get<any>('/admin/dashboard/stats'),
  });
};

// --- Job Queries & Mutations ---
type JobQueryParams = { page?: number; limit?: number; search?: string; status?: string; category?: string; urgency?: string };

export const useJobs = (params: JobQueryParams = {}) => {
  const query = toQueryString(params);
  return useQuery({
    queryKey: ['jobs', params],
    queryFn: () => api.get<any>(query ? `/admin/jobs?${query}` : '/admin/jobs'),
  });
};

export const useJobsPage = (params: JobQueryParams = {}) =>
  usePaginatedQuery<any>('jobs', '/admin/jobs', params);

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

export const useUpdateJobStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      api.patch(`/admin/jobs/${id}/status`, { status, reason }),
    onSuccess: (_, variables) => {
      toast.success(`Job status updated to ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', variables.id] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update job status');
    },
  });
};

export const useCancelJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.patch(`/admin/jobs/${id}/cancel`, { reason }),
    onSuccess: (_, variables) => {
      toast.success('Job cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', variables.id] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel job');
    },
  });
};

// --- Bookings Queries ---
type BookingQueryParams = {
  page?: number;
  limit?: number;
  status?: string;
  workerId?: string;
  customerId?: string;
  search?: string;
  paymentStatus?: string;
  bookingType?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const useBookings = (params: BookingQueryParams = {}) => {
  const query = toQueryString(params);
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: () => api.get<AdminBooking[]>(`/admin/bookings${query ? `?${query}` : ''}`),
  });
};

export const useBookingsPage = (params: BookingQueryParams = {}) =>
  usePaginatedQuery<AdminBooking>('bookings', '/admin/bookings', params);

export const useBookingDetails = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.get<any>(`/admin/bookings/${id}`),
    enabled,
  });
};

export const useUpdateBookingStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, cancelReason }: { id: string; status: string; cancelReason?: string }) =>
      api.patch(`/admin/bookings/${id}/status`, { status, cancelReason }),
    onSuccess: (_, variables) => {
      toast.success(`Booking status updated to ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', variables.id] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update booking status');
    },
  });
};

export const useCancelBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post(`/admin/bookings/${id}/cancel`, { reason }),
    onSuccess: (_, variables) => {
      toast.success('Booking cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', variables.id] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel booking');
    },
  });
};

export const usePayments = (params: { page?: number; limit?: number; status?: string; workerId?: string; customerId?: string } = {}) => {
  const query = toQueryString(params);
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () => api.get<AdminPayment[]>(`/admin/payments${query ? `?${query}` : ''}`),
  });
};

export const usePaymentsPage = (params: { page?: number; limit?: number; status?: string; workerId?: string; customerId?: string } = {}) =>
  usePaginatedQuery<AdminPayment>('payments', '/admin/payments', params);

export const usePaymentSummary = () => {
  return useQuery({
    queryKey: ['payments-summary'],
    queryFn: () => api.get<Record<string, { count: number; totalAmount: number; workerEarnings: number; platformFees: number }>>('/admin/payments/summary'),
  });
};

// --- Users Queries ---
type UserQueryParams = { page?: number; limit?: number; search?: string; status?: string; city?: string; dateFrom?: string };

export const useUsers = (params: UserQueryParams = {}) => {
  const query = toQueryString(params);
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => api.get<any>(`/admin/users?${query}`),
  });
};

export const useUsersPage = (params: UserQueryParams = {}) =>
  usePaginatedQuery<any>('users', '/admin/users', params);

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
    mutationFn: ({ id, isActive, reason }: { id: string; isActive: boolean; reason?: string }) =>
      api.patch(`/admin/users/${id}/status`, { isActive, reason }),
    onSuccess: (_, variables) => {
      toast.success('User status updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] });
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

export const useWorkersPage = (params: { page?: number; limit?: number; search?: string; status?: string; verified?: boolean; city?: string; category?: string } = {}) =>
  usePaginatedQuery<Worker>('workers', '/admin/workers', params);

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
    mutationFn: ({ id, isActive, reason }: { id: string; isActive: boolean; reason?: string }) =>
      api.patch<Worker>(`/admin/workers/${id}/status`, { isActive, reason }),
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

export const useUpdateWorkerProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; fullName?: string; phone?: string; email?: string; city?: string; address?: string }) =>
      api.patch<Worker>(`/admin/workers/${id}`, data),
    onSuccess: (_data, variables) => {
      toast.success('Worker profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['worker', variables.id] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update worker profile');
    },
  });
};

export const useReviewWorkerSpecialty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workerId,
      categoryId,
      approvalStatus,
      reason,
    }: {
      workerId: string;
      categoryId: string;
      approvalStatus: 'approved' | 'rejected';
      reason?: string;
    }) => api.patch(`/admin/workers/${workerId}/specialties/${categoryId}/review`, {
      approvalStatus,
      reason,
    }),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.approvalStatus === 'approved'
          ? 'Specialty approved, wallet charged, and category activated'
          : 'Specialty request rejected'
      );
      queryClient.invalidateQueries({ queryKey: ['worker', variables.workerId] });
      queryClient.invalidateQueries({ queryKey: ['specialty-requests'] });
      queryClient.invalidateQueries({ queryKey: ['worker-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['worker-wallet-details', variables.workerId] });
      queryClient.invalidateQueries({ queryKey: ['wallet-summary'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to review specialty request');
    },
  });
};

export const useWorkerReviews = (workerId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['worker-reviews', workerId],
    queryFn: () => api.getPaginated<any>(`/admin/reviews?workerId=${workerId}&limit=50`),
    enabled: !!workerId && enabled,
    select: (data) => data.items,
  });
};

export const useAdminCities = () => {
  return useQuery({
    queryKey: ['admin-cities'],
    queryFn: () => api.get<string[]>('/admin/meta/cities'),
    staleTime: 5 * 60_000,
  });
};

export const useSpecialtyRequestsPage = (params: { page?: number; limit?: number; search?: string } = {}) =>
  usePaginatedQuery<Worker>('specialty-requests', '/admin/specialty-requests', params);

export const useWorkerOnboardingPage = (params: { page?: number; limit?: number; search?: string } = {}) =>
  usePaginatedQuery<any>('worker-onboarding', '/admin/workers/onboarding', params);

export interface PlatformSettings {
  urgentPricingRates: Record<string, { baseRatePerHour: number; minimumPrice: number }>;
  defaultUrgentRate: { baseRatePerHour: number; minimumPrice: number };
  instantJobInitialRadiusKm: number;
  instantJobExpandedRadiusKm: number;
  instantJobExpansionMinutes: number;
  instantJobTimeoutMinutes: number;
  updatedAt?: string;
}

export const usePlatformSettings = () => {
  return useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => api.get<PlatformSettings>('/admin/platform-settings'),
  });
};

export const useUpdatePlatformSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<PlatformSettings>) => api.patch<PlatformSettings>('/admin/platform-settings', payload),
    onSuccess: () => {
      toast.success('Platform settings updated');
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update platform settings');
    },
  });
};

export const useAdminProfile = (enabled = true) => {
  return useQuery({
    queryKey: ['admin-profile'],
    queryFn: () => api.get<any>('/admin/me'),
    enabled: enabled && typeof window !== 'undefined' && !!localStorage.getItem('adminToken'),
  });
};

export const useBookingMessages = (bookingId: string, enabled = true) => {
  return useQuery({
    queryKey: ['booking-messages', bookingId],
    queryFn: () => api.get<any[]>(`/admin/bookings/${bookingId}/messages`),
    enabled: !!bookingId && enabled,
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
type ReviewQueryParams = { page?: number; limit?: number; search?: string; rating?: number; category?: string; dateFrom?: string };

export const useReviews = (params: ReviewQueryParams = {}) => {
  const query = toQueryString(params);
  return useQuery({
    queryKey: ['reviews', params],
    queryFn: () => api.get<any>(`/admin/reviews?${query}`),
  });
};

export const useReviewsPage = (params: ReviewQueryParams = {}) =>
  usePaginatedQuery<any>('reviews', '/admin/reviews', params);

export const useDeleteReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/reviews/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  });
};

export const useToggleFlagReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.patch(`/admin/reviews/${id}/flag`, { reason }),
    onSuccess: () => {
      toast.success('Review flag status updated');
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update review flag status');
    },
  });
};

// --- Worker Wallet Types ---
export interface WorkerWallet {
  _id: string;
  worker: {
    _id: string;
    fullName: string;
    phone: string;
    email?: string;
    profileImage?: string;
  };
  balance: number;
  reservedBalance?: number;
  availableBalance?: number;
  totalRecharged: number;
  totalCommissionDeducted: number;
  totalSubscriptionDeducted?: number;
  isActive: boolean;
  lastRechargedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  _id: string;
  wallet: string;
  worker: string;
  type: 'recharge' | 'commission_deduction' | 'specialty_subscription' | 'refund' | 'adjustment';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  reference?: {
    booking?: string;
    payment?: string;
    topUpRequest?: string;
  };
  performedBy: {
    actor: string;
    actorType: 'worker' | 'admin' | 'system';
  };
  createdAt: string;
  updatedAt: string;
}

export interface WalletTopUpRequest {
  _id: string;
  requestId: string;
  worker?: {
    _id: string;
    fullName: string;
    phone?: string;
    email?: string;
    profileImage?: string;
    category?: string;
  };
  wallet: string;
  amount: number;
  method: 'easypaisa' | 'jazzcash' | 'bank_transfer' | 'other';
  proofImageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  paymentDetailsSnapshot: {
    method: string;
    label: string;
    accountTitle?: string;
    accountNumber?: string;
    bankName?: string;
    iban?: string;
    instructions?: string;
  };
  admin?: {
    _id: string;
    fullName: string;
    email?: string;
  } | null;
  adminNotes?: string;
  rejectionReason?: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WalletSummary {
  walletCount: number;
  totalBalance: number;
  totalReservedBalance?: number;
  totalAvailableBalance?: number;
  totalRecharged: number;
  totalCommissionDeducted: number;
  lowBalanceCount: number;
  zeroBalanceCount: number;
  minimumWalletBalance: number;
  pendingTopUpCount: number;
  pendingTopUpAmount: number;
  commissionSettings?: WalletSettings;
}

export interface WalletSettings {
  platformFeePercentage: number;
  minimumWalletBalance: number;
  additionalCategoryMonthlyFee: number;
  commissionEnabled: boolean;
  updatedAt?: string;
}

export type WalletPaymentMethodKey = 'easypaisa' | 'jazzcash' | 'bank_transfer' | 'other';

export interface WalletPaymentMethodSetting {
  _id?: string;
  method: WalletPaymentMethodKey;
  label: string;
  accountTitle: string;
  accountNumber: string;
  bankName?: string;
  iban?: string;
  instructions?: string;
  enabled: boolean;
  isConfigured: boolean;
  sortOrder?: number;
  updatedAt?: string;
}

export type WalletPaymentMethodInput = Omit<WalletPaymentMethodSetting, '_id' | 'isConfigured' | 'updatedAt'>;

export interface WorkerWalletDetails {
  worker: {
    _id: string;
    fullName: string;
    phone: string;
    email?: string;
    profileImage?: string;
  };
  wallet: {
    _id: string;
    worker: string;
    balance: number;
    reservedBalance?: number;
    availableBalance?: number;
    totalRecharged: number;
    totalCommissionDeducted: number;
    totalSubscriptionDeducted?: number;
    isActive: boolean;
    lastRechargedAt?: string;
    createdAt: string;
    updatedAt: string;
  };
  transactions: WalletTransaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// --- Worker Wallet Hooks ---
export const useWorkerWallets = (params: { search?: string; balanceStatus?: 'low' | 'zero' | 'sufficient' | ''; page?: number; limit?: number } = {}) => {
  const qs = toQueryString(params);
  return useQuery({
    queryKey: ['worker-wallets', params],
    queryFn: () => api.get<any>(`/admin/wallets${qs ? `?${qs}` : ''}`),
  });
};

export const useWorkerWalletsPage = (params: { search?: string; balanceStatus?: 'low' | 'zero' | 'sufficient' | ''; page?: number; limit?: number } = {}) =>
  usePaginatedQuery<WorkerWallet>('worker-wallets', '/admin/wallets', params);

export const useWalletSummary = () => {
  return useQuery({
    queryKey: ['wallet-summary'],
    queryFn: () => api.get<WalletSummary>('/admin/wallets/summary'),
  });
};

export const useWalletSettings = () => {
  return useQuery({
    queryKey: ['wallet-settings'],
    queryFn: () => api.get<WalletSettings>('/admin/wallet-settings'),
  });
};

export const useUpdateWalletSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: WalletSettings) => api.patch<WalletSettings>('/admin/wallet-settings', settings),
    onSuccess: () => {
      toast.success('Wallet commission settings updated');
      queryClient.invalidateQueries({ queryKey: ['wallet-settings'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-summary'] });
      queryClient.invalidateQueries({ queryKey: ['worker-wallets'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update wallet settings');
    },
  });
};

export const useWalletPaymentMethodSettings = () => {
  return useQuery({
    queryKey: ['wallet-payment-methods'],
    queryFn: () => api.get<WalletPaymentMethodSetting[]>('/admin/wallet-payment-methods'),
  });
};

export const useUpdateWalletPaymentMethodSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ methods }: { methods: WalletPaymentMethodInput[] }) =>
      api.patch<WalletPaymentMethodSetting[]>('/admin/wallet-payment-methods', { methods }),
    onSuccess: () => {
      toast.success('Payment methods updated successfully');
      queryClient.invalidateQueries({ queryKey: ['wallet-payment-methods'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update payment methods');
    },
  });
};

export const useWorkerWalletDetails = (workerId: string, page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['worker-wallet-details', workerId, page, limit],
    queryFn: () => api.get<WorkerWalletDetails>(`/admin/wallets/${workerId}?page=${page}&limit=${limit}`),
    enabled: !!workerId,
  });
};

export const useAdminRechargeWallet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workerId, amount, description }: { workerId: string; amount: number; description?: string }) =>
      api.post(`/admin/wallets/${workerId}/recharge`, { amount, description }),
    onSuccess: (data, variables) => {
      toast.success('Wallet recharged successfully');
      queryClient.invalidateQueries({ queryKey: ['worker-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['worker-wallet-details', variables.workerId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to recharge wallet');
    },
  });
};

export const useAdminAdjustWallet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workerId, amount, type, description }: { workerId: string; amount: number; type: 'refund' | 'adjustment'; description: string }) =>
      api.post(`/admin/wallets/${workerId}/adjust`, { amount, type, description }),
    onSuccess: (data, variables) => {
      toast.success('Wallet balance adjusted successfully');
      queryClient.invalidateQueries({ queryKey: ['worker-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['worker-wallet-details', variables.workerId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to adjust wallet balance');
    },
  });
};

export const useWalletTopUps = (params: {
  page?: number;
  limit?: number;
  status?: string;
  method?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}) => {
  const qs = toQueryString(params);
  return useQuery({
    queryKey: ['wallet-topups', params],
    queryFn: () => api.get<WalletTopUpRequest[]>(`/admin/wallet-topups${qs ? `?${qs}` : ''}`),
  });
};

export const useWalletTopUpsPage = (params: {
  page?: number;
  limit?: number;
  status?: string;
  method?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}) => usePaginatedQuery<WalletTopUpRequest>('wallet-topups', '/admin/wallet-topups', params);

export const useWalletTopUpSummary = (params: {
  status?: string;
  method?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}) => {
  const qs = toQueryString(params);
  return useQuery({
    queryKey: ['wallet-topup-summary', params],
    queryFn: () => api.get<Record<'pending' | 'approved' | 'rejected', { count: number; amount: number }>>(`/admin/wallet-topups/summary${qs ? `?${qs}` : ''}`),
  });
};

export const useApproveWalletTopUp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminNotes }: { id: string; adminNotes?: string }) =>
      api.patch(`/admin/wallet-topups/${id}/approve`, { adminNotes }),
    onSuccess: () => {
      toast.success('Top-up approved and wallet credited');
      queryClient.invalidateQueries({ queryKey: ['wallet-topups'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-topup-summary'] });
      queryClient.invalidateQueries({ queryKey: ['worker-wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-summary'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve top-up');
    },
  });
};

export const useRejectWalletTopUp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rejectionReason, adminNotes }: { id: string; rejectionReason: string; adminNotes?: string }) =>
      api.patch(`/admin/wallet-topups/${id}/reject`, { rejectionReason, adminNotes }),
    onSuccess: () => {
      toast.success('Top-up request rejected');
      queryClient.invalidateQueries({ queryKey: ['wallet-topups'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-topup-summary'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-summary'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reject top-up');
    },
  });
};

// --- Admin Notifications ---
export interface AdminNotification {
  _id: string;
  isBroadcast?: boolean;
  broadcastId?: string;
  recipientType: 'user' | 'worker' | 'admin';
  recipient?: {
    _id: string;
    fullName: string;
    phone: string;
    email?: string;
    profileImage?: string;
  } | null;
  title: string;
  message: string;
  deliveryStatus?: string;
  scheduledAt?: string;
  createdAt?: string;
  sentAt?: string;
  totalCount?: number;
  sentCount?: number;
  readCount?: number;
  failedCount?: number;
}

export interface AdminNotificationsResponse {
  notifications: AdminNotification[];
  pagination: {
    total: number;
    page: number;
    pages: number;
  };
}

export const useAdminNotifications = (params: { page?: number; limit?: number; grouped?: boolean } = { limit: 50 }) => {
  const qs = toQueryString(params);
  return useQuery({
    queryKey: ['admin-notifications', params],
    queryFn: () => api.get<AdminNotificationsResponse>(`/admin/notifications${qs ? `?${qs}` : ''}`),
  });
};

export const useBroadcastNotification = () => {
  return useMutation({
    mutationFn: (payload: { target: 'users' | 'workers' | 'all' | 'user' | 'worker'; title: string; body: string; recipientId?: string; scheduledAt?: string; type?: string }) =>
      api.post(`/admin/notifications/global`, payload),
  });
};

// --- Support Queries ---
export interface SupportReply {
  from: 'admin' | 'user';
  message: string;
  authorName?: string;
  createdAt: string;
}

export interface SupportRequest {
  _id: string;
  user?: string;
  name: string;
  email?: string;
  topic?: string;
  message: string;
  status: 'open' | 'closed' | 'pending';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  replies?: SupportReply[];
  createdAt: string;
}

export const useSupportRequests = (params: { page?: number; limit?: number; status?: string; search?: string; priority?: string } = {}) => {
  const qs = toQueryString(params);
  return useQuery({
    queryKey: ['support-requests', params],
    queryFn: () => api.getPaginated<SupportRequest>(`/admin/support/requests${qs ? `?${qs}` : ''}`),
    staleTime: LIST_STALE_TIME,
    select: (data) => data.items,
  });
};

export const useSupportRequestsPage = (params: { page?: number; limit?: number; status?: string; search?: string; priority?: string } = {}) =>
  usePaginatedQuery<SupportRequest>('support-requests', '/admin/support/requests', params);

export const useReplySupportRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message, authorName }: { id: string; message: string; authorName?: string }) =>
      api.post<SupportRequest>(`/admin/support/requests/${id}/reply`, { message, authorName }),
    onSuccess: () => {
      toast.success('Reply sent successfully');
      queryClient.invalidateQueries({ queryKey: ['support-requests'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send reply');
    }
  });
};

export const useUpdateSupportStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'open' | 'closed' | 'pending' }) =>
      api.patch<SupportRequest>(`/admin/support/requests/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Ticket status updated');
      queryClient.invalidateQueries({ queryKey: ['support-requests'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update status');
    }
  });
};

export const useUpdateSupportPriority = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: 'low' | 'medium' | 'high' | 'urgent' }) =>
      api.patch<SupportRequest>(`/admin/support/requests/${id}/priority`, { priority }),
    onSuccess: () => {
      toast.success('Ticket priority updated');
      queryClient.invalidateQueries({ queryKey: ['support-requests'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update priority');
    }
  });
};

export const useUpdateAdminProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { fullName?: string; email?: string }) =>
      api.patch<any>(`/admin/me`, payload),
    onSuccess: (data) => {
      toast.success('Profile updated successfully');
      localStorage.setItem('adminUser', JSON.stringify(data));
      window.dispatchEvent(new Event('admin:user-updated'));
      queryClient.invalidateQueries({ queryKey: ['admin-profile'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    }
  });
};

export const useChangeAdminPassword = () => {
  return useMutation({
    mutationFn: (payload: { currentPassword?: string; newPassword?: string }) =>
      api.post(`/admin/change-password`, payload),
    onSuccess: () => {
      toast.success('Password updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update password');
    }
  });
};

// --- Reports Hooks ---
export const useRevenueReport = () => {
  return useQuery({
    queryKey: ['reports-revenue'],
    queryFn: () => api.get<any>('/admin/reports/revenue'),
  });
};

export const useBookingsReport = () => {
  return useQuery({
    queryKey: ['reports-bookings'],
    queryFn: () => api.get<any>('/admin/reports/bookings'),
  });
};

export const useWorkersReport = () => {
  return useQuery({
    queryKey: ['reports-workers'],
    queryFn: () => api.get<any>('/admin/reports/workers'),
  });
};

export const useUsersReport = () => {
  return useQuery({
    queryKey: ['reports-users'],
    queryFn: () => api.get<any>('/admin/reports/users'),
  });
};

// --- Audit Log Hooks ---
export const useAuditLogs = (params: { page?: number; limit?: number; search?: string; action?: string; entityType?: string } = {}) => {
  const query = toQueryString(params);
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => api.get<any>(`/admin/audit-logs${query ? `?${query}` : ''}`),
  });
};

// --- Sub-Admin Hooks ---
export interface AdminUser {
  _id: string;
  fullName: string;
  email: string;
  role: 'superadmin' | 'admin' | 'support' | 'verifier' | 'finance';
  status: 'active' | 'inactive';
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export const useAdmins = () => {
  return useQuery({
    queryKey: ['admins'],
    queryFn: () => api.get<AdminUser[]>('/admin/admins'),
  });
};

export const useCreateAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<AdminUser, '_id' | 'createdAt' | 'updatedAt' | 'status'> & { password?: string }) =>
      api.post<AdminUser>('/admin/admins', data),
    onSuccess: () => {
      toast.success('Admin user created successfully');
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create admin user');
    },
  });
};

export const useToggleAdminStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<AdminUser>(`/admin/admins/${id}/status`, {}),
    onSuccess: (data) => {
      toast.success(`Admin user status updated to ${data.status}`);
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to toggle admin status');
    },
  });
};

export const useDeleteAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/admins/${id}`),
    onSuccess: () => {
      toast.success('Admin user deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete admin user');
    },
  });
};

// --- Dispute Queries & Mutations ---
export interface Dispute {
  _id: string;
  booking?: any;
  customer?: any;
  worker?: any;
  raisedBy: string;
  raisedByType: 'customer' | 'worker';
  reason: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  amountDisputed: number;
  proofImages: string[];
  adminNotes?: string;
  resolutionDetails?: string;
  resolvedBy?: any;
  resolvedAt?: string;
  createdAt: string;
  moderationApplied?: {
    warnedCustomer?: boolean;
    warnedWorker?: boolean;
    customerRefund?: number;
    workerPenalty?: number;
    customerBlocked?: boolean;
    workerBlocked?: boolean;
  };
  updatedAt: string;
}

export const useDisputes = (params: { page?: number; limit?: number; status?: string; reason?: string; search?: string } = {}) => {
  const qs = toQueryString(params);
  return useQuery({
    queryKey: ['disputes', params],
    queryFn: () => api.get<any>(`/admin/disputes${qs ? `?${qs}` : ''}`),
  });
};

export const useDisputesPage = (params: { page?: number; limit?: number; status?: string; reason?: string; search?: string } = {}) =>
  usePaginatedQuery<Dispute>('disputes', '/admin/disputes', params);

export const useDisputeDetails = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ['dispute', id],
    queryFn: () => api.get<Dispute>(`/admin/disputes/${id}`),
    enabled: !!id && enabled,
  });
};

export const useResolveDispute = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string;
      status: 'resolved' | 'dismissed' | 'under_review';
      adminNotes?: string;
      resolutionDetails?: string;
      refundAmount?: number;
      moderation?: {
        warnCustomer?: boolean;
        warnWorker?: boolean;
        workerPenalty?: number;
        blockCustomer?: boolean;
        blockWorker?: boolean;
        blockReason?: string;
      };
    }) =>
      api.patch<any>(`/admin/disputes/${id}/resolve`, data),
    onSuccess: (data: any) => {
      toast.success('Dispute resolution saved');
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      queryClient.invalidateQueries({ queryKey: ['dispute', data._id || data.data?._id] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to resolve dispute');
    },
  });
};

// --- Promo Code Queries & Mutations ---
export interface PromoCode {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minBookingAmount: number;
  maxDiscountAmount: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usageCount: number;
  userUsageLimit: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type PromoQueryParams = { page?: number; limit?: number; search?: string; status?: string; discountType?: string };

export const usePromos = (params: PromoQueryParams = {}) => {
  const qs = toQueryString(params);
  return useQuery({
    queryKey: ['promos', params],
    queryFn: () => api.get<any>(`/admin/promos${qs ? `?${qs}` : ''}`),
  });
};

export const usePromosPage = (params: PromoQueryParams = {}) =>
  usePaginatedQuery<PromoCode>('promos', '/admin/promos', params);

export const useCreatePromo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<PromoCode, '_id' | 'createdAt' | 'updatedAt' | 'isActive' | 'usageCount'>) =>
      api.post<PromoCode>('/admin/promos', data),
    onSuccess: () => {
      toast.success('Promo code created successfully');
      queryClient.invalidateQueries({ queryKey: ['promos'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create promo code');
    },
  });
};

export const useTogglePromoStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<PromoCode>(`/admin/promos/${id}/status`, {}),
    onSuccess: (data) => {
      toast.success(`Promo code is now ${data.isActive ? 'active' : 'inactive'}`);
      queryClient.invalidateQueries({ queryKey: ['promos'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to toggle status');
    },
  });
};

export const useDeletePromo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/admin/promos/${id}`),
    onSuccess: () => {
      toast.success('Promo code deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['promos'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete promo code');
    },
  });
};

// --- Verification Pipeline Hooks ---
export const useVerificationRequests = (params: { page?: number; limit?: number; status?: string; search?: string } = {}) => {
  const query = toQueryString(params);
  return useQuery({
    queryKey: ['verification-requests', params],
    queryFn: () => api.get<any>(`/admin/verification/requests${query ? `?${query}` : ''}`),
  });
};

export const useVerificationRequestsPage = (params: { page?: number; limit?: number; status?: string; search?: string } = {}) =>
  usePaginatedQuery<any>('verification-requests', '/admin/verification/requests', params);

export const useReviewVerificationRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, rejectionReason, adminNotes }: { id: string; status: 'approved' | 'rejected'; rejectionReason?: string; adminNotes?: string }) =>
      api.patch<any>(`/admin/verification/requests/${id}/review`, { status, rejectionReason, adminNotes }),
    onSuccess: () => {
      toast.success('Verification request reviewed successfully');
      queryClient.invalidateQueries({ queryKey: ['verification-requests'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      queryClient.invalidateQueries({ queryKey: ['nav-badges'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to review verification request');
    },
  });
};

/**
 * Aggregates badge counts for the sidebar navigation.
 * Uses server pagination totals so badges stay accurate beyond the first page.
 */
export const useNavBadges = () => {
  const { data: supportData } = useSupportRequestsPage({ status: 'open', limit: 1 });
  const { data: jobsData } = useJobsPage({ status: 'open', limit: 1 });
  const { data: bookingsData } = useBookingsPage({ status: 'pending', limit: 1 });
  const { data: workersData } = useWorkersPage({ verified: false, status: 'active', limit: 1 });
  const { data: topUpsData } = useWalletTopUpsPage({ status: 'pending', limit: 1 });
  const { data: disputesData } = useDisputesPage({ status: 'open', limit: 1 });
  const { data: verificationsData } = useVerificationRequestsPage({ status: 'pending', limit: 1 });
  const { data: specialtyData } = useSpecialtyRequestsPage({ limit: 1 });

  const openTickets = supportData?.pagination.totalItems ?? 0;
  const openJobs = jobsData?.pagination.totalItems ?? 0;
  const pendingBookings = bookingsData?.pagination.totalItems ?? 0;
  const unverifiedWorkers = workersData?.pagination.totalItems ?? 0;
  const pendingTopUps = topUpsData?.pagination.totalItems ?? 0;
  const openDisputes = disputesData?.pagination.totalItems ?? 0;
  const pendingVerifications = verificationsData?.pagination.totalItems ?? 0;
  const pendingSpecialties = specialtyData?.pagination.totalItems ?? 0;

  return {
    openTickets,
    openJobs,
    pendingBookings,
    unverifiedWorkers,
    pendingTopUps,
    openDisputes,
    pendingVerifications,
    pendingSpecialties,
  };
};
