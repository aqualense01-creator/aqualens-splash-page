import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Dashboard } from "@/components/landing/Dashboard";
import { MonitoringStory } from "@/components/landing/MonitoringStory";
import { WaterParameters } from "@/components/landing/WaterParameters";
import { AlertsActions } from "@/components/landing/AlertsActions";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FarmersSection } from "@/components/landing/FarmersSection";
import { ReportsTrends } from "@/components/landing/ReportsTrends";
import { DeviceHealth } from "@/components/landing/DeviceHealth";
import { Rugged } from "@/components/landing/Rugged";
import { PricingMarket } from "@/components/landing/PricingMarket";
import { Testimonials } from "@/components/landing/Testimonials";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { Stats } from "@/components/landing/Stats";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Acqua Lence — Real-time Pond Water Monitoring for Fish & Shrimp Farms" },
      {
        name: "description",
        content:
          "Acqua Lence monitors dissolved oxygen, pH, temperature, turbidity, salinity, ammonia and device health in real time — with clear alerts and practical actions for fish and shrimp farmers.",
      },
      {
        property: "og:title",
        content: "Acqua Lence — Crystal clear water insights for healthier fish farming",
      },
      {
        property: "og:description",
        content:
          "Real-time pond water monitoring, critical alerts, and clear next-step recommendations for fish and shrimp farms.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=Instrument+Serif:ital@0;1&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      const href = link?.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector<HTMLElement>(href);
      if (!target) return;

      event.preventDefault();
      window.history.pushState(null, "", href);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <main className="min-h-screen overflow-x-clip bg-background font-sans">
      <Nav />
      <Hero />
      <Dashboard />
      <Stats />
      <MonitoringStory />
      <WaterParameters />
      <AlertsActions />
      <HowItWorks />
      <FarmersSection />
      <ReportsTrends />
      <DeviceHealth />
      <Rugged />
      <PricingMarket />
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  );
}
