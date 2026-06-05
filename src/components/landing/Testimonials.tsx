import { motion } from "framer-motion";
import { TestimonialsColumn, type Testimonial } from "@/components/ui/testimonials-columns-1";
import { Reveal } from "./Reveal";

const testimonials: Testimonial[] = [
  {
    text: "The alerts are simple enough for my pond team to act on immediately. Low oxygen no longer waits for someone to notice it late.",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&q=80",
    name: "Abdul Karim",
    role: "Shrimp farm owner, Khulna",
  },
  {
    text: "Before Acqua Lence, our readings were scattered in notebooks. Now I can compare ponds and understand which one needs attention first.",
    image:
      "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=96&q=80",
    name: "Mahmud Hasan",
    role: "Farm manager, Bagerhat",
  },
  {
    text: "The Bangla guidance matters. Technicians can read the alert, call the manager, and start the right action without confusion.",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80",
    name: "Nusrat Jahan",
    role: "Aquaculture technician",
  },
  {
    text: "Having device health, water status, and reports together makes it easier to keep farms ready for export-quality production.",
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=96&q=80",
    name: "Tanvir Rahman",
    role: "Operations lead",
  },
  {
    text: "The dashboard gives our team a calm way to see what is happening across ponds without waiting for manual calls from the field.",
    image:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=96&q=80",
    name: "Sabbir Ahmed",
    role: "Commercial hatchery operator",
  },
  {
    text: "It feels built for pond-side work. The information is direct, the action is clear, and the pricing is easy to explain.",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=96&q=80",
    name: "Farhana Akter",
    role: "Aquaculture consultant",
  },
];

const firstColumn = testimonials.slice(0, 2);
const secondColumn = testimonials.slice(2, 4);
const thirdColumn = testimonials.slice(4, 6);

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="relative overflow-hidden bg-background py-14 sm:py-20 lg:py-24"
      aria-labelledby="testimonials-heading"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(18,198,222,0.1),transparent_36%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true, amount: 0.4 }}
            className="mx-auto flex max-w-2xl flex-col items-center text-center"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              Testimonials
            </p>
            <h2
              id="testimonials-heading"
              className="mt-3 font-display text-3xl font-bold text-foreground text-balance sm:text-4xl lg:text-5xl"
            >
              What our users say
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">
              See what our customers have to say about us.
            </p>
          </motion.div>
        </Reveal>

        <div className="mx-auto mt-9 flex max-h-[620px] max-w-6xl justify-center gap-4 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_84%,transparent)] sm:mt-12 sm:gap-5">
          <TestimonialsColumn testimonials={firstColumn} duration={18} />
          <TestimonialsColumn
            testimonials={secondColumn}
            className="hidden md:block"
            duration={22}
          />
          <TestimonialsColumn
            testimonials={thirdColumn}
            className="hidden lg:block"
            duration={20}
          />
        </div>
      </div>
    </section>
  );
}
