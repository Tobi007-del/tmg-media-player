import {
  ERROR_CODES,
  MODES,
  WHITELISTED_KEYS,
  KEY_SHORTCUT_ACTIONS,
  KEY_SHORTCUT_MOD_ACTIONS,
  APT_AUTOPLAY_OPTIONS,
  ORIENTATION_OPTIONS,
} from "@consts/generics";

export type MediaType = "video" | "audio";
export type ErrorCode = (typeof ERROR_CODES)[number];
export type Mode = (typeof MODES)[number];
export type WhitelistedKey = (typeof WHITELISTED_KEYS)[number];
export type KeyShortcutAction = (typeof KEY_SHORTCUT_ACTIONS)[number];
export type KeyShortcutModAction = (typeof KEY_SHORTCUT_MOD_ACTIONS)[number];
export type AptAutoplayOption = (typeof APT_AUTOPLAY_OPTIONS)[number];
export type OrientationOption = (typeof ORIENTATION_OPTIONS)[number];
export type Dimensions = Record<"width" | "height", number>;

export interface Source {
  src: string;
  type: string;
  media: string;
}
export type Sources = Source[];
export type SrcObject = MediaSource | null;

export interface Track {
  kind: string;
  label: string;
  srclang: string;
  src: string;
  default: boolean;
  id: string;
}
export type Tracks = Track[];

export interface PosterPreview {
  usePoster: boolean;
  time: number;
  tease: boolean;
}

export interface AptRange {
  min: number;
  max: number;
  step: number;
}

export interface OptRange {
  min: number;
  max: number;
  skip: number;
}
