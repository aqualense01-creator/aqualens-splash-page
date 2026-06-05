import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import {
  ShieldCheck,
  Cpu,
  Activity,
  Bell,
  Package,
  Users,
  Volume2,
  FileText,
  Languages,
  History,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  Search,
  Check,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { insforge } from "@/lib/insforge";
import { PageHeader, StatusBadge } from "@/components/app/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Admin · System Settings — Acqua Lence" }] }),
  component: AdminSettings,
});

// ===== Interfaces =====
interface SensorTypeConfig {
  key: string;
  name: string;
  unit: string;
  calInterval: number;
  status: "active" | "inactive";
}

interface ThresholdConfig {
  id?: string;
  scope: string;
  parameter: string;
  safe_min: number | null;
  safe_max: number | null;
  warn_min: number | null;
  warn_max: number | null;
  crit_min: number | null;
  crit_max: number | null;
}

interface AlertTemplateConfig {
  id: string;
  type: string;
  enMsg: string;
  bnMsg: string;
  severity: "info" | "watch" | "warning" | "critical";
  action: string;
}

interface DevicePackageConfig {
  id: string;
  name: string;
  price: number;
  description: string;
  sensors: string[];
  status: "active" | "inactive";
}

interface UserRoleConfig {
  id: string;
  role: string;
  description: string;
  permissions: string[];
}

interface NotificationChannelConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  provider: string;
  status: "operational" | "degraded" | "offline";
  apiKey: string;
  endpoint: string;
}

interface ReportTemplateConfig {
  id: string;
  name: string;
  schedule: string;
  format: string;
  parameters: string[];
  status: "active" | "inactive";
}

interface LanguageStringConfig {
  id: string;
  key: string;
  en: string;
  bn: string;
  category: string;
}

interface ChangeLogEntry {
  id: string;
  timestamp: string;
  section: string;
  detail: string;
  user: string;
}

// ===== Initial Default Seed Data =====
const DEFAULT_SENSOR_TYPES: SensorTypeConfig[] = [
  { key: "do_mg_l", name: "Dissolved Oxygen", unit: "mg/L", calInterval: 30, status: "active" },
  { key: "ph", name: "pH", unit: "pH", calInterval: 45, status: "active" },
  { key: "temp_c", name: "Temperature", unit: "°C", calInterval: 90, status: "active" },
  { key: "turbidity_ntu", name: "Turbidity", unit: "NTU", calInterval: 60, status: "active" },
  {
    key: "salinity_ppt",
    name: "Salinity (Shrimp)",
    unit: "ppt",
    calInterval: 60,
    status: "active",
  },
  { key: "ammonia_mg_l", name: "Ammonia", unit: "mg/L", calInterval: 30, status: "active" },
];

const DEFAULT_ALERT_TEMPLATES: AlertTemplateConfig[] = [
  {
    id: "tmpl-1",
    type: "do_mg_l_critical_low",
    enMsg:
      "Dissolved oxygen level is critically low ({value} mg/L). Turn on all aerators immediately!",
    bnMsg: "দ্রবীভূত অক্সিজেন মাত্রা অত্যন্ত কম ({value} mg/L)। অবিলম্বে সব এয়ারেটর চালু করুন!",
    severity: "critical",
    action: "Turn on all paddle wheel aerators and add oxygen tablets if available.",
  },
  {
    id: "tmpl-2",
    type: "do_mg_l_warning_low",
    enMsg: "Dissolved oxygen level is dropping ({value} mg/L). Start auxiliary aerators.",
    bnMsg: "দ্রবীভূত অক্সিজেন মাত্রা কমছে ({value} mg/L)। অতিরিক্ত এয়ারেটর চালু করুন।",
    severity: "warning",
    action: "Turn on auxiliary aerators and monitor the readings.",
  },
  {
    id: "tmpl-3",
    type: "ph_critical_high",
    enMsg: "pH level is critically high ({value}). High risk of ammonia toxicity.",
    bnMsg: "pH মাত্রা অত্যন্ত বেশি ({value})। অ্যামোনিয়া বিষাক্ততার উচ্চ ঝুঁকি।",
    severity: "critical",
    action: "Apply calcium sulfate (gypsum) or perform partial water exchange.",
  },
  {
    id: "tmpl-4",
    type: "temp_c_warning_high",
    enMsg: "Water temperature is high ({value}°C). Stress risk for shrimp.",
    bnMsg: "পানির তাপমাত্রা বেশি ({value}°C)। জলজ প্রাণীর জন্য চাপের ঝুঁকি।",
    severity: "warning",
    action: "Increase water depth, run aerators during night to cool water.",
  },
  {
    id: "tmpl-5",
    type: "ammonia_mg_l_critical_high",
    enMsg: "Ammonia levels are critical ({value} mg/L). Immediate action needed.",
    bnMsg: "অ্যামোনিয়ার মাত্রা ঝুঁকিপূর্ণ ({value} mg/L)। অবিলম্বে ব্যবস্থা নিন।",
    severity: "critical",
    action: "Reduce feeding by 50% and apply molasses or other carbon source.",
  },
];

const DEFAULT_DEVICE_PACKAGES: DevicePackageConfig[] = [
  {
    id: "pkg-1",
    name: "Starter Lite Kit",
    price: 15000,
    description:
      "Includes Dissolved Oxygen and Temperature sensors. Ideal for small, single-pond family farms.",
    sensors: ["Dissolved Oxygen", "Temperature"],
    status: "active",
  },
  {
    id: "pkg-2",
    name: "Standard Floating Station",
    price: 28000,
    description:
      "Our best seller. Includes Dissolved Oxygen, Temperature, pH, and Salinity sensors on a solar-powered floating buoy.",
    sensors: ["Dissolved Oxygen", "Temperature", "pH", "Salinity (Shrimp)"],
    status: "active",
  },
  {
    id: "pkg-3",
    name: "Commercial Multi-Sensor Node",
    price: 45000,
    description:
      "Fully loaded telemetry node. Includes Dissolved Oxygen, pH, Temperature, Salinity, Ammonia, and Turbidity probes with advanced battery backup.",
    sensors: ["Dissolved Oxygen", "pH", "Temperature", "Turbidity", "Salinity (Shrimp)", "Ammonia"],
    status: "active",
  },
];

const DEFAULT_USER_ROLES: UserRoleConfig[] = [
  {
    id: "role-1",
    role: "Farmer",
    description:
      "Standard pond owner. Can view own farm telemetry, receive alerts, and log daily feed/treatments.",
    permissions: ["read_telemetry", "log_pond_actions", "request_support", "manage_billing"],
  },
  {
    id: "role-2",
    role: "Farm Manager",
    description:
      "Manages multiple ponds and personnel. Can configure pond thresholds, assign tasks, and view analytics.",
    permissions: [
      "read_telemetry",
      "log_pond_actions",
      "configure_pond_thresholds",
      "assign_workers",
      "request_support",
    ],
  },
  {
    id: "role-3",
    role: "Technician",
    description:
      "Field engineer. Can perform sensor calibrations, log maintenance visits, and update hardware statuses.",
    permissions: [
      "read_telemetry",
      "perform_calibrations",
      "log_maintenance",
      "configure_device_serials",
    ],
  },
  {
    id: "role-4",
    role: "Support Agent",
    description:
      "Customer support representative. Can view user tickets, assign technicians, and view device connectivity logs.",
    permissions: [
      "read_tickets",
      "manage_support_tickets",
      "view_device_logs",
      "assign_technicians",
    ],
  },
  {
    id: "role-5",
    role: "Admin",
    description:
      "System administrator. Has full superuser control over the entire platform, global configurations, and billing settings.",
    permissions: ["all_permissions"],
  },
];

const DEFAULT_NOTIFICATION_CHANNELS: NotificationChannelConfig[] = [
  {
    id: "chan-1",
    name: "SMS Alerts",
    type: "SMS",
    enabled: true,
    provider: "Twilio API Gateway",
    status: "operational",
    apiKey: "••••••••••••••••",
    endpoint: "https://api.twilio.com/2010-04-01/Accounts",
  },
  {
    id: "chan-2",
    name: "WhatsApp Notifications",
    type: "WhatsApp",
    enabled: true,
    provider: "Meta Cloud API",
    status: "operational",
    apiKey: "••••••••••••••••",
    endpoint: "https://graph.facebook.com/v17.0",
  },
  {
    id: "chan-3",
    name: "Email Reports",
    type: "Email",
    enabled: false,
    provider: "SendGrid SMTP",
    status: "degraded",
    apiKey: "••••••••••••••••",
    endpoint: "smtp.sendgrid.net:587",
  },
  {
    id: "chan-4",
    name: "App Push Notifications",
    type: "App notification",
    enabled: true,
    provider: "Firebase Cloud Messaging (FCM)",
    status: "operational",
    apiKey: "••••••••••••••••",
    endpoint: "https://fcm.googleapis.com/fcm/send",
  },
];

