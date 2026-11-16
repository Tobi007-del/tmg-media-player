import { DeepPartial } from "sia-reactor";
import { TemporalConfig } from "./types";

export const TEMPORAL_BUILD: DeepPartial<TemporalConfig> & { module: { whitelist: { config: string[] } } } = {
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

export const TEMPORAL_DOCKLIST: string[] = [];

