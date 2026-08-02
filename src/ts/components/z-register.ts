import { ComponentRegistry } from "@core/registries";
import { RangeInput } from "./rangeinput";
import { Buffer } from "./buffer";
import { Meta } from "./controls/meta";
import { BigNextButton } from "./controls/bignext";
import { BigPlayPauseButton } from "./controls/bigplaypause";
import { BigPreviousButton } from "./controls/bigprevious";
import { PreviousButton } from "./controls/previous";
import { PlayPauseButton } from "./controls/playpause";
import { NextButton } from "./controls/next";
import { Forward10Button } from "./controls/forward10";
import { Backward10Button } from "./controls/backward10";
import { TimeButton } from "./controls/time";
import { DurationButton } from "./controls/duration";
import { TimeAndDurationButton } from "./controls/timeandduration";
import { SettingsButton } from "./controls/settings";
import { ObjectFitButton } from "./controls/objectfit";
import { PictureInPictureButton } from "./controls/pictureinpicture";
import { TheaterButton } from "./controls/theater";
import { CaptureButton } from "./controls/capture";
import { FullscreenButton } from "./controls/fullscreen";
import { FullscreenLockButton } from "./controls/fullscreenlock";
import { FullscreenOrientationButton } from "./controls/fullscreenorientation";
import { RemoveMiniplayerButton } from "./controls/removeminiplayer";
import { ExpandMiniplayerButton } from "./controls/expandminiplayer";
import { Timeline } from "./controls/timeline";
import { VolumeControl } from "./controls/volume";
import { BrightnessControl } from "./controls/brightness";
import { CaptionsView } from "./captionsview";
import { CaptionsButton } from "./controls/captions";
import { ScreenLockButton } from "./screenlock";
import { ChapterButton } from "./controls/chapter";
import { CastButton } from "./controls/cast";
import { AirPlayButton } from "./controls/airplay";
import { PiPPlaceholder } from "./holders/pipplaceholder";
import { CastPlaceholder } from "./holders/castplaceholder";
import { AirPlayPlaceholder } from "./holders/airplayplaceholder";

for (const Comp of [
  // Random Order
  RangeInput,
  Buffer,
  Meta,
  BigNextButton,
  BigPlayPauseButton,
  BigPreviousButton,
  PreviousButton,
  PlayPauseButton,
  NextButton,
  Forward10Button,
  Backward10Button,
  TimeButton,
  DurationButton,
  TimeAndDurationButton,
  SettingsButton,
  ObjectFitButton,
  PictureInPictureButton,
  TheaterButton,
  CaptureButton,
  FullscreenButton,
  FullscreenLockButton,
  FullscreenOrientationButton,
  RemoveMiniplayerButton,
  ExpandMiniplayerButton,
  Timeline,
  VolumeControl,
  BrightnessControl,
  CaptionsView,
  CaptionsButton,
  ScreenLockButton,
  ChapterButton,
  CastButton,
  AirPlayButton,
  PiPPlaceholder,
  CastPlaceholder,
  AirPlayPlaceholder,
])
  ComponentRegistry.register(Comp);
