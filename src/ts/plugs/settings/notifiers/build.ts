import type { ComponentRegistryMap } from "@defs/registries";
import type { NotifiersConfig } from "./types";

export const NOTIFIERS_BUILD: Partial<NotifiersConfig> = {
  disabled: false,
  centerBlocks: ["mediaPrevious", "mediaNext", "playbackRate", "volume", "brightness", "objectFit", "captions", "capture", "cast", "airplay"],
};

export const NOTIFIERS_WHITELIST: Array<keyof ComponentRegistryMap> = ["playPauseNotifier", "prevNextNotifier", "captionsNotifier", "captureNotifier", "playbackRateNotifier", "fastPlayNotifier", "volumeNotifier", "brightnessNotifier", "objectFitNotifier", "fwdBwdNotifier", "scrubNotifier", "cancelScrubNotifier", "touchVolumeNotifier", "touchBrightnessNotifier", "touchTimelineNotifier", "chapterNotifier", "castNotifier", "airplayNotifier"];

