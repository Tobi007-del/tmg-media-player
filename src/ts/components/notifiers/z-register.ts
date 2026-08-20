import { ComponentRegistry } from "@core/registries";
import { PlayPauseNotifier } from "./playPause";
import { PrevNextNotifier } from "./prevNext";
import { CaptionsNotifier } from "./captions";
import { CaptureNotifier } from "./capture";
import { PlaybackRateNotifier } from "./playbackRate";
import { FastPlayNotifier } from "./fastPlay";
import { VolumeNotifier } from "./volume";
import { BrightnessNotifier } from "./brightness";
import { ObjectFitNotifier } from "./objectFit";
import { FwdBwdNotifier } from "./fwdBwd";
import { ScrubNotifier } from "./scrub";
import { CancelScrubNotifier } from "./cancelScrub";
import { TouchVolumeNotifier } from "./touchVolume";
import { TouchBrightnessNotifier } from "./touchBrightness";
import { TouchTimelineNotifier } from "./touchTimeline";
import { ChapterNotifier } from "./chapter";
import { CastNotifier } from "./cast";
import { AirPlayNotifier } from "./airplay";
import { TimerNotifier } from "./timer";

for (const Comp of [
  // Random Order
  PlayPauseNotifier,
  PrevNextNotifier,
  CaptionsNotifier,
  CaptureNotifier,
  PlaybackRateNotifier,
  FastPlayNotifier,
  VolumeNotifier,
  BrightnessNotifier,
  ObjectFitNotifier,
  FwdBwdNotifier,
  ScrubNotifier,
  CancelScrubNotifier,
  TouchVolumeNotifier,
  TouchBrightnessNotifier,
  TouchTimelineNotifier,
  ChapterNotifier,
  CastNotifier,
  AirPlayNotifier,
  TimerNotifier,
])
  ComponentRegistry.register(Comp);
