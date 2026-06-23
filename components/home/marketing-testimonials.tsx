"use client";

import { useMemo } from "react";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { TestimonialsMarquee } from "@/components/home/testimonials-marquee";
import type { Testimonial } from "@/lib/types/testimonial.type";

export function MarketingTestimonials() {
  const { data } = useFirebaseRealtime<Testimonial>("testimonials", {
    asArray: true,
    filter: (t) => t.status === "published",
    sort: (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  });

  const testimonials = useMemo(() => {
    const items = (data as Testimonial[]) || [];
    return items.map((t) => ({
      name: t.name,
      role: t.role,
      description: <p>{t.quote}</p>,
    }));
  }, [data]);

  return <TestimonialsMarquee testimonials={testimonials} />;
}
