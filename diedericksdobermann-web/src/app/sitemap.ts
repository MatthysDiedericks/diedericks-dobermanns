import type { MetadataRoute } from "next";

import { createStaticClient } from "@/lib/supabase/static";

const BASE = "https://diedericksdobermanns.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/dogs",
    "/litters",
    "/training",
    "/gallery",
    "/achievements",
    "/about",
    "/faq",
    "/contact",
    "/apply",
    "/privacy-policy",
    "/terms",
    "/terms-of-sale",
  ].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  try {
    const supabase = createStaticClient();
    const [{ data: dogs }, { data: litters }] = await Promise.all([
      supabase.from("dogs").select("id, updated_at").eq("is_public", true),
      supabase.from("litters").select("id, updated_at").eq("is_public", true),
    ]);

    const dogRoutes = (dogs ?? []).map((d) => ({
      url: `${BASE}/dogs/${d.id}`,
      lastModified: d.updated_at ? new Date(d.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
    const litterRoutes = (litters ?? []).map((l) => ({
      url: `${BASE}/litters/${l.id}`,
      lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    return [...staticRoutes, ...dogRoutes, ...litterRoutes];
  } catch {
    return staticRoutes;
  }
}
