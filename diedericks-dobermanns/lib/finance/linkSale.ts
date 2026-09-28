/**
 * Stamp a sale onto a litter. A puppy is optional and must belong to that litter.
 * Never overwrite a different dog or litter. Never match on a buyer name.
 */

function missingLitterColumn(message: string): boolean {
  return /litter_id/i.test(message) && /historical_income/i.test(message);
}

export async function linkIncomeToLitter(
  supabase: any,
  source: "invoice" | "historical",
  id: string,
  litterId: string,
  dogId: string | null,
): Promise<{ error?: string }> {
  const { data: litter, error: litterError } = await supabase
    .from("litters")
    .select("id")
    .eq("id", litterId)
    .maybeSingle();
  if (litterError) return { error: litterError.message };
  if (!litter) return { error: "Litter not found." };

  if (dogId) {
    const { data: dog, error: dogError } = await supabase
      .from("dogs")
      .select("id, litter_id")
      .eq("id", dogId)
      .maybeSingle();
    if (dogError) return { error: dogError.message };
    if (!dog) return { error: "Puppy not found." };
    if (dog.litter_id !== litterId) return { error: "That puppy is not in this litter." };
  }

  if (source === "invoice") {
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("id, dog_id, litter_id, historical_income_id")
      .eq("id", id)
      .maybeSingle();
    if (error) return { error: error.message };
    if (!invoice) return { error: "Invoice not found." };
    if (invoice.litter_id && invoice.litter_id !== litterId) {
      return { error: "This invoice is already linked to another litter." };
    }
    if (dogId && invoice.dog_id && invoice.dog_id !== dogId) {
      return { error: "This invoice is already linked to another dog." };
    }
    const patch: { litter_id: string; dog_id?: string } = { litter_id: litterId };
    if (dogId && !invoice.dog_id) patch.dog_id = dogId;
    if (!invoice.litter_id || patch.dog_id) {
      const { error: updateError } = await supabase.from("invoices").update(patch).eq("id", id);
      if (updateError) return { error: updateError.message };
    }
    if (invoice.historical_income_id) {
      const history = await stampHistorical(supabase, invoice.historical_income_id, litterId, dogId);
      if (history.error) return history;
    }
    return {};
  }

  return stampHistorical(supabase, id, litterId, dogId);
}

async function stampHistorical(
  supabase: any,
  id: string,
  litterId: string,
  dogId: string | null,
): Promise<{ error?: string }> {
  const { data: row, error } = await supabase
    .from("historical_income")
    .select("id, dog_id, litter_id")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (missingLitterColumn(error.message)) {
      return { error: "Historical income cannot be linked to a litter until migration 0194 is applied." };
    }
    return { error: error.message };
  }
  if (!row) return { error: "Income row not found." };
  if (row.litter_id && row.litter_id !== litterId) {
    return { error: "This income is already linked to another litter." };
  }
  if (dogId && row.dog_id && row.dog_id !== dogId) {
    return { error: "This income is already linked to another dog." };
  }
  const patch: { litter_id: string; dog_id?: string } = { litter_id: litterId };
  if (dogId && !row.dog_id) patch.dog_id = dogId;
  if (!row.litter_id || patch.dog_id) {
    const { error: updateError } = await supabase.from("historical_income").update(patch).eq("id", id);
    if (updateError) {
      if (missingLitterColumn(updateError.message)) {
        return { error: "Historical income cannot be linked to a litter until migration 0194 is applied." };
      }
      return { error: updateError.message };
    }
  }

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, dog_id, litter_id")
    .eq("historical_income_id", id);
  for (const invoice of invoices ?? []) {
    if (invoice.litter_id && invoice.litter_id !== litterId) continue;
    if (dogId && invoice.dog_id && invoice.dog_id !== dogId) continue;
    const invoicePatch: { litter_id?: string; dog_id?: string } = {};
    if (!invoice.litter_id) invoicePatch.litter_id = litterId;
    if (dogId && !invoice.dog_id) invoicePatch.dog_id = dogId;
    if (Object.keys(invoicePatch).length === 0) continue;
    await supabase.from("invoices").update(invoicePatch).eq("id", invoice.id);
  }
  return {};
}
