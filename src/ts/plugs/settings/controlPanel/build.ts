import { DeepPartial } from "sia-reactor";
import { ControlPanelConfig, ControlPanelDraggable } from "./types";
import { IS_MOBILE } from "@utils/env";

export const ROWS_ARR = [1, 2, 3] as const;

export const CONTROLS = ["expandminiplayer", "removeminiplayer", "meta", "timeline", "capture", "fullscreenorientation", "fullscreenlock", "backward10", "prev", "playpause", "next", "forward10", "brightness", "volume", "timeandduration", "spacer", "captions", "settings", "objectfit", "pictureinpicture", "theater", "fullscreen", "cast", "airplay", "chapter"] as const;

export const BIG_CONTROLS = ["bigprev", "bigplaypause", "bignext"] as const;

export const CONTROL_PANEL_DRAGGABLE_BUILD: ControlPanelDraggable = ["", "big", "wrapper"];

export const CONTROL_PANEL_BUILD: DeepPartial<ControlPanelConfig> = {
  profile: true,
  title: true,
  artist: true,
  top: ["expandminiplayer", "spacer", "meta", "spacer", "capture", "fullscreenlock", "airplay", "cast", "fullscreenorientation", "removeminiplayer"],
  center: ["bigprev", "bigplaypause", "bignext"],
  bottom: {
    1: [],
    2: ["spacer", "timeline", "spacer"],
    3: [...(!IS_MOBILE ? (["prev", "playpause", "next"] as const) : []), "brightness", "volume", "timeandduration", "chapter", "spacer", "captions", "settings", "objectfit", "pictureinpicture", "theater", "fullscreen"] as const,
  },
  buffer: {
    value: "eclipse",
    options: [
      { value: "eclipse", display: "Eclipse" },
      { value: "accent", display: "Accent" },
      { value: false, display: "Off" },
    ]
  },
  timeline: {
    thumb: {
      value: true,
      options: [
        { value: "auto", display: "Auto" },
        { value: true, display: "On" },
        { value: false, display: "Off" },
      ]
    },
    previews: false,
    scrub: {
      sync: false,
      relative: !IS_MOBILE,
      cancel: {
        delta: 15,
        timeout: 2000,
      },
    },
    label: "Media Timeline",
    tooltip: false,
    autopause: true,
    compact: IS_MOBILE,
    bufferMarks: false,
    playedMarks: false,
  },
  progressBar: IS_MOBILE,
  // draggable: CONTROL_PANEL_DRAGGABLE_BUILD,
};
