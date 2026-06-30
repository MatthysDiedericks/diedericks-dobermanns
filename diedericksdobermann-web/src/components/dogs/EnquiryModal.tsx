"use client";

import { useEffect, useState } from "react";

import { EnquiryForm } from "@/components/forms/EnquiryForm";

export function EnquiryModal({
  dogId,
  dogName,
}: {
  dogId: string;
  dogName: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-sm border border-gold px-6 py-3 font-cinzel text-xs uppercase tracking-widest text-gold transition-colors hover:bg-gold/10"
      >
        Make an Enquiry
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="my-12 w-full max-w-lg rounded-sm border border-gold/20 bg-surface p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="font-cinzel text-xs uppercase tracking-widest text-gold-dim">
                  Enquiry
                </p>
                <h3 className="mt-1 font-cinzel text-2xl text-gold">
                  {dogName}
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-2xl leading-none text-muted hover:text-gold"
              >
                ×
              </button>
            </div>
            <EnquiryForm dogId={dogId} />
          </div>
        </div>
      ) : null}
    </>
  );
}
