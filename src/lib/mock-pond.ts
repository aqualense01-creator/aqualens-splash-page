// Mock pond/farm data for landing-page previews. Pure data, no side effects.

export type Status = "good" | "watch" | "warning" | "critical" | "offline" | "calibration";

export const statusMeta: Record<
  Status,
  { label: string; bn: string; color: string; ring: string; bg: string; text: string }
> = {
  good: {
    label: "Good",
    bn: "ভালো",
    color: "var(--status-good)",
    ring: "ring-status-good/30",
    bg: "bg-status-good/10",
    text: "text-status-good",
  },
  watch: {
    label: "Watch",
    bn: "নজর রাখুন",
    color: "var(--status-watch)",
    ring: "ring-status-watch/30",
    bg: "bg-status-watch/10",
    text: "text-status-watch",
  },
  warning: {
    label: "Warning",
    bn: "সতর্কতা",
    color: "var(--status-warning)",
    ring: "ring-status-warning/30",
    bg: "bg-status-warning/15",
    text: "text-status-warning",
  },
  critical: {
    label: "Critical",
    bn: "জরুরি",
    color: "var(--status-critical)",
    ring: "ring-status-critical/30",
    bg: "bg-status-critical/10",
    text: "text-status-critical",
  },
  offline: {
    label: "Offline",
    bn: "অফলাইন",
    color: "var(--status-offline)",
    ring: "ring-status-offline/30",
    bg: "bg-status-offline/10",
    text: "text-status-offline",
  },
  calibration: {
    label: "Calibrate",
    bn: "ক্যালিব্রেট",
    color: "var(--status-calibration)",
    ring: "ring-status-calibration/30",
    bg: "bg-status-calibration/10",
    text: "text-status-calibration",
  },
};

export const ponds = [
  {
    id: "p1",
    name: "Pond 1 · Catla",
    status: "good" as Status,
    do: 6.8,
    ph: 7.4,
    temp: 28.4,
    device: "AQ-204",
  },
  {
    id: "p2",
    name: "Pond 2 · Shrimp",
    status: "critical" as Status,
    do: 3.1,
    ph: 8.4,
    temp: 31.2,
    device: "AQ-211",
    alert: "Low oxygen — Turn on aerator now",
    alertBn: "অক্সিজেন কমে গেছে — এয়ারেটর চালু করুন",
  },
  {
    id: "p3",
    name: "Pond 3 · Tilapia",
    status: "warning" as Status,
    do: 5.4,
    ph: 8.7,
    temp: 29.5,
    device: "AQ-188",
    alert: "pH rising — check water exchange",
  },
];

export const farms = ["Mirpur Farm", "Khulna Shrimp", "Cox's Bazar"];

export const trend12h = [6.8, 6.6, 6.4, 6.1, 5.6, 5.0, 4.4, 3.8, 3.3, 3.1, 3.4, 4.2];
