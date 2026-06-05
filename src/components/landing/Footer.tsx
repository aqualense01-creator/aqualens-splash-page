import { Logo } from "./Logo";
import { Twitter, Linkedin, Facebook, Youtube } from "lucide-react";

const cols = [
  { title: "Product", links: ["Buoy", "Sensors", "Platform", "Pricing"] },
  { title: "Company", links: ["About", "Careers", "Press", "Contact"] },
  { title: "Resources", links: ["Docs", "Blog", "Case Studies", "Support"] },
  { title: "Legal", links: ["Privacy", "Terms", "Security", "Cookies"] },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface py-14">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Smart aquaculture monitoring for healthier ponds, better harvests and a sustainable future.
            </p>
            <div className="mt-4 flex gap-3 text-muted-foreground">
              {[Twitter, Linkedin, Facebook, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="grid h-8 w-8 place-items-center rounded-full border border-border hover:text-primary">
                  <Icon className="h-3.5 w-3.5" />
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
                    <a href="#" className="text-sm text-muted-foreground hover:text-primary">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} AcquaLence. All rights reserved.</p>
          <p>Made for smarter aquaculture.</p>
        </div>
      </div>
    </footer>
  );
}
