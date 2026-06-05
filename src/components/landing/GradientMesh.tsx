import { motion, useReducedMotion } from "framer-motion";

export function GradientMesh() {
  const reduced = useReducedMotion();
  const blobs = [
    { color: "oklch(0.66 0.11 210 / 0.35)", size: 520, top: "-10%", left: "-8%", dur: 16 },
    { color: "oklch(0.72 0.13 195 / 0.28)", size: 600, top: "20%", left: "55%", dur: 20 },
    { color: "oklch(0.35 0.10 250 / 0.30)", size: 460, top: "60%", left: "10%", dur: 14 },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={
            reduced
              ? undefined
              : { x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.08, 0.96, 1] }
          }
          transition={{ duration: b.dur, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            background: `radial-gradient(circle at 50% 50%, ${b.color}, transparent 65%)`,
            filter: "blur(40px)",
          }}
        />
      ))}
    </div>
  );
}
