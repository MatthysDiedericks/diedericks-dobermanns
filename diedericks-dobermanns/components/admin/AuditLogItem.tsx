import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import type { AuditLogEntry } from '@/hooks/useAuditLog';
import { fieldDiff } from '@/lib/audit/format';
import {
  actorLabel,
  EMPHASIZED_TABLES,
  humanize,
  summarizeEntry,
} from '@/lib/audit/labels';
import { timeAgo } from '@/lib/kennel/formatters';

export function AuditLogItem({ entry }: { entry: AuditLogEntry }) {
  const [open, setOpen] = useState(false);
  const actor = actorLabel(
    entry.actor_id,
    entry.actor_email,
    entry.actor_role,
    entry.actor_name,
  );
  const fields = entry.changed_fields ?? [];
  const emphasized = EMPHASIZED_TABLES.has(entry.table_name);
  const summary = summarizeEntry({
    actor: actor.label,
    action: entry.action,
    fields,
    recordLabel: entry.record_label,
  });

  const single =
    entry.action === 'update' && fields.length === 1
      ? fieldDiff(fields[0]!, entry.old_values, entry.new_values)
      : null;
  const multi =
    entry.action === 'update' && fields.length > 1
      ? fields.map((f) => ({ field: f, ...fieldDiff(f, entry.old_values, entry.new_values) }))
      : null;

  return (
    <Card
      className={`mb-3 ${emphasized ? 'border-l-2 border-l-gold' : ''} ${
        actor.isSystem ? 'opacity-80' : ''
      }`}
    >
      <Typography
        variant="body"
        className={actor.isSystem ? 'italic text-silver' : undefined}
      >
        {summary}
      </Typography>

      {single ? (
        <Typography variant="caption" className="mt-1 text-silver">
          {single.from} → {single.to}
        </Typography>
      ) : null}

      {multi ? (
        <Pressable onPress={() => setOpen((v) => !v)} className="mt-1">
          <Typography variant="caption" className="text-gold">
            {open ? 'Hide fields' : fields.map(humanize).join(', ')}
          </Typography>
        </Pressable>
      ) : null}

      {open && multi
        ? multi.map((d) => (
            <View key={d.field} className="mt-1">
              <Typography variant="caption" className="text-silver">
                {humanize(d.field)} · {d.from} → {d.to}
              </Typography>
            </View>
          ))
        : null}

      <Typography variant="caption" className="mt-2 text-subtle">
        {timeAgo(entry.created_at)}
      </Typography>
    </Card>
  );
}
