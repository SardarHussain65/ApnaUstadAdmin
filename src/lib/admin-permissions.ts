export type AdminRole = 'superadmin' | 'admin' | 'support' | 'verifier' | 'finance';

export type AdminPermission =
  | 'dashboard'
  | 'reports'
  | 'users'
  | 'workers'
  | 'onboarding'
  | 'verification'
  | 'specialty-requests'
  | 'jobs'
  | 'bookings'
  | 'payments'
  | 'wallets'
  | 'categories'
  | 'promos'
  | 'reviews'
  | 'notifications'
  | 'support'
  | 'disputes'
  | 'audit'
  | 'admins'
  | 'settings'
  | 'platform-config';

const ALL_PERMISSIONS: AdminPermission[] = [
  'dashboard',
  'reports',
  'users',
  'workers',
  'onboarding',
  'verification',
  'specialty-requests',
  'jobs',
  'bookings',
  'payments',
  'wallets',
  'categories',
  'promos',
  'reviews',
  'notifications',
  'support',
  'disputes',
  'audit',
  'admins',
  'settings',
  'platform-config',
];

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[] | ['*']> = {
  superadmin: ['*'],
  admin: ['*'],
  support: ['dashboard', 'users', 'bookings', 'support', 'disputes', 'notifications', 'settings'],
  verifier: ['dashboard', 'workers', 'onboarding', 'verification', 'specialty-requests', 'settings'],
  finance: ['dashboard', 'reports', 'payments', 'wallets', 'promos', 'bookings', 'settings'],
};

export const hasAdminPermission = (role: string | undefined, permission: AdminPermission): boolean => {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role as AdminRole];
  if (!permissions) return false;
  if (permissions.includes('*')) return true;
  return permissions.includes(permission);
};

export const getPermissionsForRole = (role: string | undefined): AdminPermission[] => {
  if (!role) return [];
  const permissions = ROLE_PERMISSIONS[role as AdminRole];
  if (!permissions) return [];
  if (permissions.includes('*')) return ALL_PERMISSIONS;
  return permissions;
};

export const canAccessRoute = (role: string | undefined, path: string): boolean => {
  const routePermissionMap: Record<string, AdminPermission> = {
    '/dashboard': 'dashboard',
    '/reports': 'reports',
    '/users': 'users',
    '/workers': 'workers',
    '/onboarding': 'onboarding',
    '/verification': 'verification',
    '/specialty-requests': 'specialty-requests',
    '/jobs': 'jobs',
    '/bookings': 'bookings',
    '/payments': 'payments',
    '/wallets': 'wallets',
    '/categories': 'categories',
    '/promos': 'promos',
    '/reviews': 'reviews',
    '/notifications': 'notifications',
    '/support': 'support',
    '/disputes': 'disputes',
    '/audit': 'audit',
    '/admins': 'admins',
    '/settings': 'settings',
    '/platform-config': 'platform-config',
  };

  const matched = Object.entries(routePermissionMap).find(([route]) => path === route || path.startsWith(`${route}/`));
  if (!matched) return true;
  return hasAdminPermission(role, matched[1]);
};
