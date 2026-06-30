import { AdminHeader } from "@/components/admin/AdminHeader";
import { TestimonialsManager } from "@/components/admin/TestimonialsManager";
import { createClient } from "@/lib/supabase/server";
import type { Testimonial } from "@/types/app";

export const dynamic = "force-dynamic";

export default async function AdminTestimonialsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("testimonials")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <>
      <AdminHeader
        title="Testimonials"
        subtitle="Approve and feature client testimonials."
      />
      <TestimonialsManager items={(data ?? []) as Testimonial[]} />
    </>
  );
}
