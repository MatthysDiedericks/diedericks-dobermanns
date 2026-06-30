"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { GoldButton } from "@/components/ui/GoldButton";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-sm border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-subtle focus:border-gold focus:outline-none";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="font-cinzel text-lg tracking-[0.2em] text-gold">
            DIEDERICKS DOBERMANNS
          </p>
          <p className="mt-2 font-cinzel text-xs uppercase tracking-widest text-subtle">
            Admin Panel
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-10 rounded-sm border border-gold/20 bg-surface p-8"
        >
          <label className="mb-1.5 block font-cinzel text-xs uppercase tracking-widest text-muted">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <label className="mb-1.5 mt-5 block font-cinzel text-xs uppercase tracking-widest text-muted">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />

          {error ? (
            <p className="mt-4 text-sm text-red-400">{error}</p>
          ) : null}

          <GoldButton type="submit" disabled={loading} className="mt-8 w-full">
            {loading ? "Signing in…" : "Sign In"}
          </GoldButton>
        </form>
      </div>
    </div>
  );
}
