import { Redirect } from 'expo-router';

import { getHomeRouteForRole } from '@/lib/auth/routes';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const initializing = useAuthStore((s) => s.initializing);
  const user = useAuthStore((s) => s.session?.user);
  const profile = useAuthStore((s) => s.profile);

  if (initializing) return null;

  if (!user) return <Redirect href="/(public)" />;

  const home = getHomeRouteForRole(profile?.role);
  if (home !== '/(public)/login') return <Redirect href={home as never} />;

  return <Redirect href="/(public)/login" />;
}
