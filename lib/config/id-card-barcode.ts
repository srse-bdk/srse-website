/**
 * Gate / handheld laser scanners read CODE39 more reliably than dense CODE128
 * on small printed ID cards. Settings target ≥0.33 mm bar width when printed.
 */
export const ID_CARD_BARCODE_FORMAT = "CODE39" as const;

export const ID_CARD_BARCODE_MODULE_WIDTH = 3;
export const ID_CARD_BARCODE_BAR_HEIGHT_PX = 100;
export const ID_CARD_BARCODE_QUIET_ZONE_PX = 18;
