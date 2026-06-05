import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Award, Facebook, Mail, Phone, Send, ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";

const cols = [
  { title: "Product", links: ["Buoy", "Sensors", "Platform", "Pricing", "Integrations"] },
  { title: "Company", links: ["About", "Careers", "Press", "Contact", "Partners"] },
  { title: "Resources", links: ["Docs", "Blog", "Case Studies", "Support", "Changelog"] },
  { title: "Legal", links: ["Privacy", "Terms", "Security", "Cookies", "DPA"] },
];

const badges = [
  { icon: ShieldCheck, label: "Supported by UIHP" },
  { icon: Award, label: "ICT Division Bangladesh" },
];

const contactItems = [
  {
    icon: Mail,
    label: "Email",
    value: "aqualense01@gmail.com",
    href: "mailto:aqualense01@gmail.com",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+880 1607255194",
    href: "tel:+8801607255194",
  },
  {
    icon: Facebook,
    label: "Facebook",
    value: "Aqualense Official",
  },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    setEmail("");
    setTimeout(() => setSubmitted(false), 2400);
  };

  return (
    <footer id="footer" className="relative overflow-hidden border-t border-border bg-surface">
      <div className="relative mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-16">
        <div className="overflow-hidden rounded-lg border border-border bg-card p-5 shadow-soft sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Newsletter
              </p>
              <h3 className="mt-2 font-display text-2xl font-bold text-foreground text-balance sm:text-3xl">
                Get the latest in smart aquaculture
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Field reports, product drops and water-quality research - once a month, no spam.
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
                  "Subscribed"
                ) : (
                  <>
                    Subscribe <Send className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1.55fr] lg:gap-10">
          <div className="rounded-lg border border-border bg-background/65 p-5 shadow-sm backdrop-blur">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Smart aquaculture monitoring for healthier ponds, better harvests and a sustainable
              future.
            </p>

            <div className="mt-5 grid gap-2">
              {contactItems.map(({ icon: Icon, label, value, href }) => {
                const content = (
                  <>
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                        {label}
                      </span>
                      <span className="block break-words text-sm font-medium text-foreground">
                        {value}
                      </span>
                    </span>
                  </>
                );

                return href ? (
                  <a
                    key={label}
                    href={href}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card/70 px-3 py-2.5 transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {content}
                  </a>
                ) : (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card/70 px-3 py-2.5"
                  >
                    {content}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/10 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Supported by
              </p>
              <p className="mt-1 text-sm font-medium leading-6 text-foreground">
                UIHP (University Innovation Hub Program), ICT Division Bangladesh.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
            {cols.map((c) => (
              <div key={c.title}>
                <p className="text-sm font-semibold text-foreground">{c.title}</p>
                <ul className="mt-3 space-y-2">
                  {c.links.map((l) => (
                    <li key={l}>
                      <a
                        href={l === "Pricing" ? "#pricing" : "#"}
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
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-background/60 px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {badges.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 text-xs font-medium text-foreground/80"
              >
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </div>
            ))}
          </div>
          <select
            aria-label="Region"
            defaultValue="en-BD"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground/80 outline-none focus:border-primary"
          >
            <option value="en-BD">English / Bangla</option>
            <option value="en-US">English (US)</option>
          </select>
        </div>

        <div className="mt-8 hidden select-none overflow-hidden sm:block">
          <p className="bg-gradient-to-b from-primary/15 to-transparent bg-clip-text font-display text-[14vw] font-bold leading-none tracking-tight text-transparent">
            AcquaLence
          </p>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-border py-5 text-xs text-muted-foreground sm:mt-0 sm:flex-row sm:items-center">
          <p>&copy; {new Date().getFullYear()} AcquaLence Technologies. All rights reserved.</p>
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
