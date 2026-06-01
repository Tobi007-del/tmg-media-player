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
import { FwdNotifier } from "./fwd";
import { BwdNotifier } from "./bwd";
import { ScrubNotifier } from "./scrub";
import { CancelScrubNotifier } from "./cancelscrub";
import { TouchVolumeNotifier } from "./touchvolume";
import { TouchBrightnessNotifier } from "./touchbrightness";
import { TouchTimelineNotifier } from "./touchtimeline";

[
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
  FwdNotifier,
  BwdNotifier,
  ScrubNotifier,
  CancelScrubNotifier,
  TouchVolumeNotifier,
  TouchBrightnessNotifier,
  TouchTimelineNotifier,
].forEach((Comp) => ComponentRegistry.register(Comp));
