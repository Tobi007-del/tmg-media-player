import { OverlayConfig } from "./types";
import { DeepPartial } from "sia-reactor";

export const OVERLAY_BUILD: DeepPartial<OverlayConfig> = {
  delay: 3000,
  behavior: {
    value: "strict",
    options: [
      { value: "strict", display: "Strict" },
      { value: "auto", display: "Auto" },
      { value: "persistent", display: "Persistent" },
      { value: "hidden", display: "Hidden" },
    ]
  },
  curtain: {
    value: "edged",
    options: [
      { value: "edged", display: "Edged" },
      { value: "cover", display: "Cover" },
      { value: "none", display: "None" },
    ]
  }
};
