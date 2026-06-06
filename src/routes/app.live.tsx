import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Radio,
  Droplets,
  FlaskConical,
  Thermometer,
  CloudFog,
  Waves,
  Beaker,
  Battery,
  Signal,
  Clock,
  ArrowRight,
  AlertCircle,
  Pause,
  Play,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { readFarmSelection, writeFarmSelection } from "@/lib/farm-selection";
import {
  insforge,
  type Device,
  type DeviceStatus,
  type Farm,
  type Pond,
  type PondStatus,
  type Reading,
} from "@/lib/insforge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/live")({
  head: () => ({ meta: [{ title: "Live View — Acqua Lence" }] }),
  component: LivePage,
});

const REFRESH_MS = 8_000;

type ParamKey = "all" | "do" | "ph" | "temp" | "turbidity" | "salinity" | "ammonia";
type SortKey = "risk" | "name" | "freshness";

const statusTone: Record<
  string,
  { pill: string; dot: string; cardBorder: string; cardBg: string }
> = {
  good: {
    pill: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    dot: "bg-emerald-500",
    cardBorder: "border-border/60",
    cardBg: "bg-card",
  },
  watch: {
    pill: "bg-sky-500/10 text-sky-700 border-sky-500/30",
    dot: "bg-sky-500",
    cardBorder: "border-sky-500/30",
    cardBg: "bg-card",
  },
  warning: {
    pill: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    dot: "bg-amber-500",
    cardBorder: "border-amber-500/40",
    cardBg: "bg-amber-500/[0.03]",
  },
  critical: {
    pill: "bg-rose-500/10 text-rose-700 border-rose-500/30",
    dot: "bg-rose-500",
    cardBorder: "border-rose-500/50",
    cardBg: "bg-rose-500/[0.05]",
  },
  offline: {
    pill: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground/50",
    cardBorder: "border-border",
    cardBg: "bg-muted/30",
  },
  calibration_due: {
    pill: "bg-violet-500/10 text-violet-700 border-violet-500/30",
    dot: "bg-violet-500",
    cardBorder: "border-violet-500/30",
    cardBg: "bg-card",
  },
};

const riskRank: Record<string, number> = {
  critical: 0,
  warning: 1,
  offline: 2,
  calibration_due: 3,
  watch: 4,
  good: 5,
};

function staleness(ts: string, isBn: boolean) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return { label: isBn ? "এইমাত্র" : "just now", stale: false, mins };
  if (mins < 60)
    return { label: isBn ? `${mins} মিনিট আগে` : `${mins}m ago`, stale: mins > 15, mins };
  const hrs = Math.floor(mins / 60);
  return { label: isBn ? `${hrs} ঘন্টা আগে` : `${hrs}h ago`, stale: true, mins };
}

type LivePond = {
  id: string;
  name: string;
  species: string;
  status: PondStatus;
  do_mg_l: number | null;
  ph: number | null;
  temp_c: number | null;
  turbidity_ntu: number | null;
  salinity_ppt: number | null;
  ammonia_mg_l: number | null;
  battery_pct: number;
  signal_pct: number;
  farm_id: string;
  last_updated: string;
  device_status: DeviceStatus;
};

const EMPTY_FARMS: Pick<Farm, "id" | "name">[] = [];
const EMPTY_LIVE_PONDS: LivePond[] = [];

function dbErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function assertDbOk(result: { error?: unknown }, fallback: string) {
  if (result.error) throw new Error(dbErrorMessage(result.error, fallback));
}

function newestDevice(devices: Device[], pondId: string) {
  return devices
    .filter((d) => d.pond_id === pondId)
    .sort((a, b) => {
      const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
      const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
      return bTime - aTime;
    })[0];
}

function latestReadingByPond(readings: Reading[]) {
  const byPond = new Map<string, Reading>();
  readings.forEach((reading) => {
    const previous = byPond.get(reading.pond_id);
    if (!previous || new Date(reading.recorded_at) > new Date(previous.recorded_at)) {
      byPond.set(reading.pond_id, reading);
    }
  });
  return byPond;
}

