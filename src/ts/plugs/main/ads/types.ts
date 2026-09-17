import type { ToastOptions } from "@t007/toast";
import { MediaReport } from "@defs/contract";
import type { Inert } from "sia-reactor";

export interface AdRoll {
  url: string;
  time: number | string; // preroll, postroll, midroll - positives, negatives, percents
  badge: string; // show "Sponsored" in the skip toast
  played: boolean;
  media: MediaReport;
  toasts: Record<"meta" | "skip", ToastOptions>;
}

export interface AdsConfig {
  rolls: Inert<AdRoll[]>;
  options: {
    locale: string;
    vpaidMode: number; // 0 = DISABLED, 1 = ENABLED, 2 = INSECURE
    maxRedirects: number;
  };
}

export interface AdsState {
  roll: AdRoll | null;
}
