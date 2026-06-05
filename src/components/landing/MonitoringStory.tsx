import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from "framer-motion";
import {
  Waves,
  Activity,
  LayoutDashboard,
  AlertOctagon,
  BellRing,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { Reveal } from "./Reveal";
import step1 from "@/assets/story/step-1.jpg";
import step2 from "@/assets/story/step-2.jpg";
import step3 from "@/assets/story/step-3.jpg";
import step4 from "@/assets/story/step-4.jpg";
import step5 from "@/assets/story/step-5.jpg";
import step6 from "@/assets/story/step-6.jpg";
import step7 from "@/assets/story/step-7.jpg";

const steps = [
  {
    icon: Waves,
    image: step1,
    alt: "Smart sensor buoy floating in a calm aquaculture pond",
    title: "Pond water is monitored 24/7",
    body: "Our buoy floats in your pond and reads water around the clock.",
  },
  {
    icon: Activity,
    image: step2,
    alt: "Underwater water-quality sensor probes reading DO and pH",
    title: "Sensors capture 6 parameters",
    body: "DO, pH, temperature, turbidity, salinity and ammonia — second by second.",
  },
  {
    icon: LayoutDashboard,
    image: step3,
    alt: "Live water-quality dashboard with charts and gauges",
    title: "Dashboard receives live data",
    body: "Readings stream into a calm, farmer-friendly dashboard you can open on any phone.",
  },
  {
    icon: AlertOctagon,
    image: step4,
    alt: "Pond water turning murky — early sign of falling oxygen",
    title: "Risk detected: oxygen falling",
    body: "Acqua Lence spots dangerous patterns early — like dissolved oxygen dropping below 4 mg/L.",
  },
  {
    icon: BellRing,
    image: step5,
    alt: "Farmer checking an alert on a smartphone beside the pond",
    title: "Farmer is alerted instantly",
    body: "SMS, WhatsApp, app push and email — in English or বাংলা.",
  },
  {
    icon: Wrench,
    image: step6,
    alt: "Paddle wheel aerator splashing water to add oxygen",
    title: "Clear action: turn on aerator",
    body: "Not just a number. A practical next step the farmer can do right now.",
  },
  {
    icon: CheckCircle2,
    image: step7,
    alt: "Healthy fish and shrimp thriving in clear pond water",
    title: "Pond returns to safe levels",
    body: "Status flips back to green. You saved the harvest before it became a loss.",
  },
];

export function MonitoringStory() {
  const outerRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const usePin = !reduced && !isMobile;

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (!usePin) return;
    // Lock to final step when nearly done — guards against rounding skipping it.
    const idx =
      p >= 0.94 ? steps.length - 1 : Math.min(steps.length - 1, Math.floor(p * steps.length));
    setActive(idx);
  });

  // Static stacked fallback (mobile / reduced motion).
  if (!usePin) {
    return (
      <section className="relative bg-surface py-20 sm:py-24" aria-labelledby="story-heading">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              How It Works
            </p>
            <h2
              id="story-heading"
              className="mt-3 font-display text-3xl font-bold text-foreground text-balance sm:text-4xl"
            >
              From pond water to farmer action — in seconds.
            </h2>
          </Reveal>
          <ol className="mt-10 space-y-4">
            {steps.map(({ icon: Icon, image, alt, title, body }, i) => (
              <Reveal key={title} delay={i * 0.05}>
                <li className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
                  <img
                    src={image}
                    alt={alt}
                    width={1280}
                    height={896}
                    loading="lazy"
                    className="aspect-[16/10] w-full object-cover"
                  />
                  <div className="flex items-start gap-3 p-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Step {i + 1}
                      </span>
                      <h3 className="mt-0.5 text-[15px] font-semibold text-foreground">{title}</h3>
                      <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{body}</p>
                    </div>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={outerRef}
      className="relative bg-surface"
      aria-labelledby="story-heading"
      style={{ height: "210vh" }}
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(800px 500px at 50% 50%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 65%)",
          }}
        />
        <div className="mx-auto grid w-full max-w-7xl grid-cols-12 items-center gap-10 px-6">
          {/* left: heading + progress rail */}
          <div className="col-span-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              How It Works
            </p>
            <h2
              id="story-heading"
              className="mt-3 font-display text-4xl font-bold text-foreground text-balance lg:text-5xl"
            >
              From pond water to farmer action — in seconds.
            </h2>
            <p className="mt-4 max-w-md text-[15px] text-muted-foreground">
              Scroll to watch how Acqua Lence turns raw sensor data into a practical next step that
              protects your fish and shrimp.
            </p>

            <ol className="mt-8 space-y-1.5">
              {steps.map((s, i) => {
                const done = i < active;
                const current = i === active;
                return (
                  <li
                    key={s.title}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors ${
                      current ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold transition-colors ${
                        done
                          ? "bg-status-good text-white"
                          : current
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    {s.title}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* right: active step card */}
          <div className="col-span-7 flex justify-center">
            <div className="relative h-[560px] w-full max-w-xl">
              {steps.map((s, i) => {
                const Icon = s.icon;
                const isActive = i === active;
                return (
                  <motion.article
                    key={s.title}
                    aria-hidden={!isActive}
                    initial={false}
                    animate={{
                      opacity: isActive ? 1 : 0,
                      y: isActive ? 0 : 16,
                      scale: isActive ? 1 : 0.98,
                    }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-[0_40px_80px_-30px_rgba(15,44,68,0.30)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                        Step {i + 1} of {steps.length}
                      </span>
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-6 font-display text-3xl font-bold text-foreground text-balance">
                      {s.title}
                    </h3>
                    <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                      {s.body}
                    </p>
                    {/* visual frame */}
                    <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-border/60">
                      <img
                        src={s.image}
                        alt={s.alt}
                        width={1280}
                        height={896}
                        loading={i === 0 ? "eager" : "lazy"}
                        decoding="async"
                        className="aspect-[16/10] w-full object-cover"
                      />
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
