import { motion, useReducedMotion } from "framer-motion";

export function AuroraBackground() {
  const reduced = useReducedMotion();

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        animate={reduced ? undefined : { backgroundPosition: ["0% 50%", "100% 50%"] }}
        transition={{ duration: 18, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
        style={{
          background:
            "linear-gradient(120deg, oklch(0.66 0.11 210 / 0.22), transparent 38%, oklch(0.72 0.13 195 / 0.18) 62%, transparent), linear-gradient(180deg, transparent, oklch(0.18 0.05 250 / 0.65))",
          backgroundSize: "220% 220%, 100% 100%",
        }}
      />
    </div>
  );
}
