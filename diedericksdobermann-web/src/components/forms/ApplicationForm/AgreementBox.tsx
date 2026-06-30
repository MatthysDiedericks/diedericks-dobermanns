import type { FieldError, UseFormRegister } from "react-hook-form";

import type { ApplicationFormValues } from "@/components/forms/ApplicationForm/schema";

export function AgreementBox({
  heading,
  text,
  register,
  name,
  error,
  link,
}: {
  heading: string;
  text: string;
  register: UseFormRegister<ApplicationFormValues>;
  name: keyof ApplicationFormValues;
  error?: FieldError;
  link?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 rounded-sm border border-border bg-background p-5">
      <p className="font-cinzel text-sm text-gold">{heading}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
      {link ? (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-gold underline"
        >
          {link.label}
        </a>
      ) : null}
      <label className="mt-4 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-[#c4a35a]"
          {...register(name)}
        />
        <span className="text-sm text-muted">I understand and agree</span>
      </label>
      {error?.message ? (
        <p className="mt-1 text-xs text-red-400">{String(error.message)}</p>
      ) : null}
    </div>
  );
}
