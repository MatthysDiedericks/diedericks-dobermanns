import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const FINANCE_ROLES = ["admin", "super_admin", "management"];

/**
 * Finance module access — admin, super_admin, or management.
 * Management users are redirected to finance if they hit other admin routes.
 */
export async function requireFinance() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !FINANCE_ROLES.includes(profile.role)) {
    redirect("/admin/login");
  }

  return { user, profile };
}
