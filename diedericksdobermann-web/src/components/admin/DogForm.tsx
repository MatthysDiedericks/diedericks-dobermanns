"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { upsertDog, type DogInput } from "@/app/admin/(panel)/dogs/actions";
import { inputClass, labelClass, primaryBtn } from "@/lib/admin/styles";
import type { Dog } from "@/types/app";

type Option = { id: string; name: string };

type FormValues = Omit<DogInput, "price"> & { price: string };

export function DogForm({
  dog,
  parents,
}: {
  dog: Dog | null;
  parents: Option[];
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      name: dog?.name ?? "",
      sex: dog?.sex ?? "",
      colour: dog?.colour ?? "",
      date_of_birth: dog?.date_of_birth ?? "",
      category: dog?.category ?? "standard",
      status: dog?.status ?? "available",
      bloodline: dog?.bloodline ?? "",
      microchip_number: dog?.microchip_number ?? "",
      price: dog?.price != null ? String(dog.price) : "",
      description: dog?.description ?? "",
      training_notes: dog?.training_notes ?? "",
      temperament_notes: dog?.temperament_notes ?? "",
      dcm_status: dog?.dcm_status ?? "",
      hip_score: dog?.hip_score ?? "",
      elbow_score: dog?.elbow_score ?? "",
      pedigree_url: dog?.pedigree_url ?? "",
      mother_id: dog?.mother_id ?? "",
      father_id: dog?.father_id ?? "",
      is_public: dog?.is_public ?? false,
      is_featured: dog?.is_featured ?? false,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSaved(false);
    const result = await upsertDog({
      ...values,
      id: dog?.id,
      price: values.price ? Number(values.price) : null,
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    if (!dog && result.id) {
      router.push(`/admin/dogs/${result.id}`);
      return;
    }
    setSaved(true);
    router.refresh();
  };

  const parentOptions = parents.filter((p) => p.id !== dog?.id);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name">
          <input className={inputClass} {...register("name", { required: true })} />
        </Field>
        <Field label="Category">
          <select className={inputClass} {...register("category")}>
            <option value="standard">Standard</option>
            <option value="elite">Elite</option>
            <option value="protection">Protection</option>
            <option value="breeding">Breeding (Stud/Dam)</option>
          </select>
        </Field>
        <Field label="Status">
          <select className={inputClass} {...register("status")}>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
            <option value="in_training">In Training</option>
            <option value="not_available">Not Available</option>
          </select>
        </Field>
        <Field label="Sex">
          <select className={inputClass} {...register("sex")}>
            <option value="">—</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </Field>
        <Field label="Colour">
          <input className={inputClass} {...register("colour")} />
        </Field>
        <Field label="Date of Birth">
          <input type="date" className={inputClass} {...register("date_of_birth")} />
        </Field>
        <Field label="Price (ZAR)">
          <input type="number" className={inputClass} {...register("price")} />
        </Field>
        <Field label="Microchip Number">
          <input className={inputClass} {...register("microchip_number")} />
        </Field>
        <Field label="Bloodline" full>
          <input className={inputClass} {...register("bloodline")} />
        </Field>
        <Field label="Sire (Father)">
          <select className={inputClass} {...register("father_id")}>
            <option value="">—</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dam (Mother)">
          <select className={inputClass} {...register("mother_id")}>
            <option value="">—</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="DCM Status">
          <input className={inputClass} {...register("dcm_status")} />
        </Field>
        <Field label="Hip Score">
          <input className={inputClass} {...register("hip_score")} />
        </Field>
        <Field label="Elbow Score">
          <input className={inputClass} {...register("elbow_score")} />
        </Field>
      </div>

      <Field label="Pedigree URL">
        <input className={inputClass} {...register("pedigree_url")} />
      </Field>

      <Field label="Description">
        <textarea rows={4} className={inputClass} {...register("description")} />
      </Field>
      <Field label="Training Notes">
        <textarea rows={3} className={inputClass} {...register("training_notes")} />
      </Field>
      <Field label="Temperament Notes">
        <textarea
          rows={3}
          className={inputClass}
          {...register("temperament_notes")}
        />
      </Field>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#c4a35a]"
            {...register("is_public")}
          />
          Public
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#c4a35a]"
            {...register("is_featured")}
          />
          Featured
        </label>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-400">Saved.</p> : null}

      <button type="submit" className={primaryBtn}>
        {dog ? "Save Changes" : "Create Dog"}
      </button>
    </form>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}
