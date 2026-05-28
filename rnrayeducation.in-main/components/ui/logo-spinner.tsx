"use client";

import { motion } from "motion/react";
import Image from "next/image";

export function LogoSpinner({
  className = "",
  size = 80,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent, rgba(59, 130, 246, 0.8), transparent)`,
          }}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div className="absolute inset-[3px] rounded-full bg-background" />
        <div className="absolute inset-[6px] rounded-full overflow-hidden bg-background">
          <Image
            src="/logo.png"
            alt="Loading"
            fill
            className="object-contain p-2"
          />
        </div>
      </div>
      <motion.p
        className="text-sm text-muted-foreground font-medium"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Loading...
      </motion.p>
    </div>
  );
}
