import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { DateField } from '@/components/ui/DateField';
import { Typography } from '@/components/ui/Typography';
import { useApplicationFunnel } from '@/hooks/useApplicationFunnel';
import {
  APPLY_DEVICES,
  formatDrop,
  type ApplyDevice,
  type FunnelSnapshot,
} from '@/lib/applications/funnel';

export function ApplicationFunnel() {
  const {
    snapshot,
    trackingReady,
    loading,
    error,
    from,
    to,
    setFrom,
    setTo,
    applyRange,
  } = useApplicationFunnel();

  return (
    <FunnelPanel
      snapshot={snapshot}
      trackingReady={trackingReady}
      loading={loading}
      error={error}
      from={from}
      to={to}
      setFrom={setFrom}
      setTo={setTo}
      onApplyRange={applyRange}
    />
  );
}

export function FunnelPanel({
  snapshot,
  trackingReady,
  loading,
  error,
  from,
  to,
  setFrom,
  setTo,
  onApplyRange,
  hideRangeForm,
  notLiveMessage,
}: {
  snapshot: FunnelSnapshot;
  trackingReady: boolean;
  loading?: boolean;
  error?: string | null;
  from?: string;
  to?: string;
  setFrom?: (v: string) => void;
  setTo?: (v: string) => void;
  onApplyRange?: () => void;
  hideRangeForm?: boolean;
  notLiveMessage?: string;
}) {
  const [device, setDevice] = useState<ApplyDevice | 'all'>('all');
  const slice =
    device === 'all'
      ? {
          rows: snapshot.rows,
          submitted: snapshot.submitted,
          tooLittleData: snapshot.tooLittleData,
        }
      : snapshot.byDevice[device];
  const rows = slice.rows;
  const submitted = slice.submitted;
  const tooLittleData = slice.tooLittleData;
  const biggest = tooLittleData ? undefined : rows.find((r) => r.isBiggestDrop);

  return (
    <View className="mb-4 px-6">
      <Card>
        <Typography variant="label" className="mb-1">
          Where they give up
        </Typography>
        <Typography variant="caption" className="mb-3">
          Drop between steps is the number that matters.
        </Typography>

        {!hideRangeForm && from != null && to != null && setFrom && setTo && onApplyRange ? (
          <>
            <DateField label="From" value={from} onChange={setFrom} />
            <DateField label="To" value={to} onChange={setTo} />
            <Pressable
              onPress={onApplyRange}
              className="mb-4 rounded-xl border border-gold/40 px-4 py-3"
            >
              <Typography variant="body" className="text-center text-gold">
                {loading ? 'Loading…' : 'Update'}
              </Typography>
            </Pressable>
          </>
        ) : null}

        {error ? (
          <Typography variant="caption" className="mb-3 text-danger">
            {error}
          </Typography>
        ) : null}

        {!trackingReady ? (
          <Typography variant="caption" className="mb-3">
            {notLiveMessage ??
              'Step tracking starts once migration 0178 is applied. Page views still show below.'}
          </Typography>
        ) : null}

        {trackingReady && !loading && tooLittleData ? (
          <Typography variant="caption" className="mb-3">
            Counts are shown. Percentages are hidden — too little data to read.
          </Typography>
        ) : null}

        {biggest && biggest.dropCount ? (
          <View className="mb-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2">
            <Typography variant="caption" className="text-amber-200">
              Biggest drop: {biggest.label} {formatDrop(biggest)}
            </Typography>
          </View>
        ) : null}

        <View className="mb-3 flex-row flex-wrap gap-2">
          {(['all', ...APPLY_DEVICES] as const).map((key) => (
            <Pressable
              key={key}
              onPress={() => setDevice(key)}
              className={
                device === key
                  ? 'rounded-full bg-gold px-3 py-1'
                  : 'rounded-full border border-gold/30 px-3 py-1'
              }
            >
              <Typography
                variant="caption"
                className={device === key ? 'text-black' : 'text-gold'}
              >
                {key === 'all' ? 'All devices' : key}
              </Typography>
            </Pressable>
          ))}
        </View>

        {device !== 'all' ? (
          <Typography variant="caption" className="mb-2">
            Device split starts at step 1. Submitted on {device}: {submitted}.
          </Typography>
        ) : null}

        {rows.map((row) => {
          const lead = rows[0]?.count || 1;
          const width = Math.min(100, Math.round((row.count / lead) * 100));
          return (
            <View key={row.id} className="border-b border-gold/10 py-2">
              <View className="flex-row items-baseline justify-between">
                <Typography
                  variant="caption"
                  className={`flex-1 ${row.isBiggestDrop ? 'text-amber-200' : ''}`}
                >
                  {row.label}
                </Typography>
                <Typography
                  variant="subtitle"
                  className={row.isBiggestDrop ? 'text-amber-200' : 'text-gold'}
                >
                  {row.dropPct != null ? formatDrop(row) : '—'}
                </Typography>
                <Typography variant="caption" className="ml-2 w-16 text-right opacity-60">
                  {row.count}
                  {row.pctOfViews != null ? ` (${row.pctOfViews}%)` : ''}
                </Typography>
              </View>
              <View className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                <View className="h-full rounded-full bg-gold" style={{ width: `${width}%` }} />
              </View>
            </View>
          );
        })}

        <Typography variant="label" className="mb-2 mt-5">
          Why they stopped
        </Typography>
        {snapshot.feedback.length === 0 ? (
          <Typography variant="caption">No feedback yet.</Typography>
        ) : (
          snapshot.feedback.map((line, i) => (
            <View key={`${line.occurredAt}-${i}`} className="mb-2">
              <Typography variant="caption" className="opacity-60">
                {line.occurredAt.slice(0, 10)}
                {line.device ? ` · ${line.device}` : ''}
              </Typography>
              <Typography variant="body">{line.note}</Typography>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}
