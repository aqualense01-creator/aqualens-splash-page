import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  LifeBuoy,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Users,
  Image as ImageIcon,
  MessageSquare,
  Send,
  MoreHorizontal,
  Upload,
  Building2,
  Waves,
  Cpu,
  Phone,
  FileText,
  HelpCircle,
  PlusCircle,
  X,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { insforge, type Profile, type Farm, type Pond, type Device } from "@/lib/insforge";
import { PageHeader, StatusBadge, EmptyState } from "@/components/app/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/support")({
  head: () => ({ meta: [{ title: "Admin · Support Tickets — Acqua Lence" }] }),
  component: AdminSupport,
});

// ===== Types =====
export type TicketStatus = "open" | "in_progress" | "waiting_for_farmer" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";

export type TicketActivity = {
  id: string;
  type: "created" | "assignment" | "status_change" | "note" | "resolution";
  author: string;
  body: string;
  created_at: string;
};

export type SupportTicket = {
  id: string;
  issue_type: string; // "Hardware" | "Software" | "Water Quality" | "Other"
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  farm_id: string | null;
  farm_name: string | null;
  pond_id: string | null;
  pond_name: string | null;
  device_id: string | null;
  device_serial: string | null;
  priority: TicketPriority;
  description: string;
  photos: string[];
  assigned_to: string | null; // Tech profile ID
  assigned_name: string | null;
  status: TicketStatus;
  timeline: TicketActivity[];
  created_at: string;
  updated_at: string;
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting_for_farmer: "Waiting for Farmer",
  resolved: "Resolved",
  closed: "Closed",
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  medium: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  high: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  critical: "bg-rose-500/10 text-rose-700 border-rose-500/30 animate-pulse",
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: "bg-slate-500/10 text-slate-700 border-slate-500/30",
  in_progress: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  waiting_for_farmer: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  resolved: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  closed: "bg-gray-500/10 text-gray-700 border-gray-500/30",
};

