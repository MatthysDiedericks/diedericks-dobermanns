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
  preference_notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const inputClass =
  "w-full rounded-sm border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-subtle focus:border-gold focus:outline-none";
const labelClass =
  "mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-muted";

export function WaitlistForm({
  litterId,
  litterName,
}: {
  litterId: string;
  litterName: string;
}) {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, litterId, litterName }),
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
        <p className="font-cinzel text-xl text-gold">You&apos;re on the list</p>
        <p className="mt-3 text-sm text-muted">
          Thank you for registering your interest in {litterName}. We will
          contact you as this litter progresses.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className={labelClass}>Full Name</label>
        <input className={inputClass} {...register("full_name")} />
        {errors.full_name ? (
          <p className="mt-1 text-xs text-red-400">{errors.full_name.message}</p>
        ) : null}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Email</label>
          <input className={inputClass} type="email" {...register("email")} />
          {errors.email ? (
            <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
          ) : null}
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input className={inputClass} {...register("phone")} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Preferences (optional)</label>
        <textarea
          rows={4}
          placeholder="Sex preference, colour, intended purpose…"
          className={inputClass}
          {...register("preference_notes")}
        />
      </div>

      {serverError ? (
        <p className="text-sm text-red-400">{serverError}</p>
      ) : null}

      <GoldButton type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Submitting…" : "Join Waitlist"}
      </GoldButton>
    </form>
  );
}
