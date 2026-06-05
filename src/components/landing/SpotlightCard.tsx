import { useRef, type ReactNode } from "react";

export function SpotlightCard({
  children,
  className = "",
  color = "oklch(0.66 0.11 210 / 0.18)",
}: {
  children: ReactNode;
  className?: string;
  color?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={"group/spot relative overflow-hidden " + className}
      style={
        {
          "--mx": "50%",
          "--my": "50%",
          "--spot-color": color,
        } as React.CSSProperties
      }
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(220px circle at var(--mx) var(--my), var(--spot-color), transparent 60%)",
        }}
      />
      {children}
    </div>
  );
}
