"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteDog } from "@/app/admin/(panel)/dogs/actions";
import { dangerBtn } from "@/lib/admin/styles";

export function DeleteDogButton({ dogId }: { dogId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!confirm("Delete this dog permanently? This cannot be undone.")) return;
    setBusy(true);
    await deleteDog(dogId);
    router.push("/admin/dogs");
  };

  return (
    <button onClick={remove} disabled={busy} className={dangerBtn}>
      {busy ? "Deleting…" : "Delete Dog"}
    </button>
  );
}
