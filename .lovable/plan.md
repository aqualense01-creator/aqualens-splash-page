# Acqua Lence — Complete MVP Build Plan

Building on what already exists (auth, dashboard, live view, pond detail, sidebar/topbar shell, i18n, insforge client), this plan finishes every remaining farmer, technician, and admin route from the PRD with pixel-perfect UI.

## What already exists
- Auth: `/login`, `/signup` with email OTP verification, `/auth` context
- Shell: `AppSidebar`, `AppTopbar`, `/app` layout, i18n (EN/BN)
- Farmer pages: `/app/dashboard`, `/app/live`, `/app/ponds/:pondId`
- Schema: farms, ponds, devices, readings, alerts (insforge)
- Logo + branding wired

## What to build

### 1. Farmer pages (complete the set)
- `/app/farms` — Farm + Pond management. Farm list (cards), add/edit farm dialog, expandable pond list per farm, add/edit pond dialog with all required fields (name, type, species, area, depth, water type, stocking date, density, device, threshold preset), assign device action.
- `/app/alerts` — Summary cards (critical/warning/device/calibration/resolved), tabbed table (All/Critical/Warning/Device/Calibration/Resolved), filters, row click → detail drawer with parameter, value, threshold, recommended action, history sparkline, acknowledge + resolve + add note actions.
- `/app/reports` — Date range + farm/pond/parameter selectors, summary KPI cards (water quality score, % in safe range, total alerts, device uptime), trend charts (DO, pH, temp, salinity, alert trend, pond comparison), report type tabs (daily/weekly/monthly/device/custom), export CSV/PDF buttons.
- `/app/devices` — Summary cards (total/online/offline/low battery/cal due/maint due), filterable device table with status/battery/signal/firmware/last-seen.
- `/app/devices/:deviceId` — Tabs: Overview, Sensors, History, Settings. Restart + run-diagnostics actions; sampling interval, threshold profile.
- `/app/settings` — Profile, Security (change password, sessions), Notifications (channels × types matrix), Language selector.

### 2. Technician pages
- `/app/setup` — 6-step wizard (Installation checklist → Connectivity test → Registration/QR → Assign to pond → Sensor calibration → Finalize). Stepper UI, validation per step, completion summary.
- `/app/calibration/:deviceId` — Per-sensor calibration cards (pH, DO, temp, turbidity, salinity, ammonia) with calibration value, date, technician name, result status; saves log.
- `/app/maintenance/:deviceId` — Maintenance log table + add-entry form (visit date, technician, issue, action, photos, notes).

### 3. Admin shell + pages
- New `/admin` layout with `AdminSidebar` (Dashboard, Farms, Devices, Users, Alerts, Support, System Settings) reusing `AppTopbar`. Role-gated: only `admin` users can access (check `auth.users` role via insforge profile/role; redirect otherwise).
- `/admin/dashboard` — Platform metrics (customers, farms, ponds, devices online/offline, active+critical alerts, cal due, support tickets), charts (device status, alert trends, farm distribution, uptime trend).
- `/admin/farms` — Customer search, customer profile drawer (farms, ponds, devices, activity, suspend/reactivate), farm/pond CRUD, assign device.
- `/admin/devices` — Full inventory table with firmware/SIM/warranty/maintenance columns, filters, bulk actions (mark maint due, assign technician, export CSV, deactivate, flag).
- `/admin/users` — User table with role filter, create/edit user dialog (role: farmer/manager/technician/admin/support), suspend, reset password, assign org/farm.
- `/admin/alerts` — Cross-platform alert monitoring, filters (farm/district/device/severity), detail drawer with assign-technician, internal note, escalate, resolve.
- `/admin/support` — Ticket table with status filter, create ticket, ticket detail drawer (issue type, farmer, pond, device, priority, photos, assigned tech), status transitions.
- `/admin/settings` — Tabs: Sensor types, Default safe ranges, Alert thresholds, Alert templates (EN/BN), Device packages, Roles, Notification channels, Report templates, Language strings. Changes logged.

### 4. Backend additions (insforge migration)
New tables + RLS:
- `profiles` (id → auth.users, full_name, phone, role enum: farmer|manager|technician|admin|support, district, language, suspended)
- `alerts` extra cols if missing: severity, status (open/ack/resolved), recommended_action, acknowledged_at/by, resolved_at/by, notes[]
- `calibrations` (device_id, sensor_type, value, calibrated_at, technician_id, result)
- `maintenance_logs` (device_id, technician_id, visit_date, issue, action, photos[], notes)
- `support_tickets` (farmer_id, farm_id, pond_id, device_id, issue_type, priority, description, photos[], assigned_to, status)
- `system_settings` (key, value jsonb) for thresholds/templates/sensor types
- `audit_logs` (actor_id, action, entity, entity_id, diff, created_at)
- `device_assignments` history (optional)
- RLS: farmers see own farms/ponds/devices/alerts; admin/support see all; technicians see assigned.

### 5. Shared components to add
- `StatusBadge` (good/watch/warning/critical/offline/cal-due) — colors from semantic tokens
- `ParameterCard` (value, unit, status, safe range, sparkline)
- `BatteryIndicator`, `SignalIndicator`
- `AlertDrawer`, `DeviceCard`, `FarmCard`, `PondCard`
- `Stepper` for technician wizard
- `EmptyState`, `LoadingSkeleton`, `StaleDataChip`
- `RoleGuard` wrapper

### 6. Design tokens (extend src/styles.css)
Add semantic colors for: `--status-good`, `--status-watch`, `--status-warning`, `--status-critical`, `--status-offline`, `--status-calibration`, plus gradients and shadows for cards. Keep current Acqua palette (calm aquatic blues/teals with warm coral for critical).

### 7. Mobile
All pages responsive at 360px. Sidebar collapses; farmer pages get a bottom-tab feel via existing sidebar in mobile drawer mode. Cards stack, charts simplified.

## Technical notes
- Routes use file-based TanStack flat names: `app.farms.tsx`, `app.alerts.tsx`, `app.reports.tsx`, `app.devices.tsx`, `app.devices.$deviceId.tsx`, `app.settings.tsx`, `app.setup.tsx`, `app.calibration.$deviceId.tsx`, `app.maintenance.$deviceId.tsx`, `admin.tsx` (layout), `admin.dashboard.tsx`, `admin.farms.tsx`, `admin.devices.tsx`, `admin.users.tsx`, `admin.alerts.tsx`, `admin.support.tsx`, `admin.settings.tsx`.
- Data: TanStack Query (`useQuery`/`useMutation`) against `insforge` SDK with array-form `insert([...])`.
- Charts: Recharts (already installed) with threshold `ReferenceArea`s.
- i18n: extend `useI18n` dictionary with new keys for every page (EN + BN).
- Admin gate: read role from `profiles` table; redirect non-admins to `/app/dashboard`.

## Execution order
1. Migration: profiles + role, calibrations, maintenance_logs, support_tickets, system_settings, audit_logs, alert columns; insert default system_settings (sensor types + thresholds).
2. Shared components + status tokens.
3. Farmer pages: farms → alerts → devices → device detail → reports → settings.
4. Technician pages: setup wizard → calibration → maintenance.
5. Admin shell + role guard.
6. Admin pages: dashboard → farms → devices → users → alerts → support → settings.
7. i18n strings (EN + BN) pass.
8. Mobile QA + polish.

This is a large build (~20 new route files + ~15 shared components + 1 migration). After approval I'll execute in the order above, batching parallel file writes per phase.