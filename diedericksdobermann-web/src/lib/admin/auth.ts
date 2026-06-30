import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const ADMIN_ROLES = ["admin", "super_admin"];

/**
 * Ensures the current request has an authenticated admin session. Redirects to
 * the login page otherwise. Returns the auth user and profile.
 */
export async function requireAdmin() {
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

  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    redirect("/admin/login");
  }

  return { user, profile };
}
