import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import { Reveal } from "./Reveal";
import { SpotlightCard } from "./SpotlightCard";
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
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Shop</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-foreground text-balance sm:text-4xl">Everything You Need</h2>

            <p className="mt-3 text-sm text-muted-foreground">
              Explore our range of smart devices, sensors and accessories — built for the demands of modern aquaculture.
            </p>
            <Button className="mt-5 gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
              <ShoppingBag className="h-4 w-4" /> Visit Shop
            </Button>
          </Reveal>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {products.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.05}>
                <SpotlightCard className="group flex h-full flex-col rounded-2xl border border-border bg-card p-3 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft sm:p-4">
                  <div className="grid h-28 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-surface to-primary/5 sm:h-32">
                    <img
                      src={p.img}
                      alt={p.name}
                      className="max-h-24 w-auto object-contain transition-transform duration-500 group-hover:scale-110 sm:max-h-28"
                      loading="lazy"
                      width={200}
                      height={200}
                    />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.sub}</p>
                  <p className="mt-2 text-sm font-bold text-foreground">{p.price}</p>
                  <Button size="sm" variant="outline" className="mt-3 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground">
                    Add to Cart
                  </Button>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
