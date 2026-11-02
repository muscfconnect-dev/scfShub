import { PrivateThread } from "@/components/private-thread";
export const metadata = {
  title: "Private SCF case",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  return <PrivateThread kind="case" reference={(await params).reference} />;
}
