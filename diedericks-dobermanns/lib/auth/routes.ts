import type { UserRole } from '@/types/app.types';

const STAFF_ROLES: UserRole[] = ['trainer', 'management', 'admin', 'super_admin'];

/** Route group home screen after sign-in. */
export function getHomeRouteForRole(role: UserRole | undefined): string {
  if (isAdminPlus(role)) return '/(admin)/dashboard';
  if (role === 'trainer') return '/(trainer)/bookings';
  if (role === 'client') return '/(portal)/dashboard';
  return '/(public)/login';
}

export function isStaffRole(role: UserRole | undefined): boolean {
  return role != null && STAFF_ROLES.includes(role);
}

export function isTrainerOrAbove(role: UserRole | undefined): boolean {
  return isStaffRole(role);
}

export function isAdminPlus(role: UserRole | undefined): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'management';
}

/** Admin route guard — uses public.users.role, not Supabase session role. */
export function isAdminGuardRole(role: UserRole | undefined): boolean {
  return role === 'admin' || role === 'super_admin';
}
