import { PrivateThread } from "@/components/private-thread";
export const metadata = {
  title: "Private transport booking",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  return <PrivateThread kind="booking" reference={(await params).reference} />;
}
