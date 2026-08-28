import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { canAttachHandoverPdf } from '@/lib/handover/attachLimit';
import { defaultHandoverMessage, defaultHandoverSubject } from '@/lib/handover/copy';
import {
  EMPTY_CHOICE,
  formatPackBytes,
  hasGroup,
  includesCert,
  PACK_GROUP_KEYS,
  parsePackQuery,
  serializePackQuery,
  type PackChoice,
  type PackGroupKey,
} from '@/lib/handover/sections';
import {
  fetchHandoverOutline,
  printHandoverPack,
  sendHandoverPack,
  shareHandoverPack,
  type HandoverOutline,
} from '@/lib/handover/sharePack';
import { openWhatsAppDraft } from '@/lib/followUps/whatsapp';

const STORAGE_KEY = 'dd-handover-pack-selection';
const ALL_GROUPS = new Set<PackGroupKey>(PACK_GROUP_KEYS);

export function HandoverPackActions({
  dogId,
  dogName,
  canGenerate,
  released,
}: {
  dogId: string;
  dogName: string;
  canGenerate: boolean;
  released?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [outline, setOutline] = useState<HandoverOutline | null>(null);
  const [choice, setChoice] = useState<PackChoice>(EMPTY_CHOICE);
  const [preview, setPreview] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => setChoice(parsePackQuery(raw)));
    void fetchHandoverOutline(dogId)
      .then(setOutline)
      .catch(() => setOutline(null));
  }, [dogId]);

  const totals = useMemo(() => {
    if (!outline) return { pages: 0, bytes: 0 };
    let pages = 0;
    let bytes = 0;
    for (const item of outline.items) {
      if (item.id === 'cover' || item.locked) {
        pages += item.pages;
        bytes += item.bytes;
      } else if (item.id === 'sire' || item.id === 'dam') {
        for (const child of item.children ?? []) {
          if (includesCert(choice, child.id, item.id)) {
            pages += child.pages;
            bytes += child.bytes;
          }
        }
      } else if (hasGroup(choice, item.id as PackGroupKey)) {
        pages += item.pages;
        bytes += item.bytes;
      }
    }
    return { pages, bytes };
  }, [outline, choice]);

  function persist(next: PackChoice) {
    setChoice(next);
    void AsyncStorage.setItem(STORAGE_KEY, serializePackQuery(next));
  }

  function toggleGroup(key: PackGroupKey, on: boolean) {
    const groups = new Set(choice.all ? ALL_GROUPS : choice.groups);
    if (on) groups.add(key);
    else groups.delete(key);
    persist({ all: false, groups, certIds: new Set(choice.certIds) });
  }

  function run(fn: () => Promise<void>) {
    setBusy(true);
    fn()
      .catch((e) => Alert.alert('Handover pack', e instanceof Error ? e.message : 'Failed'))
      .finally(() => setBusy(false));
  }

  if (!canGenerate && !released) {
    return (
      <Typography variant="caption" className="mt-3 text-subtle">
        The handover pack appears here after go-home. Bulk generation is website-only.
      </Typography>
    );
  }

  const email = outline?.buyerEmail ?? null;
  const labels =
    outline?.items.flatMap((item) => {
      if (item.id === 'cover' || item.locked) return [item.label];
      if (item.id === 'sire' || item.id === 'dam') {
        return (item.children ?? [])
          .filter((c) => includesCert(choice, c.id, item.id))
          .map((c) => c.label);
      }
      return hasGroup(choice, item.id as PackGroupKey) ? [item.label] : [];
    }) ?? [];
  return (
    <View className="mt-3">
      {(outline?.items ?? []).map((item) => (
        <Pressable
          key={item.id}
          className="flex-row items-center py-1"
          disabled={item.locked}
          onPress={() => toggleGroup(item.id as PackGroupKey, !hasGroup(choice, item.id as PackGroupKey))}
        >
          <Typography variant="body">
            {(item.locked || hasGroup(choice, item.id as PackGroupKey) ? '☑' : '☐') + ' '}
            {item.label}{item.locked ? ' (always)' : ''}
          </Typography>
        </Pressable>
      ))}
      {(outline?.items ?? [])
        .filter((i) => i.children?.length)
        .map((item) => (
          <View key={`${item.id}-kids`} className="pl-4">
            {(item.children ?? []).map((child) => (
              <Pressable
                key={child.id}
                className="py-1"
                onPress={() => {
                  const groups = new Set(choice.all ? ALL_GROUPS : choice.groups);
                  const certIds = new Set(choice.certIds);
                  const on = includesCert(choice, child.id, item.id as 'sire' | 'dam');
                  groups.delete(item.id as PackGroupKey);
                  if (on) certIds.delete(child.id.toLowerCase());
                  else certIds.add(child.id.toLowerCase());
                  persist({ all: false, groups, certIds });
                }}
              >
                <Typography variant="caption">
                  {includesCert(choice, child.id, item.id as 'sire' | 'dam') ? '☑' : '☐'} {child.label}
                </Typography>
              </Pressable>
            ))}
          </View>
        ))}

      <Typography variant="caption" className="mt-2 text-gold">
        {totals.pages} pages · {formatPackBytes(totals.bytes)}
      </Typography>
      <Button
        label={busy ? 'Preparing…' : 'Share pack'}
        variant="secondary"
        disabled={busy}
        onPress={() => run(() => shareHandoverPack(dogId, choice))}
        className="mt-3"
      />
      {canGenerate ? (
        <Button
          label="Print pack"
          variant="ghost"
          className="mt-2"
          disabled={busy}
          onPress={() => run(() => printHandoverPack(dogId, choice))}
        />
      ) : null}
      {email ? (
        <Button
          label="Email to buyer"
          variant="ghost"
          className="mt-2"
          disabled={busy}
          onPress={() => {
            setSubject(defaultHandoverSubject(dogName));
            setMessage(
              defaultHandoverMessage({
                buyerName: outline?.buyerName ?? null,
                puppyName: dogName,
                portalUrl: outline?.portalUrl ?? 'https://diedericksdobermanns.com/portal',
              }),
            );
            setSendError(null);
            setPreview(true);
          }}
        />
      ) : (
        <Typography variant="caption" className="mt-2 text-subtle">
          Email to buyer is off — no email on file. Link the contact on the website.
        </Typography>
      )}
      <Button
        label="Copy link"
        variant="ghost"
        className="mt-2"
        onPress={() =>
          void Share.share({
            message: outline?.portalUrl ?? 'https://diedericksdobermanns.com/portal',
          })
        }
      />
      {outline?.buyerPhone ? (
        <Button
          label="WhatsApp"
          variant="ghost"
          className="mt-2"
          onPress={() =>
            void openWhatsAppDraft(
              outline.buyerPhone,
              defaultHandoverMessage({
                buyerName: outline.buyerName,
                puppyName: dogName,
                portalUrl: outline.portalUrl,
              }),
            )
          }
        />
      ) : null}

      <Modal visible={preview} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="max-h-[90%] rounded-t-lg bg-surface p-4">
            <ScrollView>
              <Typography variant="label" className="text-gold">
                EMAIL TO BUYER
              </Typography>
              <Typography variant="caption" className="mt-2 text-muted">
                To {email}
              </Typography>
              <Typography variant="caption" className="text-muted">
                {totals.pages} pages · {formatPackBytes(totals.bytes)}
              </Typography>
              {labels.map((l) => (
                <Typography key={l} variant="caption">
                  • {l}
                </Typography>
              ))}
              <Typography variant="caption" className="mt-2 text-gold">
                {canAttachHandoverPdf(totals.bytes)
                  ? 'The PDF will be attached, plus the portal link.'
                  : 'Too large to attach — portal link only.'}
              </Typography>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                className="mt-3 border border-gold/30 p-2 text-text"
              />
              <TextInput
                value={message}
                onChangeText={setMessage}
                multiline
                className="mt-2 min-h-[120px] border border-gold/30 p-2 text-text"
              />
              {sendError ? (
                <Typography variant="caption" className="mt-2 text-danger">
                  {sendError}
                </Typography>
              ) : null}
              <Button
                label={busy ? 'Sending…' : 'Send'}
                className="mt-3"
                disabled={busy || !subject.trim() || !message.trim()}
                onPress={() => {
                  setBusy(true);
                  setSendError(null);
                  void sendHandoverPack({
                    dogId,
                    packQuery: serializePackQuery(choice),
                    subject: subject.trim(),
                    message: message.trim(),
                  }).then((res) => {
                    setBusy(false);
                    if (res.error) setSendError(res.error);
                    else {
                      setPreview(false);
                      Alert.alert('Handover pack', `Sent to ${res.to ?? email}.`);
                    }
                  });
                }}
              />
              <Button label="Cancel" variant="ghost" className="mt-2" onPress={() => setPreview(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
