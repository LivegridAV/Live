import type { Metadata } from "next";
import type { ReactNode } from "react";

// Internal inspection tool for the entrance model. It stays reachable for
// review but must not be indexed alongside the public site.
export const metadata: Metadata = {
  title: "Entrance review",
  robots: { index: false, follow: false },
};

export default function EntranceReviewLayout({ children }: { children: ReactNode }) {
  return children;
}