// ===== Initial Pre-populated Support Tickets =====
const getInitialTickets = (
  techs: Profile[],
  farms: Farm[],
  ponds: Pond[],
  devices: Device[],
): SupportTicket[] => {
  const defaultTech = techs[0] ?? null;
  const defaultFarm = farms[0] ?? null;
  const defaultPond = ponds.find((p) => p.farm_id === defaultFarm?.id) ?? null;
  const defaultDevice = devices.find((d) => d.farm_id === defaultFarm?.id) ?? null;

  return [
    {
      id: "TKT-3029",
      issue_type: "Hardware",
      farmer_id: "mock-farmer",
      farmer_name: "Rahim Mia",
      farmer_phone: "+8801712345678",
      farm_id: defaultFarm?.id ?? "f1",
      farm_name: defaultFarm?.name ?? "Sundarban Farm",
      pond_id: defaultPond?.id ?? "p2",
      pond_name: defaultPond?.name ?? "Pond 2 — Shrimp",
      device_id: defaultDevice?.id ?? "d2",
      device_serial: defaultDevice?.serial ?? "AQ-204",
      priority: "critical",
      description:
        "My sensor node buoy (AQ-204) was hit by a paddle-wheel aerator during high winds. The dissolved oxygen reading is currently stuck at 2.8 mg/L even though the aerators are running, and there is visible condensation under the top cover. Need a replacement probe or field visit urgently.",
      photos: [],
      assigned_to: defaultTech?.id ?? "mock-tech",
      assigned_name: defaultTech?.full_name ?? "Shahin Hossain",
      status: "in_progress",
      timeline: [
        {
          id: "act-1",
          type: "created",
          author: "Rahim Mia (Farmer)",
          body: "Ticket raised from mobile app: Hardware damage and DO sensor calibration issue.",
          created_at: new Date(Date.now() - 3600 * 24 * 1000).toISOString(),
        },
        {
          id: "act-2",
          type: "assignment",
          author: "System Admin",
          body: `Ticket assigned to technician ${defaultTech?.full_name ?? "Shahin Hossain"}.`,
          created_at: new Date(Date.now() - 3600 * 20 * 1000).toISOString(),
        },
        {
          id: "act-3",
          type: "status_change",
          author: defaultTech?.full_name ?? "Shahin Hossain",
          body: "Status changed from 'Open' to 'In Progress'.",
          created_at: new Date(Date.now() - 3600 * 19 * 1000).toISOString(),
        },
        {
          id: "act-4",
          type: "note",
          author: defaultTech?.full_name ?? "Shahin Hossain (Tech)",
          body: "Checked the cloud log. Readings dropped abruptly right after the impact. I am heading to Mirpur Farm tomorrow morning with a spare optical DO probe.",
          created_at: new Date(Date.now() - 3600 * 18 * 1000).toISOString(),
        },
      ],
      created_at: new Date(Date.now() - 3600 * 24 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 18 * 1000).toISOString(),
    },
    {
      id: "TKT-3011",
      issue_type: "Water Quality",
      farmer_id: "mock-farmer-2",
      farmer_name: "Anisur Rahman",
      farmer_phone: "+8801823456789",
      farm_id: farms[1]?.id ?? "f2",
      farm_name: farms[1]?.name ?? "Khulna East Farm",
      pond_id: ponds.find((p) => p.farm_id === farms[1]?.id)?.id ?? "p3",
      pond_name: ponds.find((p) => p.farm_id === farms[1]?.id)?.name ?? "Pond 3 — Tilapia",
      device_id: devices.find((d) => d.farm_id === farms[1]?.id)?.id ?? "d3",
      device_serial: devices.find((d) => d.farm_id === farms[1]?.id)?.serial ?? "AQ-211",
      priority: "high",
      description:
        "Ammonia level warnings have been firing for Pond 3 since yesterday (currently reading 0.8 mg/L). We applied lime last week, but the readings are rising. We need support verifying if the sensor needs recalibration before we add probiotic treatments.",
      photos: [],
      assigned_to: null,
      assigned_name: null,
      status: "open",
      timeline: [
        {
          id: "act-5",
          type: "created",
          author: "Anisur Rahman (Farmer)",
          body: "Ticket raised: Ammonia warnings rising rapidly, requesting calibration verification.",
          created_at: new Date(Date.now() - 3600 * 5 * 1000).toISOString(),
        },
      ],
      created_at: new Date(Date.now() - 3600 * 5 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 5 * 1000).toISOString(),
    },
    {
      id: "TKT-2995",
      issue_type: "Software",
      farmer_id: "mock-farmer-3",
      farmer_name: "Mofizur Rahman",
      farmer_phone: "+8801934567890",
      farm_id: defaultFarm?.id ?? "f1",
      farm_name: defaultFarm?.name ?? "Sundarban Farm",
      pond_id: ponds.find((p) => p.id === "p3")?.id ?? "p3",
      pond_name: ponds.find((p) => p.id === "p3")?.name ?? "Pond 3 — Tilapia",
      device_id: defaultDevice?.id ?? "d3",
      device_serial: defaultDevice?.serial ?? "AQ-188",
      priority: "medium",
      description:
        "The SMS notification services are not sending messages to my fallback mobile number when the battery drops low. The device battery is at 14% but I only received an app push, no SMS alerts.",
      photos: [],
      assigned_to: defaultTech?.id ?? "mock-tech",
      assigned_name: defaultTech?.full_name ?? "Shahin Hossain",
      status: "waiting_for_farmer",
      timeline: [
        {
          id: "act-6",
          type: "created",
          author: "Mofizur Rahman (Farmer)",
          body: "Ticket raised: SMS alert delivery issues for low battery warning.",
          created_at: new Date(Date.now() - 3600 * 48 * 1000).toISOString(),
        },
        {
          id: "act-7",
          type: "assignment",
          author: "System Admin",
          body: `Ticket assigned to technician ${defaultTech?.full_name ?? "Shahin Hossain"}.`,
          created_at: new Date(Date.now() - 3600 * 46 * 1000).toISOString(),
        },
        {
          id: "act-8",
          type: "note",
          author: defaultTech?.full_name ?? "Shahin Hossain (Tech)",
          body: "Checked the SMS gateway. The carrier reports a blocked sender configuration. Farmer Mofizur, could you please confirm if you have blocked or muted notifications from our SMS gateway number (+88016...)?",
          created_at: new Date(Date.now() - 3600 * 24 * 1000).toISOString(),
        },
        {
          id: "act-9",
          type: "status_change",
          author: defaultTech?.full_name ?? "Shahin Hossain",
          body: "Status changed to 'Waiting for Farmer'.",
          created_at: new Date(Date.now() - 3600 * 24 * 1000).toISOString(),
        },
      ],
      created_at: new Date(Date.now() - 3600 * 48 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 24 * 1000).toISOString(),
    },
    {
      id: "TKT-2950",
      issue_type: "Hardware",
      farmer_id: "mock-farmer",
      farmer_name: "Rahim Mia",
      farmer_phone: "+8801712345678",
      farm_id: defaultFarm?.id ?? "f1",
      farm_name: defaultFarm?.name ?? "Sundarban Farm",
      pond_id: defaultPond?.id ?? "p1",
      pond_name: defaultPond?.name ?? "Pond 1 — Rui",
      device_id: defaultDevice?.id ?? "d1",
      device_serial: defaultDevice?.serial ?? "AQ-101",
      priority: "low",
      description:
        "Solar panel bracket has a loose screw and keeps tilting during strong winds. Panel is still charging but angle is not optimal.",
      photos: [],
      assigned_to: defaultTech?.id ?? "mock-tech",
      assigned_name: defaultTech?.full_name ?? "Shahin Hossain",
      status: "resolved",
      timeline: [
        {
          id: "act-10",
          type: "created",
          author: "Rahim Mia (Farmer)",
          body: "Ticket raised: Loose solar bracket screw.",
          created_at: new Date(Date.now() - 3600 * 120 * 1000).toISOString(),
        },
        {
          id: "act-11",
          type: "assignment",
          author: "System Admin",
          body: `Ticket assigned to technician ${defaultTech?.full_name ?? "Shahin Hossain"}.`,
          created_at: new Date(Date.now() - 3600 * 118 * 1000).toISOString(),
        },
        {
          id: "act-12",
          type: "note",
          author: defaultTech?.full_name ?? "Shahin Hossain (Tech)",
          body: "Tightened the bracket bracket and added a lock washer to prevent it from slipping loose again. Charging efficiency is back to 100%.",
          created_at: new Date(Date.now() - 3600 * 96 * 1000).toISOString(),
        },
        {
          id: "act-13",
          type: "resolution",
          author: defaultTech?.full_name ?? "Shahin Hossain",
          body: "Ticket marked as Resolved. Resolution note: Bracket tightened and lock-washer added on field visit.",
          created_at: new Date(Date.now() - 3600 * 96 * 1000).toISOString(),
        },
      ],
      created_at: new Date(Date.now() - 3600 * 120 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 96 * 1000).toISOString(),
    },
  ];
};

