import { useAuthStore } from '@/stores/authStore';

const FINANCE_ROLES = ['admin', 'super_admin', 'accountant'] as const;

export function useFinanceAccess() {
  const role = useAuthStore((s) => s.profile?.role);
  return FINANCE_ROLES.includes(role as typeof FINANCE_ROLES[number]);
}
