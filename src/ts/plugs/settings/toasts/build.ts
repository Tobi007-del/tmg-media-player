import { ToastsConfig } from "./types";

export const TOASTS_BUILD = {
  limit: 7,
  position: "bottom-left",
  compact: false,
  hideProgressBar: true,
  closeButton: false,
  animation: "slide",
  dragToCloseDir: "x||y",
} satisfies ToastsConfig;
