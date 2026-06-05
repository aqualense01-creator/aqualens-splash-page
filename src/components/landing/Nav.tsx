import { useState } from "react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const links: { label: string; href: string }[] = [
  { label: "Product", href: "#" },
  { label: "Device", href: "#device" },
  { label: "Platform", href: "#" },
  { label: "Shop", href: "#" },
  { label: "Support", href: "#" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href="/login" className="hidden sm:inline-flex"><Button variant="ghost">Sign in</Button></a>
          <a href="/signup"><Button className="bg-primary text-primary-foreground hover:bg-primary/90">Get Started</Button></a>
          <button
            aria-label="Toggle menu"
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
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-primary"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="#"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-primary sm:hidden"
              >
                Login
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
