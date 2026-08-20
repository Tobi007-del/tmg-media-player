import { MenuRegistry } from "@core/registries";
import { getMainPlaylistMenu } from "./main/playlist";
import { getSkeletonGeneralMenu } from "./main/skeleton";
import { getSettingsAmbienceMenu } from "./settings/ambience";
import { getSettingsAutoMenu } from "./settings/auto";
import { getSettingsBrightnessMenu } from "./settings/brightness";
import { getSettingsCaptionsMenu } from "./settings/captions";
import { getSettingsControlPanelMenu } from "./settings/controlPanel";
import { getSettingsFastPlayMenu } from "./settings/fastPlay";
import { getSettingsGestureMenu } from "./settings/gesture";
import { getSettingsKeysMenu } from "./settings/keys";
import { getSettingsMetadataMenu } from "./settings/metadata";
import { getSettingsModesMenu } from "./settings/modes";
import { getSettingsOverlayMenu } from "./settings/overlay";
import { getSettingsPersistMenu } from "./settings/persist";
import { getSettingsPlaybackRateMenu } from "./settings/playbackRate";
import { getSettingsPosterMenu } from "./settings/poster";
import { getSettingsSleepTimerMenu } from "./settings/sleepTimer";
import { getSettingsTimeMenu } from "./settings/time";
import { getSettingsTimeTravelMenu } from "./settings/timeTravel";
import { getSettingsToastsMenu } from "./settings/toasts";
import { getSettingsVolumeMenu } from "./settings/volume";
import { getSettingsVoiceMenu } from "./settings/voice";
import { getSettingsFrameMenu } from "./settings/frame";
import { getSettingsLockedMenu } from "./settings/locked";
import { getSettingsSettingsViewMenu } from "./settings/settingsView";
import { getActionsMenu } from "./settings/actions";

for (const [key, menu] of [
  ["actions", getActionsMenu],
  ["skeleton", getSkeletonGeneralMenu],
  ["playlist", getMainPlaylistMenu],
  ["settings.ambience", getSettingsAmbienceMenu],
  ["settings.auto", getSettingsAutoMenu],
  ["settings.brightness", getSettingsBrightnessMenu],
  ["settings.captions", getSettingsCaptionsMenu],
  ["settings.controlPanel", getSettingsControlPanelMenu],
  ["settings.fastPlay", getSettingsFastPlayMenu],
  ["settings.gesture", getSettingsGestureMenu],
  ["settings.keys", getSettingsKeysMenu],
  ["settings.metadata", getSettingsMetadataMenu],
  ["settings.modes", getSettingsModesMenu],
  ["settings.overlay", getSettingsOverlayMenu],
  ["settings.persist", getSettingsPersistMenu],
  ["settings.playbackRate", getSettingsPlaybackRateMenu],
  ["settings.poster", getSettingsPosterMenu],
  ["settings.sleepTimer", getSettingsSleepTimerMenu],
  ["settings.time", getSettingsTimeMenu],
  ["settings.timeTravel", getSettingsTimeTravelMenu],
  ["settings.toasts", getSettingsToastsMenu],
  ["settings.volume", getSettingsVolumeMenu],
  ["settings.voice", getSettingsVoiceMenu],
  ["settings.frame", getSettingsFrameMenu],
  ["settings.locked", getSettingsLockedMenu],
  ["settings.settingsView", getSettingsSettingsViewMenu],
] as const)
  MenuRegistry.register(key, menu);
