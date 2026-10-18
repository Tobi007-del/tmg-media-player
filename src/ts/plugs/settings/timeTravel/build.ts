import { DeepPartial } from "sia-reactor";
import { TimeTravelConfig } from "./types";

export const TIME_TRAVEL_BUILD: DeepPartial<TimeTravelConfig> & { module: { whitelist: { config: string[] } } } = {
  module: {
    whitelist: {
      media: ["intent"], // for undoing actions while "state" for reliving time itself
      config: [],
    },
    blacklist: {
      media: ["intent.paused"],
    },
    mirrorReads: true,
    mirrorWrites: true,
  },
  console: {
    disabled: true,
    devOnly: false,
    startOpen: true,
  },
  persist: false,
};

export const TIME_TRAVEL_DOCKLIST: string[] = [];

