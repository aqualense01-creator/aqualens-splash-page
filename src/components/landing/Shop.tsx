import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import buoy from "@/assets/buoy-product.png";
import sensorDo from "@/assets/sensor-do.png";
import sensorPh from "@/assets/sensor-ph.png";
import sensorTurb from "@/assets/sensor-turbidity.png";
import solar from "@/assets/solar-kit.png";

const products = [
  { img: buoy, name: "AcquaLence Buoy", sub: "Water Quality Monitoring Device", price: "$1,299.00" },
  { img: sensorDo, name: "DO Sensor", sub: "Dissolved Oxygen Sensor", price: "$199.00" },
  { img: sensorPh, name: "pH Sensor", sub: "pH Level Sensor", price: "$149.00" },
  { img: sensorTurb, name: "Turbidity Sensor", sub: "Turbidity Sensor", price: "$169.00" },
  { img: solar, name: "Solar Panel Kit", sub: "8W Solar Panel Kit", price: "$89.00" },
];

export function Shop() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Shop</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-foreground">Everything You Need</h2>
            <p className="mt-3 text-sm text-muted-foreground">Explore our range of smart devices, sensors and accessories.</p>
            <Button variant="outline" className="mt-5 gap-1 border-primary text-primary hover:bg-primary/10 hover:text-primary">
              Visit Shop <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {products.map((p) => (
              <div key={p.name} className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
                <div className="grid h-32 place-items-center rounded-lg bg-surface">
                  <img src={p.img} alt={p.name} className="max-h-28 w-auto object-contain transition-transform group-hover:scale-105" loading="lazy" width={200} height={200} />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">{p.sub}</p>
                <p className="mt-2 text-sm font-bold text-foreground">{p.price}</p>
                <Button size="sm" variant="outline" className="mt-3 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary">
                  Add to Cart
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
