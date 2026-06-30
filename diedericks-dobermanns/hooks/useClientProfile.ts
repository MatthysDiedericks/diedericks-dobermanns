import { useCallback, useState } from 'react';

import { CLIENT_PROFILE_SELECT } from '@/lib/auth/profileSelect';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { AppUser } from '@/types/app.types';
import type { TablesUpdate } from '@/types/database.types';

export interface ClientProfileUpdate {
  full_name?: string;
  phone?: string;
  whatsapp_number?: string;
  address?: string;
  country?: string;
  dog_experience?: string;
  current_pets?: string;
  has_children?: boolean;
  property_type?: string;
  has_fencing?: boolean;
  purpose?: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  vet_practice?: string;
  vet_name?: string;
  vet_phone?: string;
}

function mapRowToAppUser(id: string, row: Record<string, unknown>): AppUser {
  return {
    id,
    full_name: (row.full_name as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    country: (row.country as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    whatsapp_number: (row.whatsapp_number as string | null) ?? null,
    dog_experience: (row.dog_experience as string | null) ?? null,
    current_pets: (row.current_pets as string | null) ?? null,
    has_children: (row.has_children as boolean | null) ?? null,
    property_type: (row.property_type as string | null) ?? null,
    has_fencing: (row.has_fencing as boolean | null) ?? null,
    purpose: (row.purpose as string[] | null) ?? null,
    emergency_contact_name: (row.emergency_contact_name as string | null) ?? null,
    emergency_contact_phone: (row.emergency_contact_phone as string | null) ?? null,
    emergency_contact_relationship: (row.emergency_contact_relationship as string | null) ?? null,
    vet_practice: (row.vet_practice as string | null) ?? null,
    vet_name: (row.vet_name as string | null) ?? null,
    vet_phone: (row.vet_phone as string | null) ?? null,
    profile_completed_at: (row.profile_completed_at as string | null) ?? null,
    role: row.role as AppUser['role'],
    avatar_url: (row.avatar_url as string | null) ?? null,
    marketing_opt_in: Boolean(row.marketing_opt_in),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

export function useClientProfile() {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (patch: ClientProfileUpdate) => {
      if (!profile?.id) return;
      setSaving(true);
      setError(null);
      try {
        const merged = { ...profile, ...patch };
        const isComplete =
          !!merged.full_name && !!merged.phone && !!merged.address && !!merged.dog_experience;
        const payload: TablesUpdate<'users'> = {
          ...patch,
          ...(isComplete && !profile.profile_completed_at
            ? { profile_completed_at: new Date().toISOString() }
            : {}),
        };

        const { data, error: err } = await requireSupabase()
          .from('users')
          .update(payload)
          .eq('id', profile.id)
          .select(CLIENT_PROFILE_SELECT)
          .single();
        if (err) throw new Error(err.message);
        setProfile(mapRowToAppUser(profile.id, data as unknown as Record<string, unknown>));
        showSaved('Saved ✓');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not save profile';
        setError(msg);
        showError('Could not save — try again');
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [profile, setProfile],
  );

  const isComplete = !!(
    profile?.full_name &&
    profile?.phone &&
    profile?.address &&
    profile?.dog_experience
  );

  const completionPercent = (() => {
    if (!profile) return 0;
    const required = [
      profile.full_name,
      profile.phone,
      profile.address,
      profile.country,
      profile.dog_experience,
    ];
    const filled = required.filter(Boolean).length;
    return Math.round((filled / required.length) * 100);
  })();

  return { profile, save, saving, error, isComplete, completionPercent };
}
