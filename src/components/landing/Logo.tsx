export function Logo({ light = false, iconOnly = false }: { light?: boolean; iconOnly?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-teal-400 p-1.5 shadow-md shadow-sky-500/20 shrink-0">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="h-5.5 w-5.5 text-white"
        >
          {/* Water droplet with stylized waves/reflection */}
          <path
            d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"
            fill="currentColor"
            fillOpacity="0.15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 18.5a6.5 6.5 0 0 0 4.5-2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      {!iconOnly && (
        <span
          className={`font-display text-lg font-bold leading-none tracking-tight ${
            light ? "text-white" : "text-foreground"
          }`}
        >
          ACQUA
          <br />
          LENCE
        </span>
      )}
    </div>
  );
}
