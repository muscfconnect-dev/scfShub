import { z } from "zod";
export const modules = [
  "content",
  "resources",
  "reviews",
  "complaints",
  "transport",
  "staff",
  "settings",
] as const;
export type Module = (typeof modules)[number];
export const kinds = [
  "page",
  "resource",
  "course",
  "place",
  "group",
  "sport",
  "news",
  "link",
  "guide",
  "rule",
  "ad",
  "faculty",
  "department",
] as const;
export type Kind = (typeof kinds)[number];
export type Entry = {
  id: string;
  kind: Kind;
  title: string;
  slug: string;
  summary: string;
  body: string;
  image: string;
  status: "draft" | "published" | "archived";
  sort_order: number;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
};
export type Trip = {
  id: string;
  title: string;
  slug: string;
  destination: string;
  departure_at: string;
  fare: number;
  capacity: number;
  confirmed_count: number;
  meeting_point: string;
  instructions: string;
  booking_closes_at: string;
  status: string;
  created_at: string;
};
export type Review = {
  id: string;
  kind: "course" | "place";
  title: string;
  course_code: string;
  course_name: string;
  faculty: string;
  department: string;
  level: string;
  place_id: string | null;
  difficulty: string;
  study_hours: string;
  rating: number;
  body: string;
  helped: string;
  author_name: string;
  status: string;
  created_at: string;
};
export type Staff = {
  id: string;
  email: string;
  notification_email?: string;
  display_name: string;
  role: "owner" | "admin" | "staff";
  permissions: Module[];
  active: boolean;
};
export type Settings = Record<string, string>;
export const defaultSettings: Settings = {
  site_name: "SCF Students’ Hub",
  home_updates_title: "In case you missed it.",
  home_updates_text: "A few useful places to catch up.",
  home_feature_title: "Just got here?",
  home_feature_text:
    "The forms, packing information and school contacts you’ll want to find first.",
  home_life_title: "There’s life outside lectures.",
  home_life_text:
    "Find a good meal, something to join or a reason to get moving.",
  home_food_title: "So, what are we eating?",
  home_food_text: "Find a spot and check the price range.",
  home_groups_title: "Find your people.",
  home_groups_text: "See what communities you can get involved in.",
  home_sports_title: "You can’t read all day.",
  home_sports_text: "Teams, fitness and places to play.",
  travel_cta_title: "Ready to go home?",
  travel_cta_text:
    "Check your route, fare and departure details before you plan the journey.",
  strapline: "MADUKA UNIVERSITY | MADE FOR YOU",
  hero_title: "MU IS A LOT.",
  hero_emphasis: "TRUST US,\nWE GET IT.",
  hero_text:
    "Past questions, food spots, school updates and a way home. The useful stuff in one place, so you don’t have to keep asking around.",
  hero_image: "/assets/mu-garden.webp",
  hero_caption: "Maduka University",
  home_feature_image: "/assets/mu-orientation.webp",
  home_groups_image: "/assets/mu-symposium.webp",
  home_food_image: "",
  home_sports_image: "",
  help_title: "We’re students too.",
  help_text:
    "We know how much of school runs on “ask someone”. This is our way of making the answers easier to find, and giving you somewhere to raise the things that need attention.",
  support_message:
    "You can contact us any time. We aim to respond within 24 hours.",
  footer_credit: "Powered by Koad",
  footer_whatsapp: "2349157678946",
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  privacy_text:
    "SCF uses the information you submit to handle your request. Complaints and receipts are accessible only to authorised staff. Contact SCF to request correction or deletion of your information. Never include passwords, PINs or card details in a complaint.",
  terms_text:
    "This student-led hub shares campus information. Check official university sources for requirements, fees and instructions. Transport bookings are confirmed only after payment verification and subject to availability.",
  transport_terms:
    "Cancellation requests are reviewed by the transport team. Confirm the school’s cancellation and refund terms before paying.",
  contact_email: "",
  site_description:
    "Your campus, connected. Study resources, campus life and student support at Maduka University.",
};
export function hasPermission(staff: Staff | null, module: Module) {
  return (
    !!staff?.active &&
    (staff.role === "owner" ||
      staff.role === "admin" ||
      staff.permissions.includes(module))
  );
}
export const kindModule = (kind: Kind): Module =>
  kind === "resource" ||
  kind === "course" ||
  kind === "faculty" ||
  kind === "department"
    ? "resources"
    : "content";
export function safeUrl(value: string, allowRelative = true) {
  try {
    if (allowRelative && /^\/(?!\/)[^\\\s]*$/.test(value)) return value;
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch {
    return "";
  }
}
const text = (max = 2000) => z.string().trim().max(max);
export const webUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (v) => !v || !!safeUrl(v),
    "Use an https:// link or a local path starting with /.",
  );
