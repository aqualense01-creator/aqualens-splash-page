import type { PondStatus, DeviceStatus, AlertSeverity } from "@/lib/insforge";

export type MockPond = {
  id: string;
  name: string;
  species: string;
  status: PondStatus;
  do_mg_l: number;
  ph: number;
  temp_c: number;
  last_updated: string; // ISO
  device_status: DeviceStatus;
  trend: number[]; // last 12 DO readings
};

export type MockDevice = {
  id: string;
  name: string;
  pond_name: string;
  status: DeviceStatus;
  battery_pct: number;
  signal_pct: number;
  last_seen: string;
};

export type MockAlert = {
  id: string;
  pond_name: string | null;
  device_name: string | null;
  alert_type: "critical" | "warning" | "device_offline" | "calibration_due";
  severity: AlertSeverity;
  message: string;
  recommended_action: string | null;
  detected_at: string;
};

const now = Date.now();
const m = (mins: number) => new Date(now - mins * 60_000).toISOString();

export const MOCK_PONDS: MockPond[] = [
  {
    id: "p1",
    name: "Pond 1 — Rui",
    species: "Rui (Rohu)",
    status: "good",
    do_mg_l: 6.8,
    ph: 7.4,
    temp_c: 28.6,
    last_updated: m(3),
    device_status: "online",
    trend: [6.2, 6.4, 6.5, 6.6, 6.7, 6.9, 7.0, 6.9, 6.8, 6.8, 6.9, 6.8],
  },
  {
    id: "p2",
    name: "Pond 2 — Shrimp",
    species: "Bagda Shrimp",
    status: "critical",
    do_mg_l: 2.8,
    ph: 7.1,
    temp_c: 31.2,
    last_updated: m(2),
    device_status: "online",
    trend: [5.8, 5.4, 5.0, 4.6, 4.1, 3.8, 3.4, 3.1, 3.0, 2.9, 2.8, 2.8],
  },
  {
    id: "p3",
    name: "Pond 3 — Tilapia",
    species: "Tilapia",
    status: "warning",
    do_mg_l: 4.2,
    ph: 8.4,
    temp_c: 30.1,
    last_updated: m(7),
    device_status: "low_battery",
    trend: [5.6, 5.4, 5.2, 5.0, 4.9, 4.8, 4.6, 4.5, 4.4, 4.3, 4.2, 4.2],
  },
  {
    id: "p4",
    name: "Pond 4 — Pangas",
    species: "Pangasius",
    status: "good",
    do_mg_l: 7.1,
    ph: 7.6,
    temp_c: 28.9,
    last_updated: m(5),
    device_status: "online",
    trend: [6.9, 7.0, 7.0, 7.1, 7.0, 7.1, 7.2, 7.1, 7.0, 7.1, 7.1, 7.1],
  },
  {
    id: "p5",
    name: "Pond 5 — Carp Mix",
    species: "Mixed carp",
    status: "offline",
    do_mg_l: 5.4,
    ph: 7.3,
    temp_c: 27.8,
    last_updated: m(185), // stale
    device_status: "offline",
    trend: [5.5, 5.5, 5.4, 5.4, 5.4, 5.4, 5.4, 5.4, 5.4, 5.4, 5.4, 5.4],
  },
  {
    id: "p6",
    name: "Pond 6 — Koi",
    species: "Koi Carp",
    status: "good",
    do_mg_l: 6.5,
    ph: 7.5,
    temp_c: 28.4,
    last_updated: m(4),
    device_status: "calibration_due",
    trend: [6.4, 6.5, 6.6, 6.5, 6.6, 6.5, 6.4, 6.5, 6.5, 6.5, 6.5, 6.5],
  },
];

export const MOCK_DEVICES: MockDevice[] = [
  { id: "d1", name: "AL-Sense 01", pond_name: "Pond 1", status: "online", battery_pct: 86, signal_pct: 92, last_seen: m(3) },
  { id: "d2", name: "AL-Sense 02", pond_name: "Pond 2", status: "online", battery_pct: 74, signal_pct: 88, last_seen: m(2) },
  { id: "d3", name: "AL-Sense 03", pond_name: "Pond 3", status: "low_battery", battery_pct: 14, signal_pct: 76, last_seen: m(7) },
  { id: "d4", name: "AL-Sense 04", pond_name: "Pond 4", status: "online", battery_pct: 92, signal_pct: 95, last_seen: m(5) },
  { id: "d5", name: "AL-Sense 05", pond_name: "Pond 5", status: "offline", battery_pct: 0, signal_pct: 0, last_seen: m(185) },
  { id: "d6", name: "AL-Sense 06", pond_name: "Pond 6", status: "calibration_due", battery_pct: 68, signal_pct: 82, last_seen: m(4) },
];

export const MOCK_ALERTS: MockAlert[] = [
  {
    id: "a1",
    pond_name: "Pond 2 — Shrimp",
    device_name: null,
    alert_type: "critical",
    severity: "critical",
    message: "Dissolved oxygen critically low (2.8 mg/L)",
    recommended_action: "Turn on aerator immediately",
    detected_at: m(4),
  },
  {
    id: "a2",
    pond_name: "Pond 3 — Tilapia",
    device_name: null,
    alert_type: "warning",
    severity: "warning",
    message: "pH rising above safe range (8.4)",
    recommended_action: "Check feeding and aeration",
    detected_at: m(22),
  },
  {
    id: "a3",
    pond_name: "Pond 5 — Carp Mix",
    device_name: "AL-Sense 05",
    alert_type: "device_offline",
    severity: "warning",
    message: "Device offline for 3 hours",
    recommended_action: "Check device power and connection",
    detected_at: m(180),
  },
  {
    id: "a4",
    pond_name: "Pond 6 — Koi",
    device_name: "AL-Sense 06",
    alert_type: "calibration_due",
    severity: "info",
    message: "pH sensor calibration due",
    recommended_action: "Schedule a calibration visit this week",
    detected_at: m(60 * 18),
  },
  {
    id: "a5",
    pond_name: "Pond 3 — Tilapia",
    device_name: "AL-Sense 03",
    alert_type: "warning",
    severity: "warning",
    message: "Device battery at 14%",
    recommended_action: "Replace or recharge battery soon",
    detected_at: m(45),
  },
];
