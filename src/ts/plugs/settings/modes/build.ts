import { DeepPartial } from "sia-reactor";
import { IS_IOS, IS_MOBILE } from "@utils/env";
import { ModesFullscreenConfig, ModesPictureInPictureConfig, ModesMiniplayerConfig, ModesConfig, ModesTheaterConfig } from "./types";
import { supportsFullscreen } from "@utils/dom";

export const RESIZE_DIRS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;

export const ORIENTATION_OPTS = [{ value: false, display: "Off" } as const, { value: "landscape-primary", display: "Landscape" } as const, { value: "portrait-primary", display: "Portrait" } as const, { value: "landscape-secondary", display: "Landscape Inverted" } as const, { value: "portrait-secondary", display: "Portrait Inverted" } as const];

export const MODES_FULLSCREEN_BUILD: Partial<ModesFullscreenConfig> = {
  disabled: false,
  pseudo: IS_IOS || !supportsFullscreen(),
  orientation: {
    options: [...ORIENTATION_OPTS, { value: "auto", display: "Auto" } as const],
    allowMediaOverride: true,
    rotationToggle: {
      on: {
        value: "landscape-primary",
        options: ORIENTATION_OPTS,
      },
      off: {
        value: false,
        options: ORIENTATION_OPTS,
      },
    },
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
