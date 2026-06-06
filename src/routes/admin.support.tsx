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
import { useAuth } from "@/lib/auth";
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
  type: "created" | "assignment" | "status_change" | "note" | "resolution" | "attachment";
  author: string;
  body: string;
  created_at: string;
};

export type TicketAttachment = {
  id: string;
  url: string;
  storage_key: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
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
  attachments: TicketAttachment[];
  assigned_to: string | null; // Tech profile ID
  assigned_name: string | null;
  status: TicketStatus;
  timeline: TicketActivity[];
  created_at: string;
  updated_at: string;
};

type SupportTicketRow = {
  id: string;
  created_by: string | null;
  assigned_to: string | null;
  farm_id: string | null;
  pond_id: string | null;
  device_id: string | null;
  issue_type: string | null;
  priority: string | null;
  description: string | null;
  photos: unknown;
  status: string;
  created_at: string;
  updated_at: string;
};

type SupportTicketActivityRow = {
  id: string;
  ticket_id: string;
  actor_id: string | null;
  kind: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type SupportTicketAttachmentRow = {
  id: string;
  ticket_id: string;
  uploaded_by: string | null;
  bucket: string;
  storage_key: string;
  url: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

const SUPPORT_ATTACHMENTS_BUCKET = "support-ticket-attachments";
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

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

function isTicketStatus(value: string): value is TicketStatus {
  return ["open", "in_progress", "waiting_for_farmer", "resolved", "closed"].includes(value);
}

function isTicketPriority(value: string): value is TicketPriority {
  return ["low", "medium", "high", "critical"].includes(value);
}

function normalizeTicketStatus(value: string | null | undefined): TicketStatus {
  return value && isTicketStatus(value) ? value : "open";
}

function normalizeTicketPriority(value: string | null | undefined): TicketPriority {
  if (value === "normal") return "medium";
  return value && isTicketPriority(value) ? value : "medium";
}

function normalizePhotos(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeActivityKind(value: string): TicketActivity["type"] {
  return ["created", "assignment", "status_change", "note", "resolution", "attachment"].includes(
    value,
  )
    ? (value as TicketActivity["type"])
    : "note";
}

function dbErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function isMissingSupportTable(error: unknown) {
  const message = dbErrorMessage(error, "").toLowerCase();
  return (
    message.includes("support_ticket_activities") ||
    message.includes("support_ticket_attachments") ||
    (message.includes("relation") && message.includes("does not exist")) ||
    message.includes("schema cache")
  );
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "attachment";
}

function mapTicketActivity(row: SupportTicketActivityRow, profiles: Profile[]): TicketActivity {
  const actor = profiles.find((item) => item.id === row.actor_id) ?? null;
  return {
    id: row.id,
    type: normalizeActivityKind(row.kind),
    author: actor?.full_name ?? "Support",
    body: row.body ?? "Ticket updated.",
    created_at: row.created_at,
  };
}

function mapTicketAttachment(row: SupportTicketAttachmentRow): TicketAttachment {
  return {
    id: row.id,
    url: row.url,
    storage_key: row.storage_key,
    file_name: row.file_name,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    created_at: row.created_at,
  };
}

function mapSupportTicket({
  row,
  profiles,
  farms,
  ponds,
  devices,
  activities,
  attachments,
}: {
  row: SupportTicketRow;
  profiles: Profile[];
  farms: Farm[];
  ponds: Pond[];
  devices: Device[];
  activities: SupportTicketActivityRow[];
  attachments: SupportTicketAttachmentRow[];
}): SupportTicket {
  const farm = farms.find((item) => item.id === row.farm_id) ?? null;
  const pond = ponds.find((item) => item.id === row.pond_id) ?? null;
  const device = devices.find((item) => item.id === row.device_id) ?? null;
  const farmerId = farm?.owner_id ?? row.created_by ?? "";
  const farmer = profiles.find((item) => item.id === farmerId) ?? null;
  const assigned = profiles.find((item) => item.id === row.assigned_to) ?? null;
  const status = normalizeTicketStatus(row.status);
  const ticketActivities = activities
    .filter((item) => item.ticket_id === row.id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const ticketAttachments = attachments
    .filter((item) => item.ticket_id === row.id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const mappedAttachments = ticketAttachments.map(mapTicketAttachment);
  const legacyAttachments = normalizePhotos(row.photos).map((url, index) => ({
    id: `${row.id}-legacy-${index}`,
    url,
    storage_key: null,
    file_name: "Attachment",
    mime_type: null,
    size_bytes: null,
    created_at: row.created_at,
  }));
  const timeline: TicketActivity[] =
    ticketActivities.length > 0
      ? ticketActivities.map((item) => mapTicketActivity(item, profiles))
      : [
          {
            id: `${row.id}-created`,
            type: "created",
            author: farmer?.full_name ?? "Requester",
            body: row.description ?? "Support ticket created.",
            created_at: row.created_at,
          },
        ];

  if (ticketActivities.length === 0 && row.assigned_to) {
    timeline.push({
      id: `${row.id}-assigned`,
      type: "assignment",
      author: "Support",
      body: `Assigned to ${assigned?.full_name ?? "technician"}.`,
      created_at: row.updated_at,
    });
  }
  if (ticketActivities.length === 0 && (status === "resolved" || status === "closed")) {
    timeline.push({
      id: `${row.id}-resolved`,
      type: "resolution",
      author: assigned?.full_name ?? "Support",
      body: status === "resolved" ? "Ticket marked as resolved." : "Ticket closed.",
      created_at: row.updated_at,
    });
  } else if (ticketActivities.length === 0 && status !== "open") {
    timeline.push({
      id: `${row.id}-status`,
      type: "status_change",
      author: assigned?.full_name ?? "Support",
      body: `Status changed to ${STATUS_LABELS[status]}.`,
      created_at: row.updated_at,
    });
  }

  return {
    id: row.id,
    issue_type: row.issue_type ?? "Other",
    farmer_id: farmerId,
    farmer_name: farmer?.full_name ?? "Unknown requester",
    farmer_phone: farmer?.phone ?? "--",
    farm_id: row.farm_id,
    farm_name: farm?.name ?? null,
    pond_id: row.pond_id,
    pond_name: pond?.name ?? null,
    device_id: row.device_id,
    device_serial: device?.serial ?? null,
    priority: normalizeTicketPriority(row.priority),
    description: row.description ?? "",
    photos: Array.from(
      new Set([...mappedAttachments.map((item) => item.url), ...normalizePhotos(row.photos)]),
    ),
    attachments: [...mappedAttachments, ...legacyAttachments],
    assigned_to: row.assigned_to,
    assigned_name: assigned?.full_name ?? null,
    status,
    timeline,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function AdminSupport() {
  const qc = useQueryClient();
  const { user } = useAuth();
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
    farmer_id: "",
    farmer_name: "",
    farmer_phone: "",
    farm_id: "",
    pond_id: "",
    device_id: "none",
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

  const ticketsQ = useQuery({
    queryKey: ["admin-support", "tickets"],
    queryFn: async () => {
      const r = await insforge.database
        .from("support_tickets")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (r.error) throw r.error;
      return (r.data ?? []) as SupportTicketRow[];
    },
  });

  const ticketRows = useMemo(() => ticketsQ.data ?? [], [ticketsQ.data]);
  const ticketIds = useMemo(() => ticketRows.map((ticket) => ticket.id), [ticketRows]);

  const activitiesQ = useQuery({
    queryKey: ["admin-support", "activities", ticketIds],
    queryFn: async () => {
      if (ticketIds.length === 0) return [] as SupportTicketActivityRow[];

      const r = await insforge.database
        .from("support_ticket_activities")
        .select("*")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (r.error) {
        if (isMissingSupportTable(r.error)) return [] as SupportTicketActivityRow[];
        throw r.error;
      }
      return (r.data ?? []) as SupportTicketActivityRow[];
    },
  });

  const attachmentsQ = useQuery({
    queryKey: ["admin-support", "attachments", ticketIds],
    queryFn: async () => {
      if (ticketIds.length === 0) return [] as SupportTicketAttachmentRow[];

      const r = await insforge.database
        .from("support_ticket_attachments")
        .select("*")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (r.error) {
        if (isMissingSupportTable(r.error)) return [] as SupportTicketAttachmentRow[];
        throw r.error;
      }
      return (r.data ?? []) as SupportTicketAttachmentRow[];
    },
  });

  const farms = useMemo(() => farmsQ.data ?? [], [farmsQ.data]);
  const ponds = useMemo(() => pondsQ.data ?? [], [pondsQ.data]);
  const devices = useMemo(() => devicesQ.data ?? [], [devicesQ.data]);
  const profiles = useMemo(() => profilesQ.data ?? [], [profilesQ.data]);
  const roles = useMemo(() => rolesQ.data ?? [], [rolesQ.data]);
  const activityRows = useMemo(() => activitiesQ.data ?? [], [activitiesQ.data]);
  const attachmentRows = useMemo(() => attachmentsQ.data ?? [], [attachmentsQ.data]);

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

  const tickets = useMemo(
    () =>
      ticketRows.map((row) =>
        mapSupportTicket({
          row,
          profiles,
          farms,
          ponds,
          devices,
          activities: activityRows,
          attachments: attachmentRows,
        }),
      ),
    [activityRows, attachmentRows, devices, farms, ponds, profiles, ticketRows],
  );

  // Auto-fill values in new ticket form
  useEffect(() => {
    if (farms.length > 0 && !newTicketForm.farm_id) {
      setNewTicketForm((f) => ({ ...f, farm_id: farms[0].id }));
    }
  }, [farms, newTicketForm.farm_id]);

  useEffect(() => {
    if (farmers.length > 0 && !newTicketForm.farmer_id) {
      const farmer = farmers[0];
      setNewTicketForm((f) => ({
        ...f,
        farmer_id: farmer.id,
        farmer_name: farmer.full_name ?? "",
        farmer_phone: farmer.phone ?? "",
      }));
    }
  }, [farmers, newTicketForm.farmer_id]);

  useEffect(() => {
    if (newTicketForm.farm_id) {
      const farmPonds = ponds.filter((p) => p.farm_id === newTicketForm.farm_id);
      const farmDevices = devices.filter((d) => d.farm_id === newTicketForm.farm_id);
      setNewTicketForm((f) => ({
        ...f,
        pond_id: farmPonds[0]?.id ?? "",
        device_id: farmDevices[0]?.id ?? "none",
      }));
    }
  }, [newTicketForm.farm_id, ponds, devices]);

  const recordTicketActivity = async ({
    ticketId,
    kind,
    body,
    metadata = {},
  }: {
    ticketId: string;
    kind: TicketActivity["type"];
    body: string;
    metadata?: Record<string, unknown>;
  }) => {
    if (!user?.id) throw new Error("Please sign in again before updating this ticket.");
    const result = await insforge.database.from("support_ticket_activities").insert([
      {
        ticket_id: ticketId,
        actor_id: user.id,
        kind,
        body,
        metadata,
      },
    ]);
    if (result.error) {
      if (isMissingSupportTable(result.error)) {
        throw new Error("Support ticket activity storage has not been deployed yet.");
      }
      throw new Error(dbErrorMessage(result.error, "Could not save ticket activity"));
    }
  };

  const tryRecordTicketActivity = async (
    args: Parameters<typeof recordTicketActivity>[0],
  ): Promise<string | null> => {
    try {
      await recordTicketActivity(args);
      return null;
    } catch (error) {
      return dbErrorMessage(error, "Ticket updated, but the timeline entry was not saved.");
    }
  };

  const refreshSupportTickets = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin-support", "tickets"] }),
      qc.invalidateQueries({ queryKey: ["admin-support", "activities"] }),
      qc.invalidateQueries({ queryKey: ["admin-support", "attachments"] }),
    ]);
  };

  const updateTicketMutation = useMutation({
    mutationFn: async ({
      ticketId,
      patch,
      activity,
      successMessage,
    }: {
      ticketId: string;
      patch: Partial<SupportTicket>;
      activity?: {
        kind: TicketActivity["type"];
        body: string;
        metadata?: Record<string, unknown>;
      };
      successMessage?: string;
    }) => {
      const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if ("assigned_to" in patch) dbPatch.assigned_to = patch.assigned_to ?? null;
      if ("status" in patch && patch.status) dbPatch.status = patch.status;
      if ("priority" in patch && patch.priority) dbPatch.priority = patch.priority;
      if ("description" in patch && patch.description != null)
        dbPatch.description = patch.description;

      const result = await insforge.database
        .from("support_tickets")
        .update(dbPatch)
        .eq("id", ticketId);
      if (result.error) throw result.error;
      if (activity) {
        const activityWarning = await tryRecordTicketActivity({ ticketId, ...activity });
        return { activityWarning };
      }
      return { activityWarning: null };
    },
    onSuccess: async (data, variables) => {
      if (variables.successMessage) toast.success(variables.successMessage);
      if (data.activityWarning) toast.warning(data.activityWarning);
      await refreshSupportTickets();
    },
    onError: (error) => toast.error(dbErrorMessage(error, "Could not update ticket")),
  });

  const createTicketMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Please sign in again before creating a ticket.");
      const { farm_id, pond_id, device_id, issue_type, priority, description } = newTicketForm;
      if (!description.trim()) throw new Error("Please enter an issue description");

      const selectedDeviceId = device_id === "none" ? null : device_id || null;
      const requesterId = newTicketForm.farmer_id || user.id;
      const selectedFarm = farm_id ? farms.find((farm) => farm.id === farm_id) : null;
      const selectedPond = pond_id ? ponds.find((pond) => pond.id === pond_id) : null;
      const selectedDevice = selectedDeviceId
        ? devices.find((device) => device.id === selectedDeviceId)
        : null;

      if (selectedFarm && requesterId !== user.id && selectedFarm.owner_id !== requesterId) {
        throw new Error("Selected farm does not belong to the selected requester.");
      }
      if (selectedPond && selectedFarm && selectedPond.farm_id !== selectedFarm.id) {
        throw new Error("Selected pond does not belong to the selected farm.");
      }
      if (selectedDevice?.farm_id && selectedFarm && selectedDevice.farm_id !== selectedFarm.id) {
        throw new Error("Selected device does not belong to the selected farm.");
      }
      if (selectedDevice?.pond_id && selectedPond && selectedDevice.pond_id !== selectedPond.id) {
        throw new Error("Selected device does not belong to the selected pond.");
      }

      const result = await insforge.database
        .from("support_tickets")
        .insert([
          {
            created_by: requesterId,
            farm_id: farm_id || null,
            pond_id: pond_id || null,
            device_id: selectedDeviceId,
            issue_type,
            priority,
            description: description.trim(),
            photos: [],
            status: "open",
          },
        ])
        .select();
      if (result.error) throw result.error;
      const ticket = ((result.data ?? []) as SupportTicketRow[])[0];
      let activityWarning: string | null = null;
      if (ticket?.id) {
        activityWarning = await tryRecordTicketActivity({
          ticketId: ticket.id,
          kind: "created",
          body: description.trim(),
        });
      }
      return { activityWarning };
    },
    onSuccess: async (data) => {
      toast.success("Support ticket created");
      if (data.activityWarning) toast.warning(data.activityWarning);
      setCreateDialogOpen(false);
      setNewTicketForm({
        issue_type: "Hardware",
        farmer_id: farmers[0]?.id ?? "",
        farmer_name: farmers[0]?.full_name ?? "",
        farmer_phone: farmers[0]?.phone ?? "",
        farm_id: farms[0]?.id ?? "",
        pond_id: "",
        device_id: "none",
        priority: "medium",
        description: "",
      });
      await refreshSupportTickets();
    },
    onError: (error) => toast.error(dbErrorMessage(error, "Could not create ticket")),
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ ticketId, body }: { ticketId: string; body: string }) => {
      await recordTicketActivity({ ticketId, kind: "note", body });
    },
    onSuccess: async () => {
      toast.success("Note saved");
      setNewNote("");
      await refreshSupportTickets();
    },
    onError: (error) => toast.error(dbErrorMessage(error, "Could not save note")),
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ ticketId, file }: { ticketId: string; file: File }) => {
      if (!user?.id) throw new Error("Please sign in again before uploading an attachment.");
      if (file.size > MAX_ATTACHMENT_BYTES) {
        throw new Error("Attachment must be 10MB or smaller.");
      }

      const key = `${ticketId}/${Date.now()}-${safeFileName(file.name)}`;
      const upload = await insforge.storage.from(SUPPORT_ATTACHMENTS_BUCKET).upload(key, file);
      if (upload.error || !upload.data) {
        throw new Error(dbErrorMessage(upload.error, "Attachment upload failed"));
      }

      const inserted = await insforge.database
        .from("support_ticket_attachments")
        .insert([
          {
            ticket_id: ticketId,
            uploaded_by: user.id,
            bucket: SUPPORT_ATTACHMENTS_BUCKET,
            storage_key: upload.data.key,
            url: upload.data.url,
            file_name: file.name,
            mime_type: file.type || upload.data.mimeType || null,
            size_bytes: file.size,
          },
        ])
        .select();

      if (inserted.error) {
        const cleanup = await insforge.storage
          .from(SUPPORT_ATTACHMENTS_BUCKET)
          .remove(upload.data.key);
        if (cleanup.error) {
          throw new Error(
            `Attachment record failed and uploaded file cleanup also failed: ${dbErrorMessage(
              cleanup.error,
              "cleanup failed",
            )}`,
          );
        }
        if (isMissingSupportTable(inserted.error)) {
          throw new Error("Support ticket attachment storage has not been deployed yet.");
        }
        throw new Error(dbErrorMessage(inserted.error, "Could not save attachment record"));
      }

      const attachment = ((inserted.data ?? []) as SupportTicketAttachmentRow[])[0];
      const activityWarning = await tryRecordTicketActivity({
        ticketId,
        kind: "attachment",
        body: `Attached ${file.name}`,
        metadata: {
          attachment_id: attachment?.id ?? null,
          file_name: file.name,
          storage_key: upload.data.key,
          url: upload.data.url,
        },
      });
      return { activityWarning };
    },
    onSuccess: async (data) => {
      toast.success("Attachment uploaded");
      if (data.activityWarning) toast.warning(data.activityWarning);
      await refreshSupportTickets();
    },
    onError: (error) => toast.error(dbErrorMessage(error, "Could not upload attachment")),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async ({
      ticketId,
      attachment,
    }: {
      ticketId: string;
      attachment: TicketAttachment;
    }) => {
      if (attachment.storage_key) {
        const removed = await insforge.storage
          .from(SUPPORT_ATTACHMENTS_BUCKET)
          .remove(attachment.storage_key);
        if (removed.error) {
          throw new Error(dbErrorMessage(removed.error, "Could not remove attachment file"));
        }
      }

      const result = await insforge.database
        .from("support_ticket_attachments")
        .delete()
        .eq("id", attachment.id);
      if (result.error) throw result.error;
      const activityWarning = await tryRecordTicketActivity({
        ticketId,
        kind: "attachment",
        body: `Removed ${attachment.file_name ?? "attachment"}`,
        metadata: { attachment_id: attachment.id, storage_key: attachment.storage_key },
      });
      return { activityWarning };
    },
    onSuccess: async (data) => {
      toast.success("Attachment removed");
      if (data.activityWarning) toast.warning(data.activityWarning);
      await refreshSupportTickets();
    },
    onError: (error) => toast.error(dbErrorMessage(error, "Could not remove attachment")),
  });

  const updateTicket = (
    ticketId: string,
    patch: Partial<SupportTicket>,
    activity?: { kind: TicketActivity["type"]; body: string; metadata?: Record<string, unknown> },
    successMessage?: string,
  ) => {
    updateTicketMutation.mutate({ ticketId, patch, activity, successMessage });
  };

  // Actions
  const handleAssign = (ticketId: string, techId: string) => {
    if (techId === "none") {
      updateTicket(
        ticketId,
        { assigned_to: null, assigned_name: null },
        { kind: "assignment", body: "Ticket unassigned." },
        "Ticket unassigned",
      );
      return;
    }

    const tech = technicians.find((t) => t.id === techId);
    if (!tech) return;

    updateTicket(
      ticketId,
      { assigned_to: techId, assigned_name: tech.full_name },
      { kind: "assignment", body: `Assigned to ${tech.full_name ?? "technician"}.` },
      `Ticket assigned to ${tech.full_name ?? "technician"}`,
    );
  };

  const handleStatusChange = (ticketId: string, status: TicketStatus) => {
    updateTicket(
      ticketId,
      { status },
      { kind: "status_change", body: `Status changed to ${STATUS_LABELS[status]}.` },
      `Status updated to ${STATUS_LABELS[status]}`,
    );
  };

  const handleAddNote = (ticketId: string) => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate({ ticketId, body: newNote.trim() });
  };

  const handleCloseWithResolution = (ticketId: string) => {
    if (!resolutionNote.trim()) {
      toast.error("Please provide a resolution note");
      return;
    }

    updateTicket(
      ticketId,
      { status: "resolved" },
      { kind: "resolution", body: `Ticket resolved. ${resolutionNote.trim()}` },
      "Ticket marked resolved",
    );
    setResolutionNote("");
    setCloseResolutionOpen(false);
  };

  const handlePhotoUpload = (ticketId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadAttachmentMutation.mutate({ ticketId, file });
  };

  const handleCreateTicket = () => {
    const { farmer_id, farm_id, pond_id, device_id, issue_type, priority, description } =
      newTicketForm;
    if (!description.trim()) {
      toast.error("Please enter an issue description");
      return;
    }

    void farmer_id;
    void farm_id;
    void pond_id;
    void device_id;
    void issue_type;
    void priority;
    createTicketMutation.mutate();
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
                    {activeTicket.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="relative group overflow-hidden rounded-xl border border-border h-20 w-20 bg-muted"
                      >
                        <img
                          src={attachment.url}
                          alt={attachment.file_name ?? "Attachment"}
                          className="h-full w-full object-cover"
                        />
                        {attachment.storage_key && (
                          <button
                            onClick={() =>
                              deleteAttachmentMutation.mutate({
                                ticketId: activeTicket.id,
                                attachment,
                              })
                            }
                            className="absolute right-1 top-1 hidden group-hover:grid place-items-center h-5 w-5 rounded-full bg-rose-600 text-white shadow-soft transition"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadAttachmentMutation.isPending}
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
                        attachment: <ImageIcon className="h-3.5 w-3.5 text-cyan-600" />,
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
                    <Label className="text-xs text-muted-foreground">Add Ticket Note</Label>
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
        <DialogContent className="sm:max-w-md">
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
                  value={newTicketForm.device_id || "none"}
                  onValueChange={(v) => setNewTicketForm({ ...newTicketForm, device_id: v })}
                  disabled={!newTicketForm.farm_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Device" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None / Unassigned</SelectItem>
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
