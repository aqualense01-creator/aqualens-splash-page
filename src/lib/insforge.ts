import { createClient } from "@insforge/sdk";

export const insforge = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_URL,
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY,
});

// ===== Togglable Demo Mode Implementation =====
const now = Date.now();
const m = (mins: number) => new Date(now - mins * 60_000).toISOString();

const MOCK_FARMS_FULL = [
  { id: "f1", owner_id: "demo-user-id", name: "Sundarban Shrimp Farm", district: "Khulna", location: "Syamnagar", status: "active" },
  { id: "f2", owner_id: "demo-user-id", name: "Khulna East Farm", district: "Khulna", location: "Bagerhat", status: "active" }
];

const MOCK_PONDS_FULL = [
  { id: "p1", farm_id: "f1", name: "Pond 1 — Rui", pond_type: "grow_out", water_type: "fresh", species: "Rui (Rohu)", area_m2: 1200, depth_m: 1.8, stocking_date: "2026-03-01", stocking_density: 3.5, threshold_preset: "standard_carp", status: "good" as const },
  { id: "p2", farm_id: "f1", name: "Pond 2 — Shrimp", pond_type: "grow_out", water_type: "brackish", species: "Bagda Shrimp", area_m2: 2500, depth_m: 1.5, stocking_date: "2026-04-10", stocking_density: 15, threshold_preset: "shrimp_default", status: "critical" as const },
  { id: "p3", farm_id: "f1", name: "Pond 3 — Tilapia", pond_type: "grow_out", water_type: "fresh", species: "Tilapia", area_m2: 1800, depth_m: 1.6, stocking_date: "2026-03-15", stocking_density: 8, threshold_preset: "standard_tilapia", status: "warning" as const },
  { id: "p4", farm_id: "f2", name: "Pond 4 — Pangas", pond_type: "grow_out", water_type: "fresh", species: "Pangasius", area_m2: 3000, depth_m: 2.2, stocking_date: "2026-02-20", stocking_density: 12, threshold_preset: "standard_carp", status: "good" as const },
  { id: "p5", farm_id: "f2", name: "Pond 5 — Carp Mix", pond_type: "grow_out", water_type: "fresh", species: "Mixed carp", area_m2: 2000, depth_m: 1.8, stocking_date: "2026-03-05", stocking_density: 4, threshold_preset: "standard_carp", status: "offline" as const },
  { id: "p6", farm_id: "f2", name: "Pond 6 — Koi", pond_type: "grow_out", water_type: "fresh", species: "Koi Carp", area_m2: 800, depth_m: 1.2, stocking_date: "2026-05-01", stocking_density: 25, threshold_preset: "standard_carp", status: "good" as const }
];

const MOCK_DEVICES_FULL = [
  { id: "d1", serial: "AQ-204", name: "AL-Sense 01", hardware_version: "v2.1", firmware_version: "v1.4.2", farm_id: "f1", pond_id: "p1", status: "online" as const, battery_pct: 86, signal_pct: 92, last_seen: m(3), installed_at: m(1000) },
  { id: "d2", serial: "AQ-211", name: "AL-Sense 02", hardware_version: "v2.1", firmware_version: "v1.4.2", farm_id: "f1", pond_id: "p2", status: "online" as const, battery_pct: 74, signal_pct: 88, last_seen: m(2), installed_at: m(950) },
  { id: "d3", serial: "AQ-188", name: "AL-Sense 03", hardware_version: "v2.0", firmware_version: "v1.3.9", farm_id: "f1", pond_id: "p3", status: "low_battery" as const, battery_pct: 14, signal_pct: 76, last_seen: m(7), installed_at: m(800) },
  { id: "d4", serial: "AQ-105", name: "AL-Sense 04", hardware_version: "v2.1", firmware_version: "v1.4.2", farm_id: "f2", pond_id: "p4", status: "online" as const, battery_pct: 92, signal_pct: 95, last_seen: m(5), installed_at: m(1200) },
  { id: "d5", serial: "AQ-122", name: "AL-Sense 05", hardware_version: "v1.9", firmware_version: "v1.2.5", farm_id: "f2", pond_id: "p5", status: "offline" as const, battery_pct: 0, signal_pct: 0, last_seen: m(185), installed_at: m(500) },
  { id: "d6", serial: "AQ-145", name: "AL-Sense 06", hardware_version: "v2.1", firmware_version: "v1.4.2", farm_id: "f2", pond_id: "p6", status: "calibration_due" as const, battery_pct: 68, signal_pct: 82, last_seen: m(4), installed_at: m(600) }
];

