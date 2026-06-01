import { PlugRegistry, PinRegistry } from "@core/registries";
import { PersistPlug } from "./settings/persist";
import { TimeTravelPlug } from "./settings/timeTravel";
import { PlaylistPlug } from "./main/playlist";
import { AutoPlug } from "./settings/auto";
import { CSSPlug } from "./settings/css";
import { SkeletonPlug } from "./main/skeleton";
import { ControlPanelPlug } from "./settings/controlPanel";
import { OverlayPlug } from "./settings/overlay";
import { NotifiersPlug } from "./settings/notifiers";
import { MediaPlug } from "./main/media";
import { TimePlug } from "./settings/time";
import { LightStatePlug } from "./main/lightState";
import { GesturePlug } from "./settings/gesture";
import { FastPlayPlug } from "./settings/fastPlay";
import { VolumePlug } from "./settings/volume";
import { BrightnessPlug } from "./settings/brightness";
import { PlaybackRatePlug } from "./settings/playbackRate";
import { ObjectFitPlug } from "./settings/objectFit";
import { CaptionsPlug } from "./settings/captions";
import { ModesPlug } from "./settings/modes";
import { KeysPlug } from "./settings/keys";
import { ToastsPlug } from "./settings/toasts";
import { LockedPlug } from "./settings/locked";
import { FramePlug } from "./settings/frame";
import { DisabledPlug } from "./main/disabled";
import { ErrorMessagesPlug } from "./settings/errorMessages";
import { SettingsViewPlug } from "./settings/settingsView";
import { ControlPanelDraggablePin } from "./settings/controlPanel/draggable";
import { ModesFullscreenPin } from "./settings/modes/fullscreen";
import { ModesTheaterPin } from "./settings/modes/theater";
import { ModesPictureInPicturePin } from "./settings/modes/pictureInPicture";
import { ModesMiniplayerPin } from "./settings/modes/miniplayer";
import { GestureWheelPin } from "./settings/gesture/wheel";
import { GestureTouchPin } from "./settings/gesture/touch";

[
  // Priority Order
  PersistPlug,
  TimeTravelPlug,
  MediaPlug,
  CSSPlug,
  SkeletonPlug,
  ControlPanelPlug,
  OverlayPlug,
  NotifiersPlug,
  PlaylistPlug,
  AutoPlug,
  TimePlug,
  LightStatePlug,
  GesturePlug,
  FastPlayPlug,
  VolumePlug,
  BrightnessPlug,
  PlaybackRatePlug,
  ObjectFitPlug,
  CaptionsPlug,
  ModesPlug,
  KeysPlug,
  ToastsPlug,
  LockedPlug,
  FramePlug,
  DisabledPlug,
  ErrorMessagesPlug,
  SettingsViewPlug,
].forEach((Plug) => PlugRegistry.register(Plug));

[
  // Random Order
  ControlPanelDraggablePin,
  ModesFullscreenPin,
  ModesTheaterPin,
  ModesPictureInPicturePin,
  ModesMiniplayerPin,
  GestureWheelPin,
  GestureTouchPin,
].forEach((Pin) => PinRegistry.register(Pin));
