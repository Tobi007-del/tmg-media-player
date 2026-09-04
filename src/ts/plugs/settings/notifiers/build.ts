import { NotifiersConfig } from "./types";

export const NOTIFIERS_BUILD: Partial<NotifiersConfig> = {
  disabled: false,
  whitelist: ["playPauseNotifier", "prevNextNotifier", "captionsNotifier", "captureNotifier", "playbackRateNotifier", "fastPlayNotifier", "volumeNotifier", "brightnessNotifier", "objectFitNotifier", "fwdBwdNotifier", "scrubNotifier", "cancelScrubNotifier", "touchVolumeNotifier", "touchBrightnessNotifier", "touchTimelineNotifier", "chapterNotifier", "castNotifier", "airplayNotifier", "timerNotifier"] as const,
};
