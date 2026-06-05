## Goal

Rebuild the `/` landing page so it reads, in 10 seconds, as a real-time pond water monitoring product for fish & shrimp farmers — not a generic agritech homepage. Fix the slow / last-frame-missing scroll animation. Keep all existing app/admin routes untouched.

## Scope (landing only)

Touched files: `src/routes/index.tsx` and `src/components/landing/*`. New images generated into `src/assets/`. No backend, no route, no schema, no auth changes. App pages under `/app/*` and `/admin/*` are not modified.

---

## New section order

```text
1. Hero — monitoring-first
2. Live Pond Dashboard preview (replaces current Dashboard.tsx focus)
3. Scroll-triggered Monitoring Story (rebuilt — replaces the buoy frame sequence usage here)
4. Water Parameters bento (DO, pH, Temp, Turbidity, Salinity, Ammonia, Device Health)
5. Alerts & Recommended Actions (with Bangla example)
6. How It Works — 4 steps
7. Built for Fish & Shrimp Farmers (phone mockup)
8. Reports & Trends
9. Device Health
10. Rugged Buoy section (keep existing buoy frame canvas here — it's the product shot)
11. Final CTA
12. Footer
```

Stats, Platform, Shop, ProductAttachments, Support stay available but are removed from the landing flow (kept as components so other pages can reuse). The landing is now monitoring-focused, not catalog-focused.

---

## Hero (rewrite `Hero.tsx`)

- Badge: "Smart Water Monitoring for Fish & Shrimp Farms"
- H1: "See Your Pond Water Health Before Problems Become Losses"
- Sub: DO, pH, temperature, turbidity, salinity, ammonia, device health — real time with clear alerts and actions.
- CTAs: "View Live Demo" → `/app/live`, "Request Setup" → `/app/setup`. Full-width on `<sm`.
- Trust row: 4 chips (Real-time readings · Critical alerts · Farmer-friendly · EN/বাংলা).
- Right column = dashboard preview card (new component `HeroDashboardCard.tsx`):
  - Header: "Pond 2 · Critical"
  - Three big readings: DO 3.1 mg/L (red), pH 8.4 (amber), Temp 31.2°C (ok)
  - Alert strip: "Low oxygen — Turn on aerator now"
  - Mini sparkline (inline SVG, no chart lib)
  - Device row: AQ-204 online · battery 78% · signal 4/5
- Layout: desktop text-left / card-right; tablet 2-col balanced; mobile text → card; no horizontal overflow.

## Live Pond Dashboard preview (rewrite `Dashboard.tsx`)

