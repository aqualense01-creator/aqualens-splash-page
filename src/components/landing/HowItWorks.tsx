import { Cpu, Radio, CloudUpload, BarChart3, CheckCircle2, ChevronRight } from "lucide-react";

const steps = [
  { icon: Cpu, title: "Smart Device", body: "Our buoy collects real-time water quality data 24/7." },
  { icon: Radio, title: "Data Transmission", body: "Data is securely transmitted to the cloud via 4G / NB-IoT / LoRa." },
  { icon: CloudUpload, title: "Cloud Platform", body: "Data is processed, stored, and analyzed in real time." },
  { icon: BarChart3, title: "Smart Insights", body: "Get actionable insights and recommendations." },
  { icon: CheckCircle2, title: "Better Decisions", body: "Take action and improve water quality and yield." },
];

export function HowItWorks() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">How AcquaLence Works</h2>
        <div className="mt-14 grid gap-10 md:grid-cols-5">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="relative flex flex-col items-center text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10">
                <Icon className="h-7 w-7 text-primary" strokeWidth={1.75} />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
              <p className="mt-2 max-w-[180px] text-xs leading-relaxed text-muted-foreground">{body}</p>
              {i < steps.length - 1 && (
                <ChevronRight className="absolute right-[-14px] top-6 hidden h-5 w-5 text-primary/40 md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
