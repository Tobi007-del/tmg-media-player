import { UISettings } from "@defs/UIOptions";

export interface OverlayConfig {
  delay: number;
  curtain: UISettings<"cover" | "edged" | "none">;
  behavior: UISettings<"persistent" | "auto" | "strict" | "hidden">;
}

export interface OverlayState {
  visible: boolean;
}
