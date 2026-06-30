import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Anon Supabase client without cookies — safe to use in generateStaticParams,
 * sitemap, and other build-time contexts that have no request scope.
 */
export function createStaticClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
