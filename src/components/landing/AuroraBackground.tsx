import { motion, useReducedMotion } from "framer-motion";

export function AuroraBackground() {
  const reduced = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-1/3 left-1/2 h-[120%] w-[160%] -translate-x-1/2"
        animate={
          reduced
            ? undefined
            : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
        }
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={{
          background:
            "conic-gradient(from 180deg at 50% 50%, oklch(0.66 0.11 210 / 0.30), oklch(0.45 0.10 250 / 0.25), oklch(0.72 0.13 195 / 0.30), oklch(0.40 0.08 280 / 0.25), oklch(0.66 0.11 210 / 0.30))",
          filter: "blur(60px)",
          opacity: 0.7,
          backgroundSize: "200% 200%",
        }}
      />
    </div>
  );
}
