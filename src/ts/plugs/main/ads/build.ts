import { DeepPartial } from "sia-reactor";
import type { AdRoll, AdsConfig } from "./types";
import { MEDIA_ITEM_BUILD } from "@consts/media";

export const AD_ROLL_FORMATTED: unique symbol = Symbol.for("TMG_MEDIA_AD_ROLL_FORMATTED");

export const ADS_BUILD: AdsConfig = {
  rolls: [],
  settings: {
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
    prep: {
      render: "Advertisement break",
      compact: true,
      position: "top-left",
      autoClose: 5000,
      tag: "tmg-adpr",
    },
    meta: {
      position: "bottom-left",
      autoClose: false,
    },
    skip: {
      compact: true,
      position: "bottom-right",
      autoClose: false,
    },
  },
};
