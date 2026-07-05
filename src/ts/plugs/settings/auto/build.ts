import { AutoConfig } from "./types";
import { DeepPartial } from "sia-reactor";
import { capitalize, uncamelize } from "@utils/str";

export const APT_AUTOPLAY_OPTIONS = ["in-view", "out-view", "in-view-always", "out-view-always"] as const;

const AUTOPLAY_UI_OPTIONS = [{ value: false, display: "Off" }, ...APT_AUTOPLAY_OPTIONS.map((o) => ({ value: o, display: capitalize(uncamelize(String(o))) }))];

export const AUTO_BUILD: DeepPartial<AutoConfig> = {
  play: {
    value: false,
    options: AUTOPLAY_UI_OPTIONS
  },
  pause: {
    value: false,
    options: AUTOPLAY_UI_OPTIONS
  },
  next: {
    value: 20000,
    preview: {
      usePoster: true,
      time: 4,
      tease: true,
    },
  },
};