const MOCK_ALERTS_FULL = [
  { id: "a1", pond_id: "p2", device_id: "d2", alert_type: "critical", parameter: "do_mg_l", value: 2.8, threshold: 4.0, severity: "critical" as const, status: "open" as const, message: "Dissolved oxygen critically low (2.8 mg/L)", recommended_action: "Turn on aerator immediately", detected_at: m(4), acknowledged_at: null, resolved_at: null, notes: null },
  { id: "a2", pond_id: "p3", device_id: "d3", alert_type: "warning", parameter: "ph", value: 8.4, threshold: 8.2, severity: "warning" as const, status: "open" as const, message: "pH rising above safe range (8.4)", recommended_action: "Check feeding and aeration", detected_at: m(22), acknowledged_at: null, resolved_at: null, notes: null },
  { id: "a3", pond_id: "p5", device_id: "d5", alert_type: "device_offline", parameter: "status", value: null, threshold: null, severity: "warning" as const, status: "open" as const, message: "Device offline for 3 hours", recommended_action: "Check device power and connection", detected_at: m(180), acknowledged_at: null, resolved_at: null, notes: null },
  { id: "a4", pond_id: "p6", device_id: "d6", alert_type: "calibration_due", parameter: "ph", value: null, threshold: null, severity: "info" as const, status: "open" as const, message: "pH sensor calibration due", recommended_action: "Schedule a calibration visit this week", detected_at: m(1080), acknowledged_at: null, resolved_at: null, notes: null },
  { id: "a5", pond_id: "p3", device_id: "d3", alert_type: "warning", parameter: "battery", value: 14, threshold: 20, severity: "warning" as const, status: "open" as const, message: "Device battery at 14%", recommended_action: "Replace or recharge battery soon", detected_at: m(45), acknowledged_at: null, resolved_at: null, notes: null }
];

const MOCK_PROFILES = [
  { id: "demo-user-id", full_name: "Demo Admin", phone: "+8801712345678", district: "Khulna", language: "en" as const, avatar_url: null, account_status: "active", created_at: m(1000) },
  { id: "demo-user-2", full_name: "Rahim Ali", phone: "+8801812345678", district: "Bagerhat", language: "bn" as const, avatar_url: null, account_status: "active", created_at: m(500) },
  { id: "demo-user-3", full_name: "Karim Uddin", phone: "+8801912345678", district: "Cox's Bazar", language: "en" as const, avatar_url: null, account_status: "active", created_at: m(200) }
];

const MOCK_USER_ROLES = [
  { id: "ur-1", user_id: "demo-user-id", role: "admin" as const },
  { id: "ur-2", user_id: "demo-user-id", role: "farmer" as const },
  { id: "ur-3", user_id: "demo-user-id", role: "technician" as const },
  { id: "ur-4", user_id: "demo-user-id", role: "support" as const },
  { id: "ur-5", user_id: "demo-user-2", role: "farmer" as const },
  { id: "ur-6", user_id: "demo-user-3", role: "technician" as const }
];

const MOCK_TICKETS = [
  { id: "t1", created_by: "demo-user-2", assigned_to: "demo-user-id", farm_id: "f1", pond_id: "p2", device_id: "d2", issue_type: "device", priority: "high", description: "Oxygen level reading has sudden drop. Check sensor calibration.", status: "open", subject: "Pond 2 low oxygen warning", created_at: m(120), updated_at: m(60) },
  { id: "t2", created_by: "demo-user-3", assigned_to: null, farm_id: "f2", pond_id: "p5", device_id: "d5", issue_type: "device", priority: "normal", description: "AL-Sense 05 has gone offline since yesterday.", status: "open", subject: "Device AL-Sense 05 offline", created_at: m(480), updated_at: m(480) },
  { id: "t3", created_by: "demo-user-2", assigned_to: "demo-user-id", farm_id: "f1", pond_id: "p3", device_id: "d3", issue_type: "device", priority: "low", description: "Low battery warning on Pond 3 device.", status: "resolved", subject: "AL-Sense 03 battery replacement", created_at: m(1440), updated_at: m(1000) }
];

const MOCK_MAINTENANCE_LOGS = [
  { id: "ml1", device_id: "d5", technician_id: "demo-user-3", visit_type: "troubleshoot", notes: "Cleaned algae growth from sensors and verified power connection.", performed_at: m(600) },
  { id: "ml2", device_id: "d6", technician_id: "demo-user-3", visit_type: "calibration", notes: "Calibrated pH sensor with 4.0 and 7.0 buffer solutions.", performed_at: m(1200) }
];

