import { useCallback, useState } from 'react';

import {
  resendSignupOtp,
  sendPasswordReset as authSendPasswordReset,
  signInWithEmail,
  signOut as authSignOut,
  signUpWithEmail,
  updatePassword as authUpdatePassword,
  verifySignupOtp,
  verifyInviteOtp,
} from '@/lib/auth';
import { claimMyRecords } from '@/lib/claimMyRecords';
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
        const { error, userId } = await signInWithEmail(email.trim(), password);
        if (error) throw new Error(error);
        if (userId) void claimMyRecords(userId);
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

  const verifyOtp = useCallback(
    async (email: string, token: string) => {
      setIsLoading(true);
      try {
        const signup = await verifySignupOtp(email.trim(), token.trim());
        if (!signup.error) {
          if (signup.userId) void claimMyRecords(signup.userId);
          await refresh();
          return;
        }
        const invite = await verifyInviteOtp(email.trim(), token.trim());
        if (invite.error) throw new Error(invite.error);
        if (invite.userId) void claimMyRecords(invite.userId);
        await refresh();
      } finally {
        setIsLoading(false);
      }
    },
    [refresh],
  );

  const resendOtp = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      const { error } = await resendSignupOtp(email.trim());
      if (error) throw new Error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    verifyOtp,
    resendOtp,
    signOut,
    sendPasswordReset,
    updatePassword,
    isLoading,
    profile,
    role,
  };
}