export const courseLevels = [
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
] as const;
export const courseSemesters = [
  "First semester",
  "Second semester",
  "Full year",
] as const;
export const courseSchema = z.object({
  course_code: text(30)
    .min(2, "Enter the course code.")
    .transform((v) => v.toUpperCase().replace(/\s+/g, " ")),
  faculty_id: z.uuid("Choose a faculty."),
  department_ids: z
    .array(z.uuid())
    .min(1, "Choose at least one department.")
    .max(30)
    .transform((v) => [...new Set(v)].sort()),
  faculty: text(180).default(""),
  departments: z.array(text(180)).default([]),
  level: z.enum(courseLevels),
  semester: z.enum(courseSemesters),
  units: z.number().int().min(0).max(30),
  course_type: z.enum(["Compulsory", "Elective"]),
  session: text(30).default(""),
});
export type CourseData = z.infer<typeof courseSchema>;
export const fieldSchemas: Record<Kind, z.ZodObject<any>> = {
  page: z.object({ description: text(500).default("") }),
  course: courseSchema,
  resource: z.object({
    course_code: text(30),
    faculty: text(120),
    departments: z.array(text(120)).max(30),
    level: text(10),
    session: text(30),
    material_type: z.enum(["Past questions", "Notes", "Study materials"]),
    file_id: z.uuid(),
  }),
  place: z.object({
    category: z.enum(["Food", "Drink", "Shop"]),
    location: text(300),
    hours: text(300),
    price_min: z.number().nonnegative(),
    price_max: z.number().nonnegative(),
    contact_url: webUrl.default(""),
    sponsored: z.boolean().default(false),
    menu: text(4000).default(""),
  }),
  group: z.object({
    category: text(100),
    meeting_time: text(300),
    location: text(300),
    join_url: webUrl,
    contact_url: webUrl.default(""),
    activities: text(4000).default(""),
  }),
  sport: z.object({
    category: text(100),
    location: text(300),
    schedule: text(1000),
    contact_url: webUrl.default(""),
    activities: text(4000).default(""),
  }),
  news: z.object({
    category: text(100),
    event_at: text(40).default(""),
    location: text(300).default(""),
  }),
  link: z.object({
    url: webUrl.refine(Boolean, "A link is required."),
    category: text(100),
    placement: z.enum(["directory", "navigation", "footer", "whatsapp"]),
    instructions: text(1000).default(""),
  }),
  guide: z.object({
    link_url: webUrl.default(""),
    link_label: text(100).default(""),
  }),
  rule: z.object({
    file_id: z.uuid().or(z.literal("")).default(""),
    link_url: webUrl.default(""),
  }),
  ad: z.object({
    url: webUrl.refine(Boolean, "A destination is required."),
    placement: z.enum([
      "home",
      "archive",
      "reviews",
      "freshers",
      "places",
      "groups",
      "sports",
      "news",
      "travel",
    ]),
    starts_at: text(40).default(""),
    ends_at: text(40).default(""),
    cta: text(80).default("Find out more"),
  }),
  faculty: z.object({}),
  department: z.object({
    faculty: text(120).default(""),
    faculty_id: z.uuid().or(z.literal("")).default(""),
  }),
};
export const entrySchema = z
  .object({
    kind: z.enum(kinds),
    title: text(180).min(2),
    slug: text(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    summary: text(600).default(""),
    body: text(30000).default(""),
    image: webUrl.default(""),
    status: z.enum(["draft", "published", "archived"]).default("draft"),
    sort_order: z.number().int().min(0).max(100000).default(0),
    data: z.record(z.string(), z.unknown()).default({}),
  })
  .superRefine((v, c) => {
    const r = fieldSchemas[v.kind].safeParse(v.data);
    if (!r.success)
      r.error.issues.forEach((i) =>
        c.addIssue({
          code: "custom",
          path: ["data", ...i.path],
          message: i.message,
        }),
      );
  });
export const reviewSchema = z
  .object({
    kind: z.enum(["course", "place"]),
    title: text(160).min(3),
    course_code: text(30).default(""),
    course_name: text(160).default(""),
    faculty: text(120).default(""),
    department: text(120).default(""),
    level: text(10).default(""),
    place_id: z.uuid().nullable().default(null),
    difficulty: z
      .enum([
        "Easy",
        "Manageable",
        "Moderate",
        "Challenging",
        "Very challenging",
      ])
      .default("Moderate"),
    study_hours: text(60).default(""),
    rating: z.number().int().min(1).max(5),
    body: text(3000).min(20),
    helped: text(1500).default(""),
    author_name: text(80).min(2),
    website: text(200).default(""),
    captcha: text(2048).default(""),
  })
  .superRefine((v, c) => {
    if (
      v.kind === "course" &&
      (!v.course_code ||
        !v.course_name ||
        !v.faculty ||
        !v.department ||
        !v.level)
    )
      c.addIssue({
        code: "custom",
        message: "Enter the course, faculty, department and level.",
      });
    if (v.kind === "place" && !v.place_id)
      c.addIssue({ code: "custom", message: "Choose a campus spot." });
  });
export const caseSchema = z.object({
  kind: z.enum(["general", "academic", "hostel"]),
  category: text(120).min(2),
  subject: text(180).min(3),
  // The short form no longer asks for a name; staff identify students by verified email.
  name: text(100).min(2).default("Student"),
  email: z.email().max(254),
  message: text(5000).min(20),
  hostel: text(120).default(""),
  location: text(200).default(""),
  website: text(200).default(""),
  captcha: text(2048).default(""),
});
export const tripSchema = z
  .object({
    title: text(180).min(3),
    slug: text(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    destination: text(120).min(2),
    departure_at: z.iso.datetime({ offset: true }),
    fare: z.number().nonnegative().max(10000000),
    capacity: z.number().int().min(1).max(1000),
    meeting_point: text(300),
    instructions: text(6000).default(""),
    booking_closes_at: z.iso.datetime({ offset: true }),
    status: z.enum(["draft", "published", "closed", "cancelled"]),
  })
  .refine(
    (v) => new Date(v.booking_closes_at) <= new Date(v.departure_at),
    "Booking must close before departure.",
  );
export const bookingSchema = z.object({
  trip_id: z.uuid(),
  name: text(100).min(2),
  email: z.email().max(254),
  phone: text(30).min(7),
  consent: z.literal(true),
  website: text(200).default(""),
  captcha: text(2048).default(""),
});
export const money = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
