import type { CSSProperties, ReactNode } from "react";
import { Player } from "@remotion/player";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  interpolateColors,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const FPS = 30;
const DURATION = 270;
const WIDTH = 1280;
const HEIGHT = 720;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const colors = {
  background: "#f5faff",
  shell: "#ffffff",
  ink: "#0b1d3d",
  navy: "#16324a",
  muted: "#60708c",
  faint: "#edf5fb",
  border: "rgba(11,29,61,0.1)",
  primary: "#168fd0",
  primaryDeep: "#0877b8",
  aqua: "#18b8c7",
  aquaSoft: "rgba(24,184,199,0.12)",
  good: "#16a86e",
  warning: "#f19320",
  critical: "#f33b39",
  blueSoft: "#e9f6ff",
  grid: "rgba(82,115,150,0.16)",
};

type Metric = {
  label: string;
  value: number;
  decimals: number;
  unit: string;
  delta: string;
  trend: "up" | "down";
  color: string;
  spark: string;
};

type TrendSeries = {
  label: string;
  color: string;
  path: string;
  end: { x: number; y: number };
};

type AlertItem = {
  title: string;
  detail: string;
  time: string;
  color: string;
  icon: "bang" | "warn" | "info" | "check";
};

const metrics: Metric[] = [
  {
    label: "Dissolved Oxygen",
    value: 6.42,
    decimals: 2,
    unit: "mg/L",
    delta: "4.2%",
    trend: "up",
    color: colors.primary,
    spark: "M4 22 C15 18 22 20 31 15 C42 7 50 25 61 16 C70 9 75 12 86 5",
  },
  {
    label: "pH Level",
    value: 7.35,
    decimals: 2,
    unit: "pH",
    delta: "1.1%",
    trend: "up",
    color: colors.aqua,
    spark: "M4 21 C13 22 17 18 26 17 C34 4 43 9 50 18 C58 27 67 11 75 12 C82 13 84 6 88 3",
  },
  {
    label: "Temperature",
    value: 28.6,
    decimals: 1,
    unit: "deg C",
    delta: "0.4%",
    trend: "down",
    color: "#ff8a18",
    spark: "M4 6 C12 20 22 8 29 19 C37 29 46 17 55 20 C65 23 73 15 87 8",
  },
  {
    label: "Turbidity",
    value: 12.4,
    decimals: 1,
    unit: "NTU",
    delta: "3.6%",
    trend: "down",
    color: colors.critical,
    spark: "M4 18 C16 20 20 6 29 17 C38 29 48 18 57 20 C66 23 73 18 87 7",
  },
  {
    label: "Salinity",
    value: 15.2,
    decimals: 1,
    unit: "ppt",
    delta: "2.0%",
    trend: "up",
    color: "#68b7e9",
    spark: "M4 24 C14 24 21 22 30 21 C40 20 51 16 58 17 C64 26 70 10 87 3",
  },
];

const trendSeries: TrendSeries[] = [
  {
    label: "Dissolved Oxygen (mg/L)",
    color: colors.primary,
    path: "M42 183 C85 170 120 165 164 174 C210 183 248 164 292 168 C330 172 352 199 393 198 C434 197 462 177 506 180 C536 182 554 193 580 184",
    end: { x: 580, y: 184 },
  },
  {
    label: "pH Level",
    color: colors.aqua,
    path: "M42 122 C84 116 112 130 151 120 C198 108 235 106 281 121 C318 133 354 132 394 134 C430 151 460 156 504 158 C535 160 552 151 580 139",
    end: { x: 580, y: 139 },
  },
  {
    label: "Temperature (deg C)",
    color: "#ff8a18",
    path: "M42 82 C82 58 125 61 166 80 C209 99 239 44 286 56 C327 66 350 105 392 100 C434 94 462 75 504 71 C540 67 554 86 580 78",
    end: { x: 580, y: 78 },
  },
  {
    label: "Turbidity (NTU)",
    color: colors.critical,
    path: "M42 164 C83 146 125 150 166 167 C210 185 240 184 284 170 C321 158 350 172 392 180 C430 198 464 214 506 205 C542 197 557 176 580 168",
    end: { x: 580, y: 168 },
  },
  {
    label: "Salinity (ppt)",
    color: "#68b7e9",
    path: "M42 125 C86 111 120 113 166 126 C210 139 238 201 284 178 C324 158 350 122 392 123 C434 124 464 136 506 132 C540 128 557 131 580 126",
    end: { x: 580, y: 126 },
  },
];