const MOCK_THRESHOLDS = [
  { id: "th1", scope: "global", parameter: "do_mg_l", safe_min: 5.0, safe_max: 8.0, warn_min: 4.0, warn_max: 9.0, crit_min: 3.0, crit_max: 12.0 },
  { id: "th2", scope: "global", parameter: "ph", safe_min: 7.0, safe_max: 8.5, warn_min: 6.5, warn_max: 9.0, crit_min: 6.0, crit_max: 9.5 },
  { id: "th3", scope: "global", parameter: "temp_c", safe_min: 26.0, safe_max: 30.0, warn_min: 24.0, warn_max: 32.0, crit_min: 22.0, crit_max: 35.0 },
  { id: "th4", scope: "global", parameter: "turbidity_ntu", safe_min: 0.0, safe_max: 15.0, warn_min: 0.0, warn_max: 25.0, crit_min: 0.0, crit_max: 40.0 },
  { id: "th5", scope: "global", parameter: "salinity_ppt", safe_min: 10.0, safe_max: 25.0, warn_min: 5.0, warn_max: 30.0, crit_min: 0.0, crit_max: 40.0 },
  { id: "th6", scope: "global", parameter: "ammonia_mg_l", safe_min: 0.0, safe_max: 0.5, warn_min: 0.0, warn_max: 1.0, crit_min: 0.0, crit_max: 2.0 }
];

const MOCK_ADMIN_SETTINGS_DOCS = [
  { id: "doc1", key: "general", data: { platformName: "Acqua Lence", generalMaintenance: false }, updated_at: m(1000) }
];

const MOCK_ALERT_NOTES = [
  { id: "an1", alert_id: "a1", user_id: "demo-user-id", note: "Turned on Pond 2 aerator. Oxygen levels should recover within the hour.", created_at: m(3) }
];

function generateMockReadings() {
  const list: any[] = [];
  const pondTrends: Record<string, { do: number[], ph: number, temp: number, turb?: number, sal?: number, amm?: number, dev: string }> = {
    p1: { do: [6.2, 6.4, 6.5, 6.6, 6.7, 6.9, 7.0, 6.9, 6.8, 6.8, 6.9, 6.8], ph: 7.4, temp: 28.6, turb: 18, amm: 0.08, dev: "d1" },
    p2: { do: [5.8, 5.4, 5.0, 4.6, 4.1, 3.8, 3.4, 3.1, 3.0, 2.9, 2.8, 2.8], ph: 7.1, temp: 31.2, turb: 42, sal: 14.2, amm: 0.42, dev: "d2" },
    p3: { do: [5.6, 5.4, 5.2, 5.0, 4.9, 4.8, 4.6, 4.5, 4.4, 4.3, 4.2, 4.2], ph: 8.4, temp: 30.1, turb: 26, amm: 0.18, dev: "d3" },
    p4: { do: [6.9, 7.0, 7.0, 7.1, 7.0, 7.1, 7.2, 7.1, 7.0, 7.1, 7.1, 7.1], ph: 7.6, temp: 28.9, turb: 20, amm: 0.05, dev: "d4" },
    p5: { do: [5.5, 5.5, 5.4, 5.4, 5.4, 5.4, 5.4, 5.4, 5.4, 5.4, 5.4, 5.4], ph: 7.3, temp: 27.8, turb: 22, amm: 0.12, dev: "d5" },
    p6: { do: [6.4, 6.5, 6.6, 6.5, 6.6, 6.5, 6.4, 6.5, 6.5, 6.5, 6.5, 6.5], ph: 7.5, temp: 28.4, turb: 16, amm: 0.06, dev: "d6" }
  };

  for (const [pondId, config] of Object.entries(pondTrends)) {
    config.do.forEach((doVal, index) => {
      const timeOffset = (12 - index) * 2;
      const recordedAt = new Date(now - timeOffset * 60 * 60 * 1000).toISOString();
      list.push({
        id: `r-${pondId}-${index}`,
        pond_id: pondId,
        device_id: config.dev,
        recorded_at: recordedAt,
        do_mg_l: doVal,
        ph: config.ph + (Math.sin(index) * 0.05),
        temp_c: config.temp + (Math.sin(index) * 0.1),
        turbidity_ntu: config.turb ?? 15,
        salinity_ppt: config.sal ?? null,
        ammonia_mg_l: config.amm ?? null,
        water_level_cm: 150 + (Math.sin(index) * 2),
        battery_pct: 80 - index,
        signal_pct: 90
      });
    });
  }
  return list;
}

export const isDemoMode = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("acqua_lence_demo_mode") !== "false";
};

