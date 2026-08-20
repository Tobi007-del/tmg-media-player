import { MediaIntent } from "@defs/contract";
import { RESIZE_DIRS } from "./build";
import { UISettings } from "@defs/UIOptions";

export type ResizeDir = (typeof RESIZE_DIRS)[number];

export interface ModesFullscreenState {
  snubbingAutoFullscreenOrientation: boolean;
}

export interface ModesFullscreenConfig {
  disabled: boolean;
  pseudo: boolean;
  orientation: {
    allowMediaOverride: boolean;
    options: UISettings<MediaIntent["fullscreenOrientation"] | "auto">["options"];
    rotationToggle: {
      on: UISettings<MediaIntent["fullscreenOrientation"]>;
      off: UISettings<MediaIntent["fullscreenOrientation"]>;
    };
  };
}

export interface ModesTheaterConfig {
  disabled: boolean;
}

export interface ModesMiniplayerConfig {
  disabled: boolean;
  minWindowWidth: number;
}

export interface ModesFloatingPlayerConfig {
  disabled: boolean;
  width: number;
  height: number;
  disallowReturnToOpener: boolean;
  preferInitialWindowPlacement: boolean;
}
export interface ModesPictureInPictureConfig {
  disabled: boolean;
  floatingPlayer: ModesFloatingPlayerConfig;
}

export interface ModesConfig {
  fullscreen: ModesFullscreenConfig;
  theater: ModesTheaterConfig;
  pictureInPicture: ModesPictureInPictureConfig;
  miniplayer: ModesMiniplayerConfig;
}
