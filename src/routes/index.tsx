import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Stats } from "@/components/landing/Stats";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Dashboard } from "@/components/landing/Dashboard";
import { Rugged } from "@/components/landing/Rugged";
import { Platform } from "@/components/landing/Platform";
import { Shop } from "@/components/landing/Shop";
import { Support } from "@/components/landing/Support";
import { CTA } from "@/components/landing/CTA";
import ProductAttachments from "@/components/landing/ProductAttachments";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AcquaLence — Smart Aquaculture Water Quality Monitoring" },
      {
        name: "description",
        content:
          "AcquaLence is an all-in-one smart aquaculture solution that monitors water quality in real time, helps you make better decisions, and maximizes your yield.",
      },
      { property: "og:title", content: "AcquaLence — Smarter Water. Stronger Harvests." },
      {
        property: "og:description",
        content: "Real-time water quality monitoring, AI insights, and 24/7 expert support for modern aquaculture.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background font-sans">
      <Nav />
      <Hero />
      <Stats />
      <HowItWorks />
      <Dashboard />
      <Rugged />
      <Platform />
      <Shop />
      <Support />
      <CTA />
      <Footer />
    </main>
  );
}