function deriveStatus(
  pond: Pond,
  device: Device | undefined,
  reading: Reading | undefined,
): PondStatus {
  const latestAt = reading?.recorded_at ?? device?.last_seen ?? null;
  const staleMinutes = latestAt ? (Date.now() - new Date(latestAt).getTime()) / 60_000 : Infinity;

  if (device?.status === "offline" || staleMinutes > 60) return "offline";
  if (device?.status === "calibration_due") return "calibration_due";
  if (!reading) return pond.status;
  if (reading.do_mg_l != null && reading.do_mg_l < 3) return "critical";
  if (
    (reading.do_mg_l != null && reading.do_mg_l < 4) ||
    (reading.ph != null && (reading.ph < 6.5 || reading.ph > 8.5)) ||
    (reading.ammonia_mg_l != null && reading.ammonia_mg_l > 0.3) ||
    (reading.turbidity_ntu != null && reading.turbidity_ntu > 50)
  ) {
    return "warning";
  }
  return pond.status === "watch" ? "watch" : "good";
}

function toLivePonds(ponds: Pond[], devices: Device[], readings: Reading[]): LivePond[] {
  const readingsByPond = latestReadingByPond(readings);
  return ponds.map((pond) => {
    const device = newestDevice(devices, pond.id);
    const reading = readingsByPond.get(pond.id);
    return {
      id: pond.id,
      name: pond.name,
      species: pond.species ?? pond.pond_type ?? "Pond",
      status: deriveStatus(pond, device, reading),
      do_mg_l: reading?.do_mg_l ?? null,
      ph: reading?.ph ?? null,
      temp_c: reading?.temp_c ?? null,
      turbidity_ntu: reading?.turbidity_ntu ?? null,
      salinity_ppt: reading?.salinity_ppt ?? null,
      ammonia_mg_l: reading?.ammonia_mg_l ?? null,
      battery_pct: reading?.battery_pct ?? device?.battery_pct ?? 0,
      signal_pct: reading?.signal_pct ?? device?.signal_pct ?? 0,
      farm_id: pond.farm_id,
      last_updated: reading?.recorded_at ?? device?.last_seen ?? new Date(0).toISOString(),
      device_status: device?.status ?? "offline",
    };
  });
}

