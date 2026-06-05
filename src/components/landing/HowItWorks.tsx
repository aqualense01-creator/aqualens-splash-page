import { Cpu, Radio, CloudUpload, BarChart3, CheckCircle2, ChevronRight } from "lucide-react";
import { Reveal } from "./Reveal";

const steps = [
  { icon: Cpu, title: "Smart Device", body: "Our buoy collects real-time water quality data 24/7." },
  { icon: Radio, title: "Data Transmission", body: "Securely transmitted to the cloud via 4G / NB-IoT / LoRa." },
  { icon: CloudUpload, title: "Cloud Platform", body: "Data is processed, stored and analyzed in real time." },
  { icon: BarChart3, title: "Smart Insights", body: "Get actionable insights and recommendations." },
  { icon: CheckCircle2, title: "Better Decisions", body: "Take action and improve water quality and yield." },
];

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 -z-10 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">How it works</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground text-balance md:text-4xl">
            From buoy to better decisions in five steps
          </h2>
        </Reveal>

        <div className="relative mt-16 grid gap-10 md:grid-cols-5">
          {/* connecting line */}
          <div className="absolute left-[8%] right-[8%] top-8 hidden h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent md:block" />
          {steps.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 0.08} className="relative flex flex-col items-center text-center">
              <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-background ring-1 ring-border shadow-soft">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/15 to-transparent" />
                <Icon className="relative h-6 w-6 text-primary" strokeWidth={1.75} />
                <span className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground shadow-soft">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
              <p className="mt-2 max-w-[200px] text-xs leading-relaxed text-muted-foreground">{body}</p>
              {i < steps.length - 1 && (
                <ChevronRight className="absolute right-[-14px] top-5 hidden h-5 w-5 text-primary/40 md:block" />
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
