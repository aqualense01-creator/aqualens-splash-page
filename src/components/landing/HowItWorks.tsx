import { CyberneticBentoGrid } from "@/components/ui/cybernetic-bento-grid";
import { Reveal } from "./Reveal";

export function HowItWorks() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-[#061727] py-16 sm:py-20 lg:py-24"
      aria-labelledby="features-heading"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_78%_18%,rgba(45,212,191,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%)]" />
      <div className="absolute inset-0 bg-grid opacity-[0.08]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-200/30 to-transparent" />
      <Reveal className="relative">
        <CyberneticBentoGrid headingId="features-heading" />
      </Reveal>
    </section>
  );
}
