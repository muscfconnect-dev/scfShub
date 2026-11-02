import type { MetadataRoute } from "next";
import { publicData } from "@/lib/server";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) return [];
  const data = await publicData();
  return [
    { url: base },
    ...[
      "archive",
      "courses",
      "reviews",
      "freshers",
      "places",
      "groups",
      "sports",
      "news",
      "travel",
      "school-links",
      "ask-scf",
      "hostel-complaints",
      "privacy",
      "terms",
    ].map((p) => ({ url: `${base}/${p}` })),
    ...data.entries
      .filter((e) => ["place", "group", "sport", "news"].includes(e.kind))
      .map((e) => ({
        url: `${base}/${e.kind === "news" ? "story" : e.kind}/${e.slug}`,
        lastModified: e.updated_at,
      })),
  ];
}
