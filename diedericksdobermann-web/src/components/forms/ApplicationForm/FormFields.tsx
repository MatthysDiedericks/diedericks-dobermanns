import type {
  FieldError,
  Path,
  UseFormRegister,
  UseFormWatch,
} from "react-hook-form";

import { cn } from "@/lib/utils";

import type { ApplicationFormValues } from "./schema";

export const inputClass =
  "w-full rounded-sm border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-subtle focus:border-gold focus:outline-none";

export const labelClass =
  "mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-muted";

export function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

export function TextInput<T extends Record<string, unknown>>({
  register,
  name,
  label,
  error,
  type = "text",
  placeholder,
  full,
  rows,
}: {
  register: UseFormRegister<T>;
  name: Path<T>;
  label: string;
  error?: string;
  type?: string;
  placeholder?: string;
  full?: boolean;
  rows?: number;
}) {
  const Tag = rows ? "textarea" : "input";
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className={labelClass}>{label}</label>
      <Tag
        className={cn(inputClass, rows ? "min-h-[88px] resize-y" : "")}
        type={rows ? undefined : type}
        placeholder={placeholder}
        rows={rows}
        {...register(name)}
      />
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

export function SelectField({
  register,
  name,
  label,
  error,
  options,
  full,
}: {
  register: UseFormRegister<ApplicationFormValues>;
  name: Path<ApplicationFormValues>;
  label: string;
  error?: string;
  options: { value: string; label: string }[];
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className={labelClass}>{label}</label>
      <select className={inputClass} {...register(name)}>
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

export function OptionGroup({
  register,
  name,
  label,
  error,
  options,
}: {
  register: UseFormRegister<ApplicationFormValues>;
  name: Path<ApplicationFormValues>;
  label: string;
  error?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="mb-5 sm:col-span-2">
      <p className={labelClass}>{label}</p>
      <div className="space-y-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-start gap-3 rounded-sm border border-border bg-background px-4 py-3 text-sm text-muted transition-colors hover:border-gold/40"
          >
            <input
              type="radio"
              value={o.value}
              className="mt-0.5 accent-[#c4a35a]"
              {...register(name)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

export function CheckboxField({
  register,
  name,
  label,
  error,
}: {
  register: UseFormRegister<ApplicationFormValues>;
  name: Path<ApplicationFormValues>;
  label: string;
  error?: FieldError;
}) {
  return (
    <div className="mb-4 sm:col-span-2">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-[#c4a35a]"
          {...register(name)}
        />
        <span className="text-sm text-muted">{label}</span>
      </label>
      {error?.message ? (
        <p className="mt-1 text-xs text-red-400">{String(error.message)}</p>
      ) : null}
    </div>
  );
}

export function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="mb-2 flex justify-between gap-4 border-b border-gold/10 pb-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="max-w-[58%] text-right text-text">{value || "—"}</span>
    </div>
  );
}

export function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3 className="mb-3 font-cinzel text-sm text-gold">{title}</h3>
      {children}
    </div>
  );
}

export type StepProps = {
  register: UseFormRegister<ApplicationFormValues>;
  errors: import("react-hook-form").FieldErrors<ApplicationFormValues>;
  watch?: UseFormWatch<ApplicationFormValues>;
};