const alerts: AlertItem[] = [
  {
    title: "High Turbidity",
    detail: "18.7 NTU",
    time: "12 min ago",
    color: colors.critical,
    icon: "bang",
  },
  {
    title: "pH Fluctuation",
    detail: "7.9 pH",
    time: "25 min ago",
    color: colors.warning,
    icon: "warn",
  },
  {
    title: "DO Level Normal",
    detail: "6.42 mg/L",
    time: "35 min ago",
    color: colors.primary,
    icon: "info",
  },
  {
    title: "Temperature Stable",
    detail: "28.6 deg C",
    time: "47 min ago",
    color: colors.primary,
    icon: "info",
  },
  {
    title: "System Online",
    detail: "All sensors operational",
    time: "1 hr ago",
    color: colors.good,
    icon: "check",
  },
];

const navItems = [
  "Overview",
  "Sensors",
  "Buoys",
  "Alerts",
  "Reports",
  "Analytics",
  "Devices",
  "Settings",
];

function ease(frame: number, start: number, duration: number) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
}

function loopPulse(frame: number, offset = 0, speed = 12) {
  return (Math.sin((frame + offset) / speed) + 1) / 2;
}

function ShellPanel({
  x,
  y,
  width,
  height,
  delay,
  children,
  style,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  delay: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const enter = ease(frame, delay, 26);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px) scale(${interpolate(
          enter,
          [0, 1],
          [0.975, 1],
        )})`,
        borderRadius: 16,
        border: `1px solid ${colors.border}`,
        background: colors.shell,
        boxShadow: "0 24px 60px rgba(23,45,74,0.12)",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function StatusDot({ color, offset = 0 }: { color: string; offset?: number }) {
  const frame = useCurrentFrame();
  const pulse = loopPulse(frame, offset);

  return (
    <span
      style={{
        display: "inline-block",
        width: 9,
        height: 9,
        borderRadius: 999,
        background: color,
        transform: `scale(${interpolate(pulse, [0, 1], [0.86, 1.18])})`,
        boxShadow: `0 0 ${interpolate(pulse, [0, 1], [4, 17])}px ${color}`,
      }}
    />
  );
}

function DropletLogo({ size = 39 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path
        d="M24 4 C16 15 10 23 10 31 C10 39 16 44 24 44 C32 44 38 39 38 31 C38 23 32 15 24 4 Z"
        fill="rgba(24,143,208,0.15)"
        stroke={colors.primary}
        strokeWidth="3"
      />
      <path
        d="M24 13 C19 21 16 26 16 31 C16 36 19 39 24 39 C29 39 32 36 32 31 C32 26 29 21 24 13 Z"
        fill={colors.aqua}
        opacity="0.9"
      />
    </svg>
  );
}

function NavIcon({ index, active }: { index: number; active: boolean }) {
  const stroke = active ? colors.primaryDeep : "#53647f";
  const fill = active ? "rgba(22,143,208,0.16)" : "transparent";
  const glyph = index % 4;

  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
      {glyph === 0 && (
        <>
          <rect
            x="4"
            y="4"
            width="7"
            height="7"
            rx="1.5"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
          />
          <rect
            x="15"
            y="4"
            width="7"
            height="7"
            rx="1.5"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
          />
          <rect
            x="4"
            y="15"
            width="7"
            height="7"
            rx="1.5"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
          />
          <rect
            x="15"
            y="15"
            width="7"
            height="7"
            rx="1.5"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
          />
        </>
      )}
      {glyph === 1 && (
        <>
          <circle cx="13" cy="13" r="3" fill={fill} stroke={stroke} strokeWidth="2" />
          <path
            d="M13 4 C18 4 22 8 22 13 M13 22 C8 22 4 18 4 13"
            fill="none"
            stroke={stroke}
            strokeLinecap="round"
            strokeWidth="2"
          />
          <path
            d="M13 8 C16 8 18 10 18 13 M13 18 C10 18 8 16 8 13"
            fill="none"
            stroke={stroke}
            strokeLinecap="round"
            strokeWidth="2"
          />
        </>
      )}
      {glyph === 2 && (
        <>
          <path
            d="M8 10 H18 L20 20 H6 L8 10 Z"
            fill={fill}
            stroke={stroke}
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path d="M13 4 V10 M10 7 H16" stroke={stroke} strokeLinecap="round" strokeWidth="2" />
        </>
      )}
      {glyph === 3 && (
        <>
          <path
            d="M7 18 H19 M9 18 V11 C9 8 11 6 13 6 C15 6 17 8 17 11 V18"
            fill={fill}
            stroke={stroke}
            strokeLinecap="round"
            strokeWidth="2"
          />
          <path d="M11 21 H15" stroke={stroke} strokeLinecap="round" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

function Sidebar() {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: "absolute",
        left: 14,
        top: 14,
        width: 230,
        height: 692,
        borderRight: `1px solid ${colors.border}`,
        background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,252,255,0.98))",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 34,
          top: 31,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <DropletLogo />
        <div style={{ color: colors.ink, fontSize: 19, fontWeight: 850, letterSpacing: 3.4 }}>
          ACQUALENCE
        </div>
      </div>

      <div style={{ position: "absolute", left: 20, right: 20, top: 122, display: "grid", gap: 7 }}>
        {navItems.map((item, index) => {
          const active = index === 0;
          const row = ease(frame, 25 + index * 4, 20);

          return (
            <div
              key={item}
              style={{
                height: 50,
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "0 18px",
                borderRadius: 8,
                color: active ? colors.primaryDeep : "#273c5c",
                background: active ? "linear-gradient(90deg, #e8f6ff, #f4fbff)" : "transparent",
                opacity: row,
                transform: `translateX(${interpolate(row, [0, 1], [-14, 0])}px)`,
                fontSize: 17,
                fontWeight: active ? 800 : 600,
              }}
            >
              <NavIcon index={index} active={active} />
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopBar() {
  const frame = useCurrentFrame();
  const enter = ease(frame, 18, 24);
  const drop = loopPulse(frame, 12, 15);

  return (
    <div
      style={{
        position: "absolute",
        left: 244,
        top: 14,
        width: 1022,
        height: 76,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 36px",
        borderBottom: `1px solid ${colors.border}`,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [-12, 0])}px)`,
      }}
    >
      <div style={{ color: colors.ink, fontSize: 23, fontWeight: 850 }}>Overview</div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ color: "#203455", fontSize: 18, fontWeight: 650 }}>Farm Omega</div>
        <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden>
          <path
            d="M2 2 L7 7 L12 2"
            fill="none"
            stroke="#203455"
            strokeLinecap="round"
            strokeWidth="2"
          />
        </svg>
        <div
          style={{
            position: "relative",
            width: 46,
            height: 46,
            borderRadius: 999,
            background: "linear-gradient(135deg, #2e8bc5, #0b1d3d)",
            border: "3px solid #fff",
            boxShadow: "0 10px 24px rgba(15,44,68,0.16)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 13,
              top: 7,
              width: 20,
              height: 20,
              borderRadius: 999,
              background: "#f2c89d",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 8,
              top: 29,
              width: 31,
              height: 26,
              borderRadius: "12px 12px 0 0",
              background: "#103250",
            }}
          />
          <span
            style={{
              position: "absolute",
              right: -2,
              bottom: -2,
              width: 16,
              height: 16,
              borderRadius: 999,
              border: "2px solid #fff",
              background: colors.good,
              transform: `scale(${interpolate(drop, [0, 1], [0.9, 1.08])})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ metric, index, x }: { metric: Metric; index: number; x: number }) {
  const frame = useCurrentFrame();
  const enter = ease(frame, 44 + index * 5, 24);
  const draw = ease(frame, 62 + index * 5, 34);
  const numberProgress = ease(frame, 56 + index * 4, 38);
  const value = interpolate(numberProgress, [0, 1], [metric.value * 0.82, metric.value]);
  const deltaColor = metric.trend === "up" ? colors.good : colors.critical;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: 106,
        width: 179,
        height: 164,
        borderRadius: 13,
        border: `1px solid ${colors.border}`,
        background: colors.shell,
        boxShadow: "0 18px 42px rgba(23,45,74,0.1)",
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px) scale(${interpolate(
          enter,
          [0, 1],
          [0.97, 1],
        )})`,
        padding: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 22,
          right: 46,
          top: 22,
          minHeight: 40,
        }}
      >
        <div style={{ color: "#334766", fontSize: 15, fontWeight: 760, lineHeight: 1.22 }}>
          {metric.label}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 22,
          top: 28,
          display: "grid",
          placeItems: "center",
          width: 18,
          height: 18,
          borderRadius: 999,
          border: "1.8px solid #9aabc2",
          color: "#7d8ca4",
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        i
      </div>

      <div
        style={{
          position: "absolute",
          left: 22,
          top: 78,
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          color: metric.color === colors.aqua ? colors.ink : metric.color,
          lineHeight: 1,
        }}
      >
        <span
          style={{
            fontSize: 37,
            fontWeight: 850,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value.toFixed(metric.decimals)}
        </span>
        <span style={{ color: colors.muted, fontSize: 15, fontWeight: 650 }}>{metric.unit}</span>
      </div>

      <div
        style={{
          position: "absolute",
          left: 22,
          bottom: 22,
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        <span style={{ color: deltaColor, fontSize: 13, fontWeight: 850, whiteSpace: "nowrap" }}>
          {metric.trend === "up" ? "up" : "down"} {metric.delta}
        </span>
      </div>
      <svg
        width="68"
        height="32"
        viewBox="0 0 92 32"
        style={{ position: "absolute", right: 18, bottom: 20, overflow: "visible" }}
        aria-hidden
      >
        <path
          d={metric.spark}
          fill="none"
          pathLength={1}
          stroke={metric.color}
          strokeDasharray={1}
          strokeDashoffset={1 - draw}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          opacity="0.88"
        />
      </svg>
    </div>
  );
}

function LegendItem({ series, index }: { series: TrendSeries; index: number }) {
  const frame = useCurrentFrame();
  const enter = ease(frame, 80 + index * 4, 18);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [8, 0])}px)`,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 999, background: series.color }} />
      <span style={{ color: "#3b4e6d", fontSize: 14, fontWeight: 650 }}>{series.label}</span>
    </div>
  );
}

function AnimatedChart() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const livePulse = loopPulse(frame, 10, 13);
  const cursorLoop = ((frame - 116 + 5 * fps) % (5 * fps)) / (5 * fps);
  const cursorX = interpolate(cursorLoop, [0, 1], [42, 580]);
  const cursorOpacity = ease(frame, 112, 18);

  return (
    <ShellPanel x={268} y={278} width={670} height={400} delay={64}>
      <div style={{ position: "absolute", inset: 0, padding: 26 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ color: colors.ink, fontSize: 23, fontWeight: 850 }}>
            Water Quality Trend
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                height: 39,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0 14px",
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: "#fbfdff",
                color: "#1f3554",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              <StatusDot color={colors.good} />
              Live
              <span style={{ color: colors.muted, fontSize: 16 }}>v</span>
            </div>
            <div
              style={{
                height: 39,
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: "#fbfdff",
                color: "#1f3554",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              6 Hours
            </div>
          </div>
        </div>

        <div style={{ marginTop: 27, display: "flex", flexWrap: "wrap", gap: "15px 18px" }}>
          {trendSeries.map((series, index) => (
            <LegendItem key={series.label} series={series} index={index} />
          ))}
        </div>

        <svg
          width="600"
          height="252"
          viewBox="0 0 600 252"
          style={{ position: "absolute", left: 34, bottom: 24, overflow: "visible" }}
          aria-label="Animated water quality line chart"
        >
          {[40, 30, 20, 10, 0].map((label, index) => {
            const y = 26 + index * 46;
            return (
              <g key={label}>
                <text x="0" y={y + 5} fill="#405472" fontSize="14" fontWeight="600">
                  {label}
                </text>
                <line
                  x1="42"
                  x2="580"
                  y1={y}
                  y2={y}
                  stroke={colors.grid}
                  strokeDasharray="5 6"
                  strokeWidth="1.4"
                />
              </g>
            );
          })}

          <line x1="42" x2="580" y1="210" y2="210" stroke="rgba(11,29,61,0.16)" strokeWidth="1.6" />
          {["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00"].map((label, index) => (
            <text
              key={label}
              x={42 + index * 89}
              y="243"
              textAnchor={index === 0 ? "start" : index === 6 ? "end" : "middle"}
              fill="#405472"
              fontSize="14"
              fontWeight="600"
            >
              {label}
            </text>
          ))}

          {trendSeries.map((series, index) => {
            const draw = ease(frame, 96 + index * 8, 74);
            const glow = interpolate(loopPulse(frame, index * 9, 16), [0, 1], [0.42, 0.78]);
            return (
              <g key={series.label}>
                <path
                  d={series.path}
                  fill="none"
                  pathLength={1}
                  stroke={series.color}
                  strokeDasharray={1}
                  strokeDashoffset={1 - draw}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={glow}
                  strokeWidth="8"
                />
                <path
                  d={series.path}
                  fill="none"
                  pathLength={1}
                  stroke={series.color}
                  strokeDasharray={1}
                  strokeDashoffset={1 - draw}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                />
                <circle
                  cx={series.end.x}
                  cy={series.end.y}
                  r={interpolate(loopPulse(frame, index * 12, 10), [0, 1], [4, 6])}
                  fill="#fff"
                  opacity={ease(frame, 158 + index * 6, 18)}
                  stroke={series.color}
                  strokeWidth="3"
                />
              </g>
            );
          })}

          <g opacity={cursorOpacity}>
            <line
              x1={cursorX}
              x2={cursorX}
              y1="26"
              y2="210"
              stroke={colors.primary}
              strokeOpacity="0.28"
              strokeWidth="2"
            />
            <circle
              cx={cursorX}
              cy={interpolate(loopPulse(frame, 20, 14), [0, 1], [72, 92])}
              r={interpolate(livePulse, [0, 1], [5, 8])}
              fill={colors.primary}
              opacity="0.75"
            />
          </g>
        </svg>
      </div>
    </ShellPanel>
  );
}

function AlertIcon({ item }: { item: AlertItem }) {
  const text =
    item.icon === "check" ? "" : item.icon === "info" ? "i" : item.icon === "warn" ? "!" : "!";

  return (
    <span
      style={{
        width: 31,
        height: 31,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background: interpolateColors(0.22, [0, 1], ["#ffffff", item.color]),
        color: item.color,
        fontSize: 17,
        fontWeight: 900,
      }}
    >
      {item.icon === "check" ? (
        <svg width="17" height="13" viewBox="0 0 17 13" aria-hidden>
          <path
            d="M2 6.5 L6.3 11 L15 2"
            fill="none"
            stroke={item.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        </svg>
      ) : (
        text
      )}
    </span>
  );
}

function AlertRail() {
  const frame = useCurrentFrame();
  const actionGlow = loopPulse(frame, 5, 14);

  return (
    <ShellPanel x={962} y={278} width={282} height={400} delay={78}>
      <div style={{ padding: "24px 22px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ color: colors.ink, fontSize: 22, fontWeight: 850 }}>Alerts & Activity</div>
          <div style={{ color: colors.primaryDeep, fontSize: 14, fontWeight: 850 }}>View all</div>
        </div>

        <div style={{ marginTop: 16 }}>
          {alerts.map((item, index) => {
            const row = ease(frame, 98 + index * 9, 24);
            return (
              <div
                key={item.title}
                style={{
                  height: 50,
                  display: "grid",
                  gridTemplateColumns: "34px minmax(0, 1fr) 62px",
                  gap: 10,
                  alignItems: "center",
                  padding: 0,
                  borderBottom: index === alerts.length - 1 ? "none" : `1px solid ${colors.border}`,
                  opacity: row,
                  transform: `translateX(${interpolate(row, [0, 1], [20, 0])}px)`,
                }}
              >
                <AlertIcon item={item} />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: colors.ink,
                      fontSize: 14,
                      fontWeight: 850,
                      lineHeight: 1.2,
                    }}
                  >
                    {item.title}
                  </div>
                  <div style={{ marginTop: 5, color: colors.muted, fontSize: 13, fontWeight: 600 }}>
                    {item.detail}
                  </div>
                </div>
                <div
                  style={{
                    color: "#74819a",
                    fontSize: 12,
                    fontWeight: 650,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.time}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 12,
            height: 45,
            borderRadius: 9,
            border: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            color: colors.primaryDeep,
            fontSize: 15,
            fontWeight: 850,
            background: interpolateColors(actionGlow, [0, 1], ["#ffffff", "#eef9ff"]),
          }}
        >
          View all alerts
          <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden>
            <path
              d="M1 6 H15 M10 1 L15 6 L10 11"
              fill="none"
              stroke={colors.primaryDeep}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.4"
            />
          </svg>
        </div>
      </div>
    </ShellPanel>
  );
}

function SignalOverlay() {
  const frame = useCurrentFrame();
  const sweepX = interpolate((frame % 180) / 180, [0, 1], [-220, WIDTH + 80]);
  const pulse = loopPulse(frame, 0, 14);

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
    >
      <defs>
        <linearGradient id="dashboard-sweep" x1="0" x2="1">
          <stop offset="0%" stopColor={colors.primary} stopOpacity="0" />
          <stop offset="48%" stopColor={colors.primary} stopOpacity="0.16" />
          <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
        </linearGradient>
        <radialGradient id="dashboard-radar">
          <stop offset="0%" stopColor={colors.aqua} stopOpacity="0.24" />
          <stop offset="65%" stopColor={colors.aqua} stopOpacity="0.08" />
          <stop offset="100%" stopColor={colors.aqua} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect
        x={sweepX}
        y="0"
        width="180"
        height={HEIGHT}
        fill="url(#dashboard-sweep)"
        transform={`skewX(-12) translate(${interpolate(pulse, [0, 1], [-8, 8])} 0)`}
      />
      <circle cx="870" cy="508" r="260" fill="url(#dashboard-radar)" opacity="0.72" />
      {[0, 1, 2].map((index) => {
        const cycle = (frame + index * 34) % 112;
        const radius = interpolate(cycle, [0, 112], [28, 155], clamp);
        const opacity = interpolate(cycle, [0, 18, 112], [0, 0.32, 0], clamp);
        return (
          <circle
            key={index}
            cx="870"
            cy="508"
            r={radius}
            fill="none"
            stroke={colors.aqua}
            strokeWidth="3"
            opacity={opacity}
          />
        );
      })}
    </svg>
  );
}

export function LiveDashboardComposition() {
  const frame = useCurrentFrame();
  const intro = ease(frame, 0, 32);
  const metricX = [268, 467, 666, 865, 1064];

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #f6fbff 0%, #ffffff 45%, #edf8fb 100%)",
        fontFamily: "Inter, Arial, sans-serif",
        color: colors.ink,
        overflow: "hidden",
      }}
    >
      <SignalOverlay />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.72,
          backgroundImage:
            "linear-gradient(rgba(16,43,66,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(16,43,66,0.045) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 14,
          top: 14,
          width: 1252,
          height: 692,
          borderRadius: 16,
          border: `1px solid ${colors.border}`,
          background: "rgba(255,255,255,0.9)",
          boxShadow: "0 26px 70px rgba(23,45,74,0.15)",
          opacity: intro,
          transform: `scale(${interpolate(intro, [0, 1], [0.985, 1])})`,
          overflow: "hidden",
        }}
      />

      <Sidebar />
      <TopBar />

      {metrics.map((metric, index) => (
        <MetricCard key={metric.label} metric={metric} index={index} x={metricX[index]} />
      ))}

      <AnimatedChart />
      <AlertRail />
    </AbsoluteFill>
  );
}

export function LiveDashboardMotionPlayer({ reduced }: { reduced: boolean }) {
  return (
    <Player
      component={LiveDashboardComposition}
      durationInFrames={DURATION}
      compositionWidth={WIDTH}
      compositionHeight={HEIGHT}
      fps={FPS}
      autoPlay={!reduced}
      loop={!reduced}
      controls={false}
      clickToPlay={false}
      doubleClickToFullscreen={false}
      spaceKeyToPlayOrPause={false}
      initiallyMuted
      initialFrame={reduced ? 150 : 0}
      acknowledgeRemotionLicense
      style={{
        width: "100%",
        aspectRatio: `${WIDTH} / ${HEIGHT}`,
        borderRadius: 8,
        overflow: "hidden",
        background: colors.background,
      }}
    />
  );
}
