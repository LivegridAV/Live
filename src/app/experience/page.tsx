import type { Metadata } from "next";
import ExperienceGate from "@/experience/ExperienceGate";
import SiteNav from "@/components/SiteNav";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Work from "@/components/Work";
import Stats from "@/components/Stats";
import Process from "@/components/Process";
import CTA from "@/components/CTA";
import SiteFooter from "@/components/SiteFooter";

// The previous immersive scroll-through venue, preserved (not deleted) after
// the V2 homepage took over "/". Reachable here for reference; not indexed.
export const metadata: Metadata = {
  title: "livegridAV — Immersive venue (archive)",
  robots: { index: false, follow: false },
};

export default function ExperiencePage() {
  return (
    <ExperienceGate
      classic={
        <>
          <SiteNav />
          <main className="flex-1">
            <Hero />
            <Services />
            <Work />
            <Stats />
            <Process />
            <CTA />
          </main>
          <SiteFooter />
        </>
      }
    />
  );
}
