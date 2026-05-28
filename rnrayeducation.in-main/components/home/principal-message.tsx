"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";

export function PrincipalMessage() {
    return (
        <section className="relative py-20 lg:py-32 overflow-hidden bg-secondary/50">
            {/* Decorative Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

                    {/* Image Section */}
                    <motion.div
                        className="w-full lg:w-5/12 mx-auto"
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="relative group">
                            {/* Image Frame */}
                            <div className="relative rounded-2xl overflow-hidden aspect-[3/4] shadow-2xl border-[8px] border-white dark:border-card">
                                {/* Fallback image if generation failed, or use a placeholder that looks professional */}
                                <Image
                                    src="/photos/principal2.jpeg"
                                    alt="Principal"
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />

                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                                {/* Name Badge on Image */}
                                <div className="absolute bottom-6 left-6 text-white z-10">
                                    <p className="text-lg font-bold">Mrs. Himani Ray</p>
                                    <p className="text-sm font-medium opacity-90">Principal, M.A(Eco), BEd</p>
                                </div>
                            </div>

                        </div>
                    </motion.div>

                    {/* Content Section */}
                    <motion.div
                        className="w-full lg:w-7/12"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <div className="space-y-8 text-center lg:text-left relative">
                            {/* Watermark Logo */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] opacity-10 pointer-events-none z-0">
                                <Image
                                    src="/logo.png"
                                    alt="Watermark"
                                    fill
                                    className="object-contain"
                                />
                            </div>

                            {/* Section Tag */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium relative z-10">
                                <span className="w-2 h-2 rounded-full bg-primary" />
                                Principal&apos;s Message
                            </div>

                            {/* Heading */}
                            <h2 className="text-3xl md:text-5xl font-bold text-foreground relative z-10">
                                Inspiring Minds, <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                                    Building Character
                                </span>
                            </h2>

                            {/* Quote Block */}
                            <div className="relative z-10">
                                <Quote className="absolute -top-4 -left-4 w-12 h-12 text-primary/10 rotate-180" />
                                <blockquote className="text-lg md:text-xl text-muted-foreground leading-relaxed italic relative z-10 px-4">
                                    "Education is not merely the accumulation of facts; it is the preparation of life itself. At S R School of Excellence, we believe in nurturing not just scholars, but compassionate, creative, and confident individuals who will shape the future of our society."
                                </blockquote>
                            </div>

                            {/* Message Body */}
                            <div className="space-y-4 text-muted-foreground leading-relaxed relative z-10">
                                <p>
                                    Welcome to our vibrant learning community. Our mission goes beyond textbooks and exams. We strive to create an environment where curiosity is celebrated, and every child's unique potential is recognized and cultivated.
                                </p>
                                <p>
                                    With state-of-the-art facilities and a dedicated team of educators, we are committed to providing a holistic education that balances academic rigor with co-curricular excellence. We invite you to join us on this journey of discovery and growth.
                                </p>
                            </div>

                            {/* Signature Area (Optional Visual) */}
                            <div className="pt-6 border-t border-border flex flex-col lg:flex-row items-center gap-4 lg:gap-8 justify-center lg:justify-start relative z-10">
                                <div className="font-handwriting text-2xl text-primary font-bold opacity-80">
                                    Mrs. Himani Ray
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    <span className="font-semibold text-foreground">Mrs. Himani Ray</span>
                                    <span className="mx-2">•</span>
                                    Principal
                                </div>
                            </div>

                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
