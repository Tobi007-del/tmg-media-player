import { PlugRegistry, PinRegistry } from "@core/registries";
import { PersistPlug } from "./settings/persist";
import { TimeTravelPlug } from "./settings/timeTravel";
import { PlaylistPlug } from "./main/playlist";
import { AutoPlug } from "./settings/auto";
import { CSSPlug } from "./settings/css";
import { SkeletonPlug } from "./main/skeleton";
import { PosterPlug } from "./settings/poster";
import { ControlPanelPlug } from "./settings/controlPanel";
import { OverlayPlug } from "./settings/overlay";
import { NotifiersPlug } from "./settings/notifiers";
import { MetadataPlug } from "./settings/metadata";
import { TimePlug } from "./settings/time";
import { LightStatePlug } from "./main/lightState";
import { VolumePlug } from "./settings/volume";
import { BrightnessPlug } from "./settings/brightness";
import { PlaybackRatePlug } from "./settings/playbackRate";
import { ObjectFitPlug } from "./settings/objectFit";
import { CaptionsPlug } from "./settings/captions";
import { GesturePlug } from "./settings/gesture";
import { ModesPlug } from "./settings/modes";
import { KeysPlug } from "./settings/keys";
import { VoicePlug } from "./settings/voice";
import { FastPlayPlug } from "./settings/fastPlay";
import { ToastsPlug } from "./settings/toasts";
import { LockedPlug } from "./settings/locked";
import { FramePlug } from "./settings/frame";
import { DisabledPlug } from "./main/disabled";
import { ErrorsPlug } from "./settings/errors";
import { SettingsViewPlug } from "./settings/settingsView";
import { AmbiencePlug } from "./settings/ambience";
import { CastPlug } from "./settings/cast";
import { AirPlayPlug } from "./settings/airplay";
import { SleepTimerPlug } from "./settings/sleepTimer";
import { ControlPanelDraggablePin } from "./settings/controlPanel/draggable";
import { ModesFullscreenPin } from "./settings/modes/fullscreen";
import { ModesTheaterPin } from "./settings/modes/theater";
import { ModesPictureInPicturePin } from "./settings/modes/pictureInPicture";
import { ModesMiniplayerPin } from "./settings/modes/miniplayer";
import { GestureWheelPin } from "./settings/gesture/wheel";
import { GestureTouchPin } from "./settings/gesture/touch";

for (const Plug of [
  // Priority Order
  PersistPlug,
  TimeTravelPlug,
  MetadataPlug,
  CSSPlug,
  SkeletonPlug,
  ObjectFitPlug,
  PosterPlug,
  ControlPanelPlug,
  OverlayPlug,
  NotifiersPlug,
  PlaylistPlug,
  AutoPlug,
  TimePlug,
  LightStatePlug,
  VolumePlug,
  BrightnessPlug,
  CastPlug, // Before other Intent resolvers apart from envelopers (volume, brightness)
  PlaybackRatePlug,
  CaptionsPlug,
  GesturePlug,
  ModesPlug,
  KeysPlug,
  VoicePlug,
  FastPlayPlug,
  ToastsPlug,
  LockedPlug,
  FramePlug,
  DisabledPlug,
  ErrorsPlug,
  AmbiencePlug,
  AirPlayPlug,
  SleepTimerPlug,
  SettingsViewPlug,
])
  PlugRegistry.register(Plug);

for (const Pin of [
  // Random Order
  ControlPanelDraggablePin,
  ModesFullscreenPin,
  ModesTheaterPin,
  ModesPictureInPicturePin,
  ModesMiniplayerPin,
  GestureWheelPin,
  GestureTouchPin,
])
  PinRegistry.register(Pin);
