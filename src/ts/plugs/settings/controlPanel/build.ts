import { DeepPartial } from "sia-reactor";
import { ControlPanelConfig, ControlPanelDraggable } from "./types";
import { IS_MOBILE } from "@utils/env";
import { TIME_TRAVEL_BUILD } from "@plugs/settings/timeTravel/build";
import { OVERLAY_WHITELIST } from "@plugs/settings/overlay/build";

export const ROWS_ARR = [1, 2, 3] as const;

export const CONTROLS = ["bigPrevious", "bigPlayPause", "bigNext", "expandMiniplayer", "removeMiniplayer", "meta", "timeline", "capture", "fullscreenOrientation", "fullscreenLock", "backward", "previous", "playPause", "next", "forward", "brightness", "volume", "time", "duration", "timeAndDuration", "spacer", "captions", "settings", "objectFit", "pictureInPicture", "theater", "fullscreen", "cast", "airplay", "voice", "chapters", "playlist"] as const;

export const CONTROL_PANEL_DRAGGABLE_BUILD: ControlPanelDraggable = ["", "big", "wrapper"];

export const CONTROL_PANEL_BUILD: DeepPartial<ControlPanelConfig> = {
  profile: true,
  title: true,
  artist: true,
  top: ["expandMiniplayer", "spacer", "meta", "spacer", "playlist", "capture", "fullscreenLock", "airplay", "cast", "fullscreenOrientation", "removeMiniplayer"],
  center: ["bigPrevious", "bigPlayPause", "bigNext"],
  bottom: {
    1: [],
    2: ["spacer", "timeline", "spacer"],
    3: [...(!IS_MOBILE ? (["previous", "playPause", "next"] as const) : []), "brightness", "volume", "timeAndDuration", "chapters", "spacer", "voice", "spacer", "captions", "settings", "objectFit", "pictureInPicture", "theater", "fullscreen"] as const,
  },
  buffer: {
    value: "eclipse",
    options: [
      { value: "eclipse", display: "Eclipse" },
      { value: "accent", display: "Accent" },
      { value: false, display: "Off" },
    ],
  },
  timeline: {
    step: "any",
    thumb: {
      value: true,
      options: [
        { value: "auto", display: "Auto" },
        { value: true, display: "On" },
        { value: false, display: "Off" },
      ],
    },
    scrub: {
      sync: false,
      relative: !IS_MOBILE,
      cancel: {
        delta: 15,
        timeout: 2000,
      },
    },
    label: "Media timeline",
    compact: IS_MOBILE,
    tooltip: false,
    previews: false,
    autopause: true,
    bufferMarks: false,
    playedMarks: false,
    advertMarks: true,
    formatTooltip: (v: number) => `${Math.round(v)}%`,
  },
  progressBar: IS_MOBILE,
  bigVisible: IS_MOBILE,
  // draggable: CONTROL_PANEL_DRAGGABLE_BUILD,
};

TIME_TRAVEL_BUILD.module.whitelist.config.push("settings.controlPanel.timeline.marks", "settings.controlPanel.top", "settings.controlPanel.center", "settings.controlPanel.bottom");
OVERLAY_WHITELIST.push("controlDragging");
