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
  scrollMode?: "sticky" | "through";
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
  scrollMode = "sticky",
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
  const firstFrameSrc = pathTemplate.replace("{n}", "001");

  // Detect reduced motion. Mobile still uses the scroll-driven sequence.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mqReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    setReduced(mqReduced.matches);

    const onReducedChange = () => setReduced(mqReduced.matches);

    mqReduced.addEventListener("change", onReducedChange);

    return () => {
      mqReduced.removeEventListener("change", onReducedChange);
    };
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
    }
    sizeRef.current = { w, h, dpr };
    const idx = Math.max(0, Math.min(frameCount - 1, Math.round(currentRef.current)));
    drawFrame(idx);
  };

  const drawFrame = (index: number): boolean => {
    const canvas = canvasRef.current;
    const img = framesRef.current[index];
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return false;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    const { w, h, dpr } = sizeRef.current;
    if (w === 0 || h === 0) return false;
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
    return true;
  };

  // Preload frames: if in static mode (reduced motion), only load the middle frame.
  useEffect(() => {
    let cancelled = false;
    const imgs: HTMLImageElement[] = [];
    const isStatic = reduced;

    if (isStatic) {
      const mid = Math.floor((frameCount - 1) / 2);
      const img = new Image();
      img.decoding = "async";
      img.src = pathTemplate.replace("{n}", String(mid + 1).padStart(3, "0"));
      img.onload = () => {
        if (cancelled) return;
        imgs[mid] = img;
        framesRef.current = imgs;
        setLoaded(frameCount); // set load progress to 100%
        resizeCanvas();
      };
      img.onerror = () => {
        if (cancelled) return;
        setLoaded(frameCount);
      };
      return () => {
        cancelled = true;
      };
    }

    // Load frame 1 first so the canvas paints quickly, then continue the sequence.
    let count = 0;
    const seen = new Set<number>();
    const finish = (i: number) => {
      if (cancelled) return;
      if (seen.has(i)) return;
      seen.add(i);
      count += 1;
      setLoaded(count);
      if (i === 0 || count === frameCount) {
        resizeCanvas();
      }
    };

    const loadFrame = (i: number) => {
      const img = new Image();
      img.decoding = "async";
      img.src = pathTemplate.replace("{n}", String(i + 1).padStart(3, "0"));
      img.onload = () => {
        if (typeof img.decode === "function") {
          img
            .decode()
            .then(() => finish(i))
            .catch(() => finish(i));
        } else {
          finish(i);
        }
      };
      img.onerror = () => finish(i);
      imgs[i] = img;
    };

    framesRef.current = imgs;
    loadFrame(0);
    const restTimer = window.setTimeout(() => {
      for (let i = 1; i < frameCount; i++) {
        loadFrame(i);
      }
      framesRef.current = imgs;
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(restTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameCount, pathTemplate, reduced]);

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

  // Scroll → target frame index (skip if static mode)
  useEffect(() => {
    if (reduced) return;
    const compute = () => {
      const el = targetRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;

      let p: number;
      if (scrollMode === "through") {
        const progressRect = canvasRef.current?.getBoundingClientRect() ?? rect;
        p = (vh - progressRect.top) / (vh + progressRect.height);
      } else {
        // If the top of the element hasn't entered viewport top yet
        if (rect.top > 0) {
          targetIndexRef.current = 0;
          return;
        }

        // If the bottom of the element is above or at the viewport bottom (exit state)
        if (rect.bottom <= vh) {
          targetIndexRef.current = frameCount - 1;
          return;
        }

        const scrollable = Math.max(1, rect.height - vh);
        const traveled = -rect.top;
        p = traveled / scrollable;
      }

      p = Math.max(0, Math.min(1, p));

      // Crisp snapping at start and finish
      if (p < 0.04) p = 0;
      if (p > 0.88) p = 1;

      targetIndexRef.current = p * (frameCount - 1);
    };
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [targetRef, frameCount, reduced, scrollMode]);

  // Smooth animation loop (skip/mock if static mode)
  useEffect(() => {
    const isStatic = reduced;
    if (isStatic) {
      const mid = Math.floor((frameCount - 1) / 2);
      currentRef.current = mid;
      targetIndexRef.current = mid;
      const tryDraw = () => {
        const img = framesRef.current[mid];
        if (img?.complete && img.naturalWidth > 0) {
          resizeCanvas();
        } else {
          rafRef.current = requestAnimationFrame(tryDraw);
        }
      };
      rafRef.current = requestAnimationFrame(tryDraw);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }

    let lastPainted = -1;
    const tick = () => {
      const target = targetIndexRef.current;
      const diff = target - currentRef.current;
      if (Math.abs(diff) > 0.1) {
        currentRef.current += diff * 0.85; // Faster interpolation speed for crisper movement
      } else {
        currentRef.current = target;
      }
      const idx = Math.max(0, Math.min(frameCount - 1, Math.round(currentRef.current)));
      if (idx !== lastPainted) {
        const success = drawFrame(idx);
        if (success) {
          lastPainted = idx;
        }
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
      <img
        src={firstFrameSrc}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
          loaded > 0 ? "opacity-0" : "opacity-100"
        }`}
        loading="eager"
        decoding="async"
      />
      <canvas ref={canvasRef} className="relative h-full w-full" aria-label={alt} role="img" />
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
