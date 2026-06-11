export type IdCardThemeId =
  | "sunshine"
  | "candy"
  | "royal"
  | "sunset"
  | "lavender"
  | "forest-fun";

export interface IdCardSettings {
  themeId?: IdCardThemeId;
  academicYear?: string;
  principalSignatureUrl?: string;
  principalSignatureFileKey?: string;
  updatedAt?: string;
}
