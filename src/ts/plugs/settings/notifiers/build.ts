import { NotifiersConfig } from "./types";

export const NOTIFIERS_BUILD: Partial<NotifiersConfig> = {
  disabled: false,
  list: ["playpausenotifier", "prevnextnotifier", "captionsnotifier", "capturenotifier", "playbackratenotifier", "fastplaynotifier", "volumenotifier", "brightnessnotifier", "objectfitnotifier", "fwdbwdnotifier", "scrubnotifier", "cancelscrubnotifier", "touchvolumenotifier", "touchbrightnessnotifier", "touchtimelinenotifier", "chapternotifier", "castnotifier", "airplaynotifier", "timernotifier"] as const,
};
