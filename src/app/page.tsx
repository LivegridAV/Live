import ExperienceGate from "@/experience/ExperienceGate";
import SiteNav from "@/components/SiteNav";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Work from "@/components/Work";
import Process from "@/components/Process";
import CTA from "@/components/CTA";
import SiteFooter from "@/components/SiteFooter";

/**
 * The homepage IS the experience: a scroll-driven 3D journey through a
 * LiveGridAV venue. The classic site below is server-rendered as the
 * accessible / SEO / low-power fallback — ExperienceGate upgrades to
 * WebGL on capable devices (append ?classic to stay here).
 */
export default function Home() {
  return (
    <ExperienceGate
      classic={
        <>
          <SiteNav />
          <main className="flex-1">
            <Hero />
            <Services />
            <Work />
            <Process />
            <CTA />
          </main>
          <SiteFooter />
        </>
      }
    />
  );
}
