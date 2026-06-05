import { useState } from "react";
import { Logo } from "./Logo";
import {
  Twitter,
  Linkedin,
  Facebook,
  Youtube,
  Send,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  Leaf,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const cols = [
  { title: "Product", links: ["Buoy", "Sensors", "Platform", "Pricing", "Integrations"] },
  { title: "Company", links: ["About", "Careers", "Press", "Contact", "Partners"] },
  { title: "Resources", links: ["Docs", "Blog", "Case Studies", "Support", "Changelog"] },
  { title: "Legal", links: ["Privacy", "Terms", "Security", "Cookies", "DPA"] },
];

const badges = [
  { icon: ShieldCheck, label: "ISO 27001" },
  { icon: Leaf, label: "Carbon Neutral" },
  { icon: Award, label: "Aqua Alliance" },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    setEmail("");
    setTimeout(() => setSubmitted(false), 2400);
  };

  return (
    <footer className="relative overflow-hidden border-t border-border bg-surface">
      {/* glow accents */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[80%] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20">
        {/* Newsletter band */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-10">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Newsletter
              </p>
              <h3 className="mt-2 font-display text-2xl font-bold text-foreground text-balance sm:text-3xl">
                Get the latest in smart aquaculture
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Field reports, product drops and water-quality research — once a month, no spam.
              </p>
            </div>
            <form onSubmit={onSubmit} className="flex w-full flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                required
                placeholder="you@farm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 flex-1 bg-background"
                aria-label="Email address"
              />
              <Button
                type="submit"
                size="lg"
                className="h-12 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {submitted ? (
                  "Subscribed ✓"
                ) : (
                  <>
                    Subscribe <Send className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Main columns */}
        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(4,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Smart aquaculture monitoring for healthier ponds, better harvests and a sustainable
              future.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" /> Bengaluru, India · Oslo, Norway
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> hello@acqualence.com
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" /> +91 80 4567 8910
              </li>
            </ul>
            <div className="mt-5 flex gap-2 text-muted-foreground">
              {[Twitter, Linkedin, Facebook, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="social link"
                  className="grid h-9 w-9 place-items-center rounded-full border border-border transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-sm font-semibold text-foreground">{c.title}</p>
              <ul className="mt-3 space-y-2">
                {c.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="group inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      <span className="relative">
                        {l}
                        <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-background/60 px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {badges.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 text-xs font-medium text-foreground/80"
              >
                <Icon className="h-4 w-4 text-primary" /> {label}
              </div>
            ))}
          </div>
          <select
            aria-label="Region"
            defaultValue="en-IN"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground/80 outline-none focus:border-primary"
          >
            <option value="en-IN">🇮🇳 English (IN)</option>
            <option value="en-US">🇺🇸 English (US)</option>
            <option value="no-NO">🇳🇴 Norsk</option>
            <option value="es-ES">🇪🇸 Español</option>
          </select>
        </div>

        {/* Wordmark */}
        <div className="mt-10 select-none overflow-hidden">
          <p className="bg-gradient-to-b from-primary/15 to-transparent bg-clip-text font-display text-[18vw] font-bold leading-none tracking-tight text-transparent">
            AcquaLence
          </p>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-start justify-between gap-3 border-t border-border py-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} AcquaLence Technologies. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <a href="#" className="hover:text-primary">
              Privacy
            </a>
            <a href="#" className="hover:text-primary">
              Terms
            </a>
            <a href="#" className="hover:text-primary">
              Cookies
            </a>
            <a href="#" className="hover:text-primary">
              Status
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