const DEFAULT_REPORT_TEMPLATES: ReportTemplateConfig[] = [
  {
    id: "rep-1",
    name: "Weekly Water Quality Digest",
    schedule: "Weekly",
    format: "PDF",
    parameters: ["Dissolved Oxygen", "pH", "Temperature"],
    status: "active",
  },
  {
    id: "rep-2",
    name: "Monthly Calibration Audit Log",
    schedule: "Monthly",
    format: "CSV",
    parameters: ["Sensor status", "Calibration offsets", "Calibration due dates"],
    status: "active",
  },
  {
    id: "rep-3",
    name: "Pond Critical Alerts Log",
    schedule: "On Alert Trigger",
    format: "PDF & Excel",
    parameters: ["Alert triggers", "Response time", "Resolution actions"],
    status: "active",
  },
];

const DEFAULT_LANGUAGE_STRINGS: LanguageStringConfig[] = [
  {
    id: "lang-1",
    key: "dashboard.water_status",
    en: "Water Quality Status",
    bn: "পানির গুণমান অবস্থা",
    category: "Dashboard",
  },
  {
    id: "lang-2",
    key: "alert.do_low_critical",
    en: "CRITICAL: Oxygen is dangerously low!",
    bn: "জরুরি সতর্কবার্তা: অক্সিজেনের মাত্রা বিপজ্জনকভাবে কম!",
    category: "Alerts",
  },
  {
    id: "lang-3",
    key: "pond.action.add_lime",
    en: "Apply Calcium Carbonate (Lime)",
    bn: "ক্যালসিয়াম কার্বনেট (চুন) প্রয়োগ করুন",
    category: "Pond Management",
  },
  {
    id: "lang-4",
    key: "auth.login_welcome",
    en: "Welcome back to Acqua Lence",
    bn: "অ্যাকোয়া লেন্সে আপনাকে স্বাগতম",
    category: "Auth",
  },
];

const DEFAULT_CHANGE_LOGS: ChangeLogEntry[] = [
  {
    id: "log-1",
    timestamp: new Date(Date.now() - 3600 * 24 * 1000 * 2).toISOString(),
    section: "Alert Templates",
    detail: "Modified DO Critical Low English notification text",
    user: "Admin (System)",
  },
  {
    id: "log-2",
    timestamp: new Date(Date.now() - 3600 * 24 * 1000).toISOString(),
    section: "Notification Channels",
    detail: "Disabled Email notifications",
    user: "Admin (System)",
  },
  {
    id: "log-3",
    timestamp: new Date(Date.now() - 3600 * 12 * 1000).toISOString(),
    section: "Device Packages",
    detail: "Updated price of Starter Lite Kit to BDT 15,000",
    user: "Admin (System)",
  },
];

const LOCAL_STORAGE_PREFIX = "al_settings_";

const PARAMETER_NAMES: Record<string, string> = {
  do_mg_l: "Dissolved Oxygen",
  ph: "pH",
  temp_c: "Temperature",
  turbidity_ntu: "Turbidity",
  salinity_ppt: "Salinity (Shrimp)",
  ammonia_mg_l: "Ammonia",
};

const PARAMETER_UNITS: Record<string, string> = {
  do_mg_l: "mg/L",
  ph: "pH",
  temp_c: "°C",
  turbidity_ntu: "NTU",
  salinity_ppt: "ppt",
  ammonia_mg_l: "mg/L",
};

