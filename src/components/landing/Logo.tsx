import logoUrl from "@/assets/acqua-lence-logo.jpg";

export function Logo({ light = false, iconOnly = false }: { light?: boolean; iconOnly?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <img
        src={logoUrl}
        alt="Acqua Lence"
        className="h-9 w-9 shrink-0 object-contain rounded-lg shadow-sm"
        loading="eager"
        decoding="async"
      />
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