function LivePage() {
  const { lang } = useI18n();
  const isBn = lang === "bn";

  const [farmId, setFarmId] = useState<string>(() => {
    return readFarmSelection();
  });
  const [pondFilter, setPondFilter] = useState<string>("all"); // pond id or "all"
  const [paramFilter, setParamFilter] = useState<ParamKey>("all");
  const [sort, setSort] = useState<SortKey>("risk");
  const [q, setQ] = useState("");
  const [auto, setAuto] = useState(true);
  const [lastTick, setLastTick] = useState<Date>(new Date());
  const [pulse, setPulse] = useState(false);

  const liveQ = useQuery({
    queryKey: ["app-live-monitoring", farmId],
    refetchInterval: auto ? REFRESH_MS : false,
    queryFn: async () => {
      const [farmsRes, pondsRes, devicesRes, readingsRes] = await Promise.all([
        insforge.database.from("farms").select("id,name").order("name"),
        insforge.database.from("ponds").select("*").order("name"),
        insforge.database.from("devices").select("*"),
        insforge.database.rpc("get_recent_visible_readings", {
          _farm_id: farmId === "all" ? null : farmId,
          _lookback_hours: 24,
          _per_pond_limit: 1,
        }),
      ]);

      assertDbOk(farmsRes, "Failed to load farms");
      assertDbOk(pondsRes, "Failed to load ponds");
      assertDbOk(devicesRes, "Failed to load devices");
      assertDbOk(readingsRes, "Failed to load readings");

      const farms = (farmsRes.data ?? []) as Pick<Farm, "id" | "name">[];
      const ponds = (pondsRes.data ?? []) as Pond[];
      const devices = (devicesRes.data ?? []) as Device[];
      const readings = (readingsRes.data ?? []) as Reading[];
      const visiblePonds =
        farmId === "all" ? ponds : ponds.filter((pond) => pond.farm_id === farmId);

      return {
        farms,
        ponds: toLivePonds(visiblePonds, devices, readings),
        fetchedAt: new Date().toISOString(),
      };
    },
  });

  const farms = liveQ.data?.farms ?? EMPTY_FARMS;
  const ponds = liveQ.data?.ponds ?? EMPTY_LIVE_PONDS;

  useEffect(() => {
    if (!liveQ.data?.fetchedAt) return;
    setLastTick(new Date(liveQ.data.fetchedAt));
    setPulse(true);
    const timeout = window.setTimeout(() => setPulse(false), 800);
    return () => window.clearTimeout(timeout);
  }, [liveQ.data?.fetchedAt]);

  useEffect(() => {
    if (farmId === "all" || farms.length === 0) return;
    if (farms.some((farm) => farm.id === farmId)) return;
    setFarmId(writeFarmSelection("all"));
  }, [farmId, farms]);

  function refreshNow() {
    liveQ.refetch().then((result) => {
      if (result.error) {
        toast.error(isBn ? "লাইভ ডেটা লোড হয়নি" : "Live data failed to load", {
          description: dbErrorMessage(result.error, "Please try again."),
        });
        return;
      }
      toast.success(isBn ? "ডেটা আপডেট হয়েছে" : "Live data updated", {
        description: isBn ? "সর্বশেষ পরিমাপ লোড করা হয়েছে।" : "Latest readings loaded.",
      });
    });
  }

  function selectFarm(id: string) {
    setFarmId(writeFarmSelection(id));
  }

  const visiblePonds = useMemo(() => {
    let list = ponds.slice();
    if (farmId !== "all") list = list.filter((p) => p.farm_id === farmId);
    if (pondFilter !== "all") list = list.filter((p) => p.id === pondFilter);
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
    if (paramFilter !== "all") {
      list = list.filter((p) => {
        if (paramFilter === "salinity") return p.salinity_ppt != null;
        if (paramFilter === "ammonia") return p.ammonia_mg_l != null;
        return true;
      });
    }
    if (sort === "risk") {
      list.sort((a, b) => (riskRank[a.status] ?? 9) - (riskRank[b.status] ?? 9));
    } else if (sort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort((a, b) => +new Date(b.last_updated) - +new Date(a.last_updated));
    }
    return list;
  }, [ponds, farmId, pondFilter, q, paramFilter, sort]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {isBn ? "লাইভ মনিটরিং" : "Live Monitoring"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isBn
              ? "সকল পুকুরের রিয়েল-টাইম জলগুণ পরিমাপ।"
              : "Real-time water quality across all ponds."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <FreshnessIndicator lastTick={lastTick} pulse={pulse} auto={auto} isBn={isBn} />
          <Button
            variant={auto ? "default" : "outline"}
            size="sm"
            onClick={() => setAuto((v) => !v)}
          >
            {auto ? <Pause className="mr-1.5 h-4 w-4" /> : <Play className="mr-1.5 h-4 w-4" />}
            {auto ? (isBn ? "অটো চালু" : "Auto on") : isBn ? "অটো বন্ধ" : "Auto off"}
          </Button>
          <Button variant="outline" size="sm" onClick={refreshNow} disabled={liveQ.isFetching}>
            <RefreshCw className={cn("mr-1.5 h-4 w-4", liveQ.isFetching && "animate-spin")} />
            {isBn ? "রিফ্রেশ" : "Refresh"}
          </Button>
        </div>
      </div>

      {liveQ.error && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">
            {isBn ? "লাইভ ডেটা লোড হয়নি" : "Live data could not be loaded"}
          </p>
          <p className="mt-1 text-xs">
            {dbErrorMessage(liveQ.error, isBn ? "আবার চেষ্টা করুন।" : "Please try again.")}
          </p>
        </div>
      )}

      {/* Controls bar */}
      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <ControlGroup label={isBn ? "খামার" : "Farm"}>
            <Select value={farmId} onValueChange={selectFarm}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isBn ? "সব খামার" : "All farms"}</SelectItem>
                {farms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ControlGroup>

          <ControlGroup label={isBn ? "পুকুর" : "Pond"}>
            <Select value={pondFilter} onValueChange={setPondFilter}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isBn ? "সব পুকুর" : "All ponds"}</SelectItem>
                {ponds
                  .filter((p) => farmId === "all" || p.farm_id === farmId)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </ControlGroup>

          <ControlGroup label={isBn ? "প্যারামিটার" : "Parameter"}>
            <Select value={paramFilter} onValueChange={(v) => setParamFilter(v as ParamKey)}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isBn ? "সব" : "All"}</SelectItem>
                <SelectItem value="do">DO</SelectItem>
                <SelectItem value="ph">pH</SelectItem>
                <SelectItem value="temp">{isBn ? "তাপমাত্রা" : "Temperature"}</SelectItem>
                <SelectItem value="turbidity">{isBn ? "ঘোলাটে" : "Turbidity"}</SelectItem>
                <SelectItem value="salinity">{isBn ? "লবণাক্ততা" : "Salinity"}</SelectItem>
                <SelectItem value="ammonia">{isBn ? "অ্যামোনিয়া" : "Ammonia"}</SelectItem>
              </SelectContent>
            </Select>
          </ControlGroup>

          <ControlGroup
            label={
              <>
                <ArrowUpDown className="mr-1 inline h-3 w-3" />
                {isBn ? "সর্ট" : "Sort"}
              </>
            }
          >
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="risk">{isBn ? "ঝুঁকি অনুসারে" : "By risk"}</SelectItem>
                <SelectItem value="freshness">{isBn ? "সর্বশেষ আপডেট" : "Most recent"}</SelectItem>
                <SelectItem value="name">{isBn ? "নাম অনুসারে" : "By name"}</SelectItem>
              </SelectContent>
            </Select>
          </ControlGroup>

          <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={isBn ? "পুকুর খুঁজুন…" : "Search ponds…"}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
        </div>
      </div>

      {/* Risk summary chips */}
      <RiskSummary ponds={visiblePonds} isBn={isBn} />

      {/* Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visiblePonds.map((p) => (
          <LiveCard key={p.id} pond={p} paramFilter={paramFilter} isBn={isBn} pulse={pulse} />
        ))}
        {visiblePonds.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Filter className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">
              {liveQ.isLoading
                ? isBn
                  ? "লাইভ ডেটা লোড হচ্ছে"
                  : "Loading live readings"
                : isBn
                  ? "কোনো পুকুর মিলেনি"
                  : "No ponds match the current filters"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {liveQ.isLoading
                ? isBn
                  ? "সর্বশেষ পরিমাপ আনা হচ্ছে।"
                  : "Fetching the latest pond measurements."
                : isBn
                  ? "ফিল্টার পরিবর্তন করে দেখুন।"
                  : "Try adjusting the filters above."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── components ───────── */

function FreshnessIndicator({
  lastTick,
  pulse,
  auto,
  isBn,
}: {
  lastTick: Date;
  pulse: boolean;
  auto: boolean;
  isBn: boolean;
}) {
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.floor((Date.now() - lastTick.getTime()) / 1000);
  const stale = secs > REFRESH_MS / 1000 + 5;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
        stale
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
      )}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-70",
            auto && !stale ? "bg-emerald-500 animate-ping" : "bg-current opacity-0",
          )}
        />
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            stale ? "bg-amber-500" : "bg-emerald-500",
            pulse && "scale-125 transition-transform",
          )}
        />
      </span>
      <span className="font-medium tabular-nums">
        {stale ? (isBn ? "পুরাতন" : "stale") : isBn ? `${secs}s আগে` : `${secs}s ago`}
      </span>
    </div>
  );
}

