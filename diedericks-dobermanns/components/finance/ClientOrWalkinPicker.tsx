import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import type { AppUser } from '@/types/app.types';

interface Props {
  mode: 'client' | 'walkin';
  clientId: string | null;
  walkinName: string;
  walkinContact: string;
  clients: AppUser[];
  showQuickAdd: boolean;
  onSelectClient: (id: string) => void;
  onOpenQuickAdd: () => void;
  onToggleQuickAdd: () => void;
  onChangeWalkinName: (v: string) => void;
  onChangeWalkinContact: (v: string) => void;
  onConfirmWalkin: (name: string, contact: string) => void;
}

/** Shared "pick an app client, or quick-add a walk-in with no account" control for
 * the quote (and, later, invoice) builders — extracted to keep new.tsx under budget. */
export function ClientOrWalkinPicker({
  mode,
  clientId,
  walkinName,
  walkinContact,
  clients,
  showQuickAdd,
  onSelectClient,
  onOpenQuickAdd,
  onToggleQuickAdd,
  onChangeWalkinName,
  onChangeWalkinContact,
  onConfirmWalkin,
}: Props) {
  return (
    <View>
      <Typography variant="label" className="mb-2 text-silver">Client</Typography>
      {mode === 'walkin' ? (
        <View className="mb-3 flex-row items-center justify-between rounded-xl border border-gold/30 bg-gold/10 px-4 py-3">
          <Typography variant="caption" className="text-gold">Walk-in: {walkinName}</Typography>
          <Pressable onPress={onOpenQuickAdd}>
            <Typography variant="caption" className="text-gold underline">Edit</Typography>
          </Pressable>
        </View>
      ) : clientId ? (
        <Typography variant="caption" className="mb-3 text-gold">
          Linked client: {clients.find((c) => c.id === clientId)?.full_name ?? 'Selected'}
        </Typography>
      ) : null}

      <View className="mb-5 flex-row flex-wrap gap-2">
        {clients.map((c) => {
          const active = mode === 'client' && clientId === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => onSelectClient(c.id)}
              className={`rounded-xl border px-4 py-2.5 ${
                active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
              }`}
            >
              <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                {c.full_name ?? 'Unnamed'}
              </Typography>
            </Pressable>
          );
        })}
        <Pressable
          onPress={onToggleQuickAdd}
          className={`rounded-xl border px-4 py-2.5 ${
            mode === 'walkin' ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
          }`}
        >
          <Typography variant="caption" className={mode === 'walkin' ? 'text-gold' : 'text-ink-muted'}>
            + Quick add
          </Typography>
        </Pressable>
      </View>

      {showQuickAdd ? (
        <Card className="mb-5">
          <Typography variant="label" className="mb-2 text-silver">Walk-in client (no app account)</Typography>
          <Input placeholder="Full name" defaultValue={walkinName} onChangeText={onChangeWalkinName} />
          <Input
            placeholder="Phone or email (optional)"
            defaultValue={walkinContact}
            onChangeText={onChangeWalkinContact}
          />
          <Button
            label="Use this client"
            size="sm"
            onPress={() => onConfirmWalkin(walkinName, walkinContact)}
            disabled={!walkinName.trim()}
            className="mt-2 self-start"
          />
        </Card>
      ) : null}
    </View>
  );
}
