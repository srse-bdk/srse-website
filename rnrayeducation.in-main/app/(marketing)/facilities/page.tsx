"use client";

import { motion } from "motion/react";
import { marketingSite } from "@/lib/config/marketing";
import {
  Home,
  Camera,
  Heart,
  Palette,
  Activity,
  Zap,
  Monitor,
  Gamepad2,
  Bus,
  Handshake,
  Sparkles,
} from "lucide-react";

const facilityIcons = {
  "Quiet and Residential Layout": Home,
  "Complete Area under CC TV Surveillance": Camera,
  "Compassionate and Caring Staffs": Heart,
  "Colourful Premises with Theme based Furniture": Palette,
  "Well Equipped and Spacious Play Area": Activity,
  "Alternate Power Supply": Zap,
  "Air Conditioned Smart Class": Monitor,
  "Variety of Indoor Activities": Gamepad2,
  "Pick and Drop Facility": Bus,
  "Parental Involvement in the School": Handshake,
} as const;

export default function FacilitiesPage() {
  return (
    <section className="relative w-full min-h-screen bg-gradient-to-b from-background via-background to-muted/20 py-16 sm:py-20 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 right-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 left-10 h-96 w-96 rounded-full bg-accent/10 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto space-y-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-block"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              Our Facilities
            </span>
          </motion.div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              World-Class Facilities
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
            Discover the modern infrastructure and amenities that make S R School
            of Excellence a premier educational institution, designed to nurture
            excellence in every student.
          </p>
        </motion.header>

        {/* Facilities Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {marketingSite.facilities.map((facility, index) => {
            const Icon =
              facilityIcons[
                facility as keyof typeof facilityIcons
              ] || Sparkles;

            return (
              <motion.div
                key={facility}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.05,
                }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Icon */}
                <div className="relative z-10 mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors duration-300">
                  <Icon className="size-6" />
                </div>

                {/* Content */}
                <div className="relative z-10 space-y-2">
                  <h3 className="text-base font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                    {facility}
                  </h3>
                </div>

                {/* Decorative corner accent */}
                <div className="absolute top-0 right-0 size-20 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.div>
            );
          })}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center max-w-2xl mx-auto space-y-4"
        >
          <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-8 shadow-sm">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Experience Excellence Firsthand
            </h2>
            <p className="text-muted-foreground mb-6">
              Schedule a campus tour to see our facilities in person and learn
              more about how we create an environment for academic excellence.
            </p>
            <motion.a
              href="/contact"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
            >
              <Sparkles className="size-4" />
              Schedule a Visit
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

