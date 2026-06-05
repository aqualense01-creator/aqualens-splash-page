import { useEffect, useRef, useState } from "react";

type Props = {
  frameCount: number;
  /** Path template, e.g. "/device-frames/frame-{n}.webp" — {n} is replaced with zero-padded index */
  pathTemplate?: string;
  /** Width / height in px for the canvas (intrinsic resolution). Default 960x540. */
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
};

/**
 * Canvas-based scroll-triggered frame sequence (Apple-style).
 * Smoothly draws the right frame based on the section's scroll progress.
 */
export function ScrollSequence({
  frameCount,
  pathTemplate = "/device-frames/frame-{n}.webp",
  width = 960,
  height = 540,
  className,
  alt = "Animated product sequence",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const currentRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(0);

  // Preload frames
  useEffect(() => {
    let cancelled = false;
    const imgs: HTMLImageElement[] = [];
    let count = 0;
    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      img.decoding = "async";
      img.src = pathTemplate.replace("{n}", String(i).padStart(3, "0"));
      img.onload = () => {
        if (cancelled) return;
        count += 1;
        setLoaded(count);
        if (i === 1) drawFrame(0);
      };
      imgs[i - 1] = img;
    }
    framesRef.current = imgs;
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameCount, pathTemplate]);

  const drawFrame = (index: number) => {
    const canvas = canvasRef.current;
    const img = framesRef.current[index];
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // contain fit
    const cw = canvas.width;
    const ch = canvas.height;
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = cw / ch;
    let dw = cw,
      dh = ch,
      dx = 0,
      dy = 0;
    if (ir > cr) {
      dh = cw / ir;
      dy = (ch - dh) / 2;
    } else {
      dw = ch * ir;
      dx = (cw - dw) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  };

  // Smooth animation loop with easing toward target
  useEffect(() => {
    const tick = () => {
      const diff = targetRef.current - currentRef.current;
      if (Math.abs(diff) > 0.01) {
        currentRef.current += diff * 0.18; // smoothing factor
        const idx = Math.round(
          Math.max(0, Math.min(frameCount - 1, currentRef.current)),
        );
        drawFrame(idx);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameCount]);

  // Scroll trigger
  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // progress: 0 when section's top reaches bottom of viewport,
      // 1 when section's bottom reaches top of viewport
      const total = rect.height + vh;
      const traveled = vh - rect.top;
      const p = Math.max(0, Math.min(1, traveled / total));
      targetRef.current = p * (frameCount - 1);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [frameCount]);

  const pct = Math.round((loaded / frameCount) * 100);

  return (
    <div ref={containerRef} className={className}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="h-full w-full object-contain"
        aria-label={alt}
        role="img"
      />
      {loaded < frameCount && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 mx-auto w-fit rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur">
          Loading {pct}%
        </div>
      )}
    </div>
  );
}