const LOCAL_STORAGE_KEY = "acqua_support_tickets_store";

function AdminSupport() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [techFilter, setTechFilter] = useState<string>("all");
  const [drawerTicketId, setDrawerTicketId] = useState<string | null>(null);

  // Note dialog
  const [newNote, setNewNote] = useState("");
  const [closeResolutionOpen, setCloseResolutionOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");

  // Create ticket dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
    issue_type: "Hardware",
    farmer_id: "mock-farmer",
    farmer_name: "Rahim Mia",
    farmer_phone: "+8801712345678",
    farm_id: "",
    pond_id: "",
    device_id: "",
    priority: "medium" as TicketPriority,
    description: "",
  });

  // Queries for real options from database
  const farmsQ = useQuery({
    queryKey: ["admin-support", "farms"],
    queryFn: async () => {
      const r = await insforge.database.from("farms").select("*").order("name");
      if (r.error) throw r.error;
      return (r.data ?? []) as Farm[];
    },
  });

  const pondsQ = useQuery({
    queryKey: ["admin-support", "ponds"],
    queryFn: async () => {
      const r = await insforge.database.from("ponds").select("*").order("name");
      if (r.error) throw r.error;
      return (r.data ?? []) as Pond[];
    },
  });

  const devicesQ = useQuery({
    queryKey: ["admin-support", "devices"],
    queryFn: async () => {
      const r = await insforge.database.from("devices").select("*").order("serial");
      if (r.error) throw r.error;
      return (r.data ?? []) as Device[];
    },
  });

  const profilesQ = useQuery({
    queryKey: ["admin-support", "profiles"],
    queryFn: async () => {
      const r = await insforge.database.from("profiles").select("*");
      if (r.error) throw r.error;
      return (r.data ?? []) as Profile[];
    },
  });

  // Fetch roles to identify technicians/admins
  const rolesQ = useQuery({
    queryKey: ["admin-support", "roles"],
    queryFn: async () => {
      const r = await insforge.database.from("user_roles").select("*");
      if (r.error) throw r.error;
      return (r.data ?? []) as { id: string; user_id: string; role: string }[];
    },
  });

  const farms = useMemo(() => farmsQ.data ?? [], [farmsQ.data]);
  const ponds = useMemo(() => pondsQ.data ?? [], [pondsQ.data]);
  const devices = useMemo(() => devicesQ.data ?? [], [devicesQ.data]);
  const profiles = useMemo(() => profilesQ.data ?? [], [profilesQ.data]);
  const roles = useMemo(() => rolesQ.data ?? [], [rolesQ.data]);

  // Filter technicians
  const technicians = useMemo(() => {
    const techUserIds = new Set(
      roles
        .filter((r) => r.role === "technician" || r.role === "admin" || r.role === "support")
        .map((r) => r.user_id),
    );
    return profiles.filter((p) => techUserIds.has(p.id));
  }, [profiles, roles]);

  const farmers = useMemo(() => {
    const techUserIds = new Set(roles.filter((r) => r.role !== "farmer").map((r) => r.user_id));
    return profiles.filter((p) => !techUserIds.has(p.id));
  }, [profiles, roles]);

  // Support Tickets State synced with LocalStorage fallback
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        setTickets(JSON.parse(raw));
        return;
      } catch {
        // ignore & prepopulate
      }
    }
    // Prepopulate
    const prepop = getInitialTickets(technicians, farms, ponds, devices);
    setTickets(prepop);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prepop));
  }, [technicians, farms, ponds, devices]);

  const saveTickets = (nextTickets: SupportTicket[]) => {
    setTickets(nextTickets);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextTickets));
  };

  // Auto-fill values in new ticket form
  useEffect(() => {
    if (farms.length > 0 && !newTicketForm.farm_id) {
      setNewTicketForm((f) => ({ ...f, farm_id: farms[0].id }));
    }
  }, [farms, newTicketForm.farm_id]);

  useEffect(() => {
    if (newTicketForm.farm_id) {
      const farmPonds = ponds.filter((p) => p.farm_id === newTicketForm.farm_id);
      const farmDevices = devices.filter((d) => d.farm_id === newTicketForm.farm_id);
      setNewTicketForm((f) => ({
        ...f,
        pond_id: farmPonds[0]?.id ?? "",
        device_id: farmDevices[0]?.id ?? "",
      }));
    }
  }, [newTicketForm.farm_id, ponds, devices]);

  // Ticket Mutations
  const updateTicket = (
    ticketId: string,
    patch: Partial<SupportTicket>,
    activity?: TicketActivity,
  ) => {
    const next = tickets.map((t) => {
      if (t.id === ticketId) {
        const updatedTimeline = activity ? [...t.timeline, activity] : t.timeline;
        return {
          ...t,
          ...patch,
          timeline: updatedTimeline,
          updated_at: new Date().toISOString(),
        };
      }
      return t;
    });
    saveTickets(next);
  };

  // Actions
  const handleAssign = (ticketId: string, techId: string) => {
    const tech = technicians.find((t) => t.id === techId);
    if (!tech) return;

    const activity: TicketActivity = {
      id: "act-" + Math.random().toString(36).slice(2, 10),
      type: "assignment",
      author: "System Admin",
      body: `Assigned ticket to technician ${tech.full_name ?? "Unknown"}.`,
      created_at: new Date().toISOString(),
    };

    updateTicket(ticketId, { assigned_to: techId, assigned_name: tech.full_name }, activity);
    toast.success(`Ticket assigned to ${tech.full_name}`);
  };

  const handleStatusChange = (ticketId: string, status: TicketStatus) => {
    const activity: TicketActivity = {
      id: "act-" + Math.random().toString(36).slice(2, 10),
      type: "status_change",
      author: "System Admin",
      body: `Changed status to '${STATUS_LABELS[status]}'.`,
      created_at: new Date().toISOString(),
    };

    updateTicket(ticketId, { status }, activity);
    toast.success(`Status updated to ${STATUS_LABELS[status]}`);
  };

  const handleAddNote = (ticketId: string) => {
    if (!newNote.trim()) return;

    const activity: TicketActivity = {
      id: "act-" + Math.random().toString(36).slice(2, 10),
      type: "note",
      author: "System Admin (Note)",
      body: newNote.trim(),
      created_at: new Date().toISOString(),
    };

    updateTicket(ticketId, {}, activity);
    setNewNote("");
    toast.success("Note added to timeline");
  };

  const handleCloseWithResolution = (ticketId: string) => {
    if (!resolutionNote.trim()) {
      toast.error("Please provide a resolution note");
      return;
    }

    const activity: TicketActivity = {
      id: "act-" + Math.random().toString(36).slice(2, 10),
      type: "resolution",
      author: "System Admin",
      body: `Closed ticket with resolution: ${resolutionNote.trim()}`,
      created_at: new Date().toISOString(),
    };

    updateTicket(ticketId, { status: "resolved" }, activity);
    setResolutionNote("");
    setCloseResolutionOpen(false);
    toast.success("Ticket closed and marked resolved");
  };

  const handlePhotoUpload = (ticketId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const t = tickets.find((x) => x.id === ticketId);
      if (t) {
        const nextPhotos = [...t.photos, dataUrl];
        const activity: TicketActivity = {
          id: "act-" + Math.random().toString(36).slice(2, 10),
          type: "note",
          author: "System Admin",
          body: "Uploaded a new photo attachment.",
          created_at: new Date().toISOString(),
        };
        updateTicket(ticketId, { photos: nextPhotos }, activity);
        toast.success("Attachment uploaded successfully");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateTicket = () => {
    const { farmer_id, farm_id, pond_id, device_id, issue_type, priority, description } =
      newTicketForm;
    if (!description.trim()) {
      toast.error("Please enter an issue description");
      return;
    }

    const farmer = profiles.find((p) => p.id === farmer_id);
    const farm = farms.find((f) => f.id === farm_id);
    const pond = ponds.find((p) => p.id === pond_id);
    const device = devices.find((d) => d.id === device_id);

    const ticketId = "TKT-" + Math.floor(1000 + Math.random() * 9000);

    const newTicket: SupportTicket = {
      id: ticketId,
      issue_type,
      farmer_id,
      farmer_name: farmer?.full_name ?? "Unknown Farmer",
      farmer_phone: farmer?.phone ?? "—",
      farm_id: farm_id || null,
      farm_name: farm?.name ?? null,
      pond_id: pond_id || null,
      pond_name: pond?.name ?? null,
      device_id: device_id || null,
      device_serial: device?.serial ?? null,
      priority,
      description,
      photos: [],
      assigned_to: null,
      assigned_name: null,
      status: "open",
      timeline: [
        {
          id: "act-create",
          type: "created",
          author: `${farmer?.full_name ?? "Farmer"} (Raised via admin)`,
          body: description,
          created_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveTickets([newTicket, ...tickets]);
    toast.success(`Support ticket ${ticketId} created`);
    setCreateDialogOpen(false);
    setNewTicketForm({
      issue_type: "Hardware",
      farmer_id: "mock-farmer",
      farmer_name: "Rahim Mia",
      farmer_phone: "+8801712345678",
      farm_id: farms[0]?.id ?? "",
      pond_id: "",
      device_id: "",
      priority: "medium",
      description: "",
    });
  };

  // Memoized lists & counts
  const filteredTickets = useMemo(() => {
    const term = q.trim().toLowerCase();
    return tickets.filter((t) => {
      // Filters
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (techFilter !== "all") {
        if (techFilter === "unassigned" && t.assigned_to !== null) return false;
        if (techFilter !== "unassigned" && t.assigned_to !== techFilter) return false;
      }
      // Search
      if (term) {
        const searchPool = [
          t.id,
          t.farmer_name,
          t.farm_name,
          t.pond_name,
          t.device_serial,
          t.description,
          t.issue_type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchPool.includes(term)) return false;
      }
      return true;
    });
  }, [tickets, q, statusFilter, priorityFilter, techFilter]);

  const counts = useMemo(() => {
    const c = { total: tickets.length, open: 0, in_progress: 0, waiting: 0, resolved: 0 };
    for (const t of tickets) {
      if (t.status === "open") c.open++;
      else if (t.status === "in_progress") c.in_progress++;
      else if (t.status === "waiting_for_farmer") c.waiting++;
      else if (t.status === "resolved" || t.status === "closed") c.resolved++;
    }
    return c;
  }, [tickets]);

  const activeTicket = tickets.find((t) => t.id === drawerTicketId) ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <PageHeader
        title="Support Tickets"
        subtitle="Manage and resolve farmer hardware, software, and water quality issues"
        actions={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusCircle className="mr-1.5 h-4 w-4" /> Create Ticket
          </Button>
        }
      />

      {/* Summary dashboard */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <SummaryCard
          label="Total Tickets"
          value={counts.total}
          icon={<LifeBuoy className="h-4 w-4 text-slate-500" />}
        />
        <SummaryCard
          label="Open"
          value={counts.open}
          tone="info"
          icon={<HelpCircle className="h-4 w-4 text-sky-500" />}
        />
        <SummaryCard
          label="In Progress"
          value={counts.in_progress}
          tone="primary"
          icon={<Clock className="h-4 w-4 text-primary" />}
        />
        <SummaryCard
          label="Waiting on Farmer"
          value={counts.waiting}
          tone="warning"
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
        />
        <SummaryCard
          label="Resolved / Closed"
          value={counts.resolved}
          tone="success"
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
        />
      </div>

      {/* Filters & Search */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ticket ID, farmer, farm, device..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="waiting_for_farmer">Waiting for Farmer</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>

        <Select value={techFilter} onValueChange={setTechFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Assigned Tech" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Technicians</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {technicians.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.full_name ?? "Unnamed"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(q || statusFilter !== "all" || priorityFilter !== "all" || techFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              setStatusFilter("all");
              setPriorityFilter("all");
              setTechFilter("all");
            }}
            className="text-xs text-muted-foreground hover:underline"
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Ticket tables */}
      {filteredTickets.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy className="h-6 w-6" />}
          title="No support tickets found"
          description="Try modifying search keywords or check active status filters."
        />
      ) : (
        <>
          {/* Desktop view */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-soft md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5">Ticket ID</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Farmer &amp; Farm</th>
                  <th className="px-5 py-3.5">Device</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Technician</th>
                  <th className="px-5 py-3.5">Updated</th>
                  <th className="w-10 px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredTickets.map((t) => (
                  <tr
                    key={t.id}
                    className="cursor-pointer transition hover:bg-surface/50"
                    onClick={() => setDrawerTicketId(t.id)}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-foreground">
                      {t.id}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{t.issue_type}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-foreground">{t.farmer_name}</div>
                      <div className="text-xs text-muted-foreground">{t.farm_name ?? "—"}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                      {t.device_serial ?? "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          PRIORITY_COLORS[t.priority],
                        )}
                      >
                        {PRIORITY_LABELS[t.priority]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          STATUS_COLORS[t.status],
                        )}
                      >
                        {STATUS_LABELS[t.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {t.assigned_name ? (
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <User className="h-3.5 w-3.5 text-primary" />
                          {t.assigned_name}
                        </div>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {new Date(t.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile view */}
          <div className="grid gap-3 md:hidden">
            {filteredTickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setDrawerTicketId(t.id)}
                className="flex flex-col rounded-xl border border-border/80 bg-card p-4 text-left shadow-soft hover:shadow-md transition"
              >
                <div className="flex w-full items-start justify-between">
                  <div className="font-mono text-xs font-semibold text-primary">{t.id}</div>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase",
                      PRIORITY_COLORS[t.priority],
                    )}
                  >
                    {t.priority}
                  </span>
                </div>
                <h4 className="mt-2 text-sm font-semibold text-foreground">{t.issue_type} Issue</h4>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                <div className="mt-3 flex w-full items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
                  <span>{t.farmer_name}</span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[9px] font-semibold",
                      STATUS_COLORS[t.status],
                    )}
                  >
                    {STATUS_LABELS[t.status]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Ticket Details Drawer */}
      <Sheet open={!!drawerTicketId} onOpenChange={(o) => !o && setDrawerTicketId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {activeTicket && (
            <>
              <SheetHeader className="text-left border-b border-border/60 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-primary">
                    {activeTicket.id}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      PRIORITY_COLORS[activeTicket.priority],
                    )}
                  >
                    {activeTicket.priority}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      STATUS_COLORS[activeTicket.status],
                    )}
                  >
                    {STATUS_LABELS[activeTicket.status]}
                  </span>
                </div>
                <SheetTitle className="font-display text-xl mt-2 font-bold text-foreground">
                  {activeTicket.issue_type} Support Request
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                  Opened on {new Date(activeTicket.created_at).toLocaleString()}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-5 space-y-6 text-sm">
                {/* Farmer & Asset Info */}
                <div className="rounded-2xl border border-border/80 bg-surface/50 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Customer & Asset Details
                  </h3>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                    <div>
                      <p className="text-muted-foreground font-medium">Farmer Name</p>
                      <p className="font-semibold text-foreground text-[13px] mt-0.5">
                        {activeTicket.farmer_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium">Phone Number</p>
                      <p className="font-semibold text-foreground text-[13px] mt-0.5 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-primary" />
                        {activeTicket.farmer_phone}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium">Farm / Location</p>
                      <p className="font-semibold text-foreground text-[13px] mt-0.5 flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-primary" />
                        {activeTicket.farm_name ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium">Pond</p>
                      <p className="font-semibold text-foreground text-[13px] mt-0.5 flex items-center gap-1">
                        <Waves className="h-3 w-3 text-primary" />
                        {activeTicket.pond_name ?? "—"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground font-medium">Device Node</p>
                      <p className="font-semibold text-foreground text-[13px] mt-0.5 flex items-center gap-1 font-mono">
                        <Cpu className="h-3 w-3 text-primary" />
                        {activeTicket.device_serial
                          ? `${activeTicket.device_serial} (Connected)`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Description
                  </h3>
                  <p className="rounded-xl border border-border/70 bg-card p-4 text-[13px] leading-relaxed text-foreground shadow-sm">
                    {activeTicket.description}
                  </p>
                </div>

                {/* Attachments */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" /> Photo Attachments
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {activeTicket.photos.map((p, idx) => (
                      <div
                        key={idx}
                        className="relative group overflow-hidden rounded-xl border border-border h-20 w-20 bg-muted"
                      >
                        <img src={p} alt="Attachment" className="h-full w-full object-cover" />
                        <button
                          onClick={() => {
                            const nextPhotos = activeTicket.photos.filter((_, i) => i !== idx);
                            updateTicket(activeTicket.id, { photos: nextPhotos });
                            toast.success("Attachment removed");
                          }}
                          className="absolute right-1 top-1 hidden group-hover:grid place-items-center h-5 w-5 rounded-full bg-rose-600 text-white shadow-soft transition"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 hover:border-primary/50 bg-card/50 hover:bg-primary/5 h-20 w-20 text-muted-foreground hover:text-primary transition"
                    >
                      <Upload className="h-4 w-4 mb-1" />
                      <span className="text-[9px] font-semibold uppercase tracking-wider">
                        Add Photo
                      </span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => handlePhotoUpload(activeTicket.id, e)}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Activity Timeline */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" /> Ticket Activity Timeline
                  </h3>
                  <div className="relative pl-4 border-l border-border/80 ml-2 space-y-4">
                    {activeTicket.timeline.map((act) => {
                      const iconMap = {
                        created: <PlusCircle className="h-3.5 w-3.5 text-emerald-500" />,
                        assignment: <User className="h-3.5 w-3.5 text-violet-500" />,
                        status_change: <Clock className="h-3.5 w-3.5 text-sky-500" />,
                        note: <MessageSquare className="h-3.5 w-3.5 text-slate-500" />,
                        resolution: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
                      };
                      return (
                        <div key={act.id} className="relative">
                          <span className="absolute -left-[25px] top-0.5 grid h-4 w-4 place-items-center rounded-full bg-background border border-border shadow-soft">
                            {iconMap[act.type] ?? <HelpCircle className="h-3.5 w-3.5" />}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground text-xs">
                                {act.author}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(act.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                              {act.body}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Operations & Transitions */}
                <div className="border-t border-border/60 pt-4 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Team Operations
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Assign Technician</Label>
                      <Select
                        value={activeTicket.assigned_to ?? "none"}
                        onValueChange={(v) => handleAssign(activeTicket.id, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Assign technician" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— Unassigned —</SelectItem>
                          {technicians.map((tech) => (
                            <SelectItem key={tech.id} value={tech.id}>
                              {tech.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Change Status</Label>
                      <Select
                        value={activeTicket.status}
                        onValueChange={(v) => {
                          if (v === "resolved" || v === "closed") {
                            setCloseResolutionOpen(true);
                          } else {
                            handleStatusChange(activeTicket.id, v as TicketStatus);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="waiting_for_farmer">Waiting for Farmer</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Add Note */}
                  <div className="space-y-1.5 pt-2">
                    <Label className="text-xs text-muted-foreground">Add Internal Note</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Type notes or update here..."
                        className="text-xs"
                      />
                      <Button
                        onClick={() => handleAddNote(activeTicket.id)}
                        size="sm"
                        className="shrink-0 gap-1.5"
                      >
                        <Send className="h-3 w-3" /> Note
                      </Button>
                    </div>
                  </div>

                  {/* Close ticket button */}
                  {activeTicket.status !== "resolved" && activeTicket.status !== "closed" && (
                    <Button
                      variant="destructive"
                      onClick={() => setCloseResolutionOpen(true)}
                      className="w-full mt-2 text-xs"
                    >
                      Close Ticket with Resolution
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Resolution Dialog */}
      <Dialog open={closeResolutionOpen} onOpenChange={setCloseResolutionOpen}>
        <DialogContent sm-max-w-md>
          <DialogHeader>
            <DialogTitle>Close Ticket &amp; Log Resolution</DialogTitle>
            <DialogDescription>
              Please summarize what was done to resolve this support ticket. This resolution note
              will be logged to the activity timeline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs text-muted-foreground">Resolution Note</Label>
            <Textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Bracket tightened, optical DO probe calibrated, replaced hardware..."
              className="text-xs min-h-[80px]"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseResolutionOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => activeTicket && handleCloseWithResolution(activeTicket.id)}
            >
              Confirm Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Ticket Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Raise Support Ticket</DialogTitle>
            <DialogDescription>
              Submit support requests on behalf of farmers or technicians. Default status will be
              set to Open.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Farmer Raising Request</Label>
                <Select
                  value={newTicketForm.farmer_id}
                  onValueChange={(v) => {
                    const f = profiles.find((p) => p.id === v);
                    setNewTicketForm({
                      ...newTicketForm,
                      farmer_id: v,
                      farmer_name: f?.full_name ?? "Unknown",
                      farmer_phone: f?.phone ?? "—",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select farmer" />
                  </SelectTrigger>
                  <SelectContent>
                    {farmers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name} ({p.district ?? "Unknown"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Issue Type</Label>
                <Select
                  value={newTicketForm.issue_type}
                  onValueChange={(v) => setNewTicketForm({ ...newTicketForm, issue_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hardware">Hardware (Sensor/Buoy)</SelectItem>
                    <SelectItem value="Software">Software (App/SMS/Alerts)</SelectItem>
                    <SelectItem value="Water Quality">Water Quality Triage</SelectItem>
                    <SelectItem value="Billing">Billing &amp; Setup</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Priority</Label>
                <Select
                  value={newTicketForm.priority}
                  onValueChange={(v) =>
                    setNewTicketForm({ ...newTicketForm, priority: v as TicketPriority })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Farm</Label>
                <Select
                  value={newTicketForm.farm_id}
                  onValueChange={(v) => setNewTicketForm({ ...newTicketForm, farm_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Farm" />
                  </SelectTrigger>
                  <SelectContent>
                    {farms.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Pond</Label>
                <Select
                  value={newTicketForm.pond_id}
                  onValueChange={(v) => setNewTicketForm({ ...newTicketForm, pond_id: v })}
                  disabled={!newTicketForm.farm_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Pond" />
                  </SelectTrigger>
                  <SelectContent>
                    {ponds
                      .filter((p) => p.farm_id === newTicketForm.farm_id)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Device</Label>
                <Select
                  value={newTicketForm.device_id}
                  onValueChange={(v) => setNewTicketForm({ ...newTicketForm, device_id: v })}
                  disabled={!newTicketForm.farm_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Device" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None / Unassigned</SelectItem>
                    {devices
                      .filter((d) => d.farm_id === newTicketForm.farm_id)
                      .map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.serial} {d.name ? `(${d.name})` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Issue Description</Label>
              <Textarea
                value={newTicketForm.description}
                onChange={(e) =>
                  setNewTicketForm({ ...newTicketForm, description: e.target.value })
                }
                placeholder="Explain the damage or software issue in detail..."
                className="text-xs min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleCreateTicket}>
              Submit Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Inner presentational components =====
function SummaryCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "info";
}) {
  const accent = {
    default: "text-foreground",
    primary: "text-primary",
    success: "text-emerald-600",
    warning: "text-amber-600",
    info: "text-sky-600",
  }[tone];

  const ring = {
    default: "",
    primary: "ring-1 ring-primary/25",
    success: "ring-1 ring-emerald-500/25",
    warning: "ring-1 ring-amber-500/25",
    info: "ring-1 ring-sky-500/25",
  }[tone];

  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card p-4 shadow-soft", ring)}>
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <p className={cn("mt-2 font-display text-2xl font-bold tabular-nums", accent)}>{value}</p>
    </div>
  );
}
