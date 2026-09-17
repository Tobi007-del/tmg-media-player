import { DeepPartial } from "sia-reactor";
import { IS_IOS, IS_MOBILE } from "@utils/env";
import { ModesFullscreenConfig, ModesPictureInPictureConfig, ModesMiniplayerConfig, ModesConfig, ModesTheaterConfig, ModesCastConfig, ModesAirPlayConfig } from "./types";
import { supportsFullscreen } from "@utils/dom";

export const RESIZE_DIRS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;

export const ORIENTATION_OPTS = [{ value: false, display: "Off" } as const, { value: "landscape-secondary", display: "Landscape inverted" } as const, { value: "portrait-secondary", display: "Portrait inverted" } as const, { value: "landscape-primary", display: "Landscape standard" } as const, { value: "portrait-primary", display: "Portrait standard" } as const];

export const MODES_FULLSCREEN_BUILD: Partial<ModesFullscreenConfig> = {
  disabled: false,
  pseudo: IS_IOS || !supportsFullscreen(),
  orientation: {
    options: [...ORIENTATION_OPTS, { value: "landscape", display: "Landscape" } as const, { value: "portrait", display: "Portrait" } as const, { value: "auto", display: "Auto" } as const],
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
    css: {
      whitelist: { url: [], token: [":root", "tmg", "t007", "sia"] },
      blacklist: { url: [], token: [] },
    },
  },
};

export const MODES_MINIPLAYER_BUILD: Partial<ModesMiniplayerConfig> = {
  disabled: false,
  minWindowWidth: 240,
};

export const MODES_CAST_BUILD: Partial<ModesCastConfig> = {
  disabled: false,
  options: {},
};

export const MODES_AIRPLAY_BUILD: Partial<ModesAirPlayConfig> = {
  disabled: false,
};

export const MODES_BUILD: DeepPartial<ModesConfig> = {
  // fullscreen: MODES_FULLSCREEN_BUILD,
  // theater: MODES_THEATER_BUILD,
  // pictureInPicture: MODES_PICTURE_IN_PICTURE_BUILD,
  // miniplayer: MODES_MINIPLAYER_BUILD,
  // cast: MODES_CAST_BUILD,
  // airplay: MODES_AIRPLAY_BUILD,
};
