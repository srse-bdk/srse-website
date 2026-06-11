import { marketingSite } from "@/lib/config/marketing";

/** Landscape CR80 ID card (85.6 mm × 54 mm). */
export const ID_CARD_WIDTH_MM = 85.6;
export const ID_CARD_HEIGHT_MM = 54;

/** Fixed regions — must sum to ID_CARD_HEIGHT_MM. */
export const ID_CARD_HEADER_HEIGHT_MM = 16;
export const ID_CARD_BODY_HEIGHT_MM = 34.5;
export const ID_CARD_FOOTER_HEIGHT_MM = 3.5;

export const ID_CARD_PHOTO_SIZE_MM = 30;
export const ID_CARD_QR_SIZE_MM = 17;
export const ID_CARD_RIGHT_COL_WIDTH_MM = 20;

/** A4 portrait: 2 columns × 4 rows = 8 landscape cards per sheet. */
export const ID_CARDS_PER_PAGE = 8;
export const ID_CARD_GRID_COLUMNS = 2;
export const ID_CARD_GRID_ROWS = 4;

export const DEFAULT_ACADEMIC_YEAR = "2026-27";

export const idCardBranding = {
  schoolName: marketingSite.name,
  schoolLogo: "/logo.png",
  schoolAddress: "Acharya Nagar, Near Bont Chhak, Bhadrak - 756100",
  schoolEstablished: "ESTD: 2016",
} as const;

export const ID_CARD_PRINT_PAGE_STYLE = `
  @page {
    margin: 8mm;
    size: A4 portrait;
  }
  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .id-card-print-toolbar {
      display: none !important;
    }
    .id-card-print-only {
      position: static !important;
      left: auto !important;
      z-index: auto !important;
      pointer-events: auto !important;
    }
    .id-card-qr svg {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

export const idCardBaseStyle = {
  width: `${ID_CARD_WIDTH_MM}mm`,
  height: `${ID_CARD_HEIGHT_MM}mm`,
  fontFamily: "Arial, Helvetica, sans-serif",
} as const;
