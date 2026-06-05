import { useEffect, useRef, useState, type RefObject } from "react";

type Props = {
  /** Number of frames in the sequence (frames are 1-indexed in the file path). */
  frameCount: number;
  /** Path template, e.g. "/device-frames/frame-{n}.webp" — {n} is replaced with zero-padded index */
  pathTemplate?: string;
  /** Ref to the OUTER scroll-driving element (typically a tall section). The frame index maps to how far that element has scrolled past the top of the viewport. */
  targetRef: RefObject<HTMLElement | null>;
  /** CSS width/height in px for the canvas backing store math. The canvas always fills its container; these are only used for the DPR-scaled pixel buffer. */
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
};

/**
 * Apple-style scroll-driven canvas frame sequence.
 *
 * Pair this with a sticky stage:
 *   <section ref={outerRef} style={{ height: "220vh" }}>
 *     <div className="sticky top-0 h-screen">
 *       <ScrollSequence targetRef={outerRef} frameCount={65} />
 *     </div>
 *   </section>
 *
 * Progress = how far the outer section has scrolled within its own scrollable
 * range. 0 = sticky stage just locked. 1 = sticky stage about to unlock.
 */
export function ScrollSequence({
  frameCount,
  pathTemplate = "/device-frames/frame-{n}.webp",
  targetRef,
  className,
  alt = "Animated product sequence",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const currentRef = useRef(0);
  const targetIndexRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const [loaded, setLoaded] = useState(0);
  const [reduced, setReduced] = useState(false);

  // Detect reduced motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Resize canvas backing store to match its CSS box × devicePixelRatio
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      sizeRef.current = { w, h, dpr };
      const idx = Math.round(currentRef.current);
      drawFrame(idx);
    } else {
      sizeRef.current = { w, h, dpr };
    }
  };

  const drawFrame = (index: number) => {
    const canvas = canvasRef.current;
    const img = framesRef.current[index];
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h, dpr } = sizeRef.current;
    if (w === 0 || h === 0) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // contain fit (preserve aspect ratio, centered)
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = w / h;
    let dw = w;
    let dh = h;
    let dx = 0;
    let dy = 0;
    if (ir > cr) {
      dh = w / ir;
      dy = (h - dh) / 2;
    } else {
      dw = h * ir;
      dx = (w - dw) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  };

  // Preload all frames in parallel
  useEffect(() => {
    let cancelled = false;
    const imgs: HTMLImageElement[] = [];
    let count = 0;
    const finish = (i: number) => {
      if (cancelled) return;
      count += 1;
      setLoaded(count);
      if (i === 0) {
        // Draw first frame as soon as it's available so the canvas isn't empty
        resizeCanvas();
        drawFrame(0);
      }
    };
    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.decoding = "async";
      img.src = pathTemplate.replace("{n}", String(i + 1).padStart(3, "0"));
      img.onload = () => {
        // Prefer decode() for smoother first paint
        if (typeof img.decode === "function") {
          img.decode().then(() => finish(i)).catch(() => finish(i));
        } else {
          finish(i);
        }
      };
      img.onerror = () => finish(i);
      imgs[i] = img;
    }
    framesRef.current = imgs;
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameCount, pathTemplate]);

  // Resize observer
  useEffect(() => {
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener("resize", onResize);
    let ro: ResizeObserver | null = null;
    if (canvasRef.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onResize);
      ro.observe(canvasRef.current);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll → target frame index
  useEffect(() => {
    const compute = () => {
      const el = targetRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // The outer section scrolls (rect.height - vh) px while the sticky stage
      // is locked. Progress is how far we are through that window.
      const scrollable = Math.max(1, rect.height - vh);
      const traveled = Math.max(0, -rect.top);
      const p = Math.max(0, Math.min(1, traveled / scrollable));
      targetIndexRef.current = p * (frameCount - 1);
    };
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [targetRef, frameCount]);

  // Smooth animation loop — only paints when the rounded frame changes
  useEffect(() => {
    if (reduced) {
      // Reduced motion: hold the middle frame
      const mid = Math.floor((frameCount - 1) / 2);
      currentRef.current = mid;
      targetIndexRef.current = mid;
      const tryDraw = () => {
        const img = framesRef.current[mid];
        if (img?.complete && img.naturalWidth > 0) {
          resizeCanvas();
          drawFrame(mid);
        } else {
          rafRef.current = requestAnimationFrame(tryDraw);
        }
      };
      rafRef.current = requestAnimationFrame(tryDraw);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }

    let lastDrawn = -1;
    const tick = () => {
      const target = targetIndexRef.current;
      const diff = target - currentRef.current;
      if (Math.abs(diff) > 0.5) {
        // Smoothly approach target — high factor so we track scroll closely
        currentRef.current += diff * 0.35;
      } else {
        currentRef.current = target;
      }
      const idx = Math.max(
        0,
        Math.min(frameCount - 1, Math.round(currentRef.current)),
      );
      if (idx !== lastDrawn) {
        drawFrame(idx);
        lastDrawn = idx;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameCount, reduced]);

  const pct = Math.round((loaded / frameCount) * 100);
  const showLoader = loaded < frameCount;

  return (
    <div className={`relative ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        aria-label={alt}
        role="img"
      />
      {showLoader && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto flex w-40 flex-col items-center gap-1">
          <div className="h-0.5 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full bg-primary transition-[width] duration-200 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] font-medium tracking-wider text-muted-foreground">
            {pct}%
          </span>
        </div>
      )}
    </div>
  );
}
