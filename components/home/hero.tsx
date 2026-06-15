"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import { marketingSite } from "@/lib/config/marketing";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  Youtube,
  Play,
  Star,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function Hero() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  // Parallax effects
  const y1 = useTransform(scrollY, [0, 500], [0, 100]);
  const y2 = useTransform(scrollY, [0, 500], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  // Carousel images
  const carouselImages = [
    {
      id: 1,
      src: "/photos/play-time.jpg",
      alt: "Play Time",
      label: "Play Time",
    },
    { id: 2, src: "/photos/picnictme.jpeg", alt: "Picnic", label: "Community" },
    {
      id: 3,
      src: "/photos/morning-activity.jpg",
      alt: "Morning Activity",
      label: "Morning Activity",
    },
    {
      id: 4,
      src: "/photos/olympiad.jpeg",
      alt: "Olympiad",
      label: "Excellence",
    },
  ];

  // Auto slide functionality
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [carouselImages.length]);

  const socialMediaLinks = [
    {
      name: "Facebook",
      url: "https://www.facebook.com/profile.php?id=61573174480321",
      icon: Facebook,
      color: "group-hover:text-blue-600",
      bg: "group-hover:bg-blue-600/10",
    },
    {
      name: "Instagram",
      url: "https://www.instagram.com/srschool_bdk/",
      icon: Instagram,
      color: "group-hover:text-pink-600",
      bg: "group-hover:bg-pink-600/10",
    },
    {
      name: "YouTube",
      url: "https://www.youtube.com/@srschoolofexcellence",
      icon: Youtube,
      color: "group-hover:text-red-600",
      bg: "group-hover:bg-red-600/10",
    },
  ];

  return (
    <section
      ref={containerRef}
      className="relative lg:min-h-[100dvh] w-full flex items-center overflow-hidden bg-background pt-24 pb-6 lg:pt-20 lg:pb-0"
    >
      {/* 1. Unique SVG Background Pattern - Dot Grid & Geometric Shapes */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Subtle Grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Large Geometric Circle - Top Right */}
        <motion.div
          className="absolute -top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full border-[1px] border-primary/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute -top-[15%] -right-[5%] w-[50vw] h-[50vw] rounded-full border-[1px] border-dashed border-primary/20"
          animate={{ rotate: -360 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
        />

        {/* Floating Icons Background */}
        <FloatingIcon
          icon={GraduationCap}
          className="top-[20%] left-[10%] text-primary/10 w-12 h-12"
          delay={0}
        />
        <FloatingIcon
          icon={BookOpen}
          className="bottom-[15%] left-[5%] text-accent/10 w-16 h-16"
          delay={2}
        />
        <FloatingIcon
          icon={Star}
          className="top-[30%] right-[40%] text-yellow-500/10 w-8 h-8"
          delay={1}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 h-full flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center w-full">
          {/* --- LEFT SIDE: Text Content --- */}
          <div className="flex flex-col space-y-8 max-w-2xl order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              {/* Decorative Line above Title */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: 80 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="h-1 bg-gradient-to-r from-primary to-accent rounded-full"
              />

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
                Empowering <br />
                <span className="relative inline-block">
                  <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-600 to-accent">
                    Young Minds
                  </span>
                  {/* SVG Underline */}
                  {/** biome-ignore lint/a11y/noSvgWithoutTitle: <explanation> */}
                  <svg
                    className="absolute w-full h-3 -bottom-1 left-0 z-0 text-accent/30"
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
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-lg">
                {marketingSite.tagline}. Join us at {marketingSite.name}, where
                we blend traditional values with modern innovation to shape the
                leaders of tomorrow.
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              className="flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <Button
                size="lg"
                className="h-14 px-8 text-lg rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 bg-gradient-to-r from-primary to-primary/90"
                asChild
              >
                <Link href="/contact">
                  Enroll Now <ArrowRight className="ml-2 size-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg rounded-full border-2 hover:bg-secondary/80 hover:text-primary transition-colors"
                asChild
              >
                <Link href="/about">Discover More</Link>
              </Button>
            </motion.div>

            {/* Social & Stats */}
            <motion.div
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 pt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex -space-x-4">
                {[
                  "https://images.unsplash.com/photo-1485217988980-11786ced9454?auto=format&fit=crop&w=100&h=100",
                  "https://images.unsplash.com/photo-1491013516836-7db643ee125a?auto=format&fit=crop&w=100&h=100",
                  "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=100&h=100",
                  "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=100&h=100",
                ].map((src, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                    key={i}
                    className="w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground overflow-hidden"
                  >
                    <Image
                      src={src}
                      alt="Student"
                      width={40}
                      height={40}
                      className="object-cover h-full w-full"
                    />
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-background bg-primary text-white flex items-center justify-center text-xs font-bold">
                  1k+
                </div>
              </div>
              <div className="hidden sm:block h-8 w-px bg-border" />
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-muted-foreground mr-1">
                  Contact Us
                </span>
                {socialMediaLinks.map((social) => (
                  <Link
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    className={cn(
                      "group p-2 rounded-full border border-transparent transition-all duration-300 hover:border-border hover:bg-background shadow-none hover:shadow-sm",
                      social.bg,
                    )}
                  >
                    <social.icon
                      className={cn(
                        "size-5 text-muted-foreground transition-colors",
                        social.color,
                      )}
                    />
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>

          {/* --- RIGHT SIDE: Unique Visuals --- */}
          <div className="relative h-auto py-10 lg:py-0 lg:h-[700px] w-full flex items-center justify-center order-1 lg:order-2">
            {/* Abstract Blob Shape Background */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center z-0"
              animate={{ scale: [1, 1.05, 1], rotate: [0, 5, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            >
              {/** biome-ignore lint/a11y/noSvgWithoutTitle: <explanation> */}
              <svg
                viewBox="0 0 200 200"
                xmlns="http://www.w3.org/2000/svg"
                className="w-[120%] h-[120%] text-primary/5 fill-current"
              >
                <path
                  d="M42.7,-72.2C55.3,-66.1,65.6,-56.3,72.6,-44.6C79.6,-32.8,83.3,-19.1,81.8,-5.9C80.3,7.3,73.6,20.1,65.6,31.4C57.6,42.7,48.3,52.6,37.6,60.6C26.9,68.6,14.8,74.7,1.8,71.6C-11.2,68.5,-25.1,56.2,-37.9,46.1C-50.7,36,-62.4,28.1,-69.1,17.2C-75.8,6.3,-77.5,-7.6,-72.6,-19.6C-67.7,-31.6,-56.2,-41.7,-44.5,-48.1C-32.8,-54.5,-20.9,-57.2,-8.7,-58.5C3.5,-59.8,17,-59.7,30.1,-78.3L42.7,-72.2Z"
                  transform="translate(100 100)"
                />
              </svg>
            </motion.div>

            {/* Main Image Container with Unique Mask/Shape */}
            <motion.div
              style={{ y: y2 }}
              className="relative z-10 w-full max-w-2xl aspect-video"
            >
              {/* Image Mask - A custom shape using border-radius */}
              <div className="relative w-full h-full overflow-hidden rounded-[40px] rounded-tl-[100px] rounded-br-[100px] shadow-2xl border-4 border-background">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentImageIndex}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7 }}
                    className="relative w-full h-full"
                  >
                    <Image
                      src={carouselImages[currentImageIndex].src}
                      alt={carouselImages[currentImageIndex].alt}
                      fill
                      className="object-cover"
                      priority
                    />
                    {/* Gradient Overlay for Text Visibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* Dynamic Text on Image */}
                    <div className="absolute bottom-6 left-6 right-6 text-white text-right">
                      <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-xl font-bold font-serif italic"
                      >
                        "{carouselImages[currentImageIndex].label}"
                      </motion.p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Floating Elements (Orbiting) */}
              <motion.div
                className="absolute -top-6 -right-6 z-20 bg-background/80 backdrop-blur p-3 rounded-2xl shadow-lg border border-border"
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Sparkles className="size-6 text-yellow-500 fill-yellow-500" />
              </motion.div>

              <motion.div
                className="absolute -bottom-10 -left-10 z-20 bg-card p-4 rounded-xl shadow-xl border border-border max-w-[180px]"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Play className="size-4 fill-primary text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold">
                      Watch
                    </p>
                    <p className="text-sm font-bold">Campus Life</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Helper component for floating background icons
function FloatingIcon({
  icon: Icon,
  className,
  delay,
}: {
  icon: any;
  className?: string;
  delay: number;
}) {
  return (
    <motion.div
      className={cn("absolute pointer-events-none", className)}
      animate={{
        y: [0, -20, 0],
        rotate: [0, 10, -10, 0],
      }}
      transition={{
        duration: 5,
        delay: delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <Icon className="w-full h-full opacity-50" />
    </motion.div>
  );
}
