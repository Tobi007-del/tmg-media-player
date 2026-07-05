import { ToastsConfig } from "./types";

export const TOASTS_BUILD = {
  disabled: false,
  limit: 7,
  position: "bottom-left",
  hideProgressBar: true,
  closeButton: false,
  animation: "slide-up",
  dragToCloseDir: "x||y",
} satisfies ToastsConfig;