const getTableMockData = (tableName: string): any[] => {
  switch (tableName) {
    case "farms": return MOCK_FARMS_FULL;
    case "ponds": return MOCK_PONDS_FULL;
    case "devices": return MOCK_DEVICES_FULL;
    case "alerts": return MOCK_ALERTS_FULL;
    case "profiles": return MOCK_PROFILES;
    case "user_roles": return MOCK_USER_ROLES;
    case "support_tickets": return MOCK_TICKETS;
    case "maintenance_logs": return MOCK_MAINTENANCE_LOGS;
    case "thresholds": return MOCK_THRESHOLDS;
    case "admin_settings_documents": return MOCK_ADMIN_SETTINGS_DOCS;
    case "alert_notes": return MOCK_ALERT_NOTES;
    case "readings": return generateMockReadings();
    default: return [];
  }
};

const mockQueryBuilder = (tableName: string) => {
  let builderData = [...getTableMockData(tableName)];
  
  const builder: any = {
    select: (columns?: string) => {
      return builder;
    },
    order: (column: string, options?: any) => {
      const ascending = options?.ascending !== false;
      builderData.sort((a: any, b: any) => {
        if (a[column] < b[column]) return ascending ? -1 : 1;
        if (a[column] > b[column]) return ascending ? 1 : -1;
        return 0;
      });
      return builder;
    },
    limit: (count: number) => {
      builderData = builderData.slice(0, count);
      return builder;
    },
    eq: (column: string, value: any) => {
      if (tableName === "profiles" && column === "id") {
        builderData = MOCK_PROFILES.map(p => ({ ...p, id: value }));
      } else if (tableName === "user_roles" && column === "user_id") {
        builderData = MOCK_USER_ROLES.map(r => ({ ...r, user_id: value }));
      } else {
        builderData = builderData.filter((row: any) => row[column] === value);
      }
      return builder;
    },
    neq: (column: string, value: any) => {
      builderData = builderData.filter((row: any) => row[column] !== value);
      return builder;
    },
    in: (column: string, values: any[]) => {
      builderData = builderData.filter((row: any) => values.includes(row[column]));
      return builder;
    },
    maybeSingle: () => {
      return Promise.resolve({ data: builderData[0] || null, error: null });
    },
    single: () => {
      return Promise.resolve({ data: builderData[0] || null, error: null });
    },
    insert: (rows: any) => {
      const arr = Array.isArray(rows) ? rows : [rows];
      return {
        then: (onfulfilled?: any) => Promise.resolve({ data: arr, error: null }).then(onfulfilled)
      };
    },
    update: (patch: any) => {
      return {
        eq: (col: string, val: any) => {
          return {
            then: (onfulfilled?: any) => Promise.resolve({ data: [patch], error: null }).then(onfulfilled)
          };
        },
        then: (onfulfilled?: any) => Promise.resolve({ data: [patch], error: null }).then(onfulfilled)
      };
    },
    delete: () => {
      return {
        eq: (col: string, val: any) => {
          return {
            then: (onfulfilled?: any) => Promise.resolve({ data: [], error: null }).then(onfulfilled)
          };
        },
        then: (onfulfilled?: any) => Promise.resolve({ data: [], error: null }).then(onfulfilled)
      };
    },
    then: (onfulfilled?: any, onrejected?: any) => {
      return Promise.resolve({ data: builderData, error: null }).then(onfulfilled, onrejected);
    }
  };
  
  return builder;
};

const mockRpcCall = (fnName: string, params: any) => {
  let data: any = null;
  
  switch (fnName) {
    case "get_recent_visible_readings":
      const farmId = params?._farm_id;
      let readings = generateMockReadings();
      if (farmId && farmId !== "all") {
        const pondIds = new Set(MOCK_PONDS_FULL.filter(p => p.farm_id === farmId).map(p => p.id));
        readings = readings.filter(r => pondIds.has(r.pond_id));
      }
      data = readings;
      break;
    
    case "enqueue_device_command":
      data = { id: "cmd-" + Math.random().toString(36).substr(2, 9), status: "queued" };
      break;
      
    case "admin_update_user_profile_role":
    case "acknowledge_alert":
    case "resolve_alert":
    case "save_device_configuration":
      data = { success: true };
      break;
      
    default:
      data = { success: true };
  }
  
  return Promise.resolve({ data, error: null });
};

const originalDatabase = insforge.database;
(insforge as any).database = new Proxy(originalDatabase, {
  get(target, prop, receiver) {
    if (prop === "from" && isDemoMode()) {
      return (tableName: string) => mockQueryBuilder(tableName);
    }
    if (prop === "rpc" && isDemoMode()) {
      return (fnName: string, params: any) => mockRpcCall(fnName, params);
    }
    return Reflect.get(target, prop, receiver);
  }
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
  user_id: string;
  sku: string;
  name: string;
  category: string;
  tagline: string | null;
  description?: string | null;
  price_cents: number;
  attachment_url: string | null;
  attachment_key: string | null;
  attachment_name: string | null;
  attachment_uploaded_at: string | null;
};
