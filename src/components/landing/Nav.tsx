import { useEffect, useState, type MouseEvent } from "react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const links: { label: string; href: string }[] = [
  { label: "Dashboard", href: "#dashboard-heading" },
  { label: "Parameters", href: "#params-heading" },
  { label: "Alerts", href: "#alerts-heading" },
  { label: "Device", href: "#device" },
  { label: "Reports", href: "#reports-heading" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const menuId = "landing-mobile-menu";

  const handleAnchorClick = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!href.startsWith("#") || href === "#") return;

    const target = document.querySelector<HTMLElement>(href);
    if (!target) return;

    event.preventDefault();
    const wasOpen = open;
    setOpen(false);
    window.history.pushState(null, "", href);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scroll = () => {
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    };
    window.setTimeout(scroll, wasOpen ? 280 : 0);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Track which anchored section is currently in view
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const ids = links.map((l) => l.href).filter((h) => h.startsWith("#") && h.length > 1);
    const els = ids
      .map((id) => document.querySelector<HTMLElement>(id))
      .filter((x): x is HTMLElement => !!x);
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(`#${visible.target.id}`);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-border/80 bg-background/90 backdrop-blur-md"
          : "border-b border-transparent bg-background/70 backdrop-blur"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => {
            const isActive = active === l.href;
            return (
              <a
                key={l.label}
                href={l.href}
                onClick={handleAnchorClick(l.href)}
                className={`relative text-sm font-medium transition-colors ${
                  isActive ? "text-primary" : "text-foreground/80 hover:text-primary"
                }`}
              >
                {l.label}
                <span
                  className={`pointer-events-none absolute -bottom-1 left-0 h-[2px] rounded-full bg-primary transition-all duration-300 ${
                    isActive ? "w-full opacity-100" : "w-0 opacity-0"
                  }`}
                />
              </a>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <a href="/login" className="hidden sm:inline-flex">
            <Button variant="ghost">Sign in</Button>
          </a>
          <a href="/signup">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Get Started
            </Button>
          </a>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-md border border-border md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border bg-background/95 backdrop-blur md:hidden"
          >
            <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={handleAnchorClick(l.href)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active === l.href
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-accent hover:text-primary"
                  }`}
                >
                  {l.label}
                </a>
              ))}
              <a
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-primary sm:hidden"
              >
                Sign in
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
