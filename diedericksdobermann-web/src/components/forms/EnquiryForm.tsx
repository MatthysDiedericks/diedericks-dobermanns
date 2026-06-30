"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { GoldButton } from "@/components/ui/GoldButton";

const schema = z.object({
  full_name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  country: z.string().optional(),
  subject: z.string().min(1, "Select a subject"),
  message: z.string().min(10, "Please add a little more detail"),
});

type FormValues = z.infer<typeof schema>;

const SUBJECTS = ["General", "Puppy Enquiry", "Training", "Other"];

const inputClass =
  "w-full rounded-sm border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-subtle focus:border-gold focus:outline-none";
const labelClass =
  "mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-muted";

export function EnquiryForm({ dogId }: { dogId?: string }) {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subject: dogId ? "Puppy Enquiry" : "General" },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const res = await fetch("/api/enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        dog_id: dogId,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;
      setServerError(data?.error ?? "Something went wrong. Please try again.");
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="rounded-sm border border-gold/30 bg-gold/5 p-8 text-center">
        <p className="font-cinzel text-xl text-gold">Thank you</p>
        <p className="mt-3 text-sm text-muted">
          Your enquiry has been received. We will be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full Name" error={errors.full_name?.message}>
          <input className={inputClass} {...register("full_name")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input className={inputClass} type="email" {...register("email")} />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <input className={inputClass} {...register("phone")} />
        </Field>
        <Field label="Country" error={errors.country?.message}>
          <input className={inputClass} {...register("country")} />
        </Field>
      </div>

      <Field label="Subject" error={errors.subject?.message}>
        <select className={inputClass} {...register("subject")}>
          {SUBJECTS.map((s) => (
            <option key={s} value={s} className="bg-background">
              {s}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Message" error={errors.message?.message}>
        <textarea
          rows={5}
          className={inputClass}
          {...register("message")}
        />
      </Field>

      {serverError ? (
        <p className="text-sm text-red-400">{serverError}</p>
      ) : null}

      <GoldButton type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Sending…" : "Send Enquiry"}
      </GoldButton>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
