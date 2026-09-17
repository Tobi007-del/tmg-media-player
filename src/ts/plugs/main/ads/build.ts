import { DeepPartial } from "sia-reactor";
import type { AdRoll, AdsConfig } from "./types";
import { MEDIA_ITEM_BUILD } from "@consts/media";

export const ADS_BUILD: AdsConfig = {
  rolls: [],
  options: {
    locale: "en",
    vpaidMode: 2, // INSECURE by default for maximum compatibility
    maxRedirects: 4,
  },
};

export const AD_ROLL_BUILD: DeepPartial<AdRoll> = {
  url: "",
  time: 0,
  badge: "Sponsored",
  played: false,
  media: {
    intent: {
      poster: MEDIA_ITEM_BUILD.intent!.poster,
      tracks: MEDIA_ITEM_BUILD.intent!.tracks,
    },
    status: {
      adPoints: [],
    },
    settings: {
      metadata: MEDIA_ITEM_BUILD.settings!.metadata as any,
    },
  },
  toasts: {
    meta: {
      position: "bottom-left",
      autoClose: false,
    },
    skip: {
      position: "bottom-right",
      autoClose: false,
      compact: true,
    },
  },
};
