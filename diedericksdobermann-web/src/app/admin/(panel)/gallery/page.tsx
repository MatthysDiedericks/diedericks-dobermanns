import { AdminHeader } from "@/components/admin/AdminHeader";
import { GalleryManager } from "@/components/admin/GalleryManager";
import { createClient } from "@/lib/supabase/server";
import type { GalleryItem } from "@/types/app";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gallery_items")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <>
      <AdminHeader title="Gallery" subtitle="Upload and arrange gallery media." />
      <GalleryManager items={(data ?? []) as GalleryItem[]} />
    </>
  );
}