function ControlGroup({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function RiskSummary({ ponds, isBn }: { ponds: LivePond[]; isBn: boolean }) {
  const counts = {
    critical: ponds.filter((p) => p.status === "critical").length,
    warning: ponds.filter((p) => p.status === "warning").length,
    offline: ponds.filter((p) => p.status === "offline").length,
    good: ponds.filter((p) => p.status === "good" || p.status === "watch").length,
  };
  const items = [
    {
      key: "critical",
      label: isBn ? "জরুরি" : "Critical",
      count: counts.critical,
      tone: "bg-rose-500/10 text-rose-700 border-rose-500/30",
      icon: <AlertCircle className="h-3.5 w-3.5" />,
    },
    {
      key: "warning",
      label: isBn ? "সতর্কতা" : "Warning",
      count: counts.warning,
      tone: "bg-amber-500/10 text-amber-700 border-amber-500/30",
      icon: <Waves className="h-3.5 w-3.5" />,
    },
    {
      key: "offline",
      label: isBn ? "অফলাইন" : "Offline",
      count: counts.offline,
      tone: "bg-muted text-muted-foreground border-border",
      icon: <Radio className="h-3.5 w-3.5" />,
    },
    {
      key: "good",
      label: isBn ? "ভালো" : "Good",
      count: counts.good,
      tone: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
      icon: <Droplets className="h-3.5 w-3.5" />,
    },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((i) => (
        <span
          key={i.key}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
            i.tone,
          )}
        >
          {i.icon}
          {i.label}
          <span className="ml-1 rounded-full bg-background/60 px-1.5 tabular-nums">{i.count}</span>
        </span>
      ))}
    </div>
  );
}

