import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { portalCategoryLabel } from '@/lib/portal/documentLabels';
import { requireSupabase } from '@/lib/supabase';

type Row = {
  id: string;
  document_name: string;
  category: string;
  uploaded_by: string | null;
};

export function PendingClientDocsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    const supabase = requireSupabase();
    const { data } = await supabase
      .from('documents')
      .select('id, document_name, category, uploaded_by')
      .eq('provided_by', 'client')
      .eq('review_status', 'pending')
      .order('uploaded_at', { ascending: false });
    setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (rows.length === 0) return null;

  async function decide(id: string, decision: 'verified' | 'rejected') {
    const supabase = requireSupabase();
    await supabase
      .from('documents')
      .update({
        review_status: decision,
        review_note: decision === 'rejected' ? note.trim() || 'A clearer copy is needed.' : null,
      })
      .eq('id', id)
      .eq('provided_by', 'client');
    setNote('');
    void load();
  }

  return (
    <View className="mb-6">
      <Typography variant="label" className="mb-2 text-gold">
        PENDING CLIENT FILES
      </Typography>
      {rows.map((r) => (
        <View key={r.id} className="mb-3 rounded-xl border border-gold/20 bg-surface p-3">
          <Typography variant="caption" className="text-gold">
            {portalCategoryLabel(r.category)}
          </Typography>
          <Typography variant="body" className="mt-1">
            {r.document_name}
          </Typography>
          <Input label="If you need a clearer copy" value={note} onChangeText={setNote} />
          <View className="mt-2 flex-row gap-3">
            <Button label="Confirm" size="sm" onPress={() => void decide(r.id, 'verified')} />
            <Button
              label="Ask for a clearer copy"
              size="sm"
              variant="outline"
              onPress={() => void decide(r.id, 'rejected')}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
