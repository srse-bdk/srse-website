import { marketingSite } from "@/lib/config/marketing";

export type IdCardOrientation = "landscape" | "portrait";

/** Landscape CR80 ID card (85.6 mm × 54 mm). */
export const ID_CARD_WIDTH_MM = 85.6;
export const ID_CARD_HEIGHT_MM = 54;

/** Portrait CR80 ID card (54 mm × 85.6 mm). */
export const ID_CARD_PORTRAIT_WIDTH_MM = 54;
export const ID_CARD_PORTRAIT_HEIGHT_MM = 85.6;

/** Fixed regions — must sum to ID_CARD_HEIGHT_MM. */
export const ID_CARD_HEADER_HEIGHT_MM = 16;
export const ID_CARD_BODY_HEIGHT_MM = 34.5;
export const ID_CARD_FOOTER_HEIGHT_MM = 3.5;

export const ID_CARD_PHOTO_SIZE_MM = 30;
export const ID_CARD_QR_SIZE_MM = 17;
export const ID_CARD_RIGHT_COL_WIDTH_MM = 20;

/** Portrait card regions — must sum to ID_CARD_PORTRAIT_HEIGHT_MM. */
export const ID_CARD_PORTRAIT_HEADER_HEIGHT_MM = 10;
export const ID_CARD_PORTRAIT_BODY_HEIGHT_MM = 72.1;
export const ID_CARD_PORTRAIT_FOOTER_HEIGHT_MM = 3.5;
/** Body grid rows (gaps excluded). Must fit inside body with 1mm vertical padding + 0.5mm row gaps. */
export const ID_CARD_PORTRAIT_ROW_TOP_MM = 8;
export const ID_CARD_PORTRAIT_ROW_PHOTO_MM = 44.1;
/** Single row: details | signature | QR */
export const ID_CARD_PORTRAIT_ROW_INFO_MM = 17;
export const ID_CARD_PORTRAIT_COL_GAP_MM = 1.5;
export const ID_CARD_PORTRAIT_LOGO_SIZE_MM = 7;
export const ID_CARD_PORTRAIT_PHOTO_SIZE_MM = 40;
export const ID_CARD_PORTRAIT_QR_SIZE_MM = 12;

/** A4 portrait: 2 columns × 4 rows = 8 landscape cards per sheet. */
export const ID_CARDS_PER_PAGE = 8;
export const ID_CARD_GRID_COLUMNS = 2;
export const ID_CARD_GRID_ROWS = 4;

/** A4 portrait: 3 columns × 3 rows = 9 portrait cards per sheet. */
export const ID_CARDS_PORTRAIT_PER_PAGE = 9;
export const ID_CARD_PORTRAIT_GRID_COLUMNS = 3;
export const ID_CARD_PORTRAIT_GRID_ROWS = 3;

export const DEFAULT_ACADEMIC_YEAR = "2026-27";

export interface IdCardLayoutSpec {
  orientation: IdCardOrientation;
  widthMm: number;
  heightMm: number;
  cardsPerPage: number;
  gridColumns: number;
  gridRows: number;
  columnGapMm: number;
  rowGapMm: number;
}

export function getIdCardLayout(
  orientation: IdCardOrientation = "landscape",
): IdCardLayoutSpec {
  if (orientation === "portrait") {
    return {
      orientation: "portrait",
      widthMm: ID_CARD_PORTRAIT_WIDTH_MM,
      heightMm: ID_CARD_PORTRAIT_HEIGHT_MM,
      cardsPerPage: ID_CARDS_PORTRAIT_PER_PAGE,
      gridColumns: ID_CARD_PORTRAIT_GRID_COLUMNS,
      gridRows: ID_CARD_PORTRAIT_GRID_ROWS,
      columnGapMm: 3,
      rowGapMm: 3,
    };
  }

  return {
    orientation: "landscape",
    widthMm: ID_CARD_WIDTH_MM,
    heightMm: ID_CARD_HEIGHT_MM,
    cardsPerPage: ID_CARDS_PER_PAGE,
    gridColumns: ID_CARD_GRID_COLUMNS,
    gridRows: ID_CARD_GRID_ROWS,
    columnGapMm: 4,
    rowGapMm: 3,
  };
}

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

export function getIdCardBaseStyle(
  orientation: IdCardOrientation = "landscape",
): { width: string; height: string; fontFamily: string } {
  const layout = getIdCardLayout(orientation);
  return {
    width: `${layout.widthMm}mm`,
    height: `${layout.heightMm}mm`,
    fontFamily: "Arial, Helvetica, sans-serif",
  };
}

/** @deprecated Use getIdCardBaseStyle("landscape") */
export const idCardBaseStyle = getIdCardBaseStyle("landscape");
