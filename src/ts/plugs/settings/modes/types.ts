import { MediaIntent, MediaState } from "@defs/contract";
import { RESIZE_DIRS } from "./build";
import { UISettings, UITuple } from "@defs/UIOptions";

export type ResizeDir = (typeof RESIZE_DIRS)[number];

export interface ModesFullscreenState {
  snubbingAutoFullscreenOrientation: boolean;
}

export interface ModesFullscreenConfig {
  disabled: boolean;
  pseudo: boolean;
  orientation: {
    options: UITuple<MediaIntent["fullscreenOrientation"] | "auto">[];
    allowMediaOverride: boolean;
    rotationToggle: {
      on: UISettings<MediaState["fullscreenOrientation"]>;
      off: UISettings<MediaState["fullscreenOrientation"]>;
    };
  };
}

export interface ModesTheaterConfig {
  disabled: boolean;
}

export interface ModesMiniplayerConfig {
  disabled: boolean;
  minWindowWidth: number;
  lockToWindow: boolean;
}

export interface ModesFloatingPlayerConfig {
  disabled: boolean;
  width: number;
  height: number;
  disallowReturnToOpener: boolean;
  preferInitialWindowPlacement: boolean;
  css: Record<"whitelist" | "blacklist", { url: string[]; token: string[] }>;
}
export interface ModesPictureInPictureConfig {
  disabled: boolean;
  floatingPlayer: ModesFloatingPlayerConfig;
}

export interface ModesCastConfig {
  disabled: boolean;
  options: Partial<cast.framework.CastOptions>;
}

export interface ModesCastState {
  APIReady: boolean;
}

export interface ModesAirPlayConfig {
  disabled: boolean;
}

export interface ModesAirPlayState {
  isAvailable: boolean;
}

export interface ModesConfig {
  fullscreen: ModesFullscreenConfig;
  theater: ModesTheaterConfig;
  pictureInPicture: ModesPictureInPictureConfig;
  miniplayer: ModesMiniplayerConfig;
  cast: ModesCastConfig;
  airplay: ModesAirPlayConfig;
}
