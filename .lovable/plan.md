# Acqua Lence MVP — Build Plan

InsForge is already connected (`@insforge/sdk`, anon key in `.env`, API key as secret). The current `/` is the marketing landing — we'll keep it as a public entry and move the app under `/app/*`, technician under `/app/setup`, `/app/calibration`, `/app/maintenance`, and admin under `/admin/*`.

## Phasing (each phase is a separate user turn so you can review)

### Phase 1 — Foundation (this phase)

**Backend schema (InsForge migrations)**
- `profiles` — id (→ auth.users), full_name, phone, district, language ('en'|'bn'), role enum
- `app_role` enum: `farmer | farm_manager | technician | admin | support`
- `user_roles` table (separate from profiles, for RLS)
- `farms` — id, owner_id, name, district, location, status
- `ponds` — id, farm_id, name, type, water_type, species, area_m2, depth_m, stocking_date, stocking_density, device_id, threshold_preset
- `devices` — id, serial, hardware_version, firmware_version, farm_id, pond_id, status, battery, signal, last_seen
- `sensors` — id, device_id, type (do/ph/temp/turbidity/salinity/ammonia), status, last_calibrated, calibration_due
- `readings` — id, pond_id, device_id, recorded_at, do, ph, temp, turbidity, salinity, ammonia, water_level
- `alerts` — id, pond_id, device_id, type, severity (good/watch/warning/critical/offline/calibration_due), parameter, value, threshold, message, recommended_action, status, acknowledged_at, resolved_at
- `thresholds` — id, scope (global/farm/pond), pond_id?, parameter, safe_min, safe_max, warn_min, warn_max, crit_min, crit_max
- `maintenance_logs`, `calibration_logs`, `support_tickets`
- RLS via `has_role()` security-definer fn; farmers see only their owned farms/ponds; admins see everything

**Auth + app shell**
- `/login` (phone+OTP scaffold; password fallback) using InsForge SDK
- `/app/_layout` — sidebar (Dashboard/Live/Farms&Ponds/Alerts/Reports/Devices/Settings), topbar (farm selector, lang toggle EN/BN, notifications, profile)
- Auth guard: redirect unauth → `/login`
- Role-based sidebar (farmer/technician/admin variants)
- i18n scaffold (simple `t()` keyed strings, EN + BN)
- Design tokens: status colors in `styles.css` (good/watch/warning/critical/offline/calibration)
- Status badge, parameter card, pond status card primitives

**Seed data** — 1 farm, 3 ponds, 1 device, sample readings + 1 critical alert so screens aren't empty.

### Phase 2 — Farmer core
- `/app/dashboard` (farm health summary, pond cards, today's alerts, recommended action, device health, empty state)
- `/app/live` (live grid, filters, auto-refresh, stale indicator)
- `/app/ponds/:pondId` (live cards, chart with thresholds, timeline, sensor history table, export)

### Phase 3 — Farm/pond/device management + alerts
- `/app/farms` (farm + pond CRUD, assign device, threshold preset)
- `/app/alerts` (tabs, table, detail drawer, ack/resolve/note actions)
- `/app/devices` + `/app/devices/:deviceId` (overview/sensors/history/settings tabs)

### Phase 4 — Technician + Settings + Reports
- `/app/setup` 6-step wizard, `/app/calibration/:deviceId`, `/app/maintenance/:deviceId`
- `/app/reports` (charts, export PDF/CSV)
- `/app/settings` (profile, security, notifications)

### Phase 5 — Admin panel
- `/admin/*` — dashboard, farms, devices, users, alerts, support, system settings

### Phase 6 — Polish
- Mobile bottom-tab nav for farmer
- Full BN translations pass
- All UI states (loading skeletons, empty, error, offline, stale, no-permission)
- Analytics event hooks

## Technical notes
- Stack: TanStack Start + InsForge SDK (already wired). Charts: Recharts. State: TanStack Query.
- The existing landing page stays at `/` with a "Sign in" button → `/login`.
- Readings table is the hot path; insert via device API later — Phase 1 seeds rows + provides a "simulate reading" dev button so the UI is testable without hardware.
- Auth: email/password to start (InsForge supports it out of the box); add phone+OTP in Phase 4 once we wire the SMS provider.
- Bangla typography: add Noto Sans Bengali via Google Fonts and wire to `--font-body`.

## Confirm before I start

1. **OK to start with Phase 1** (schema + auth + shell + seed) in this turn, then iterate? Each phase ≈ one back-and-forth.
2. **Keep the existing marketing landing at `/`** with a "Sign in" CTA, or replace it with the login screen as the root?
3. **Auth method for v1**: email/password now, phone-OTP later — OK? (Phone-OTP needs a paid SMS provider on InsForge.)
4. **Bangla strings**: I'll set up the i18n scaffold and translate critical alert/action strings. Full BN translation of every label can land in Phase 6 — OK?