- Farm selector pill row (Mirpur Farm · Khulna Farm · Cox's Bazar Shrimp)
- Pond grid: Pond 1 Good / Pond 2 Critical DO low / Pond 3 Warning pH rising
- Right rail: Alert card, Recommended action, Device health, 12h trend chart (lightweight inline SVG path)
- All mock data in a `mock-pond.ts` helper next to the component.

## Scroll-triggered Monitoring Story (new `MonitoringStory.tsx`)

This REPLACES the slow ScrollSequence used for storytelling. The existing 65-frame buoy canvas is kept only inside `Rugged.tsx` for the product shot.

Implementation: framer-motion `useScroll` with a 140vh outer + `sticky top-0 h-screen` stage (NOT 200vh). 7 step cards cross-fade based on scroll progress.

- Progress `p = clamp(0..1, -rect.top / (rect.height - vh))`
- `activeIndex = Math.min(steps.length - 1, Math.floor(p * steps.length))`
- Each step card uses `opacity` + small `y` only; no layout animation; final state held with `opacity: 1` once `p >= 0.98`
- `prefers-reduced-motion`: render the final card statically, no pin
- Mobile (`<lg`): drop the pin entirely, render the 7 cards as a vertical stack with `whileInView` reveals — no long scroll
- Steps: Pond monitored → Sensors read 6 params → Dashboard receives → Risk detected (DO low) → Farmer alerted → Action: turn on aerator → Pond recovers (green)

Comments in code explicitly call out: short scroll range (140vh), final-state lock, mobile fallback.

## Fix existing buoy `ScrollSequence` (used by `Rugged.tsx`)

Keep the canvas approach but harden it per the brief:

- Tighten `Rugged` outer height: 200vh → **150vh** desktop, **stack (no sticky) on mobile** showing only the middle frame statically
- In `ScrollSequence.tsx`:
  - Force-draw the last frame when `p >= 0.995` (off-by-one guard)
  - On unmount / when outer leaves below viewport, paint the final frame (equivalent of GSAP `onLeave`)
  - On scroll back above, paint frame 0 (equivalent of `onEnterBack`)
  - `Math.min(frameCount - 1, Math.round(currentRef.current))` already present — verify
  - Skip scroll mapping entirely under `prefers-reduced-motion` and draw the middle frame
  - Recompute progress on `resize` and after all images decode (equivalent of `ScrollTrigger.refresh()`)

## Water Parameters bento (new `WaterParameters.tsx`)

7 cards in a 12-col bento (DO + Device Health span 2 cols on lg). Each card:

- lucide icon, parameter name, large value + unit, status badge (good/watch/warning/critical), tiny inline-SVG sparkline, one-line copy from brief.

## Alerts & Recommendations (new `AlertsActions.tsx`)

- Left: heading "From Risk Detection to Clear Action" + 2 paragraphs
- Right: stack of 5 alert cards using semantic tokens for severity:
  - Critical (red) — "Pond 2 oxygen is low. Turn on aerator now."
  - Warning (amber) — pH rising
  - Device (gray) — offline
  - Calibration (indigo) — pH sensor due
  - Bangla card — "পুকুর ২: অক্সিজেন কমে গেছে। এখনই এয়ারেটর চালু করুন।"
- Severity colors added to `styles.css` as semantic tokens (`--status-critical`, `--status-warning`, `--status-watch`, `--status-good`, `--status-offline`, `--status-calibration`) — no raw hex in components.

## How It Works (refresh `HowItWorks.tsx`)

Rewrite copy to the 4 brief-specified steps. Keep existing layout/styling.

## Built for Farmers (new `FarmersSection.tsx`)

Two-column: copy + phone mockup (rounded device frame, SVG, showing pond status, critical alert, action button, call/support).

## Reports & Trends (new `ReportsTrends.tsx`)

3 cards: Daily summary, Weekly farm health, Alert history. Plus export-icon row (PDF / CSV / Excel). Inline-SVG trend lines.

## Device Health (new `DeviceHealth.tsx`)

Single bento card group: online/offline, battery, signal, last seen, calibration due, maintenance due. Sample devices AQ-204 online, AQ-188 offline.

## Final CTA (refresh `CTA.tsx`)

Update headline/sub to brief copy. Two buttons. Small links row: Login · Dashboard · Support · EN / বাংলা.

## Footer

Keep `Footer.tsx`, only re-order links to match brief.

---

## Image generation

Generate 3 images into `src/assets/` (fast tier, .jpg):

- `pond-hero.jpg` — calm pond with buoy at golden hour (subtle, for hero background tint)
- `farmer-mobile.jpg` — farmer holding phone at pond edge (for Farmers section)
- `monitoring-illustration.jpg` — abstract isometric pond + sensors (for Monitoring Story background)

All used at low opacity behind glass cards; no decorative-only large hero photo.

---

## Design tokens (`styles.css`)

- Add status color tokens (oklch) listed above + matching `bg-status-*` / `text-status-*` Tailwind utility classes via `@layer utilities`.
- Add `--section-pad-y` and `.section-wrap` utility (`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`) — already partly there, formalize.
- Keep current aqua palette; do not redefine `--primary`.

---

## Responsive & a11y guardrails

- Test viewports during verification: 360, 390, 430, 768, 1024, 1440.
- All tap targets ≥ 44px (Tailwind `min-h-11`).
- Semantic `<section aria-labelledby>` everywhere; one `<h1>`.
- Alert severity always carries an icon + text label (color is not the only signal).
- `prefers-reduced-motion` honored in MonitoringStory, ScrollSequence, and Reveal.

## Performance

- All new charts/sparklines are inline SVG (no recharts on landing).
- Generated images: max 1280px wide, .jpg, `loading="lazy"` except hero.
- No new npm dependencies.

---

## Verification (before reporting done)

1. Build clean.
2. Browser at 1440×900: scroll top→bottom, screenshot each section, confirm no opacity-0, no overflow, no overlapping text. Confirm MonitoringStory final card is visible at end of its scroll. Confirm Rugged buoy ends on the last frame.
3. Repeat at 390×844: confirm MonitoringStory is a stacked list (no long pin), buoy section is short, CTAs are full-width, no horizontal scroll.
4. Console + network clean.

## Files changed

New:

- `src/components/landing/HeroDashboardCard.tsx`
- `src/components/landing/MonitoringStory.tsx`
- `src/components/landing/WaterParameters.tsx`
- `src/components/landing/AlertsActions.tsx`
- `src/components/landing/FarmersSection.tsx`
- `src/components/landing/ReportsTrends.tsx`
- `src/components/landing/DeviceHealth.tsx`
- `src/lib/mock-pond.ts`
- `src/assets/pond-hero.jpg` (+ .asset.json if needed)
- `src/assets/farmer-mobile.jpg`
- `src/assets/monitoring-illustration.jpg`

Edited:

- `src/routes/index.tsx` (section order, metadata)
- `src/components/landing/Hero.tsx`
- `src/components/landing/Dashboard.tsx`
- `src/components/landing/HowItWorks.tsx`
- `src/components/landing/CTA.tsx`
- `src/components/landing/Footer.tsx`
- `src/components/landing/Rugged.tsx` (height 150vh, mobile static)
- `src/components/landing/ScrollSequence.tsx` (final-frame lock, reduced-motion, refresh-on-decode)
- `src/styles.css` (status tokens, section-wrap utility)

Not touched: every file under `src/routes/app.*`, `src/routes/admin.*`, auth routes, server functions, migrations.
