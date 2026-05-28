"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { marketingSite } from "@/lib/config/marketing";
import {
  Heart,
  Target,
  Eye,
  Building2,
  Users,
  Award,
  Sparkles,
  Quote,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const staggerContainer = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Hero Section - Clean & Minimal */}
      <section className="relative py-24 sm:py-32 lg:py-40">
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="max-w-4xl mx-auto space-y-6"
          >
            <Badge
              variant="secondary"
              className="px-4 py-2 text-primary bg-primary/10 hover:bg-primary/20 transition-colors uppercase tracking-wider text-xs font-semibold rounded-full"
            >
              Our Legacy
            </Badge>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground">
              Nurturing{" "}
              <span className="text-primary relative inline-block">
                Excellence
                {/** biome-ignore lint/a11y/noSvgWithoutTitle: <explanation> */}
                <svg
                  className="absolute w-full h-3 -bottom-1 left-0 text-primary/20 -z-10"
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 5 Q 50 10 100 5"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                  />
                </svg>
              </span>{" "}
              <br />
              Inspiring Futures.
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Welcome to {marketingSite.name}, where we blend traditional values
              with modern education to shape the leaders of tomorrow.
            </p>
          </motion.div>
        </div>

        {/* Abstract Background Design */}
        <div className="absolute top-0 inset-x-0 h-full overflow-hidden -z-10 pointer-events-none opacity-40">
          <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[80%] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-[20%] -left-[10%] w-[40%] h-[60%] rounded-full bg-blue-500/5 blur-3xl" />
        </div>
      </section>

      {/* Founder Section - The Classic Tribute */}
      <section className="py-20 bg-muted/30 border-y border-border/40">
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeIn}
            className="flex flex-col items-center"
          >
            {/* Section Header */}
            <div className="text-center mb-10">
              <span className="text-sm font-semibold tracking-widest text-primary uppercase">
                Founded In Memory Of
              </span>
              <div className="h-1 w-20 bg-primary mx-auto mt-4" />
            </div>

            {/* Founder Message Image with Elegant Frame */}
            <div className="relative w-full max-w-4xl mx-auto">
              {/* Decorative corner accents */}
              <div className="absolute -top-3 -left-3 w-16 h-16 border-t-4 border-l-4 border-primary/30 rounded-tl-2xl" />
              <div className="absolute -top-3 -right-3 w-16 h-16 border-t-4 border-r-4 border-primary/30 rounded-tr-2xl" />
              <div className="absolute -bottom-3 -left-3 w-16 h-16 border-b-4 border-l-4 border-primary/30 rounded-bl-2xl" />
              <div className="absolute -bottom-3 -right-3 w-16 h-16 border-b-4 border-r-4 border-primary/30 rounded-br-2xl" />

              {/* Subtle glow effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/5 rounded-2xl blur-xl" />

              {/* Image Container */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white">
                <Image
                  src="/photos/Founders-Message.jpg"
                  alt={`${marketingSite.founder.name} - Founder's Message`}
                  width={900}
                  height={600}
                  className="w-full h-auto object-contain"
                  priority
                />
              </div>
            </div>

            {/* Quote Section */}
            <div className="mt-12 max-w-3xl mx-auto text-center">
              <div className="relative px-8 py-6">
                <Quote className="absolute top-0 left-0 size-10 text-primary/20 fill-current" />
                <Quote className="absolute bottom-0 right-0 size-10 text-primary/20 fill-current rotate-180" />
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed italic relative z-10">
                  &quot;{marketingSite.name} stands as a living tribute to the
                  ideals of Late Ram Narayan Ray. Managed by the{" "}
                  {marketingSite.founder.trust}, we are dedicated to carrying
                  forward his legacy of benevolence and commitment to society
                  through the power of education.&quot;
                </p>
              </div>
            </div>

            {/* Additional context badges */}
            <div className="mt-10 flex flex-wrap gap-8 justify-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-background rounded-full shadow-sm text-primary border border-border/50">
                  <Building2 className="size-5" />
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-foreground">Established</p>
                  <p className="text-muted-foreground">
                    {marketingSite.founder.founded}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-background rounded-full shadow-sm text-primary border border-border/50">
                  <Users className="size-5" />
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-foreground">Managed By</p>
                  <p className="text-muted-foreground">
                    {marketingSite.founder.trust}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision - Elegant Cards */}
      <section className="py-24">
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Mission */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{
                hidden: { opacity: 0, x: -30 },
                visible: { opacity: 3, x: 0, transition: { duration: 0.6 } },
              }}
              className="group"
            >
              <div className="h-full p-8 rounded-3xl bg-card border border-border/50 shadow-sm hover:shadow-xl hover:border-rose-500/20 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-bl-full transition-transform group-hover:scale-110 duration-500" />

                <div className="relative flex flex-col h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600">
                      <Target className="size-6" />
                    </div>
                    <h3 className="text-2xl font-bold font-serif">
                      Our Mission
                    </h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed flex-grow">
                    We aim at strengthening the existing Stimulus-Response bond
                    of a student to have an all-round development. We have a
                    perfect blend of academic syllabus and extra-curricular
                    activities. We aim to provide the highest quality of
                    education possible for students of all abilities.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Vision */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{
                hidden: { opacity: 0, x: 30 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.6 } },
              }}
              className="group"
            >
              <div className="h-full p-8 rounded-3xl bg-card border border-border/50 shadow-sm hover:shadow-xl hover:border-emerald-500/20 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-br-full transition-transform group-hover:scale-110 duration-500" />

                <div className="relative flex flex-col h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600">
                      <Eye className="size-6" />
                    </div>
                    <h3 className="text-2xl font-bold font-serif">
                      Our Vision
                    </h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed flex-grow">
                    Our vision is to provide a nurturing, stimulating and
                    diverse cultured environment that allows students to develop
                    high self-esteem, excellent social outcomes and achieve
                    their fullest potential. We commit to work in partnership
                    with our staff, students, parents and the wider community.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Core Values / Features Grid */}
      <section className="py-24 bg-muted/30">
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold font-serif mb-4">
              Why Choose Us?
            </h2>
            <p className="text-muted-foreground">
              distinguished by our commitment to holistic excellence
            </p>
          </div>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {[
              {
                icon: Heart,
                title: "Caring Environment",
                desc: "Nurturing atmosphere",
              },
              {
                icon: Sparkles,
                title: "Quality Education",
                desc: "Academic excellence",
              },
              { icon: Users, title: "Community", desc: "Strong partnerships" },
              {
                icon: Award,
                title: "Holistic Growth",
                desc: "Balanced development",
              },
            ].map((item, idx) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
              <motion.div key={idx} variants={fadeIn}>
                <Card className="h-full p-6 text-center hover:shadow-lg transition-shadow border-none shadow-sm bg-background/50 backdrop-blur-sm">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <item.icon className="size-6" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Premises Focus */}
      <section className="py-24">
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-primary text-primary-foreground rounded-3xl p-8 sm:p-12 lg:p-16 relative overflow-hidden">
            {/* Pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4 max-w-xl">
                <h2 className="text-3xl md:text-4xl font-bold font-serif">
                  Our Campus
                </h2>
                <p className="text-primary-foreground/90 text-lg leading-relaxed">
                  Based in {marketingSite.address.city}, near the serene
                  Omkareshwar Temple, our campus is designed to be a second home
                  for our students—stimulating, safe, and inspiring.
                </p>
                <div className="flex items-center gap-2 pt-2 text-sm font-medium opacity-80">
                  <Building2 className="size-4" />
                  <span>{marketingSite.address.full}</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <motion.a
                  href="/facilities"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 bg-background text-primary px-8 py-4 rounded-full font-semibold shadow-lg hover:bg-secondary transition-colors"
                >
                  View Facilities
                </motion.a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
