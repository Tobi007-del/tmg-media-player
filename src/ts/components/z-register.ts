import { ComponentRegistry } from "@core/registries";
import { RangeInput } from "./rangeInput";
import { Buffer } from "./buffer";
import { Meta } from "./controls/meta";
import { BigNextButton } from "./controls/bigNext";
import { BigPlayPauseButton } from "./controls/bigPlayPause";
import { BigPreviousButton } from "./controls/bigPrevious";
import { PreviousButton } from "./controls/previous";
import { PlayPauseButton } from "./controls/playPause";
import { NextButton } from "./controls/next";
import { ForwardButton } from "./controls/forward";
import { BackwardButton } from "./controls/backward";
import { TimeButton } from "./controls/time";
import { DurationButton } from "./controls/duration";
import { TimeAndDurationButton } from "./controls/timeAndDuration";
import { SettingsButton } from "./controls/settings";
import { ObjectFitButton } from "./controls/objectFit";
import { PictureInPictureButton } from "./controls/pictureInPicture";
import { TheaterButton } from "./controls/theater";
import { CaptureButton } from "./controls/capture";
import { FullscreenButton } from "./controls/fullscreen";
import { FullscreenLockButton } from "./controls/fullscreenLock";
import { FullscreenOrientationButton } from "./controls/fullscreenOrientation";
import { RemoveMiniplayerButton } from "./controls/removeMiniplayer";
import { ExpandMiniplayerButton } from "./controls/expandMiniplayer";
import { Timeline } from "./controls/timeline";
import { VolumeControl } from "./controls/volume";
import { BrightnessControl } from "./controls/brightness";
import { CaptionsView } from "./captionsView";
import { CaptionsButton } from "./controls/captions";
import { ScreenLockButton } from "./screenLock";
import { ChaptersButton } from "./controls/chapters";
import { PlaylistButton } from "./controls/playlist";
import { CastButton } from "./controls/cast";
import { AirPlayButton } from "./controls/airplay";
import { VoiceButton } from "./controls/voice";
import { PiPPlaceholder } from "./holders/pipPlaceholder";
import { CastPlaceholder } from "./holders/castPlaceholder";
import { AirPlayPlaceholder } from "./holders/airplayPlaceholder";
import { ErrorPlaceholder } from "./holders/errorPlaceholder";

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
  ForwardButton,
  BackwardButton,
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
  ChaptersButton,
  PlaylistButton,
  CastButton,
  AirPlayButton,
  VoiceButton,
  PiPPlaceholder,
  CastPlaceholder,
  AirPlayPlaceholder,
  ErrorPlaceholder,
])
  ComponentRegistry.register(Comp);
