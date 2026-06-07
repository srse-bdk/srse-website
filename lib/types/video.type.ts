import type { BaseEntity } from "./common.type";

export interface Video extends BaseEntity {
  title: string;
  youtubeId: string;
  description?: string;
  url: string; // The full YouTube URL for reference
}

export interface VideoInput {
  title: string;
  youtubeId: string;
  description?: string;
  url: string;
}
