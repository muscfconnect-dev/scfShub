import { publicData } from "@/lib/server";
import { Hub } from "@/components/hub";
import { notFound } from "next/navigation";
const routes = [
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
  "issues",
  "hostel-complaints",
  "explore",
  "privacy",
  "terms",
];
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params,
    data = await publicData(),
    [base, name] = slug;
  const kind = (
    {
      place: "place",
      group: "group",
      sport: "sport",
      story: "news",
      p: "page",
    } as Record<string, string>
  )[base];
  const entry = data.entries.find(
    (e) => e.kind === (kind || "page") && e.slug === (name || base),
  );
  return {
    title: {
      absolute: entry
        ? `${entry.title} · ${data.settings.site_name}`
        : slug.length
          ? `${base.replaceAll("-", " ")} · ${data.settings.site_name}`
          : `${data.settings.site_name} · Maduka University`,
    },
    description: entry?.summary || data.settings.site_description,
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params,
    data = await publicData(),
    route = slug.join("/");
  const [base, name] = slug;
  const kind = (
    {
      place: "place",
      group: "group",
      sport: "sport",
      story: "news",
      p: "page",
    } as Record<string, string>
  )[base];
  const valid =
    !slug.length ||
    (slug.length === 1 && routes.includes(base)) ||
    (slug.length === 2 &&
      ((kind && data.entries.some((e) => e.kind === kind && e.slug === name)) ||
        (base === "trip" && data.trips.some((t) => t.slug === name))));
  if (!valid) notFound();
  return <Hub route={route} data={data} />;
}
