
# AcquaLence Landing Page

Build a polished, single-page marketing site for AcquaLence (smart aquaculture water-quality monitoring), closely inspired by the uploaded reference. Clean, trustworthy, aqua/teal palette on white with a deep navy band — modern SaaS-meets-hardware feel.

## Design tokens (src/styles.css)
- Primary: teal `oklch(0.62 0.11 210)` (approx #1FA2B8)
- Deep navy section: `oklch(0.22 0.05 240)` (approx #0F2C44)
- Background: white; muted surface: `oklch(0.98 0.005 230)`
- Body font: Inter; Display: Plus Jakarta Sans (bold, slightly tight tracking)
- Soft rounded cards (`rounded-xl`), subtle borders, light shadows

## Sections (in order)
1. **Top nav** — logo + droplet icon, links (Product, Solutions, Platform, Shop, Resources, Support), Login + Get Started CTA.
2. **Hero** — "Smarter Water. Stronger Harvests." headline, subcopy, Explore Product / Watch Video buttons, generated hero image (buoy on water with fish pen), 4 inline feature chips (Real-time Monitoring, AI Powered Insights, 24/7 Expert Support, Reliable & Rugged).
3. **All-in-One stats strip** — 5 feature stats (5+ Parameters, Real-time, AI Powered, Cloud Based, IP67) + side blurb with Learn More.
4. **How AcquaLence Works** — 5-step horizontal flow with icons + arrows (Smart Device → Data Transmission → Cloud Platform → Smart Insights → Better Decisions).
5. **Dashboard showcase** — "Every Parameter. Every Moment." left copy with checklist; right side a stylized dashboard mockup (built in JSX with mock charts using Recharts).
6. **Rugged. Reliable.** — center buoy image with 4 spec callouts on left (Solar Powered, 5+ Parameters, Rugged Design, Easy Maintenance) and right copy + 4 mini icon stats.
7. **Data That Drives Growth** — deep navy band, laptop+phone dashboard image, 5 platform features (Advanced Analytics, Smart Alerts, Reports, Team Access, API Integration).
8. **Shop** — "Everything You Need" with 5 product cards (Buoy, DO Sensor, pH Sensor, Turbidity Sensor, Solar Panel Kit) with price + Add to Cart.
9. **24/7 Expert Support + Testimonials** — split: left support list with photo of expert; right testimonial card with quote, author, dots.
10. **CTA band** — aquaculture water background, "Ready to Transform Your Aquaculture?" with Get Started Today / Request Demo.
11. **Footer** — logo, columns (Product, Company, Resources, Legal), socials, copyright.

## Technical
- Single route: replace `src/routes/index.tsx` with the landing page.
- Components split under `src/components/landing/` (Nav, Hero, Stats, HowItWorks, Dashboard, Rugged, Platform, Shop, Support, CTA, Footer).
- Update `__root.tsx` head defaults + per-route `head()` with title, description, og tags, and hero og:image.
- Add semantic tokens (primary teal, navy surface, gradient-hero, shadow-soft) to `src/styles.css`. Wire Inter + Plus Jakarta via Google Fonts `<link>` in root head.
- Generate images with imagegen:
  - Hero buoy on water (1600x1000)
  - Standalone buoy product shot, transparent bg (1024x1024)
  - Expert support portrait (1024x1024)
  - CTA fish-farm water background (1600x600)
  - 4 small product shots for shop (DO sensor, pH sensor, turbidity sensor, solar panel)
- Mock dashboard built with Recharts (line chart) — no real data wiring.
- Lucide icons throughout. Subtle framer-motion fade/slide on hero + section reveals.
- Fully responsive (stack columns on mobile, horizontal flow becomes vertical).

No backend, auth, or Cloud needed — pure presentation.
