import { Button } from "@/components/ui/button";
import { Activity, Brain, Headphones, ShieldCheck, Play } from "lucide-react";
import heroImg from "@/assets/hero-buoy.jpg";

const chips = [
  { icon: Activity, label: "Real-time", sub: "Monitoring" },
  { icon: Brain, label: "AI Powered", sub: "Insights" },
  { icon: Headphones, label: "24/7 Expert", sub: "Support" },
  { icon: ShieldCheck, label: "Reliable &", sub: "Rugged" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img src={heroImg} alt="AcquaLence smart buoy floating beside a fish farm pen" className="h-full w-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
      </div>
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-28 md:pt-28 md:pb-40">
        <div className="max-w-xl">
          <h1 className="font-display text-5xl font-bold leading-[1.05] text-foreground md:text-6xl">
            Smarter Water.
            <br />
            Stronger Harvests.
          </h1>
          <p className="mt-6 text-base text-muted-foreground md:text-lg">
            AcquaLence is an all-in-one smart aquaculture solution that monitors water quality in real time,
            helps you make better decisions, and maximizes your yield.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
              Explore Product
            </Button>
            <Button size="lg" variant="ghost" className="gap-2 text-foreground">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10">
                <Play className="h-3.5 w-3.5 fill-primary text-primary" />
              </span>
              Watch Video
            </Button>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {chips.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex flex-col items-start gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </span>
                <p className="text-xs font-medium leading-tight text-foreground">
                  {label}
                  <br />
                  {sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
