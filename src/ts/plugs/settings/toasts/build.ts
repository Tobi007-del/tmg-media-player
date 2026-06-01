import { IS_MOBILE } from "@utils/browser";
import { Toasts } from "./types";

export const TOASTS_BUILD = {
  disabled: false,
  limit: 7,
  position: "bottom-left",
  hideProgressBar: true,
  closeButton: !IS_MOBILE,
  animation: "slide-up",
  dragToCloseDir: "x||y",
} satisfies Toasts;
