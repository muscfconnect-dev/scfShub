import { Admin } from "@/components/admin";
export const metadata = {
  title: "SCF staff workspace",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  return <Admin section={(await params).section || []} />;
}
