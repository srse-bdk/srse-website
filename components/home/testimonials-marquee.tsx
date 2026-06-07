"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Star } from "lucide-react";
import { Marquee } from "@/components/ui/marquee";
import { useMemo } from "react";

export function Highlight({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-primary/10 p-1 py-0.5 font-bold text-primary",
        className
      )}
    >
      {children}
    </span>
  );
}

export interface TestimonialCardProps {
  name: string;
  role: string;
  img?: string;
  description: React.ReactNode;
  className?: string;
}

export type TestimonialItem = Omit<TestimonialCardProps, "className">;

export interface TestimonialsMarqueeProps {
  testimonials?: TestimonialItem[];
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function TestimonialCard({
  description,
  name,
  img,
  role,
  className,
  ...props // Capture the rest of the props
}: TestimonialCardProps) {
  const initials = getInitials(name);

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "mb-4 flex w-full cursor-pointer break-inside-avoid flex-col items-center justify-between gap-6 rounded-2xl p-6",
        // theme styles
        "border-border bg-card/80 backdrop-blur-sm border shadow-md",
        // hover effect
        "transition-all duration-300 hover:shadow-xl hover:border-primary/50",
        className
      )}
      {...props}
    >
      <div className="text-muted-foreground text-sm font-normal select-none leading-relaxed">
        {description}
        <div className="flex flex-row gap-0.5 py-2">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
            >
              <Star className="size-4 fill-primary text-primary" />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex w-full items-center justify-start gap-4 select-none pt-2 border-t border-border/50">
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-primary/20 text-sm font-bold text-primary shadow-sm"
        >
          {initials}
        </motion.div>

        <div>
          <p className="text-foreground font-semibold">{name}</p>
          <p className="text-muted-foreground text-xs font-normal mt-0.5">{role}</p>
        </div>
      </div>
    </motion.div>
  );
}
export function TestimonialsMarquee({
  testimonials,
}: TestimonialsMarqueeProps) {
  const columnKeys = useMemo(
    () =>
      Array.from(
        { length: Math.ceil((testimonials?.length ?? 0) / 3) },
        (_, i) => `marquee-column-${i}`
      ),
    [testimonials?.length]
  );

  if (!testimonials || testimonials.length === 0) {
    return null;
  }

  return (
    <section
      id="testimonials"
      className="w-full overflow-hidden bg-muted/30 py-20"
    >
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Decorative elements */}
        <div className="absolute top-20 -left-20 z-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -right-20 bottom-20 z-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-block mb-4"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              Testimonials
            </span>
          </motion.div>
          <h2 className="mb-4 text-4xl font-bold md:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              What Our Parents Say
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Don&apos;t just take our word for it. Here&apos;s what our valued
            parents have to say about their experience with S R School of Excellence.
          </p>
        </motion.div>

        <div className="relative max-h-[800px] overflow-hidden">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {columnKeys.map((key, i) => (
              <div key={key} className="h-[800px] overflow-hidden">
                <Marquee
                  vertical
                  repeat={3}
                  pauseOnHover
                  className={cn("h-full", {
                    "[--duration:60s]": i === 1,
                    "[--duration:30s]": i === 2,
                    "[--duration:70s]": i === 3,
                    "[--duration:50s]": i === 0,
                  })}
                >
                  {(testimonials ?? [])
                    .slice(i * 3, (i + 1) * 3)
                    .map((card) => (
                      <motion.div
                        key={card.name}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{
                          delay: Math.random() * 0.8,
                          duration: 1.2,
                        }}
                      >
                        <TestimonialCard {...card} />
                      </motion.div>
                    ))}
                </Marquee>
              </div>
            ))}
          </div>
          <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-1/4 w-full bg-gradient-to-t from-20%"></div>
          <div className="from-background pointer-events-none absolute inset-x-0 top-0 h-1/4 w-full bg-gradient-to-b from-20%"></div>
        </div>
      </div>
    </section>
  );
}