function AdminSettings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("sensor_types");

  // ===== database Fetch & Mutation for Global Thresholds =====
  const thresholdsQ = useQuery({
    queryKey: ["admin-settings", "thresholds"],
    queryFn: async () => {
      const r = await insforge.database.from("thresholds").select("*").eq("scope", "global");
      if (r.error) {
        console.error("Error fetching thresholds from db:", r.error);
        return [] as ThresholdConfig[];
      }
      return (r.data ?? []) as ThresholdConfig[];
    },
  });

  const saveThresholdsMutation = useMutation({
    mutationFn: async (updated: ThresholdConfig[]) => {
      // Loop and update/insert
      for (const item of updated) {
        if (item.id) {
          const { error } = await insforge.database
            .from("thresholds")
            .update({
              safe_min: item.safe_min,
              safe_max: item.safe_max,
              warn_min: item.warn_min,
              warn_max: item.warn_max,
              crit_min: item.crit_min,
              crit_max: item.crit_max,
            })
            .eq("id", item.id);
          if (error) throw error;
        } else {
          // If no id, insert new global threshold row
          const { error } = await insforge.database.from("thresholds").insert([
            {
              scope: "global",
              parameter: item.parameter,
              safe_min: item.safe_min,
              safe_max: item.safe_max,
              warn_min: item.warn_min,
              warn_max: item.warn_max,
              crit_min: item.crit_min,
              crit_max: item.crit_max,
            },
          ]);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success("Global thresholds updated in database successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-settings", "thresholds"] });
      // Record changes in change log
      addChangeLog("Thresholds", "Updated global safe ranges and warning/critical thresholds");
      setUnsavedThresholds(null);
    },
    onError: (err: any) => {
      console.error("Failed to write to DB:", err);
      // Fallback: save to LocalState and LocalStorage
      if (unsavedThresholds) {
        localStorage.setItem(
          LOCAL_STORAGE_PREFIX + "thresholds",
          JSON.stringify(unsavedThresholds),
        );
        setThresholds(unsavedThresholds);
        addChangeLog("Thresholds", "Updated global thresholds (Saved locally)");
        setUnsavedThresholds(null);
        toast.warning("Database update failed. Saved configurations locally.");
      }
    },
  });

  // ===== Local states synced with LocalStorage =====
  const [sensorTypes, setSensorTypes] = useState<SensorTypeConfig[]>([]);
  const [thresholds, setThresholds] = useState<ThresholdConfig[]>([]);
  const [alertTemplates, setAlertTemplates] = useState<AlertTemplateConfig[]>([]);
  const [devicePackages, setDevicePackages] = useState<DevicePackageConfig[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleConfig[]>([]);
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannelConfig[]>([]);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplateConfig[]>([]);
  const [languageStrings, setLanguageStrings] = useState<LanguageStringConfig[]>([]);
  const [changeLogs, setChangeLogs] = useState<ChangeLogEntry[]>([]);

  // Track unsaved local edits
  const [unsavedSensorTypes, setUnsavedSensorTypes] = useState<SensorTypeConfig[] | null>(null);
  const [unsavedThresholds, setUnsavedThresholds] = useState<ThresholdConfig[] | null>(null);
  const [unsavedAlertTemplates, setUnsavedAlertTemplates] = useState<AlertTemplateConfig[] | null>(
    null,
  );
  const [unsavedDevicePackages, setUnsavedDevicePackages] = useState<DevicePackageConfig[] | null>(
    null,
  );
  const [unsavedUserRoles, setUnsavedUserRoles] = useState<UserRoleConfig[] | null>(null);
  const [unsavedNotificationChannels, setUnsavedNotificationChannels] = useState<
    NotificationChannelConfig[] | null
  >(null);
  const [unsavedReportTemplates, setUnsavedReportTemplates] = useState<
    ReportTemplateConfig[] | null
  >(null);
  const [unsavedLanguageStrings, setUnsavedLanguageStrings] = useState<
    LanguageStringConfig[] | null
  >(null);

  // Dialog configurations
  const [showThresholdConfirm, setShowThresholdConfirm] = useState(false);
  const [pendingConfirmAction, setPendingConfirmAction] = useState<"safe" | "alert" | null>(null);

  // Search parameters
  const [alertSearch, setAlertSearch] = useState("");
  const [langSearch, setLangSearch] = useState("");
  const [langCategoryFilter, setLangCategoryFilter] = useState("All");

  // Selection states for details panel
  const [selectedRoleId, setSelectedRoleId] = useState<string>("role-1");

  // Modal forms
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [newAlertTemplate, setNewAlertTemplate] = useState<Omit<AlertTemplateConfig, "id">>({
    type: "",
    enMsg: "",
    bnMsg: "",
    severity: "warning",
    action: "",
  });

  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [newPackage, setNewPackage] = useState<Omit<DevicePackageConfig, "id">>({
    name: "",
    price: 0,
    description: "",
    sensors: [],
    status: "active",
  });

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [newReport, setNewReport] = useState<Omit<ReportTemplateConfig, "id">>({
    name: "",
    schedule: "Weekly",
    format: "PDF",
    parameters: [],
    status: "active",
  });

  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [newLanguageString, setNewLanguageString] = useState<Omit<LanguageStringConfig, "id">>({
    key: "",
    en: "",
    bn: "",
    category: "Common",
  });

  // ===== Loading logic =====
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load simple local items
    const getLocal = <T,>(key: string, fallback: T): T => {
      const stored = localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
      if (stored) {
        try {
          return JSON.parse(stored) as T;
        } catch {
          return fallback;
        }
      }
      return fallback;
    };

    setSensorTypes(getLocal("sensor_types", DEFAULT_SENSOR_TYPES));
    setAlertTemplates(getLocal("alert_templates", DEFAULT_ALERT_TEMPLATES));
    setDevicePackages(getLocal("device_packages", DEFAULT_DEVICE_PACKAGES));
    setUserRoles(getLocal("user_roles", DEFAULT_USER_ROLES));
    setNotificationChannels(getLocal("notification_channels", DEFAULT_NOTIFICATION_CHANNELS));
    setReportTemplates(getLocal("report_templates", DEFAULT_REPORT_TEMPLATES));
    setLanguageStrings(getLocal("language_strings", DEFAULT_LANGUAGE_STRINGS));
    setChangeLogs(getLocal("change_logs", DEFAULT_CHANGE_LOGS));
  }, []);

  // Sync loaded DB thresholds to state
  useEffect(() => {
    if (thresholdsQ.data && thresholdsQ.data.length > 0) {
      setThresholds(thresholdsQ.data);
    } else {
      // Seed fallback
      const stored = localStorage.getItem(LOCAL_STORAGE_PREFIX + "thresholds");
      if (stored) {
        try {
          setThresholds(JSON.parse(stored));
        } catch {
          // Ignore
        }
      } else {
        const fallbacks: ThresholdConfig[] = [
          {
            parameter: "do_mg_l",
            scope: "global",
            safe_min: 5.0,
            safe_max: 8.0,
            warn_min: 4.0,
            warn_max: 9.0,
            crit_min: 3.0,
            crit_max: 12.0,
          },
          {
            parameter: "ph",
            scope: "global",
            safe_min: 7.0,
            safe_max: 8.5,
            warn_min: 6.5,
            warn_max: 9.0,
            crit_min: 6.0,
            crit_max: 9.5,
          },
          {
            parameter: "temp_c",
            scope: "global",
            safe_min: 26.0,
            safe_max: 30.0,
            warn_min: 24.0,
            warn_max: 32.0,
            crit_min: 22.0,
            crit_max: 35.0,
          },
          {
            parameter: "turbidity_ntu",
            scope: "global",
            safe_min: 0.0,
            safe_max: 15.0,
            warn_min: 0.0,
            warn_max: 25.0,
            crit_min: 0.0,
            crit_max: 40.0,
          },
          {
            parameter: "salinity_ppt",
            scope: "global",
            safe_min: 10.0,
            safe_max: 25.0,
            warn_min: 5.0,
            warn_max: 30.0,
            crit_min: 0.0,
            crit_max: 40.0,
          },
          {
            parameter: "ammonia_mg_l",
            scope: "global",
            safe_min: 0.0,
            safe_max: 0.5,
            warn_min: 0.0,
            warn_max: 1.0,
            crit_min: 0.0,
            crit_max: 2.0,
          },
        ];
        setThresholds(fallbacks);
      }
    }
  }, [thresholdsQ.data]);

  // ===== Helper function to append to Change Log =====
  const addChangeLog = (section: string, detail: string) => {
    const newEntry: ChangeLogEntry = {
      id: "log-" + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      section,
      detail,
      user: "Admin (System)",
    };
    const updated = [newEntry, ...changeLogs].slice(0, 50); // limit to 50
    setChangeLogs(updated);
    localStorage.setItem(LOCAL_STORAGE_PREFIX + "change_logs", JSON.stringify(updated));
  };

  const clearChangeLogs = () => {
    setChangeLogs([]);
    localStorage.removeItem(LOCAL_STORAGE_PREFIX + "change_logs");
    toast.success("Change logs cleared");
  };

  // ===== Handlers: Sensor Types =====
  const initSensorTypesEdit = () => {
    setUnsavedSensorTypes(JSON.parse(JSON.stringify(sensorTypes)));
  };
  const handleSensorTypeChange = (key: string, field: keyof SensorTypeConfig, val: any) => {
    if (!unsavedSensorTypes) return;
    const next = unsavedSensorTypes.map((item) => {
      if (item.key === key) {
        return { ...item, [field]: val };
      }
      return item;
    });
    setUnsavedSensorTypes(next);
  };
  const saveSensorTypes = () => {
    if (!unsavedSensorTypes) return;
    setSensorTypes(unsavedSensorTypes);
    localStorage.setItem(LOCAL_STORAGE_PREFIX + "sensor_types", JSON.stringify(unsavedSensorTypes));
    addChangeLog("Sensor Types", "Updated calibration intervals and sensor active statuses");
    setUnsavedSensorTypes(null);
    toast.success("Sensor Types saved successfully!");
  };

  // ===== Handlers: Thresholds (Safe Ranges & Alert Thresholds) =====
  const initThresholdsEdit = () => {
    setUnsavedThresholds(JSON.parse(JSON.stringify(thresholds)));
  };
  const handleThresholdChange = (param: string, field: keyof ThresholdConfig, val: any) => {
    if (!unsavedThresholds) return;
    const next = unsavedThresholds.map((item) => {
      if (item.parameter === param) {
        return { ...item, [field]: val };
      }
      return item;
    });
    setUnsavedThresholds(next);
  };
  const triggerSaveThresholds = (type: "safe" | "alert") => {
    setPendingConfirmAction(type);
    setShowThresholdConfirm(true);
  };
  const executeConfirmSaveThresholds = () => {
    setShowThresholdConfirm(false);
    if (!unsavedThresholds) return;
    saveThresholdsMutation.mutate(unsavedThresholds);
  };

  // ===== Handlers: Alert Templates =====
  const initAlertTemplatesEdit = () => {
    setUnsavedAlertTemplates(JSON.parse(JSON.stringify(alertTemplates)));
  };
  const handleAlertTemplateChange = (id: string, field: keyof AlertTemplateConfig, val: any) => {
    if (!unsavedAlertTemplates) return;
    const next = unsavedAlertTemplates.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    });
    setUnsavedAlertTemplates(next);
  };
  const handleDeleteAlertTemplate = (id: string) => {
    const list = unsavedAlertTemplates || alertTemplates;
    const next = list.filter((item) => item.id !== id);
    if (unsavedAlertTemplates) {
      setUnsavedAlertTemplates(next);
    } else {
      setAlertTemplates(next);
      localStorage.setItem(LOCAL_STORAGE_PREFIX + "alert_templates", JSON.stringify(next));
      addChangeLog("Alert Templates", `Deleted template ${id}`);
      toast.success("Alert template deleted.");
    }
  };
  const saveAlertTemplates = () => {
    if (!unsavedAlertTemplates) return;
    setAlertTemplates(unsavedAlertTemplates);
    localStorage.setItem(
      LOCAL_STORAGE_PREFIX + "alert_templates",
      JSON.stringify(unsavedAlertTemplates),
    );
    addChangeLog("Alert Templates", "Updated alert notification templates and recommended actions");
    setUnsavedAlertTemplates(null);
    toast.success("Alert templates saved successfully!");
  };
  const handleCreateAlertTemplate = () => {
    const newId = "tmpl-" + Math.random().toString(36).substring(2, 9);
    const added: AlertTemplateConfig = {
      id: newId,
      ...newAlertTemplate,
    };
    const list = unsavedAlertTemplates
      ? [...unsavedAlertTemplates, added]
      : [...alertTemplates, added];

    if (unsavedAlertTemplates) {
      setUnsavedAlertTemplates(list);
    } else {
      setAlertTemplates(list);
      localStorage.setItem(LOCAL_STORAGE_PREFIX + "alert_templates", JSON.stringify(list));
      addChangeLog("Alert Templates", `Added new template: ${newAlertTemplate.type}`);
    }

    setIsAlertModalOpen(false);
    setNewAlertTemplate({ type: "", enMsg: "", bnMsg: "", severity: "warning", action: "" });
    toast.success("Alert template added successfully!");
  };

  // ===== Handlers: Device Packages =====
  const initDevicePackagesEdit = () => {
    setUnsavedDevicePackages(JSON.parse(JSON.stringify(devicePackages)));
  };
  const handleDevicePackageChange = (id: string, field: keyof DevicePackageConfig, val: any) => {
    if (!unsavedDevicePackages) return;
    const next = unsavedDevicePackages.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    });
    setUnsavedDevicePackages(next);
  };
  const handlePackageSensorToggle = (id: string, sensor: string) => {
    const list = unsavedDevicePackages || devicePackages;
    const pkg = list.find((p) => p.id === id);
    if (!pkg) return;

    const currentSensors = pkg.sensors;
    const nextSensors = currentSensors.includes(sensor)
      ? currentSensors.filter((s) => s !== sensor)
      : [...currentSensors, sensor];

    if (unsavedDevicePackages) {
      handleDevicePackageChange(id, "sensors", nextSensors);
    } else {
      const next = devicePackages.map((item) => {
        if (item.id === id) {
          return { ...item, sensors: nextSensors };
        }
        return item;
      });
      setDevicePackages(next);
      localStorage.setItem(LOCAL_STORAGE_PREFIX + "device_packages", JSON.stringify(next));
      addChangeLog("Device Packages", `Modified sensors for package: ${pkg.name}`);
    }
  };
  const handleDeletePackage = (id: string) => {
    const list = unsavedDevicePackages || devicePackages;
    const next = list.filter((item) => item.id !== id);
    if (unsavedDevicePackages) {
      setUnsavedDevicePackages(next);
    } else {
      setDevicePackages(next);
      localStorage.setItem(LOCAL_STORAGE_PREFIX + "device_packages", JSON.stringify(next));
      addChangeLog("Device Packages", `Deleted device package ${id}`);
      toast.success("Device package deleted.");
    }
  };
  const saveDevicePackages = () => {
    if (!unsavedDevicePackages) return;
    setDevicePackages(unsavedDevicePackages);
    localStorage.setItem(
      LOCAL_STORAGE_PREFIX + "device_packages",
      JSON.stringify(unsavedDevicePackages),
    );
    addChangeLog("Device Packages", "Saved modifications to commercial hardware bundles");
    setUnsavedDevicePackages(null);
    toast.success("Device packages saved successfully!");
  };
  const handleCreatePackage = () => {
    const newId = "pkg-" + Math.random().toString(36).substring(2, 9);
    const added: DevicePackageConfig = {
      id: newId,
      ...newPackage,
    };
    const list = unsavedDevicePackages
      ? [...unsavedDevicePackages, added]
      : [...devicePackages, added];

    if (unsavedDevicePackages) {
      setUnsavedDevicePackages(list);
    } else {
      setDevicePackages(list);
      localStorage.setItem(LOCAL_STORAGE_PREFIX + "device_packages", JSON.stringify(list));
      addChangeLog("Device Packages", `Created device package: ${newPackage.name}`);
    }

    setIsPackageModalOpen(false);
    setNewPackage({ name: "", price: 0, description: "", sensors: [], status: "active" });
    toast.success("Device package created!");
  };

  // ===== Handlers: User Roles =====
  const initUserRolesEdit = () => {
    setUnsavedUserRoles(JSON.parse(JSON.stringify(userRoles)));
  };
  const activeRoleData = useMemo(() => {
    const list = unsavedUserRoles || userRoles;
    return list.find((r) => r.id === selectedRoleId) || list[0];
  }, [unsavedUserRoles, userRoles, selectedRoleId]);

  const handleRolePermissionToggle = (roleId: string, permission: string) => {
    const list = unsavedUserRoles || userRoles;
    const roleObj = list.find((r) => r.id === roleId);
    if (!roleObj) return;

    const currentPerms = roleObj.permissions;
    const nextPerms = currentPerms.includes(permission)
      ? currentPerms.filter((p) => p !== permission)
      : [...currentPerms, permission];

    if (unsavedUserRoles) {
      const next = unsavedUserRoles.map((item) => {
        if (item.id === roleId) {
          return { ...item, permissions: nextPerms };
        }
        return item;
      });
      setUnsavedUserRoles(next);
    } else {
      const next = userRoles.map((item) => {
        if (item.id === roleId) {
          return { ...item, permissions: nextPerms };
        }
        return item;
      });
      setUserRoles(next);
      localStorage.setItem(LOCAL_STORAGE_PREFIX + "user_roles", JSON.stringify(next));
      addChangeLog("User Roles", `Updated permissions for role: ${roleObj.role}`);
    }
  };
  const handleRoleDescriptionChange = (roleId: string, val: string) => {
    const list = unsavedUserRoles || userRoles;
    if (unsavedUserRoles) {
      const next = unsavedUserRoles.map((item) => {
        if (item.id === roleId) {
          return { ...item, description: val };
        }
        return item;
      });
      setUnsavedUserRoles(next);
    } else {
      const next = userRoles.map((item) => {
        if (item.id === roleId) {
          return { ...item, description: val };
        }
        return item;
      });
      setUserRoles(next);
      localStorage.setItem(LOCAL_STORAGE_PREFIX + "user_roles", JSON.stringify(next));
    }
  };
  const saveUserRoles = () => {
    if (!unsavedUserRoles) return;
    setUserRoles(unsavedUserRoles);
    localStorage.setItem(LOCAL_STORAGE_PREFIX + "user_roles", JSON.stringify(unsavedUserRoles));
    addChangeLog("User Roles", "Saved system permission updates across user roles");
    setUnsavedUserRoles(null);
    toast.success("User roles configuration saved!");
  };

  // ===== Handlers: Notification Channels =====
  const initNotificationChannelsEdit = () => {
    setUnsavedNotificationChannels(JSON.parse(JSON.stringify(notificationChannels)));
  };
  const handleChannelChange = (id: string, field: keyof NotificationChannelConfig, val: any) => {
    if (!unsavedNotificationChannels) return;
    const next = unsavedNotificationChannels.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    });
    setUnsavedNotificationChannels(next);
  };
  const saveNotificationChannels = () => {
    if (!unsavedNotificationChannels) return;
    setNotificationChannels(unsavedNotificationChannels);
    localStorage.setItem(
      LOCAL_STORAGE_PREFIX + "notification_channels",
      JSON.stringify(unsavedNotificationChannels),
    );
    addChangeLog(
      "Notification Channels",
      "Updated alert transmission settings and API credentials",
    );
    setUnsavedNotificationChannels(null);
    toast.success("Notification channels updated!");
  };
  const handleTestChannel = (chanName: string) => {
    const promise = () =>
      new Promise((resolve) => setTimeout(() => resolve({ name: chanName }), 1200));
    toast.promise(promise, {
      loading: `Sending mock test ping to ${chanName}...`,
      success: (data: any) => `${data.name} connection test: SUCCESS (Ping 44ms)`,
      error: "Test failed",
    });
  };

  // ===== Handlers: Report Templates =====
  const initReportTemplatesEdit = () => {
    setUnsavedReportTemplates(JSON.parse(JSON.stringify(reportTemplates)));
  };
  const handleReportChange = (id: string, field: keyof ReportTemplateConfig, val: any) => {
    if (!unsavedReportTemplates) return;
    const next = unsavedReportTemplates.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    });
    setUnsavedReportTemplates(next);
  };
  const handleDeleteReport = (id: string) => {
    const list = unsavedReportTemplates || reportTemplates;
    const next = list.filter((item) => item.id !== id);
    if (unsavedReportTemplates) {
      setUnsavedReportTemplates(next);
    } else {
      setReportTemplates(next);
      localStorage.setItem(LOCAL_STORAGE_PREFIX + "report_templates", JSON.stringify(next));
      addChangeLog("Report Templates", `Deleted template ${id}`);
      toast.success("Report template removed.");
    }
  };
  const saveReportTemplates = () => {
    if (!unsavedReportTemplates) return;
    setReportTemplates(unsavedReportTemplates);
    localStorage.setItem(
      LOCAL_STORAGE_PREFIX + "report_templates",
      JSON.stringify(unsavedReportTemplates),
    );
    addChangeLog("Report Templates", "Saved automated report generation settings");
    setUnsavedReportTemplates(null);
    toast.success("Report templates saved!");
  };
  const handleCreateReport = () => {
    const newId = "rep-" + Math.random().toString(36).substring(2, 9);
    const added: ReportTemplateConfig = {
      id: newId,
      ...newReport,
    };
    const list = unsavedReportTemplates
      ? [...unsavedReportTemplates, added]
      : [...reportTemplates, added];

    if (unsavedReportTemplates) {
      setUnsavedReportTemplates(list);
    } else {
      setReportTemplates(list);
      localStorage.setItem(LOCAL_STORAGE_PREFIX + "report_templates", JSON.stringify(list));
      addChangeLog("Report Templates", `Added report template: ${newReport.name}`);
    }

    setIsReportModalOpen(false);
    setNewReport({ name: "", schedule: "Weekly", format: "PDF", parameters: [], status: "active" });
    toast.success("Report template created!");
  };

  // ===== Handlers: Language Strings =====
  const initLanguageStringsEdit = () => {
    setUnsavedLanguageStrings(JSON.parse(JSON.stringify(languageStrings)));
  };
  const handleLanguageStringChange = (id: string, field: keyof LanguageStringConfig, val: any) => {
    if (!unsavedLanguageStrings) return;
    const next = unsavedLanguageStrings.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    });
    setUnsavedLanguageStrings(next);
  };
  const handleDeleteLanguageString = (id: string) => {
    const list = unsavedLanguageStrings || languageStrings;
    const next = list.filter((item) => item.id !== id);
    if (unsavedLanguageStrings) {
      setUnsavedLanguageStrings(next);
    } else {
      setLanguageStrings(next);
      localStorage.setItem(LOCAL_STORAGE_PREFIX + "language_strings", JSON.stringify(next));
      addChangeLog("Language Strings", `Deleted localization key ${id}`);
      toast.success("Language key deleted.");
    }
  };
  const saveLanguageStrings = () => {
    if (!unsavedLanguageStrings) return;
    setLanguageStrings(unsavedLanguageStrings);
    localStorage.setItem(
      LOCAL_STORAGE_PREFIX + "language_strings",
      JSON.stringify(unsavedLanguageStrings),
    );
    addChangeLog("Language Strings", "Updated translation localization keys");
    setUnsavedLanguageStrings(null);
    toast.success("Translations saved successfully!");
  };
  const handleCreateLanguageString = () => {
    const newId = "lang-" + Math.random().toString(36).substring(2, 9);
    const added: LanguageStringConfig = {
      id: newId,
      ...newLanguageString,
    };
    const list = unsavedLanguageStrings
      ? [...unsavedLanguageStrings, added]
      : [...languageStrings, added];

    if (unsavedLanguageStrings) {
      setUnsavedLanguageStrings(list);
    } else {
      setLanguageStrings(list);
      localStorage.setItem(LOCAL_STORAGE_PREFIX + "language_strings", JSON.stringify(list));
      addChangeLog("Language Strings", `Added localization key: ${newLanguageString.key}`);
    }

    setIsLanguageModalOpen(false);
    setNewLanguageString({ key: "", en: "", bn: "", category: "Common" });
    toast.success("Localization key added!");
  };

  // Expand categories for select input
  const allCategories = useMemo(() => {
    const list = unsavedLanguageStrings || languageStrings;
    const set = new Set(list.map((l) => l.category));
    return ["All", ...Array.from(set)];
  }, [unsavedLanguageStrings, languageStrings]);

  const filteredLanguageStrings = useMemo(() => {
    const list = unsavedLanguageStrings || languageStrings;
    return list.filter((item) => {
      const matchSearch =
        item.key.toLowerCase().includes(langSearch.toLowerCase()) ||
        item.en.toLowerCase().includes(langSearch.toLowerCase()) ||
        item.bn.toLowerCase().includes(langSearch.toLowerCase());
      const matchCategory = langCategoryFilter === "All" || item.category === langCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [unsavedLanguageStrings, languageStrings, langSearch, langCategoryFilter]);

  const filteredAlertTemplates = useMemo(() => {
    const list = unsavedAlertTemplates || alertTemplates;
    return list.filter((item) => {
      return (
        item.type.toLowerCase().includes(alertSearch.toLowerCase()) ||
        item.enMsg.toLowerCase().includes(alertSearch.toLowerCase()) ||
        item.bnMsg.toLowerCase().includes(alertSearch.toLowerCase())
      );
    });
  }, [unsavedAlertTemplates, alertTemplates, alertSearch]);

  // ===== Dynamic Dirty-state evaluations per tab =====
  const isSensorTypesDirty = useMemo(() => {
    return unsavedSensorTypes !== null;
  }, [unsavedSensorTypes]);

  const isSafeRangesDirty = useMemo(() => {
    return unsavedThresholds !== null;
  }, [unsavedThresholds]);

  const isAlertThresholdsDirty = useMemo(() => {
    return unsavedThresholds !== null;
  }, [unsavedThresholds]);

  const isAlertTemplatesDirty = useMemo(() => {
    return unsavedAlertTemplates !== null;
  }, [unsavedAlertTemplates]);

  const isDevicePackagesDirty = useMemo(() => {
    return unsavedDevicePackages !== null;
  }, [unsavedDevicePackages]);

  const isUserRolesDirty = useMemo(() => {
    return unsavedUserRoles !== null;
  }, [unsavedUserRoles]);

  const isNotificationChannelsDirty = useMemo(() => {
    return unsavedNotificationChannels !== null;
  }, [unsavedNotificationChannels]);

  const isReportTemplatesDirty = useMemo(() => {
    return unsavedReportTemplates !== null;
  }, [unsavedReportTemplates]);

  const isLanguageStringsDirty = useMemo(() => {
    return unsavedLanguageStrings !== null;
  }, [unsavedLanguageStrings]);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title="Platform Configuration"
        subtitle="Manage global sensor types, safety ranges, notification routes, system templates, and user capabilities"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left main area: Tab configuration panels */}
        <div className="lg:col-span-9 space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col md:flex-row gap-6"
          >
            {/* Desktop Settings Menu Sidebar / Mobile Horizontal Scroller */}
            <TabsList className="flex md:flex-col items-start justify-start md:h-auto md:w-56 bg-transparent p-0 gap-1.5 overflow-x-auto md:overflow-x-visible w-full pb-2 border-b border-border/40 md:border-b-0">
              <TabsTrigger
                value="sensor_types"
                className="w-auto md:w-full justify-start py-2 px-3 text-left data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold hover:bg-muted/60"
              >
                <Cpu className="mr-2 h-4 w-4 shrink-0" />
                Sensor Types
              </TabsTrigger>
              <TabsTrigger
                value="default_safe_ranges"
                className="w-auto md:w-full justify-start py-2 px-3 text-left data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold hover:bg-muted/60"
              >
                <Activity className="mr-2 h-4 w-4 shrink-0" />
                Safe Ranges
              </TabsTrigger>
              <TabsTrigger
                value="alert_thresholds"
                className="w-auto md:w-full justify-start py-2 px-3 text-left data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold hover:bg-muted/60"
              >
                <AlertTriangle className="mr-2 h-4 w-4 shrink-0" />
                Alert Thresholds
              </TabsTrigger>
              <TabsTrigger
                value="alert_templates"
                className="w-auto md:w-full justify-start py-2 px-3 text-left data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold hover:bg-muted/60"
              >
                <Bell className="mr-2 h-4 w-4 shrink-0" />
                Alert Templates
              </TabsTrigger>
              <TabsTrigger
                value="device_packages"
                className="w-auto md:w-full justify-start py-2 px-3 text-left data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold hover:bg-muted/60"
              >
                <Package className="mr-2 h-4 w-4 shrink-0" />
                Device Packages
              </TabsTrigger>
              <TabsTrigger
                value="user_roles"
                className="w-auto md:w-full justify-start py-2 px-3 text-left data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold hover:bg-muted/60"
              >
                <Users className="mr-2 h-4 w-4 shrink-0" />
                User Roles
              </TabsTrigger>
              <TabsTrigger
                value="notification_channels"
                className="w-auto md:w-full justify-start py-2 px-3 text-left data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold hover:bg-muted/60"
              >
                <Volume2 className="mr-2 h-4 w-4 shrink-0" />
                Notification Channels
              </TabsTrigger>
              <TabsTrigger
                value="report_templates"
                className="w-auto md:w-full justify-start py-2 px-3 text-left data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold hover:bg-muted/60"
              >
                <FileText className="mr-2 h-4 w-4 shrink-0" />
                Report Templates
              </TabsTrigger>
              <TabsTrigger
                value="language_strings"
                className="w-auto md:w-full justify-start py-2 px-3 text-left data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold hover:bg-muted/60"
              >
                <Languages className="mr-2 h-4 w-4 shrink-0" />
                Language Strings
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-w-0 bg-card rounded-2xl border border-border/70 p-5 shadow-soft">
              {/* 1. TAB: SENSOR TYPES */}
              <TabsContent value="sensor_types" className="mt-0 space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      Sensor Specifications
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Define system metrics, units, and calibration recurrence offsets
                    </p>
                  </div>
                  {!isSensorTypesDirty ? (
                    <Button variant="outline" size="sm" onClick={initSensorTypesEdit}>
                      Edit Configuration
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setUnsavedSensorTypes(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={saveSensorTypes} className="gap-1">
                        <Save className="h-3.5 w-3.5" /> Save Changes
                      </Button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Metric Key</th>
                        <th className="px-4 py-3">Sensor Display Name</th>
                        <th className="px-4 py-3">Telemetry Unit</th>
                        <th className="px-4 py-3">Calibration Interval</th>
                        <th className="px-4 py-3">System Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {(unsavedSensorTypes || sensorTypes).map((item) => (
                        <tr key={item.key} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {item.key}
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {item.unit}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Input
                                type="number"
                                disabled={!isSensorTypesDirty}
                                value={item.calInterval}
                                onChange={(e) =>
                                  handleSensorTypeChange(
                                    item.key,
                                    "calInterval",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="h-8 w-20 px-2 py-1 text-xs text-center"
                              />
                              <span className="text-xs text-muted-foreground">Days</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {isSensorTypesDirty ? (
                              <Select
                                value={item.status}
                                onValueChange={(val) =>
                                  handleSensorTypeChange(item.key, "status", val)
                                }
                              >
                                <SelectTrigger className="h-8 w-28 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <StatusBadge status={item.status} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* 2. TAB: DEFAULT SAFE RANGES */}
              <TabsContent value="default_safe_ranges" className="mt-0 space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      Default Target Safe Ranges
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Set standard margins for ideal water parameters where crops flourish
                    </p>
                  </div>
                  {!isSafeRangesDirty ? (
                    <Button variant="outline" size="sm" onClick={initThresholdsEdit}>
                      Edit Safe Ranges
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setUnsavedThresholds(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => triggerSaveThresholds("safe")}
                        className="gap-1 bg-amber-600 hover:bg-amber-700 text-white border-transparent"
                      >
                        <Save className="h-3.5 w-3.5" /> Save Changes
                      </Button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Parameter</th>
                        <th className="px-4 py-3">Safe Threshold Min</th>
                        <th className="px-4 py-3">Safe Threshold Max</th>
                        <th className="px-4 py-3">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {(unsavedThresholds || thresholds).map((item) => (
                        <tr key={item.parameter} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">
                            {PARAMETER_NAMES[item.parameter] || item.parameter}
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              step="any"
                              disabled={!isSafeRangesDirty}
                              value={item.safe_min ?? ""}
                              placeholder="No limit"
                              onChange={(e) =>
                                handleThresholdChange(
                                  item.parameter,
                                  "safe_min",
                                  e.target.value === "" ? null : parseFloat(e.target.value),
                                )
                              }
                              className="h-8 w-32 px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              step="any"
                              disabled={!isSafeRangesDirty}
                              value={item.safe_max ?? ""}
                              placeholder="No limit"
                              onChange={(e) =>
                                handleThresholdChange(
                                  item.parameter,
                                  "safe_max",
                                  e.target.value === "" ? null : parseFloat(e.target.value),
                                )
                              }
                              className="h-8 w-32 px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {PARAMETER_UNITS[item.parameter] || ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* 3. TAB: ALERT THRESHOLDS */}
              <TabsContent value="alert_thresholds" className="mt-0 space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      Default Alert Severity Boundaries
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Adjust minimum/maximum lines that trigger Warning and Critical notifications
                    </p>
                  </div>
                  {!isAlertThresholdsDirty ? (
                    <Button variant="outline" size="sm" onClick={initThresholdsEdit}>
                      Edit Thresholds
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setUnsavedThresholds(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => triggerSaveThresholds("alert")}
                        className="gap-1 bg-amber-600 hover:bg-amber-700 text-white border-transparent"
                      >
                        <Save className="h-3.5 w-3.5" /> Save Changes
                      </Button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Parameter</th>
                        <th className="px-4 py-3 text-rose-700 bg-rose-500/5">Crit Min</th>
                        <th className="px-4 py-3 text-amber-700 bg-amber-500/5">Warn Min</th>
                        <th className="px-4 py-3 text-amber-700 bg-amber-500/5">Warn Max</th>
                        <th className="px-4 py-3 text-rose-700 bg-rose-500/5">Crit Max</th>
                        <th className="px-4 py-3">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {(unsavedThresholds || thresholds).map((item) => (
                        <tr key={item.parameter} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">
                            {PARAMETER_NAMES[item.parameter] || item.parameter}
                          </td>
                          <td className="px-4 py-3 bg-rose-500/5">
                            <Input
                              type="number"
                              step="any"
                              disabled={!isAlertThresholdsDirty}
                              value={item.crit_min ?? ""}
                              placeholder="No limit"
                              onChange={(e) =>
                                handleThresholdChange(
                                  item.parameter,
                                  "crit_min",
                                  e.target.value === "" ? null : parseFloat(e.target.value),
                                )
                              }
                              className="h-8 w-24 px-2 py-1 text-xs border-rose-200/60 focus:border-rose-400"
                            />
                          </td>
                          <td className="px-4 py-3 bg-amber-500/5">
                            <Input
                              type="number"
                              step="any"
                              disabled={!isAlertThresholdsDirty}
                              value={item.warn_min ?? ""}
                              placeholder="No limit"
                              onChange={(e) =>
                                handleThresholdChange(
                                  item.parameter,
                                  "warn_min",
                                  e.target.value === "" ? null : parseFloat(e.target.value),
                                )
                              }
                              className="h-8 w-24 px-2 py-1 text-xs border-amber-200/60 focus:border-amber-400"
                            />
                          </td>
                          <td className="px-4 py-3 bg-amber-500/5">
                            <Input
                              type="number"
                              step="any"
                              disabled={!isAlertThresholdsDirty}
                              value={item.warn_max ?? ""}
                              placeholder="No limit"
                              onChange={(e) =>
                                handleThresholdChange(
                                  item.parameter,
                                  "warn_max",
                                  e.target.value === "" ? null : parseFloat(e.target.value),
                                )
                              }
                              className="h-8 w-24 px-2 py-1 text-xs border-amber-200/60 focus:border-amber-400"
                            />
                          </td>
                          <td className="px-4 py-3 bg-rose-500/5">
                            <Input
                              type="number"
                              step="any"
                              disabled={!isAlertThresholdsDirty}
                              value={item.crit_max ?? ""}
                              placeholder="No limit"
                              onChange={(e) =>
                                handleThresholdChange(
                                  item.parameter,
                                  "crit_max",
                                  e.target.value === "" ? null : parseFloat(e.target.value),
                                )
                              }
                              className="h-8 w-24 px-2 py-1 text-xs border-rose-200/60 focus:border-rose-400"
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {PARAMETER_UNITS[item.parameter] || ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* 4. TAB: ALERT TEMPLATES */}
              <TabsContent value="alert_templates" className="mt-0 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      Alert Message Templates
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Manage templates generated dynamically on safe boundary exceedance
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAlertModalOpen(true)}
                      className="gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Template
                    </Button>
                    {!isAlertTemplatesDirty ? (
                      <Button variant="outline" size="sm" onClick={initAlertTemplatesEdit}>
                        Edit Content
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUnsavedAlertTemplates(null)}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveAlertTemplates} className="gap-1">
                          <Save className="h-3.5 w-3.5" /> Save Changes
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates by key or message..."
                    value={alertSearch}
                    onChange={(e) => setAlertSearch(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>

                <div className="space-y-4">
                  {filteredAlertTemplates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-primary">
                            {tmpl.type}
                          </span>
                          <StatusBadge status={tmpl.severity} />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAlertTemplate(tmpl.id)}
                          className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            English Notification Text
                          </Label>
                          {isAlertTemplatesDirty ? (
                            <Textarea
                              value={tmpl.enMsg}
                              onChange={(e) =>
                                handleAlertTemplateChange(tmpl.id, "enMsg", e.target.value)
                              }
                              rows={2}
                              className="text-xs"
                            />
                          ) : (
                            <p className="text-xs text-foreground bg-card p-2 rounded border border-border/40">
                              {tmpl.enMsg}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Bangla Notification Text
                          </Label>
                          {isAlertTemplatesDirty ? (
                            <Textarea
                              value={tmpl.bnMsg}
                              onChange={(e) =>
                                handleAlertTemplateChange(tmpl.id, "bnMsg", e.target.value)
                              }
                              rows={2}
                              className="text-xs font-bangla"
                            />
                          ) : (
                            <p className="text-xs text-foreground bg-card p-2 rounded border border-border/40 font-bangla">
                              {tmpl.bnMsg}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Recommended Action / Remediation Instructions
                        </Label>
                        {isAlertTemplatesDirty ? (
                          <Textarea
                            value={tmpl.action}
                            onChange={(e) =>
                              handleAlertTemplateChange(tmpl.id, "action", e.target.value)
                            }
                            rows={1.5}
                            className="text-xs"
                          />
                        ) : (
                          <p className="text-xs text-foreground bg-card p-2 rounded border border-border/40">
                            {tmpl.action}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredAlertTemplates.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      No matching alert templates found.
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* 5. TAB: DEVICE PACKAGES */}
              <TabsContent value="device_packages" className="mt-0 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      Commercial Hardware Packages
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Manage product bundle lineups, telemetry combinations, and market prices
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPackageModalOpen(true)}
                      className="gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Package
                    </Button>
                    {!isDevicePackagesDirty ? (
                      <Button variant="outline" size="sm" onClick={initDevicePackagesEdit}>
                        Edit Packages
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUnsavedDevicePackages(null)}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveDevicePackages} className="gap-1">
                          <Save className="h-3.5 w-3.5" /> Save Changes
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(unsavedDevicePackages || devicePackages).map((pkg) => (
                    <div
                      key={pkg.id}
                      className="relative rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isDevicePackagesDirty ? (
                            <Input
                              value={pkg.name}
                              onChange={(e) =>
                                handleDevicePackageChange(pkg.id, "name", e.target.value)
                              }
                              className="h-7 w-40 text-xs font-semibold"
                            />
                          ) : (
                            <span className="font-bold text-foreground text-sm">{pkg.name}</span>
                          )}
                          <StatusBadge status={pkg.status} />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePackage(pkg.id)}
                          className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Unit Price:</span>
                        {isDevicePackagesDirty ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold">BDT</span>
                            <Input
                              type="number"
                              value={pkg.price}
                              onChange={(e) =>
                                handleDevicePackageChange(
                                  pkg.id,
                                  "price",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              className="h-7 w-24 text-xs font-semibold"
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-primary">
                            BDT {pkg.price.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Description
                        </Label>
                        {isDevicePackagesDirty ? (
                          <Textarea
                            value={pkg.description}
                            onChange={(e) =>
                              handleDevicePackageChange(pkg.id, "description", e.target.value)
                            }
                            rows={2}
                            className="text-xs"
                          />
                        ) : (
                          <p className="text-xs text-muted-foreground">{pkg.description}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Included Probes
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {DEFAULT_SENSOR_TYPES.map((s) => {
                            const isIncluded = pkg.sensors.includes(s.name);
                            return (
                              <button
                                key={s.name}
                                type="button"
                                disabled={!isDevicePackagesDirty}
                                onClick={() => handlePackageSensorToggle(pkg.id, s.name)}
                                className={cn(
                                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                                  isIncluded
                                    ? "bg-primary/10 text-primary border-primary/30"
                                    : "bg-background text-muted-foreground border-border hover:bg-muted/30",
                                )}
                              >
                                {s.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* 6. TAB: USER ROLES */}
              <TabsContent value="user_roles" className="mt-0 space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      User Roles & Access Control
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Configure permission levels, access scopes, and roles within the console
                    </p>
                  </div>
                  {!isUserRolesDirty ? (
                    <Button variant="outline" size="sm" onClick={initUserRolesEdit}>
                      Configure Permissions
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setUnsavedUserRoles(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={saveUserRoles} className="gap-1">
                        <Save className="h-3.5 w-3.5" /> Save Changes
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Role Selection panel */}
                  <div className="md:col-span-4 space-y-2 border-r border-border/40 pr-0 md:pr-4">
                    {(unsavedUserRoles || userRoles).map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRoleId(role.id)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-lg border text-xs font-semibold transition-all flex items-center justify-between",
                          selectedRoleId === role.id
                            ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                            : "bg-background text-foreground border-border/50 hover:bg-muted/40",
                        )}
                      >
                        {role.role}
                        {selectedRoleId === role.id && (
                          <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Right Permissions Panel */}
                  <div className="md:col-span-8 space-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-foreground">Role Description</Label>
                      {isUserRolesDirty ? (
                        <Textarea
                          value={activeRoleData.description}
                          onChange={(e) =>
                            handleRoleDescriptionChange(activeRoleData.id, e.target.value)
                          }
                          rows={2}
                          className="text-xs"
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/40">
                          {activeRoleData.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-foreground">
                        Capabilities & Permissions
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { key: "read_telemetry", label: "View Ponds & Telemetry" },
                          { key: "log_pond_actions", label: "Log Feed & Treatment Actions" },
                          { key: "request_support", label: "Request Support Tickets" },
                          { key: "manage_billing", label: "Configure Billing & Subscription" },
                          {
                            key: "configure_pond_thresholds",
                            label: "Modify Individual Pond Thresholds",
                          },
                          { key: "assign_workers", label: "Delegate Tasks to workers" },
                          { key: "perform_calibrations", label: "Calibrate Field Sensors" },
                          { key: "log_maintenance", label: "Write Maintenance Bulletins" },
                          { key: "configure_device_serials", label: "Register Hardware Devices" },
                          { key: "read_tickets", label: "Read Customer Tickets" },
                          { key: "manage_support_tickets", label: "Assign & Resolve Tickets" },
                          {
                            key: "view_device_logs",
                            label: "Inspect Global Device Connectivity Logs",
                          },
                          { key: "all_permissions", label: "Superuser Master Capability (Admins)" },
                        ].map((perm) => {
                          const isAssigned =
                            activeRoleData.permissions.includes(perm.key) ||
                            activeRoleData.permissions.includes("all_permissions");
                          return (
                            <label
                              key={perm.key}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors",
                                isAssigned
                                  ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-950 font-medium"
                                  : "bg-background border-border/50 text-muted-foreground hover:bg-muted/20",
                              )}
                            >
                              <input
                                type="checkbox"
                                disabled={
                                  !isUserRolesDirty ||
                                  (activeRoleData.permissions.includes("all_permissions") &&
                                    perm.key !== "all_permissions")
                                }
                                checked={isAssigned}
                                onChange={() =>
                                  handleRolePermissionToggle(activeRoleData.id, perm.key)
                                }
                                className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                              />
                              {perm.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* 7. TAB: NOTIFICATION CHANNELS */}
              <TabsContent value="notification_channels" className="mt-0 space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      Notification Channels
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Manage SMS gateways, messaging adapters, email targets, and app delivery
                      systems
                    </p>
                  </div>
                  {!isNotificationChannelsDirty ? (
                    <Button variant="outline" size="sm" onClick={initNotificationChannelsEdit}>
                      Configure Integrations
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUnsavedNotificationChannels(null)}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={saveNotificationChannels} className="gap-1">
                        <Save className="h-3.5 w-3.5" /> Save Changes
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {(unsavedNotificationChannels || notificationChannels).map((chan) => (
                    <div
                      key={chan.id}
                      className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">{chan.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase bg-card border px-2 py-0.5 rounded">
                            {chan.type}
                          </span>
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              chan.status === "operational"
                                ? "bg-emerald-500"
                                : chan.status === "degraded"
                                  ? "bg-amber-500"
                                  : "bg-rose-500",
                            )}
                          />
                          <span className="text-[10px] capitalize text-muted-foreground">
                            {chan.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => handleTestChannel(chan.name)}
                            className="h-8 text-xs text-primary hover:bg-primary/5"
                          >
                            Test Ping
                          </Button>
                          <Switch
                            disabled={!isNotificationChannelsDirty}
                            checked={chan.enabled}
                            onCheckedChange={(checked) =>
                              handleChannelChange(chan.id, "enabled", checked)
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                            Integration Provider
                          </Label>
                          <Input
                            disabled={!isNotificationChannelsDirty}
                            value={chan.provider}
                            onChange={(e) =>
                              handleChannelChange(chan.id, "provider", e.target.value)
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                            API Endpoint Url
                          </Label>
                          <Input
                            disabled={!isNotificationChannelsDirty}
                            value={chan.endpoint}
                            onChange={(e) =>
                              handleChannelChange(chan.id, "endpoint", e.target.value)
                            }
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">
                            Authorization Key
                          </Label>
                          <Input
                            type="password"
                            disabled={!isNotificationChannelsDirty}
                            value={chan.apiKey}
                            onChange={(e) => handleChannelChange(chan.id, "apiKey", e.target.value)}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* 8. TAB: REPORT TEMPLATES */}
              <TabsContent value="report_templates" className="mt-0 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      Scheduled Telemetry Digests
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Manage templates for scheduled email, PDF, or spreadsheet reports
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsReportModalOpen(true)}
                      className="gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Template
                    </Button>
                    {!isReportTemplatesDirty ? (
                      <Button variant="outline" size="sm" onClick={initReportTemplatesEdit}>
                        Edit Schedules
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUnsavedReportTemplates(null)}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveReportTemplates} className="gap-1">
                          <Save className="h-3.5 w-3.5" /> Save Changes
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Report Type Name</th>
                        <th className="px-4 py-3">Schedule Interval</th>
                        <th className="px-4 py-3">Output Format</th>
                        <th className="px-4 py-3">Included Parameters</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {(unsavedReportTemplates || reportTemplates).map((rep) => (
                        <tr key={rep.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3">
                            {isReportTemplatesDirty ? (
                              <Input
                                value={rep.name}
                                onChange={(e) => handleReportChange(rep.id, "name", e.target.value)}
                                className="h-8 text-xs font-medium"
                              />
                            ) : (
                              <span className="font-semibold text-foreground">{rep.name}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isReportTemplatesDirty ? (
                              <Select
                                value={rep.schedule}
                                onValueChange={(val) => handleReportChange(rep.id, "schedule", val)}
                              >
                                <SelectTrigger className="h-8 w-28 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Daily">Daily</SelectItem>
                                  <SelectItem value="Weekly">Weekly</SelectItem>
                                  <SelectItem value="Monthly">Monthly</SelectItem>
                                  <SelectItem value="On Alert Trigger">On Alert</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-muted-foreground">{rep.schedule}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isReportTemplatesDirty ? (
                              <Select
                                value={rep.format}
                                onValueChange={(val) => handleReportChange(rep.id, "format", val)}
                              >
                                <SelectTrigger className="h-8 w-24 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PDF">PDF</SelectItem>
                                  <SelectItem value="CSV">CSV</SelectItem>
                                  <SelectItem value="Excel">Excel</SelectItem>
                                  <SelectItem value="PDF & Excel">PDF & Excel</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs font-mono text-muted-foreground">
                                {rep.format}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {rep.parameters.map((p) => (
                                <span
                                  key={p}
                                  className="inline-flex items-center rounded bg-primary/5 border border-primary/20 px-1.5 py-0.5 text-[9px] font-semibold text-primary"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {isReportTemplatesDirty ? (
                              <Select
                                value={rep.status}
                                onValueChange={(val) => handleReportChange(rep.id, "status", val)}
                              >
                                <SelectTrigger className="h-8 w-24 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <StatusBadge status={rep.status} />
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteReport(rep.id)}
                              className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* 9. TAB: LANGUAGE STRINGS */}
              <TabsContent value="language_strings" className="mt-0 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      Localized App Strings
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Manage translations, dictionary terms, and key-value mapping (En/Bn)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsLanguageModalOpen(true)}
                      className="gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Key
                    </Button>
                    {!isLanguageStringsDirty ? (
                      <Button variant="outline" size="sm" onClick={initLanguageStringsEdit}>
                        Edit Translations
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUnsavedLanguageStrings(null)}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveLanguageStrings} className="gap-1">
                          <Save className="h-3.5 w-3.5" /> Save Changes
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search translation strings..."
                      value={langSearch}
                      onChange={(e) => setLangSearch(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>
                  <Select value={langCategoryFilter} onValueChange={setLangCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-48 text-xs">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Localization Identifier Key</th>
                        <th className="px-4 py-3">English Translation</th>
                        <th className="px-4 py-3">Bengali (Bangla) Translation</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredLanguageStrings.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">
                            {item.key}
                          </td>
                          <td className="px-4 py-3">
                            {isLanguageStringsDirty ? (
                              <Input
                                value={item.en}
                                onChange={(e) =>
                                  handleLanguageStringChange(item.id, "en", e.target.value)
                                }
                                className="h-8 min-w-[150px] text-xs"
                              />
                            ) : (
                              <span className="text-xs text-foreground">{item.en}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bangla">
                            {isLanguageStringsDirty ? (
                              <Input
                                value={item.bn}
                                onChange={(e) =>
                                  handleLanguageStringChange(item.id, "bn", e.target.value)
                                }
                                className="h-8 min-w-[150px] text-xs"
                              />
                            ) : (
                              <span className="text-xs text-foreground">{item.bn}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[9px] font-medium text-slate-800">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLanguageString(item.id)}
                              className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right Change Log History panel */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-card rounded-2xl border border-border/70 p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-1.5">
                <History className="h-4 w-4 text-primary" />
                Change Log History
              </h3>
              {changeLogs.length > 0 && (
                <button
                  type="button"
                  onClick={clearChangeLogs}
                  className="text-[10px] font-semibold text-rose-500 hover:underline"
                >
                  Clear log
                </button>
              )}
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {changeLogs.map((log) => (
                <div key={log.id} className="relative pl-4 border-l border-primary/20 space-y-1">
                  {/* Decorative dot */}
                  <span className="absolute -left-1 top-1.5 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-semibold text-primary">{log.section}</span>
                    <span>
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground font-medium leading-relaxed">
                    {log.detail}
                  </p>
                  <p className="text-[10px] text-muted-foreground">by {log.user}</p>
                </div>
              ))}
              {changeLogs.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1">
                  <Info className="h-4 w-4 opacity-50" />
                  No changes logged in this session
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Global Thresholds Confirmation Alert ===== */}
      <AlertDialog open={showThresholdConfirm} onOpenChange={setShowThresholdConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5 animate-bounce" />
              Confirm Global Threshold Changes
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              You are about to modify system-wide thresholds. These updates will be applied as
              default guidelines across **all ponds** currently configured to use default templates.
              Existing sensors will immediately evaluate water quality status against these values.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeConfirmSaveThresholds}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Yes, Apply Globally
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== Add Alert Template Modal ===== */}
      <Dialog open={isAlertModalOpen} onOpenChange={setIsAlertModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Alert Message Template</DialogTitle>
            <DialogDescription>
              Define a translation template for newly logged threshold alarms.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Alert Identifier Key</Label>
              <Input
                placeholder="e.g. salinity_ppt_warning_high"
                value={newAlertTemplate.type}
                onChange={(e) => setNewAlertTemplate({ ...newAlertTemplate, type: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Severity</Label>
              <Select
                value={newAlertTemplate.severity}
                onValueChange={(val: any) =>
                  setNewAlertTemplate({ ...newAlertTemplate, severity: val })
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="watch">Watch</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">English Message</Label>
              <Textarea
                placeholder="e.g. Salinity levels are warning high at {value} ppt."
                value={newAlertTemplate.enMsg}
                onChange={(e) =>
                  setNewAlertTemplate({ ...newAlertTemplate, enMsg: e.target.value })
                }
                className="text-xs"
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Bangla Message</Label>
              <Textarea
                placeholder="e.g. লবণাক্ততার মাত্রা বিপজ্জনকভাবে বৃদ্ধি পেয়ে {value} ppt হয়েছে।"
                value={newAlertTemplate.bnMsg}
                onChange={(e) =>
                  setNewAlertTemplate({ ...newAlertTemplate, bnMsg: e.target.value })
                }
                className="text-xs font-bangla"
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Recommended Remediation Action</Label>
              <Textarea
                placeholder="e.g. Open pond sluice gates slightly to mix fresh water."
                value={newAlertTemplate.action}
                onChange={(e) =>
                  setNewAlertTemplate({ ...newAlertTemplate, action: e.target.value })
                }
                className="text-xs"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsAlertModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateAlertTemplate}
              disabled={!newAlertTemplate.type || !newAlertTemplate.enMsg}
            >
              Add Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Add Device Package Modal ===== */}
      <Dialog open={isPackageModalOpen} onOpenChange={setIsPackageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Hardware Package</DialogTitle>
            <DialogDescription>
              Define a new commercial sensor bundle configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Package Name</Label>
              <Input
                placeholder="e.g. Aquaculture Pro Buoy"
                value={newPackage.name}
                onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Unit Price (BDT)</Label>
              <Input
                type="number"
                placeholder="e.g. 32000"
                value={newPackage.price || ""}
                onChange={(e) =>
                  setNewPackage({ ...newPackage, price: parseInt(e.target.value) || 0 })
                }
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                placeholder="Write summary of package items, target user bases..."
                value={newPackage.description}
                onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
                className="text-xs"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Included Probes</Label>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_SENSOR_TYPES.map((s) => {
                  const isChecked = newPackage.sensors.includes(s.name);
                  return (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => {
                        const next = isChecked
                          ? newPackage.sensors.filter((x) => x !== s.name)
                          : [...newPackage.sensors, s.name];
                        setNewPackage({ ...newPackage, sensors: next });
                      }}
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                        isChecked
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-background text-muted-foreground border-border hover:bg-muted/30",
                      )}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsPackageModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreatePackage}
              disabled={!newPackage.name || !newPackage.price}
            >
              Add Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Add Report Template Modal ===== */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Report Template</DialogTitle>
            <DialogDescription>
              Define a new scheduled telemetry report blueprint.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Report Template Name</Label>
              <Input
                placeholder="e.g. Daily Dissolved Oxygen Log"
                value={newReport.name}
                onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Schedule Interval</Label>
              <Select
                value={newReport.schedule}
                onValueChange={(val) => setNewReport({ ...newReport, schedule: val })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="On Alert Trigger">On Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Output Format</Label>
              <Select
                value={newReport.format}
                onValueChange={(val) => setNewReport({ ...newReport, format: val })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="CSV">CSV</SelectItem>
                  <SelectItem value="Excel">Excel</SelectItem>
                  <SelectItem value="PDF & Excel">PDF & Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Included Metrics</Label>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_SENSOR_TYPES.map((s) => {
                  const isChecked = newReport.parameters.includes(s.name);
                  return (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => {
                        const next = isChecked
                          ? newReport.parameters.filter((x) => x !== s.name)
                          : [...newReport.parameters, s.name];
                        setNewReport({ ...newReport, parameters: next });
                      }}
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                        isChecked
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-background text-muted-foreground border-border hover:bg-muted/30",
                      )}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsReportModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateReport} disabled={!newReport.name}>
              Add Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Add Language Key Modal ===== */}
      <Dialog open={isLanguageModalOpen} onOpenChange={setIsLanguageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Localization Key</DialogTitle>
            <DialogDescription>Define a new multi-lingual translation key.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Key Name</Label>
              <Input
                placeholder="e.g. sidebar.support_tickets"
                value={newLanguageString.key}
                onChange={(e) =>
                  setNewLanguageString({ ...newLanguageString, key: e.target.value })
                }
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">English translation</Label>
              <Input
                placeholder="e.g. Customer Support"
                value={newLanguageString.en}
                onChange={(e) => setNewLanguageString({ ...newLanguageString, en: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Bangla translation</Label>
              <Input
                placeholder="e.g. গ্রাহক সেবা সহায়তা"
                value={newLanguageString.bn}
                onChange={(e) => setNewLanguageString({ ...newLanguageString, bn: e.target.value })}
                className="text-xs font-bangla"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Category Group</Label>
              <Select
                value={newLanguageString.category}
                onValueChange={(val) =>
                  setNewLanguageString({ ...newLanguageString, category: val })
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Common">Common</SelectItem>
                  <SelectItem value="Dashboard">Dashboard</SelectItem>
                  <SelectItem value="Alerts">Alerts</SelectItem>
                  <SelectItem value="Pond Management">Pond Management</SelectItem>
                  <SelectItem value="Auth">Auth</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsLanguageModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateLanguageString}
              disabled={!newLanguageString.key || !newLanguageString.en}
            >
              Add Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
