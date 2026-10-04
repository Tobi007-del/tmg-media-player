import { ToastOptions } from "@t007/toast";

export interface FrameConfig {
  disabled: boolean;
  fps: number;
  toast: ToastOptions;
  goodTime: {
    searchDuration: number;
    minSaturation: number;
    minBrightness: number;
  };
}
