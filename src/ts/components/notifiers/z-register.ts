import { ComponentRegistry } from "@core/registries";
import { PlayPauseNotifier } from "./playpause";
import { PrevNextNotifier } from "./prevnext";
import { CaptionsNotifier } from "./captions";
import { CaptureNotifier } from "./capture";
import { PlaybackRateNotifier } from "./playbackrate";
import { FastPlayNotifier } from "./fastplay";
import { VolumeNotifier } from "./volume";
import { BrightnessNotifier } from "./brightness";
import { ObjectFitNotifier } from "./objectfit";
import { FwdBwdNotifier } from "./fwdbwd";
import { ScrubNotifier } from "./scrub";
import { CancelScrubNotifier } from "./cancelscrub";
import { TouchVolumeNotifier } from "./touchvolume";
import { TouchBrightnessNotifier } from "./touchbrightness";
import { TouchTimelineNotifier } from "./touchtimeline";
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
