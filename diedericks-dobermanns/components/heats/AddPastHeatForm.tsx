"use client";

import { useMemo, useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Typography } from "@/components/ui/Typography";
import { useAddHeatCycle } from "@/hooks/useHeatCycles";
import { parseDateInput, showError } from "@/lib/dogDetail/feedback";

export function AddPastHeatForm({
  dogId,
  onSaved,
}: {
  dogId: string;
  onSaved?: (offsetMessage?: string | null) => void;
}) {
  const addHeat = useAddHeatCycle();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [mated, setMated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const canSave = useMemo(() => Boolean(parseDateInput(start)), [start]);

  async function submit() {
    const date = parseDateInput(start);
    if (!date) {
      showError("Enter a valid heat start date (YYYY-MM-DD).");
      return;
    }
    setBusy(true);
    try {
      const result = await addHeat(dogId, date, {
        heat_end_date: parseDateInput(end) || null,
        notes: notes.trim() || null,
        mated,
      });
      setNotice(result.offsetMessage ?? "Heat saved — forecast updated.");
      setStart("");
      setEnd("");
      setNotes("");
      setMated(false);
      onSaved?.(result.offsetMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-3">
      <Typography variant="caption" className="text-muted">
        Dates can go in any order — they sort themselves after save.
      </Typography>
      <Input label="Heat start date" value={start} onChangeText={setStart} placeholder="YYYY-MM-DD" />
      <Input label="End date (optional)" value={end} onChangeText={setEnd} placeholder="YYYY-MM-DD" />
      <Input label="Notes (optional)" value={notes} onChangeText={setNotes} />
      <Button
        label={mated ? "Mated in this cycle ✓" : "She was mated in this cycle"}
        variant={mated ? "primary" : "outline"}
        onPress={() => setMated((v) => !v)}
        fullWidth
      />
      {notice ? (
        <Typography variant="caption" className="text-gold">
          {notice}
        </Typography>
      ) : null}
      <Button
        label={busy ? "Saving…" : "Add past heat"}
        onPress={() => void submit()}
        loading={busy}
        disabled={!canSave}
        fullWidth
      />
    </View>
  );
}
