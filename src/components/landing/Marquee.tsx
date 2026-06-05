import { motion, useReducedMotion } from "framer-motion";

export function Marquee({
  items,
  speed = 30,
  className = "",
}: {
  items: string[];
  speed?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const row = [...items, ...items];
  return (
    <div className={"group relative overflow-hidden mask-fade-x " + className}>
      <motion.div
        className="flex w-max gap-12 whitespace-nowrap py-1"
        animate={reduced ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: speed, ease: "linear", repeat: Infinity }}
        style={{ animationPlayState: "var(--marquee-play, running)" } as React.CSSProperties}
      >
        {row.map((label, i) => (
          <span
            key={i}
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground opacity-80"
          >
            {label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
