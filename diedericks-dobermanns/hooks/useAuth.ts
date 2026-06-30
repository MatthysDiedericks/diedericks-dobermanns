import { useCallback, useState } from 'react';

import {
  sendPasswordReset as authSendPasswordReset,
  signInWithEmail,
  signOut as authSignOut,
  signUpWithEmail,
  updatePassword as authUpdatePassword,
} from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const refresh = useAuthStore((s) => s.refresh);
  const logout = useAuthStore((s) => s.logout);
  /** Application role from public.users — not the Supabase JWT role ("authenticated"). */
  const profile = useAuthStore((s) => s.profile);
  const role = useAuthStore((s) => s.getProfileRole());

  const signIn = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const { error } = await signInWithEmail(email.trim(), password);
        if (error) throw new Error(error);
        await refresh();
      } finally {
        setIsLoading(false);
      }
    },
    [refresh],
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      setIsLoading(true);
      try {
        const { error } = await signUpWithEmail(email.trim(), password, fullName.trim());
        if (error) throw new Error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  const sendPasswordReset = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      const { error } = await authSendPasswordReset(email.trim());
      if (error) throw new Error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    setIsLoading(true);
    try {
      const { error } = await authUpdatePassword(newPassword);
      if (error) throw new Error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    signIn,
    signUp,
    signOut,
    sendPasswordReset,
    updatePassword,
    isLoading,
    profile,
    role,
  };
}
