import { ComponentRegistry } from "@core/registries";
import { RangeInput } from "./rangeinput";
import { Buffer } from "./buffer";
import { Meta } from "./controls/meta";
import { BigNextButton } from "./controls/bignext";
import { BigPlayPauseButton } from "./controls/bigplaypause";
import { BigPrevButton } from "./controls/bigprev";
import { PrevButton } from "./controls/prev";
import { PlayPauseButton } from "./controls/playpause";
import { NextButton } from "./controls/next";
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
import { PiPPlaceholder } from "./pipplaceholder";
import { ScreenLockButton } from "./screenlock";
import "./notifiers/z-register";
import "./icons/z-register";

[
  // Random Order
  RangeInput,
  Buffer,
  Meta,
  BigNextButton,
  BigPlayPauseButton,
  BigPrevButton,
  PrevButton,
  PlayPauseButton,
  NextButton,
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
  PiPPlaceholder,
  ScreenLockButton,
].forEach((Comp) => ComponentRegistry.register(Comp));
