import { ToastOptions } from "@t007/toast";

export interface FrameConfig {
  disabled: boolean;
  fps: number;
  captureAutoClose: ToastOptions["autoClose"];
}

