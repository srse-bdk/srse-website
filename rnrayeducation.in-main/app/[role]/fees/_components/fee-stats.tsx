"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";
import { Banknote, TrendingDown, TrendingUp, Users } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FeeStatsProps {
    totalStudents: number;
    totalCollections: number;
    totalPending: number;
    collectionRate: number;
}

export function FeeStats({
    totalStudents,
    totalCollections,
    totalPending,
    collectionRate,
}: FeeStatsProps) {
    const stats = [
        {
            title: "Total Collections",
            value: totalCollections,
            isCurrency: true,
            icon: Banknote,
            description: "Total fees collected this year",
            gradient: "from-emerald-500 to-emerald-600",
            bgGradient: "from-emerald-500/10 to-emerald-600/5",
            accentColor: "text-emerald-500",
        },
        {
            title: "Pending Dues",
            value: totalPending,
            isCurrency: true,
            icon: TrendingDown,
            description: "Total outstanding fees",
            gradient: "from-rose-500 to-rose-600",
            bgGradient: "from-rose-500/10 to-rose-600/5",
            accentColor: "text-rose-500",
        },
        {
            title: "Collection Rate",
            value: collectionRate,
            isPercentage: true,
            icon: TrendingUp,
            description: "Percentage of fees collected",
            gradient: "from-blue-500 to-blue-600",
            bgGradient: "from-blue-500/10 to-blue-600/5",
            accentColor: "text-blue-500",
        },
        {
            title: "Students with Dues",
            value: totalStudents,
            icon: Users,
            description: "Students with pending payments",
            gradient: "from-orange-500 to-orange-600",
            bgGradient: "from-orange-500/10 to-orange-600/5",
            accentColor: "text-orange-500",
        },
    ];

    return (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{
                            delay: index * 0.1,
                            type: "spring",
                            stiffness: 100,
                            damping: 15
                        }}
                        whileHover={{ y: -5 }}
                    >
                        <Card className="group relative overflow-hidden border-none bg-background/50 backdrop-blur-md ring-1 ring-border transition-all duration-500 hover:shadow-2xl hover:ring-primary/20">
                            {/* Animated Background Gradient */}
                            <div className={cn(
                                "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-10",
                                stat.bgGradient
                            )} />

                            {/* Watermark Icon */}
                            <div className="absolute -right-2 -bottom-2 opacity-[0.03] transition-all duration-700 group-hover:scale-110 group-hover:opacity-[0.08] pointer-events-none transform rotate-12">
                                <Icon size={120} strokeWidth={1} />
                            </div>

                            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                                <CardTitle className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
                                    {stat.title}
                                </CardTitle>
                                <motion.div
                                    whileHover={{ rotate: 360, scale: 1.1 }}
                                    transition={{ duration: 0.5 }}
                                    className={cn(
                                        "flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg shadow-black/5 opacity-90 transition-all duration-500",
                                        stat.gradient
                                    )}
                                >
                                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                </motion.div>
                            </CardHeader>
                            <CardContent className="relative p-4 pt-1">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        initial={{ filter: "blur(4px)", opacity: 0 }}
                                        animate={{ filter: "blur(0px)", opacity: 1 }}
                                        className={cn(
                                            "text-xl sm:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r",
                                            stat.gradient
                                        )}
                                    >
                                        {stat.isCurrency ? formatCurrency(stat.value) :
                                            stat.isPercentage ? `${stat.value.toFixed(1)}%` :
                                                stat.value}
                                    </motion.div>
                                </AnimatePresence>
                                <motion.div
                                    initial={{ x: -10, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 + index * 0.1 }}
                                    className="flex items-center gap-1.5 mt-2"
                                >
                                    <div className={cn("h-1 w-1 rounded-full", stat.accentColor.replace('text', 'bg'))} />
                                    <p className="text-[9px] sm:text-[11px] text-muted-foreground font-medium">
                                        {stat.description}
                                    </p>
                                </motion.div>
                            </CardContent>

                            {/* Decorative Corner SVG */}
                            <svg className="absolute top-0 right-0 h-16 w-16 opacity-[0.02] transform translate-x-8 -translate-y-8" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" />
                            </svg>
                        </Card>
                    </motion.div>
                );
            })}
        </div>
    );
}
