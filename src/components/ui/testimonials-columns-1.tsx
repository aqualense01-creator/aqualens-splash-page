import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type Testimonial = {
  text: string;
  image: string;
  name: string;
  role: string;
};

type TestimonialsColumnProps = {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
};

export function TestimonialsColumn({
  className,
  testimonials,
  duration = 16,
}: TestimonialsColumnProps) {
  const shouldReduceMotion = useReducedMotion();
  const items = shouldReduceMotion ? testimonials : [...testimonials, ...testimonials];

  return (
    <div className={cn("min-w-0", className)}>
      <motion.div
        animate={shouldReduceMotion ? undefined : { translateY: "-50%" }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-4 pb-4 sm:gap-5 sm:pb-5"
      >
        {items.map(({ text, image, name, role }, index) => (
          <article
            key={`${name}-${index}`}
            className="w-full max-w-sm rounded-lg border border-border/80 bg-card p-5 text-left shadow-soft sm:p-6"
          >
            <p className="text-sm leading-7 text-foreground/80">{text}</p>
            <div className="mt-5 flex items-center gap-3">
              <img
                width={44}
                height={44}
                src={image}
                alt={name}
                loading="lazy"
                decoding="async"
                className="h-11 w-11 rounded-full object-cover ring-2 ring-primary/15"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-5 text-foreground">{name}</p>
                <p className="truncate text-xs leading-5 text-muted-foreground">{role}</p>
              </div>
            </div>
          </article>
        ))}
      </motion.div>
    </div>
  );
}
