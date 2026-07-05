import { DeepPartial } from "sia-reactor";
import { IS_MOBILE } from "@utils/env";
import { ModesFullscreenConfig, ModesPictureInPictureConfig, ModesMiniplayerConfig, ModesConfig, ModesTheaterConfig } from "./types";
import { capitalize, uncamelize } from "@utils/str";

export const ORIENTATION_OPTIONS = ["auto", "landscape", "portrait", "portrait-primary", "portrait-secondary", "landscape-primary", "landscape-secondary"] as const;

export const MODES_FULLSCREEN_BUILD: Partial<ModesFullscreenConfig> = {
  disabled: false,
  orientationLock: {
    value: "auto",
    options: [{ value: false, display: "Off" }, ...ORIENTATION_OPTIONS.map((o) => ({ value: o, display: capitalize(uncamelize(o)) }))],
  },
  onRotate: {
    value: 90,
    options: [
      { value: false, display: "Off" },
      { value: 0, display: "0° Portrait" },
      { value: 90, display: "90° Landscape" },
      { value: 180, display: "180° Inverted" },
      { value: 270, display: "270° Landscape" },
    ],
  },
};

export const MODES_THEATER_BUILD: Partial<ModesTheaterConfig> = {
  disabled: IS_MOBILE,
};

export const MODES_PICTURE_IN_PICTURE_BUILD: Partial<ModesPictureInPictureConfig> = {
  disabled: false,
  floatingPlayer: {
    disabled: false,
    width: 500,
    height: 280,
    disallowReturnToOpener: false,
    preferInitialWindowPlacement: false,
  },
};

export const MODES_MINIPLAYER_BUILD: Partial<ModesMiniplayerConfig> = {
  disabled: false,
  minWindowWidth: 240,
};

export const MODES_BUILD: DeepPartial<ModesConfig> = {
  // fullscreen: MODES_FULLSCREEN_BUILD,
  // theater: MODES_THEATER_BUILD,
  // pictureInPicture: MODES_PICTURE_IN_PICTURE_BUILD,
  // miniplayer: MODES_MINIPLAYER_BUILD,
};
