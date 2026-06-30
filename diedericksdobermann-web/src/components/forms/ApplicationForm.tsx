"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, type Path } from "react-hook-form";

import { Step1Personal } from "@/components/forms/ApplicationForm/Step1Personal";
import { Step2Lifestyle } from "@/components/forms/ApplicationForm/Step2Lifestyle";
import { Step3Experience } from "@/components/forms/ApplicationForm/Step3Experience";
import { Step4Preferences } from "@/components/forms/ApplicationForm/Step4Preferences";
import { Step5Legal } from "@/components/forms/ApplicationForm/Step5Legal";
import { Step6Review } from "@/components/forms/ApplicationForm/Step6Review";
import {
  applicationSchema,
  defaultApplicationValues,
  STEP_FIELDS,
  STEP_TITLES,
  type ApplicationFormValues,
} from "@/components/forms/ApplicationForm/schema";
import { GoldButton } from "@/components/ui/GoldButton";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string };

const STEP_COMPONENTS = [
  Step1Personal,
  Step2Lifestyle,
  Step3Experience,
  Step4Preferences,
  Step5Legal,
] as const;

export function ApplicationForm({
  dogs,
  litters,
  initialDogId,
}: {
  dogs: Option[];
  litters: Option[];
  initialDogId?: string;
}) {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      ...defaultApplicationValues,
      specific_dog_id: initialDogId ?? "",
    } as ApplicationFormValues,
    mode: "onTouched",
  });

  const lastStep = STEP_TITLES.length - 1;
  const StepBody = step < STEP_COMPONENTS.length ? STEP_COMPONENTS[step] : null;

  const next = async () => {
    setServerError(null);
    const fields = STEP_FIELDS[step] as Path<ApplicationFormValues>[];
    if (fields.length > 0) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    setStep((s) => Math.min(s + 1, lastStep));
  };

  const back = () => {
    setServerError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const onSubmit = async (values: ApplicationFormValues) => {
    setServerError(null);
    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        specific_dog_id: (values as ApplicationFormValues & { specific_dog_id?: string })
          .specific_dog_id,
        litter_interest_id: (values as ApplicationFormValues & { litter_interest_id?: string })
          .litter_interest_id,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setServerError(data?.error ?? "Could not submit your application.");
      return;
    }
    const data = (await res.json()) as { referenceId?: string };
    setReferenceId(data.referenceId ?? null);
    setSubmitted(values.full_name);
  };

  if (submitted) {
    return (
      <div className="rounded-sm border border-gold/30 bg-gold/5 p-10 text-center">
        <h2 className="font-cinzel text-2xl text-gold">Thank you, {submitted}.</h2>
        {referenceId ? (
          <p className="mt-3 font-cinzel text-sm tracking-widest text-gold">
            Reference: {referenceId}
          </p>
        ) : null}
        <p className="mx-auto mt-4 max-w-md text-muted">
          Your application has been received. We review every application personally and will be in
          touch within 5–7 business days.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-10">
        <div className="flex items-center justify-between">
          {STEP_TITLES.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col items-center">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border font-cinzel text-xs",
                  i <= step
                    ? "border-gold bg-gold text-background"
                    : "border-border text-subtle",
                )}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  "mt-2 hidden text-[10px] uppercase tracking-widest lg:block",
                  i <= step ? "text-gold" : "text-subtle",
                )}
              >
                {label.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center font-cinzel text-xs uppercase tracking-widest text-gold">
          Step {step + 1} of {STEP_TITLES.length} · {STEP_TITLES[step]}
        </p>
        <div className="mt-4 h-px w-full bg-border">
          <div
            className="h-px bg-gold transition-all duration-300"
            style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {StepBody ? (
          <StepBody register={register} errors={errors} />
        ) : (
          <Step6Review getValues={getValues} />
        )}

        {step === 3 && dogs.length > 0 ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-muted">
                Specific dog (optional)
              </label>
              <select
                className="w-full rounded-sm border border-border bg-background px-4 py-3 text-sm"
                {...register("specific_dog_id" as Path<ApplicationFormValues>)}
              >
                <option value="">No preference</option>
                {dogs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-muted">
                Litter of interest (optional)
              </label>
              <select
                className="w-full rounded-sm border border-border bg-background px-4 py-3 text-sm"
                {...register("litter_interest_id" as Path<ApplicationFormValues>)}
              >
                <option value="">No preference</option>
                {litters.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {serverError ? <p className="mt-6 text-sm text-red-400">{serverError}</p> : null}

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="font-cinzel text-xs uppercase tracking-widest text-muted disabled:opacity-30"
          >
            ← Back
          </button>

          {step < lastStep ? (
            <GoldButton type="button" onClick={next}>
              Continue
            </GoldButton>
          ) : (
            <GoldButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Submit Application"}
            </GoldButton>
          )}
        </div>
      </form>
    </div>
  );
}
