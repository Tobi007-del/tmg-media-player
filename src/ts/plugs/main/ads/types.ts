import type { ToastOptions } from "@t007/toast";
import { MediaReport } from "@defs/contract";
import type { Inert } from "sia-reactor";

export interface AdRoll {
  url: string;
  time: number | string; // preroll, postroll, midroll - positives, negatives, percents; so yeah! everything
  badge: string; // show "Sponsored" in the skip toast
  played: boolean;
  media: MediaReport;
  toasts: Record<"prep" | "meta" | "skip", ToastOptions>; // since IMA wants to play "god" so "skip" is cosmetic
}

export interface AdsConfig {
  rolls: Inert<AdRoll[]>;
  settings: {
    locale: string;
    vpaidMode: number; // 0 = DISABLED, 1 = ENABLED, 2 = INSECURE
    maxRedirects: number;
  };
}

export interface AdsState {
  roll: AdRoll | null;
}
