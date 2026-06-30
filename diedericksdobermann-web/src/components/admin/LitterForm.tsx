"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  deleteLitter,
  upsertLitter,
  type LitterInput,
} from "@/app/admin/(panel)/litters/actions";
import { dangerBtn, inputClass, labelClass, primaryBtn } from "@/lib/admin/styles";
import type { Litter } from "@/types/app";

type Option = { id: string; name: string };
type FormValues = Omit<LitterInput, "puppy_count" | "available_count"> & {
  puppy_count: string;
  available_count: string;
};

export function LitterForm({
  litter,
  dogs,
}: {
  litter: Litter | null;
  dogs: Option[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      name: litter?.name ?? "",
      mother_id: litter?.mother_id ?? "",
      father_id: litter?.father_id ?? "",
      expected_date: litter?.expected_date ?? "",
      actual_date: litter?.actual_date ?? "",
      status: litter?.status ?? "planned",
      puppy_count: litter?.puppy_count != null ? String(litter.puppy_count) : "",
      available_count:
        litter?.available_count != null ? String(litter.available_count) : "",
      description: litter?.description ?? "",
      is_public: litter?.is_public ?? false,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSaved(false);
    const res = await upsertLitter({
      ...values,
      id: litter?.id,
      puppy_count: values.puppy_count ? Number(values.puppy_count) : null,
      available_count: values.available_count
        ? Number(values.available_count)
        : null,
    });
    if (res.error) {
      setError(res.error);
      return;
    }
    if (!litter && res.id) {
      router.push(`/admin/litters/${res.id}`);
      return;
    }
    setSaved(true);
    router.refresh();
  };

  const remove = async () => {
    if (!litter) return;
    if (!confirm("Delete this litter?")) return;
    await deleteLitter(litter.id);
    router.push("/admin/litters");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name / Label">
          <input className={inputClass} {...register("name")} />
        </Field>
        <Field label="Status">
          <select className={inputClass} {...register("status")}>
            <option value="planned">Planned</option>
            <option value="expected">Expected</option>
            <option value="born">Born</option>
            <option value="available">Available</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
        <Field label="Sire (Father)">
          <select className={inputClass} {...register("father_id")}>
            <option value="">—</option>
            {dogs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dam (Mother)">
          <select className={inputClass} {...register("mother_id")}>
            <option value="">—</option>
            {dogs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Expected Date">
          <input type="date" className={inputClass} {...register("expected_date")} />
        </Field>
        <Field label="Actual Date">
          <input type="date" className={inputClass} {...register("actual_date")} />
        </Field>
        <Field label="Puppy Count">
          <input type="number" className={inputClass} {...register("puppy_count")} />
        </Field>
        <Field label="Available Count">
          <input
            type="number"
            className={inputClass}
            {...register("available_count")}
          />
        </Field>
      </div>

      <Field label="Description">
        <textarea rows={4} className={inputClass} {...register("description")} />
      </Field>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[#c4a35a]"
          {...register("is_public")}
        />
        Public
      </label>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-400">Saved.</p> : null}

      <div className="flex items-center gap-3">
        <button type="submit" className={primaryBtn}>
          {litter ? "Save Changes" : "Create Litter"}
        </button>
        {litter ? (
          <button type="button" onClick={remove} className={dangerBtn}>
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}
