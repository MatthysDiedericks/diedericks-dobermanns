import { Platform } from 'react-native';

import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export type IssueReportInput = {
  title: string;
  detail: string;
  page_path?: string;
};

/** Insert a user-reported issue (`source = reported`). Never throws to callers. */
export async function submitIssueReport(
  input: IssueReportInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = requireSupabase();
    const profile = useAuthStore.getState().profile;
    const title = input.title.trim();
    const detail = input.detail.trim();
    if (!title || !detail) {
      return { ok: false, error: 'Please describe what you were doing and what happened.' };
    }

    const { error } = await supabase.from('issue_reports').insert({
      source: 'reported',
      severity: 'normal',
      status: 'open',
      title,
      detail,
      page_path: input.page_path ?? 'app://portal',
      user_agent: `${Platform.OS} ${Platform.Version}`,
      reported_by: profile?.id ?? null,
      reporter_role: profile?.role ?? null,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    console.warn('[submitIssueReport]', e);
    return { ok: false, error: e instanceof Error ? e.message : 'Could not send report' };
  }
}
