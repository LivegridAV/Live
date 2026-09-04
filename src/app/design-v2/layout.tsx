import type { Metadata } from "next";
import "./v2.css";

// Temporary acceptance/implementation surface (brief §2/§57) — not indexed,
// not a permanent user-facing duplicate. Migrates to "/" once accepted.
export const metadata: Metadata = {
  title: "LivegridAV — V2 (preview)",
  robots: { index: false, follow: false },
};

export default function DesignV2Layout({ children }: { children: React.ReactNode }) {
  return <div className="v2root" id="top">{children}</div>;
}
