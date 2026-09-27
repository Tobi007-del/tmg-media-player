import { AutoConfig } from "./types";
import { DeepPartial } from "sia-reactor";
import { capitalize } from "@utils/str";

export const APT_AUTOPLAY_OPTIONS = ["in-view", "out-view", "in-view-always", "out-view-always", "in-window-always", "out-window-always"] as const;

const AUTOPLAY_UI_OPTIONS = [{ value: false, display: "Off" }, ...APT_AUTOPLAY_OPTIONS.map((o) => ({ value: o, display: capitalize(o.replace(/-/g, " ")) }))];

export const AUTO_BUILD: DeepPartial<AutoConfig> = {
  play: {
    value: false,
    options: AUTOPLAY_UI_OPTIONS,
  },
  pause: {
    value: false,
    options: AUTOPLAY_UI_OPTIONS,
  },
  next: {
    countdown: 20,
    preview: {
      usePoster: true,
      tease: true,
      loop: false,
      min: 0,
      max: 4,
    },
    toast: {
      position: "bottom-right",
      hideProgressBar: false,
      tag: "tmg-anma",
    },
  },
};
