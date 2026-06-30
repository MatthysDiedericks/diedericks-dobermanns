import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { fetchUserProfile, getCurrentSession, signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { AppUser, UserRole } from '@/types/app.types';

interface AuthState {
  session: Session | null;
  /** Application profile from public.users — role checks must use this, not the JWT. */
  profile: AppUser | null;
  initializing: boolean;
  /** True while public.users profile is being fetched for the current session. */
  profileLoading: boolean;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  /** Role from public.users.profile.role — never session.user.role. */
  getProfileRole: () => UserRole | undefined;
  hasRole: (...roles: UserRole[]) => boolean;
  setProfile: (profile: AppUser | null) => void;
}

let authListenerRegistered = false;

async function loadProfile(session: Session | null): Promise<AppUser | null> {
  if (!session?.user?.id) return null;
  return fetchUserProfile(session.user.id);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  initializing: true,
  profileLoading: false,

  initialize: async () => {
    const session = await getCurrentSession();
    set({ session, profileLoading: session != null });

    const profile = await loadProfile(session);
    set({ session, profile, initializing: false, profileLoading: false });

    if (!authListenerRegistered && supabase) {
      authListenerRegistered = true;
      supabase.auth.onAuthStateChange((_event, nextSession) => {
        void (async () => {
          if (!nextSession) {
            set({ session: null, profile: null, profileLoading: false });
            return;
          }

          set({ session: nextSession, profileLoading: true });

          // Defer until JWT is attached to the client (Supabase auth listener quirk).
          await new Promise((resolve) => setTimeout(resolve, 0));

          const nextProfile = await loadProfile(nextSession);
          set((state) => ({
            session: nextSession,
            profileLoading: false,
            profile:
              nextProfile ??
              (state.profile?.id === nextSession.user.id ? state.profile : null),
          }));
        })();
      });
    }
  },

  refresh: async () => {
    const session = await getCurrentSession();
    set({ session, profileLoading: session != null });
    const profile = await loadProfile(session);
    set({ session, profile, profileLoading: false });
  },

  logout: async () => {
    await signOut();
    set({ session: null, profile: null, profileLoading: false });
  },

  isAuthenticated: () => get().session != null,

  getProfileRole: () => get().profile?.role,

  hasRole: (...roles: UserRole[]) => {
    const role = get().profile?.role;
    return role != null && roles.includes(role);
  },

  setProfile: (profile) => set({ profile }),
}));
