import { InviteToPortalButton } from "@/components/admin/InviteToPortalButton";
import { InviteStateChip } from "@/components/admin/InviteStateChip";
import { PreferenceBadges } from "@/components/waitlist/PreferenceBadges";
import { PipelineBreadcrumb } from "@/components/waitlist/PipelineBreadcrumb";
import { StageSelector } from "@/components/waitlist/StageSelector";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Typography } from "@/components/ui/Typography";
import { Colors } from "@/constants/colors";
import { updateWaitlistEntry, useSubmitting } from "@/hooks/useMutations";
import { useWaitlistEntry } from "@/hooks/useWaitingList";
import { WAITLIST_HISTORY_SELECT } from "@/lib/waitlist/queries";
import { daysWaiting, stageLabel } from "@/lib/waitlist/constants";
import { entryDisplayName, entryEmail, entryPhone, effectiveStage } from "@/lib/waitlist/helpers";
import { supabase } from "@/lib/supabase";
import { fetchInviteStates, type InviteStateRow } from "@/lib/portal/invite";
import { formatPrice } from "@/lib/format";
import type { WaitingListHistoryRow } from "@/types/app.types";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from "react-native";

type Tab = "overview" | "preferences" | "history" | "notes";

export default function WaitlistEntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { entry, loading, refresh } = useWaitlistEntry(id ?? "");
  const { submitting, run } = useSubmitting();
  const [tab, setTab] = useState<Tab>("overview");
  const [stageOpen, setStageOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [history, setHistory] = useState<WaitingListHistoryRow[]>([]);
  const [inviteState, setInviteState] = useState<InviteStateRow | null>(null);

  useEffect(() => {
    if (entry) {
      setAdminNotes(entry.admin_notes ?? "");
      setFollowUp(entry.follow_up_date ?? "");
    }
  }, [entry]);

  useEffect(() => {
    const email = entry ? entryEmail(entry) : null;
    if (!email) return;
    void fetchInviteStates([email]).then((map) => setInviteState(map.get(email.toLowerCase()) ?? null));
  }, [entry]);

  useEffect(() => {
    void (async () => {
      if (!id || !supabase) return;
      const { data } = await supabase
        .from("waiting_list_history")
        .select(WAITLIST_HISTORY_SELECT)
        .eq("waiting_list_id", id)
        .order("created_at", { ascending: false });
      setHistory((data ?? []) as unknown as WaitingListHistoryRow[]);
    })();
  }, [id, entry?.pipeline_stage]);

  const reachedAt = useMemo(() => {
    const map: Record<string, string> = {};
    for (const h of [...history].reverse()) map[h.to_stage] = h.created_at;
    if (entry?.stage_updated_at && entry.pipeline_stage) {
      map[entry.pipeline_stage] = entry.stage_updated_at;
    }
    return map;
  }, [history, entry]);

  async function saveNotes() {
    if (!entry) return;
    await run(() =>
      updateWaitlistEntry(entry.id, {
        admin_notes: adminNotes.trim() || null,
        follow_up_date: followUp.trim() || null,
      }),
    );
    refresh();
  }

  if (loading || !entry) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  const days = daysWaiting(entry.date_added ?? entry.created_at);
  const tabs: Tab[] = ["overview", "preferences", "history", "notes"];

  return (
    <ScreenContainer>
      <View className="px-4 pt-2">
        <Pressable onPress={() => router.back()} className="mb-2 h-9 w-9 items-center justify-center rounded-full border border-gold/30">
          <Ionicons name="arrow-back" size={18} color={Colors.gold} />
        </Pressable>
      </View>
      <PageHeader eyebrow="Waiting List" title={entryDisplayName(entry)} back={false} />
      <View className="mb-3 flex-row flex-wrap gap-2 px-4">
        <Badge label={stageLabel(effectiveStage(entry))} tone="gold" />
        <Badge label={entry.priority} tone="muted" />
        <InviteStateChip state={inviteState} />
        <Typography variant="subtitle" className={days >= 180 ? "text-danger" : days >= 90 ? "text-warning" : "text-gold"}>
          {days}d waiting
        </Typography>
      </View>
      <View className="mb-4 flex-row flex-wrap gap-2 px-4">
        {entryPhone(entry) ? (
          <Button label="Call" size="sm" variant="outline" onPress={() => Linking.openURL(`tel:${entryPhone(entry)}`)} />
        ) : null}
        {entryEmail(entry) ? (
          <Button label="Email" size="sm" variant="outline" onPress={() => Linking.openURL(`mailto:${entryEmail(entry)}`)} />
        ) : null}
        <Button label="Move stage" size="sm" onPress={() => setStageOpen(true)} />
      </View>
      <View className="mb-4 px-4">
        <InviteToPortalButton
          email={entryEmail(entry)}
          fullName={entryDisplayName(entry)}
          phone={entryPhone(entry)}
          source="waiting_list"
          sourceId={entry.id}
          initialState={inviteState}
        />
      </View>

      <ScrollView horizontal className="mb-4 px-4">
        {tabs.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} className={`mr-2 rounded-full border px-3 py-1.5 ${tab === t ? "border-gold bg-gold/15" : "border-gold/20"}`}>
            <Typography variant="caption" className={tab === t ? "text-gold" : ""}>{t}</Typography>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView className="px-4 pb-12">
        {tab === "overview" ? (
          <View className="gap-4">
            <PipelineBreadcrumb currentStage={effectiveStage(entry)} reachedAt={reachedAt} />
            <Card className="p-4">
              <Typography variant="label" className="text-gold">Payment</Typography>
              <Typography variant="body">{entry.payment_status.replace(/_/g, " ")}</Typography>
              {entry.deposit_amount ? <Typography variant="body">{formatPrice(entry.deposit_amount)}</Typography> : null}
              <Typography variant="label" className="mt-4 text-gold">Assignment</Typography>
              <Typography variant="body">{entry.assigned_dog?.name ?? entry.assigned_litter?.name ?? "Not yet matched"}</Typography>
            </Card>
          </View>
        ) : null}
        {tab === "preferences" ? (
          <Card className="p-4">
            <PreferenceBadges entry={entry} />
            <Typography variant="body" className="mt-4">{entry.preference_notes ?? "—"}</Typography>
          </Card>
        ) : null}
        {tab === "history" ? (
          <View>
            {history.length === 0 ? (
              <Typography variant="bodyMuted">No stage changes logged yet.</Typography>
            ) : (
              history.map((h) => (
                <Card key={h.id} className="mb-2 p-3">
                  <Typography variant="caption" className="text-silver">{h.created_at.slice(0, 10)}</Typography>
                  <Typography variant="body">{stageLabel(h.from_stage)} → {stageLabel(h.to_stage)}</Typography>
                  {h.notes ? <Typography variant="caption" className="text-silver">{h.notes}</Typography> : null}
                </Card>
              ))
            )}
          </View>
        ) : null}
        {tab === "notes" ? (
          <View>
            <Input label="Admin notes" value={adminNotes} onChangeText={setAdminNotes} multiline className="h-32" />
            <Input label="Follow-up date" value={followUp} onChangeText={setFollowUp} autoCapitalize="none" className="mt-3" />
            <Button label="Save" onPress={saveNotes} loading={submitting} fullWidth className="mt-4" />
          </View>
        ) : null}
      </ScrollView>

      <StageSelector visible={stageOpen} entry={entry} onClose={() => setStageOpen(false)} onSaved={refresh} />
    </ScreenContainer>
  );
}
