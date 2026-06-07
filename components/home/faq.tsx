"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MinusIcon, PlusIcon } from "lucide-react";
import type { FaqItem, FaqConfig, FaqCategory } from "@/lib/config/faq";

const categories = [
  { id: "all", label: "All" },
  { id: "general", label: "General" },
  { id: "technical", label: "Technical" },
  { id: "pricing", label: "Pricing" },
  { id: "support", label: "Support" },
];

export interface FaqProps {
  faqItems?: FaqItem[];
  config?: FaqConfig;
}

export function Faq({ faqItems: items, config }: FaqProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    if (!items || items.length === 0) return [];
    return activeCategory === "all"
      ? items
      : items.filter((item) => item.category === activeCategory);
  }, [items, activeCategory]);

  const availableCategories = useMemo(() => {
    if (!items || items.length === 0) return [];
    const cats = new Set(items.map((item) => item.category));
    return categories.filter(
      (cat) => cat.id === "all" || cats.has(cat.id as FaqCategory)
    );
  }, [items]);

  if (!items || items.length === 0) {
    return null;
  }

  const faqTitle = config?.title || "Frequently Asked Questions";
  const faqDescription =
    config?.description || "Find answers to common questions.";
  const contactText =
    config?.contactText || "Can't find what you're looking for?";
  const contactLink = config?.contactLink || "#contact";

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section className="relative bg-gradient-to-b from-background via-background to-muted/20 py-20 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 right-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-accent/5 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="mb-12 flex flex-col items-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-4"
          >
            <Badge
              variant="outline"
              className="border-primary bg-primary/10 mb-4 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase"
            >
              <span className="size-2 rounded-full bg-primary animate-pulse mr-2 inline-block" />
              FAQs
            </Badge>
          </motion.div>

          <h2 className="text-foreground mb-6 text-center text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              {faqTitle}
            </span>
          </h2>

          <p className="text-muted-foreground max-w-2xl text-center text-lg leading-relaxed">
            {faqDescription}
          </p>
        </motion.div>

        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-10 flex flex-wrap justify-center gap-3"
        >
          {availableCategories.map((category, index) => (
            <motion.button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 shadow-sm",
                activeCategory === category.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-card border border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              {category.label}
            </motion.button>
          ))}
        </motion.div>

        {/* FAQ Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <AnimatePresence>
            {filteredFaqs.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={cn(
                  "border-border h-fit overflow-hidden rounded-2xl border bg-card/80 backdrop-blur-sm transition-all duration-300",
                  expandedId === faq.id
                    ? "shadow-xl shadow-primary/10 border-primary/50 bg-card"
                    : "shadow-md hover:shadow-lg hover:border-primary/30"
                )}
                style={{ minHeight: "88px" }}
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(faq.id)}
                  className="flex w-full items-center justify-between p-6 text-left hover:bg-primary/5 transition-colors duration-200 rounded-2xl"
                >
                  <h3 className="text-foreground text-lg font-semibold pr-4">
                    {faq.question}
                  </h3>
                  <div className="ml-4 flex-shrink-0">
                    <motion.div
                      animate={{
                        rotate: expandedId === faq.id ? 180 : 0,
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {expandedId === faq.id ? (
                        <div className="rounded-full bg-primary/10 p-1.5">
                          <MinusIcon className="text-primary h-5 w-5" />
                        </div>
                      ) : (
                        <div className="rounded-full bg-primary/10 p-1.5">
                          <PlusIcon className="text-primary h-5 w-5" />
                        </div>
                      )}
                    </motion.div>
                  </div>
                </button>

                <AnimatePresence>
                  {expandedId === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="border-border border-t bg-muted/30 px-6 pt-4 pb-6">
                        <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-muted-foreground mb-6 text-lg">{contactText}</p>
          <motion.a
            href={contactLink}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="border-primary bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-xl border-2 px-8 py-4 font-semibold shadow-lg shadow-primary/20 transition-all duration-300"
          >
            Contact Support
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
