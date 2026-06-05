import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";

const links = ["Product", "Solutions", "Platform", "Shop", "Resources", "Support"];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l} href="#" className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
              {l}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="hidden sm:inline-flex">Login</Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Get Started</Button>
        </div>
      </div>
    </header>
  );
}