function LiveCard({
  pond,
  paramFilter,
  isBn,
  pulse,
}: {
  pond: LivePond;
  paramFilter: ParamKey;
  isBn: boolean;
  pulse: boolean;
}) {
  const tone = statusTone[pond.status] ?? statusTone.offline;
  const s = staleness(pond.last_updated, isBn);
  const isCritical = pond.status === "critical";
  const isOffline = pond.status === "offline";

  function showParam(k: ParamKey) {
    return paramFilter === "all" || paramFilter === k;
  }

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border p-4 shadow-soft transition-all",
        tone.cardBorder,
        tone.cardBg,
        isCritical && "ring-2 ring-rose-500/30",
        isOffline && "opacity-80",
      )}
    >
      {isCritical && (
        <span
          className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-rose-500/20 blur-2xl"
          aria-hidden
        />
      )}
      {pulse && !isOffline && (
        <span
          className="absolute right-3 top-3 h-1.5 w-1.5 animate-ping rounded-full bg-sky-500"
          aria-hidden
        />
      )}

      {/* Header */}
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-base font-bold text-foreground">{pond.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{pond.species}</p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            tone.pill,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
          {isBn
            ? {
                good: "ভালো",
                watch: "নজরে",
                warning: "সতর্কতা",
                critical: "জরুরি",
                offline: "অফলাইন",
                calibration_due: "ক্যালি.",
              }[pond.status]
            : pond.status === "calibration_due"
              ? "Calib."
              : pond.status}
        </span>
      </div>

      {/* Primary readings */}
      <div className="relative mt-3 grid grid-cols-2 gap-2">
        {showParam("do") && (
          <BigReading
            icon={<Droplets className="h-3.5 w-3.5" />}
            label="DO"
            unit="mg/L"
            value={pond.do_mg_l}
            digits={2}
            crit={pond.do_mg_l != null && pond.do_mg_l < 3}
            warn={pond.do_mg_l != null && pond.do_mg_l < 4}
            stale={isOffline}
          />
        )}
        {showParam("ph") && (
          <BigReading
            icon={<FlaskConical className="h-3.5 w-3.5" />}
            label="pH"
            unit=""
            value={pond.ph}
            digits={2}
            crit={pond.ph != null && (pond.ph < 6 || pond.ph > 9)}
            warn={pond.ph != null && (pond.ph < 6.5 || pond.ph > 8.2)}
            stale={isOffline}
          />
        )}
        {showParam("temp") && (
          <BigReading
            icon={<Thermometer className="h-3.5 w-3.5" />}
            label={isBn ? "তাপমাত্রা" : "Temp"}
            unit="°C"
            value={pond.temp_c}
            digits={1}
            crit={pond.temp_c != null && pond.temp_c > 32}
            warn={pond.temp_c != null && pond.temp_c > 30}
            stale={isOffline}
          />
        )}
        {showParam("turbidity") && (
          <BigReading
            icon={<CloudFog className="h-3.5 w-3.5" />}
            label={isBn ? "ঘোলাটে" : "Turb."}
            unit="NTU"
            value={pond.turbidity_ntu}
            digits={1}
            warn={pond.turbidity_ntu != null && pond.turbidity_ntu > 30}
            crit={pond.turbidity_ntu != null && pond.turbidity_ntu > 50}
            stale={isOffline}
          />
        )}
      </div>

      {/* Secondary readings */}
      {(pond.salinity_ppt != null || pond.ammonia_mg_l != null) && (
        <div className="relative mt-2 grid grid-cols-2 gap-2">
          {pond.salinity_ppt != null && showParam("salinity") && (
            <SecondaryReading
              icon={<Waves className="h-3 w-3" />}
              label={isBn ? "লবণাক্ততা" : "Salinity"}
              value={`${pond.salinity_ppt.toFixed(1)} ppt`}
            />
          )}
          {pond.ammonia_mg_l != null && showParam("ammonia") && (
            <SecondaryReading
              icon={<Beaker className="h-3 w-3" />}
              label={isBn ? "অ্যামোনিয়া" : "Ammonia"}
              value={`${pond.ammonia_mg_l.toFixed(2)} mg/L`}
              warn={pond.ammonia_mg_l > 0.3}
            />
          )}
        </div>
      )}

      {/* Device strip */}
      <div className="relative mt-3 flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/40 px-2 py-1.5 text-[11px]">
        <span className="flex items-center gap-1">
          <Battery
            className={cn(
              "h-3.5 w-3.5",
              pond.battery_pct < 20
                ? "text-amber-600"
                : pond.battery_pct === 0
                  ? "text-muted-foreground"
                  : "text-emerald-600",
            )}
          />
          <span className="font-medium tabular-nums">{pond.battery_pct}%</span>
        </span>
        <span className="flex items-center gap-1">
          <Signal
            className={cn(
              "h-3.5 w-3.5",
              pond.signal_pct < 30
                ? "text-amber-600"
                : pond.signal_pct === 0
                  ? "text-muted-foreground"
                  : "text-sky-600",
            )}
          />
          <span className="font-medium tabular-nums">{pond.signal_pct}%</span>
        </span>
        <span
          className={cn(
            "flex items-center gap-1",
            s.stale ? "text-rose-600 font-semibold" : "text-muted-foreground",
          )}
        >
          <Clock className="h-3 w-3" />
          {s.label}
          {s.stale && (
            <span className="ml-0.5 rounded bg-rose-500/10 px-1 py-px text-[9px] font-bold uppercase">
              stale
            </span>
          )}
        </span>
      </div>

      {/* CTA */}
      <Button
        asChild
        size="sm"
        variant={isCritical ? "default" : "outline"}
        className={cn("relative mt-3 w-full", isCritical && "bg-rose-600 hover:bg-rose-700")}
      >
        <Link to="/app/ponds/$pondId" params={{ pondId: pond.id }}>
          {isBn ? "পুকুর বিস্তারিত দেখুন" : "View Pond Detail"}
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}

