## Goal

Two passes on the landing page:

1. **Fix the scroll-trigger section** so the frame sequence plays start-to-finish exactly in sync with scroll position, with smooth easing and proper preloading.
2. **Polish the rest of the landing page** for consistency, spacing, motion, and mobile behavior.

---

## Part 1 — Rewrite the device scroll sequence (Apple-style pinned playback)

Today the canvas lives inside a normal-height section. Progress is mapped to "section travels across viewport," so the animation also plays while the section is half off-screen and the playback never feels locked to scroll. The user explicitly wants "start to finish with perfect visual" and "accurate scroll time."

**New structure** (in `src/components/landing/Rugged.tsx` + `ScrollSequence.tsx`)

```text
<section id="device">                  ← tall outer (≈ 220vh on desktop, 180vh mobile)
  <div class="sticky top-0 h-screen">  ← pinned stage
    grid: [features | canvas | copy]   ← same 3-column layout, vertically centered
  </div>
</section>
```

- Progress = `clamp(0..1, -outerRect.top / (outerRect.height - vh))` → 0 the moment the sticky stage locks, 1 the moment it unlocks. Frame index = `progress * (frameCount-1)`, rounded.
- Drop the framer-motion `y` / `scale` on the canvas wrapper (it competes with the scroll mapping and makes timing feel off). The features chips can keep a tiny parallax tied to the same progress.
- Tighten the smoothing loop: smoothing factor 0.35 (was 0.18) so the canvas tracks scroll closely without jitter. Snap to target when `|diff| < 0.5`.
- DPR-aware canvas: set `canvas.width = cssW * dpr`, `canvas.height = cssH * dpr`, `ctx.scale(dpr, dpr)` once, and resize on viewport change. Eliminates the blurry look on retina.
- Preload pipeline:
  - Kick off all 65 `Image()` fetches in parallel, but draw frame 1 the moment its `decode()` resolves so the section is never empty.
  - Show a subtle 1-line progress bar (not the floating pill) only while < 100 % loaded; hide once decoded.
  - Honor `prefers-reduced-motion`: show the middle frame statically, skip the scroll mapping.

**Acceptance for this part**

- At the moment the section's top reaches the nav, frame 1 is showing.
- Scrolling through the full sticky window plays frames 1 → 65 monotonically.
- Reversing scroll plays 65 → 1 with no skips.
- Last frame holds until the user scrolls past the outer section.
- No layout shift on load; no blurry canvas on retina.

---

## Part 2 — Landing page polish

Scoped, deterministic fixes — no redesign:

**Global**
- Add `scroll-behavior: smooth` and `scroll-padding-top: 4rem` to `html` in `styles.css` so `#device` (and any future anchor) lands below the sticky nav.
- Make `Reveal` fire with `viewport={{ once: true, amount: 0.15 }}` and a faster default (240 ms) so above-the-fold elements aren't stuck at opacity-0 on first paint.
- Reduce default section vertical padding from `py-24` to `py-20` on `<lg`, keep `py-24` on `lg+`, to tighten mobile rhythm.

**Nav**
- Highlight the active section link as the user scrolls (IntersectionObserver on `#device`, `#platform`, `#shop`, `#support`).
- Add hover underline (`story-link`) and a 1 px translucent bottom border that solidifies after 8 px of scroll.

**Hero**
- Tighten headline leading on mobile (`leading-[1.05]` → keep but add `text-pretty`).
- Constrain the right-side preview card to `max-w-[560px]`, centered, so it doesn't crowd the headline on 1024–1280 widths.

**Stats / HowItWorks / Dashboard / Platform / Shop / Support / CTA / Footer**
- Unify section heading kicker style (uppercase 12px, primary, `tracking-[0.18em]`).
- Use one shared section wrapper class (`section-wrap` in `styles.css`) for max-width + padding so all sections line up.
- Add subtle `bg-gradient-to-b from-background to-surface` alternation between sections so the page reads as connected, not stacked rectangles.

**Mobile**
- Stack the Rugged grid as `copy → canvas → chips` (current order is correct on mobile, just verify after the sticky rewrite).
- Reduce the device sticky outer to ~180vh on `<lg` so the section doesn't dominate mobile scroll.
- Ensure nav mobile menu uses real `#device` anchor (already wired, verify).

---

## Verification step (I will run before finishing)

1. Open preview at 1280×800: scroll slowly through `#device`, screenshot at 0 %, 25 %, 50 %, 75 %, 100 % of section progress. Confirm distinct frames each time and monotonic playback.
2. Same at 390×844 mobile viewport.
3. Scroll the full page top-to-bottom, screenshot every section, confirm no opacity-0 sections, no overflow, no overlapping text.
4. Check console + network: all 65 frames load with 200, no 404s, no React warnings.

If any of those fail, fix and re-verify before reporting done.

---

## Files touched

- `src/components/landing/ScrollSequence.tsx` (rewrite)
- `src/components/landing/Rugged.tsx` (sticky stage structure)
- `src/components/landing/Nav.tsx` (active link + scroll border)
- `src/components/landing/Reveal.tsx` (defaults)
- `src/components/landing/Hero.tsx` (preview card max-width)
- `src/styles.css` (smooth scroll, section-wrap utility, reduced-motion guard)
- Light touch-ups in Stats / HowItWorks / Dashboard / Platform / Shop / Support / CTA / Footer to apply shared section wrapper and kicker class.

No new dependencies. No backend or routing changes.
