import type { IdCardThemeId } from "@/lib/types/id-card-settings.type";

export interface IdCardTheme {
  id: IdCardThemeId;
  name: string;
  description: string;
  headerGradient: [string, string, string];
  headerTriangles: string[];
  footerGradient: [string, string, string];
  photoRing: string;
  photoFallbackFrom: string;
  photoFallbackTo: string;
  labelColor: string;
  valueColor: string;
  titleColor: string;
  schoolNameColor: string;
  sessionBadge: { bg: string; text: string };
}

export const ID_CARD_THEMES: Record<IdCardThemeId, IdCardTheme> = {
  sunshine: {
    id: "sunshine",
    name: "Sunshine Rainbow",
    description: "Warm coral, pink and purple — cheerful default",
    headerGradient: ["#FF6B6B", "#E84393", "#9B59B6"],
    headerTriangles: ["#FF8E53", "#FF6B9D", "#C56CF0", "#FFD93D"],
    footerGradient: ["#FFD93D", "#FF9F43", "#FF6B6B"],
    photoRing: "#F59E0B",
    photoFallbackFrom: "#FBCFE8",
    photoFallbackTo: "#FDE68A",
    labelColor: "#BE185D",
    valueColor: "#334155",
    titleColor: "#FFFFFF",
    schoolNameColor: "#FFFFFF",
    sessionBadge: { bg: "#FDE68A", text: "#B45309" },
  },
  candy: {
    id: "candy",
    name: "Candy Playground",
    description: "Soft peach and pink — best for youngest kids",
    headerGradient: ["#FF9A8B", "#FF6A88", "#FF99AC"],
    headerTriangles: ["#FFB347", "#FF85A2", "#FFCCD5", "#FFF1A8"],
    footerGradient: ["#A8E6CF", "#88D8B0", "#7EC8E3"],
    photoRing: "#FF6B9D",
    photoFallbackFrom: "#FFD1DC",
    photoFallbackTo: "#B5EAD7",
    labelColor: "#DB2777",
    valueColor: "#374151",
    titleColor: "#FFFFFF",
    schoolNameColor: "#FFFFFF",
    sessionBadge: { bg: "#FFD1DC", text: "#BE185D" },
  },
  royal: {
    id: "royal",
    name: "Royal Primary",
    description: "Purple and gold — bright but a bit formal",
    headerGradient: ["#7C3AED", "#A855F7", "#EC4899"],
    headerTriangles: ["#9333EA", "#C084FC", "#F472B6", "#FBBF24"],
    footerGradient: ["#FBBF24", "#F97316", "#EA580C"],
    photoRing: "#8B5CF6",
    photoFallbackFrom: "#E9D5FF",
    photoFallbackTo: "#FDE68A",
    labelColor: "#6D28D9",
    valueColor: "#1F2937",
    titleColor: "#FFFFFF",
    schoolNameColor: "#FFFFFF",
    sessionBadge: { bg: "#FEF3C7", text: "#92400E" },
  },
  sunset: {
    id: "sunset",
    name: "Sunset Joy",
    description: "Orange and yellow — bold and festive",
    headerGradient: ["#F97316", "#EF4444", "#DB2777"],
    headerTriangles: ["#FB923C", "#F87171", "#F472B6", "#FACC15"],
    footerGradient: ["#FDE68A", "#FDBA74", "#FB7185"],
    photoRing: "#FB923C",
    photoFallbackFrom: "#FED7AA",
    photoFallbackTo: "#FECACA",
    labelColor: "#C2410C",
    valueColor: "#292524",
    titleColor: "#FFFFFF",
    schoolNameColor: "#FFFBEB",
    sessionBadge: { bg: "#FFEDD5", text: "#9A3412" },
  },
  lavender: {
    id: "lavender",
    name: "Lavender Dream",
    description: "Pastel purple and cream — calm and soft",
    headerGradient: ["#A78BFA", "#C4B5FD", "#F9A8D4"],
    headerTriangles: ["#8B5CF6", "#DDD6FE", "#F0ABFC", "#FEF08A"],
    footerGradient: ["#FEF08A", "#FDE68A", "#FBCFE8"],
    photoRing: "#A78BFA",
    photoFallbackFrom: "#EDE9FE",
    photoFallbackTo: "#FCE7F3",
    labelColor: "#7C3AED",
    valueColor: "#374151",
    titleColor: "#FFFFFF",
    schoolNameColor: "#FAF5FF",
    sessionBadge: { bg: "#EDE9FE", text: "#5B21B6" },
  },
  "forest-fun": {
    id: "forest-fun",
    name: "Forest Friends",
    description: "Teal and sunny yellow — nature / outdoor feel",
    headerGradient: ["#0D9488", "#10B981", "#84CC16"],
    headerTriangles: ["#14B8A6", "#34D399", "#A3E635", "#FDE047"],
    footerGradient: ["#FDE047", "#FACC15", "#F97316"],
    photoRing: "#10B981",
    photoFallbackFrom: "#A7F3D0",
    photoFallbackTo: "#FEF08A",
    labelColor: "#047857",
    valueColor: "#1F2937",
    titleColor: "#FFFFFF",
    schoolNameColor: "#ECFDF5",
    sessionBadge: { bg: "#D9F99D", text: "#365314" },
  },
};

export const ID_CARD_THEME_LIST = Object.values(ID_CARD_THEMES);

export const DEFAULT_ID_CARD_THEME_ID: IdCardThemeId = "sunshine";

export function getIdCardTheme(themeId?: IdCardThemeId): IdCardTheme {
  if (themeId && ID_CARD_THEMES[themeId]) {
    return ID_CARD_THEMES[themeId];
  }
  return ID_CARD_THEMES[DEFAULT_ID_CARD_THEME_ID];
}