function BigReading({
  icon,
  label,
  unit,
  value,
  digits,
  warn,
  crit,
  stale,
}: {
  icon: React.ReactNode;
  label: string;
  unit: string;
  value: number | null;
  digits: number;
  warn?: boolean;
  crit?: boolean;
  stale?: boolean;
}) {
  const color = stale
    ? "text-muted-foreground"
    : crit
      ? "text-rose-600"
      : warn
        ? "text-amber-600"
        : "text-foreground";
  const bg = stale
    ? "bg-muted/40 border-border"
    : crit
      ? "bg-rose-500/8 border-rose-500/30"
      : warn
        ? "bg-amber-500/8 border-amber-500/30"
        : "bg-background/60 border-border/40";
  return (
    <div className={cn("rounded-xl border px-2.5 py-2", bg)}>
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={cn("mt-0.5 font-display text-2xl font-bold tabular-nums leading-tight", color)}>
        {value == null ? "—" : value.toFixed(digits)}
        {unit && value != null && (
          <span className="ml-1 text-[10px] font-medium text-muted-foreground">{unit}</span>
        )}
      </p>
    </div>
  );
}

function SecondaryReading({
  icon,
  label,
  value,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-2 py-1.5",
        warn
          ? "border-amber-500/30 bg-amber-500/5 text-amber-700"
          : "border-border/40 bg-background/40",
      )}
    >
      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-display text-xs font-bold tabular-nums">{value}</span>
    </div>
  );
}
