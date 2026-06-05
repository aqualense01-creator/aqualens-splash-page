import { Droplet } from "lucide-react";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10">
        <Droplet className="h-5 w-5 fill-primary text-primary" />
      </div>
      <span
        className={`font-display text-lg font-bold leading-none tracking-tight ${
          light ? "text-white" : "text-foreground"
        }`}
      >
        ACQUA
        <br />
        LENCE
      </span>
    </div>
  );
}
