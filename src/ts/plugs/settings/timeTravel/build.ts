import { DeepPartial } from "sia-reactor";
import { TimeTravel } from "./types";

export const TIME_TRAVEL_BUILD: DeepPartial<TimeTravel> = {
  module: {
    whitelist: ["intent"], // for undoing actions while "state" for reliving time itself
    mirrorReadFrom: true,
    mirrorWriteTo: true,
  },
  persist: false,
};
