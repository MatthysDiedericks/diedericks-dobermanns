/**
 * At the moment a person sells a specific dog against a known invoice,
 * stamp invoices.dog_id. Never overwrite a different dog.
 */

export type StampAction = "set" | "already" | "refuse";

export function stampAction(currentDogId: string | null | undefined, dogId: string): StampAction {
  if (!currentDogId) return "set";
  if (currentDogId === dogId) return "already";
  return "refuse";
}

export async function stampDogOntoInvoices(
  // Both apps pass their generated Supabase client. The stamp only reads and writes dog_id.
  supabase: any,
  invoiceIds: Array<string | null | undefined>,
  dogId: string,
): Promise<{ stamped: string[]; refused: string[]; error?: string }> {
  const ids = [...new Set(invoiceIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return { stamped: [], refused: [] };

  const { data, error } = await supabase
    .from("invoices")
    .select("id, dog_id")
    .in("id", ids);
  if (error) return { stamped: [], refused: [], error: error.message };

  const stamped: string[] = [];
  const refused: string[] = [];
  for (const row of data ?? []) {
    const action = stampAction(row.dog_id, dogId);
    if (action === "refuse") {
      refused.push(row.id);
      continue;
    }
    if (action === "already") continue;
    const updated = await supabase
      .from("invoices")
      .update({ dog_id: dogId })
      .eq("id", row.id)
      .is("dog_id", null);
    if (updated.error) return { stamped, refused, error: updated.error.message };
    stamped.push(row.id);
  }
  return { stamped, refused };
}
