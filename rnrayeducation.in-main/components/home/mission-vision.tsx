"use client";

import { motion } from "motion/react";
import { Target, Eye, GraduationCap, Users, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function MissionVision() {
  return (
    <section className="bg-background py-20">
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col items-center">
          <Badge
            variant="outline"
            className="border-primary mb-4 px-3 py-1 text-xs font-medium tracking-wider uppercase"
          >
            Our Foundation
          </Badge>

          <h2 className="text-foreground mb-6 text-center text-4xl font-bold tracking-tight md:text-5xl">
            Mission & Vision
          </h2>

          <p className="text-muted-foreground max-w-2xl text-center">
            Building a strong foundation for holistic development and academic
            excellence
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Mission Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-lg transition-all hover:shadow-xl"
          >
            <div className="absolute right-0 top-0 -z-0 h-32 w-32 rounded-bl-full bg-primary/10 transition-transform duration-500 group-hover:scale-150" />
            <div className="relative z-10">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Target className="size-7" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Our Mission</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                We aim at strengthening the existing Stimulus-Response bond of a
                student to have an all-round development. We have a perfect blend of
                academic syllabus and extra-curricular activities. We aim to provide
                the highest quality of education possible for students of all abilities.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm">
                  <GraduationCap className="size-4 text-primary" />
                  <span className="text-foreground font-medium">
                    Academic Excellence
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm">
                  <Users className="size-4 text-primary" />
                  <span className="text-foreground font-medium">
                    All-Round Development
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Vision Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-lg transition-all hover:shadow-xl"
          >
            <div className="absolute left-0 top-0 -z-0 h-32 w-32 rounded-br-full bg-accent/10 transition-transform duration-500 group-hover:scale-150" />
            <div className="relative z-10">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Eye className="size-7" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Our Vision</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Our vision is to provide a nurturing, stimulating and diverse
                cultured environment that allows students to develop high
                self-esteem, excellent and social outcomes and achieve their fullest
                potential. We commit to work in partnership with our staffs, students,
                parents and the wider community to achieve our vision.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-sm">
                  <Heart className="size-4 text-accent" />
                  <span className="text-foreground font-medium">
                    Nurturing Environment
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-sm">
                  <Users className="size-4 text-accent" />
                  <span className="text-foreground font-medium">
                    Community Partnership
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

