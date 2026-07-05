import { ORIENTATION_OPTIONS } from "./build";
import { UISettings } from "@defs/UIOptions";

export type OrientationOption = (typeof ORIENTATION_OPTIONS)[number];

export interface ModesFullscreenConfig {
  disabled: boolean;
  orientationLock: UISettings<boolean | OrientationOption>;
  onRotate: UISettings<boolean | number>; // 0-portrait, 90-landscape, 180, 270; 'deg' suffix works
}

export interface ModesTheaterConfig {
  disabled: boolean;
}

export interface ModesMiniplayerConfig {
  disabled: boolean;
  minWindowWidth: number;
}

export interface FloatingPlayerConfig {
  disabled: boolean;
  width: number;
  height: number;
  disallowReturnToOpener: boolean;
  preferInitialWindowPlacement: boolean;
}
export interface ModesPictureInPictureConfig {
  disabled: boolean;
  floatingPlayer: FloatingPlayerConfig;
}

export interface ModesConfig {
  fullscreen: ModesFullscreenConfig;
  theater: ModesTheaterConfig;
  pictureInPicture: ModesPictureInPictureConfig;
  miniplayer: ModesMiniplayerConfig;
}
