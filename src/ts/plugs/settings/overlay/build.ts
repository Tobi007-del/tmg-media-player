import { OverlayConfig } from "./types";
import { DeepPartial } from "sia-reactor";

export const OVERLAY_BUILD: DeepPartial<OverlayConfig> = {
  delay: 3000,
  behavior: {
    value: "auto",
    options: [
      { value: "auto", display: "Auto" },
      { value: "strict", display: "Strict" },
      { value: "persistent", display: "Persistent" },
      { value: "hidden", display: "Hidden" },
    ],
  },
  curtain: {
    value: "edged",
    options: [
      { value: "edged", display: "Edged" },
      { value: "cover", display: "Cover" },
      { value: "none", display: "None" },
    ],
  },
};

export const OVERLAY_WHITELIST: string[] = [];

