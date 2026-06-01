import { DeepPartial } from "sia-reactor";
import { ControlPanel, ControlPanelDraggable } from "./types";
import { IS_MOBILE } from "@utils/browser";

export const ROWS_ARR = [1, 2, 3] as const;

export const CONTROL_PANEL_DRAGGABLE_BUILD: ControlPanelDraggable = ["", "big", "wrapper"];

export const CONTROL_PANEL_BUILD: DeepPartial<ControlPanel> = {
  profile: true,
  title: true,
  artist: true,
  top: ["expandminiplayer", "spacer", "meta", "spacer", "capture", "fullscreenlock", "fullscreenorientation", "removeminiplayer"],
  center: ["bigprev", "bigplaypause", "bignext"],
  bottom: {
    1: [],
    2: ["spacer", "timeline", "spacer"],
    3: [...(!IS_MOBILE ? (["prev", "playpause", "next"] as const) : []), "brightness", "volume", "timeandduration", "spacer", "captions", "settings", "objectfit", "pictureinpicture", "theater", "fullscreen"] as const,
  },
  buffer: "eclipse",
  timeline: {
    thumbIndicator: true,
    seek: {
      sync: false,
      relative: !IS_MOBILE,
      cancel: {
        delta: 15,
        timeout: 2000,
      },
    },
    previews: false,
  },
  progressBar: IS_MOBILE,
  // draggable: CONTROL_PANEL_DRAGGABLE_BUILD,
};
