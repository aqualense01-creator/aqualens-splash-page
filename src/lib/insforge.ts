import { createClient } from "@insforge/sdk";

export const insforge = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_URL,
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY,
});

// ===== Domain types =====
export type AppRole = "farmer" | "farm_manager" | "technician" | "admin" | "support";
export type PondStatus = "good" | "watch" | "warning" | "critical" | "offline" | "calibration_due";
export type DeviceStatus =
  | "online"
  | "offline"
  | "low_battery"
  | "calibration_due"
  | "maintenance_due";
export type AlertSeverity = "info" | "watch" | "warning" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved";
export type SensorType =
  | "do"
  | "ph"
  | "temperature"
  | "turbidity"
  | "salinity"
  | "ammonia"
  | "water_level";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  district: string | null;
  language: "en" | "bn";
  avatar_url: string | null;
};

export type Farm = {
  id: string;
  owner_id: string;
  name: string;
  district: string | null;
  location: string | null;
  status: string;
};

export type Pond = {
  id: string;
  farm_id: string;
  name: string;
  pond_type: string | null;
  water_type: string | null;
  species: string | null;
  area_m2: number | null;
  depth_m: number | null;
  stocking_date: string | null;
  stocking_density: number | null;
  threshold_preset: string | null;
  status: PondStatus;
};

export type Device = {
  id: string;
  serial: string;
  name: string | null;
  hardware_version: string | null;
  firmware_version: string | null;
  farm_id: string | null;
  pond_id: string | null;
  status: DeviceStatus;
  battery_pct: number | null;
  signal_pct: number | null;
  last_seen: string | null;
};

export type Reading = {
  id: string;
  pond_id: string;
  device_id: string | null;
  recorded_at: string;
  do_mg_l: number | null;
  ph: number | null;
  temp_c: number | null;
  turbidity_ntu: number | null;
  salinity_ppt: number | null;
  ammonia_mg_l: number | null;
  water_level_cm: number | null;
  battery_pct: number | null;
  signal_pct: number | null;
};

export type Alert = {
  id: string;
  pond_id: string | null;
  device_id: string | null;
  alert_type: string;
  parameter: string | null;
  value: number | null;
  threshold: number | null;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string | null;
  recommended_action: string | null;
  detected_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
};

// Legacy types kept for existing Shop component
export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  tagline: string | null;
  price_cents: number;
  attachment_url: string | null;
  attachment_key: string | null;
  attachment_name: string | null;
  attachment_uploaded_at: string | null;
};
