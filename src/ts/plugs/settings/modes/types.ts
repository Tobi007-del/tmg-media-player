import { OrientationOption } from "@defs/generics";

export type ModesFullscreen = {
  disabled: boolean;
  orientationLock: boolean | OrientationOption;
  onRotate: boolean | number; // 0-portrait, 90-landscape, 180, 270
};

export type ModesTheater = {
  disabled: boolean;
};

export type ModesMiniplayer = {
  disabled: boolean;
  minWindowWidth: number;
};

export interface FloatingPlayerConfig {
  disabled: boolean;
  width: number;
  height: number;
  disallowReturnToOpener: boolean;
  preferInitialWindowPlacement: boolean;
}
export type ModesPictureInPicture = {
  disabled: boolean;
  floatingPlayer: FloatingPlayerConfig;
};

export interface Modes {
  fullscreen: ModesFullscreen;
  theater: ModesTheater;
  pictureInPicture: ModesPictureInPicture;
  miniplayer: ModesMiniplayer;
}
