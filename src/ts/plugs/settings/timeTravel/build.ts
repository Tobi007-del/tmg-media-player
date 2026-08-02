import { DeepPartial } from "sia-reactor";
import { TimeTravelConfig } from "./types";

export const TIME_TRAVEL_BUILD: DeepPartial<TimeTravelConfig> = {
  module: {
    whitelist: ["intent"], // for undoing actions while "state" for reliving time itself
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
