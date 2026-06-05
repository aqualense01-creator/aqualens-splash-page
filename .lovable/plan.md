
## Goal

Layer four premium, 21st.dev-style animations into the existing landing page without restructuring any sections. All work stays in frontend/presentation code using `framer-motion` (already installed).

## Animations & where they go

### 1. Hero — Animated Gradient Mesh + Magnetic CTA
- Add a new `GradientMesh.tsx` background layer in `Hero.tsx`: three large blurred radial blobs (teal, cyan, navy) animating `x/y/scale` on a 12–18s loop via `motion.div` — sits behind the buoy image, above the wash overlay.
- Wrap the primary "Get Started" button in a new `MagneticButton.tsx`: tracks pointer position on `mousemove`, applies a spring-eased `translate` (max ~12px) so the button drifts toward the cursor, snaps back on leave. Uses `useMotionValue` + `useSpring`.

### 2. Stats strip — Animated Number Counters
- New `CountUp.tsx` component: uses `useInView` + `animate(motionValue, target, { duration: 1.6, ease: "easeOut" })` and renders the rounded value. Supports prefix/suffix (`+`, `%`, `K`).
- Replace the four static stat numbers in `Stats.tsx` with `<CountUp />`, animating once when scrolled into view.

### 3. Trust strip — Infinite Marquee
- New `Marquee.tsx`: duplicated row of partner/industry labels, animated via `motion.div` with `animate={{ x: ['0%', '-50%'] }}` and a linear 30s loop. Pauses on hover (`whileHover={{ animationPlayState: 'paused' }}` via CSS variable approach).
- Replace the static trust strip currently rendered at the bottom of `Hero.tsx` with the marquee.

### 4. Rugged section — Scroll-linked Buoy Parallax
- In `Rugged.tsx`, replace the existing `y: [0,-10,0]` loop with `useScroll` + `useTransform` driven by the section's own ref: buoy translates `y: 80 → -80` and scales `0.95 → 1.05` as the section scrolls through the viewport.
- Add a subtle counter-parallax on the spec chips (`y: -30 → 30`) for depth.

## Files

**New**
- `src/components/landing/GradientMesh.tsx`
- `src/components/landing/MagneticButton.tsx`
- `src/components/landing/CountUp.tsx`
- `src/components/landing/Marquee.tsx`

**Edited**
- `src/components/landing/Hero.tsx` — mount `GradientMesh`, wrap CTA in `MagneticButton`, swap trust strip for `Marquee`
- `src/components/landing/Stats.tsx` — swap static numbers for `CountUp`
- `src/components/landing/Rugged.tsx` — replace float loop with scroll-linked parallax
- `src/styles.css` — add `--gradient-mesh-*` color stops and a `mask-fade-x` utility for the marquee edges

## Notes

- 21st.dev's MCP can't be wired into Lovable, so these patterns are reimplemented by hand in the same style (Aceternity / Magic UI lineage).
- Respects `prefers-reduced-motion`: each component checks `useReducedMotion()` and falls back to static rendering.
- No backend, no new dependencies, no section reordering.
