import { motion, useReducedMotion } from "framer-motion";

export function GradientMesh() {
  const reduced = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--primary) 14%, transparent), transparent 42%), linear-gradient(180deg, color-mix(in oklab, var(--surface) 82%, transparent), transparent 70%)",
        }}
      />
      <motion.div
        className="absolute inset-0 bg-grid opacity-45"
        animate={reduced ? undefined : { backgroundPosition: ["0px 0px", "48px 48px"] }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
