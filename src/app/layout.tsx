import type { Metadata } from "next";
import "./reference.css";
import "./refinement.css";
import "./globals.css";
import "./shell.css";
import "./motion.css";
export const metadata: Metadata = {
  title: {
    default: "SCF Students’ Hub · Maduka University",
    template: "%s · SCF Students’ Hub",
  },
  description:
    "Your campus, connected. Study resources, campus life and SCF student support at Maduka University.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
