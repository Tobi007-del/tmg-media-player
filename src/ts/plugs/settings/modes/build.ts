import { DeepPartial } from "sia-reactor";
import { IS_MOBILE } from "@utils/browser";
import { ModesFullscreen, ModesPictureInPicture, ModesMiniplayer, Modes, ModesTheater } from "./types";

export const MODES_FULLSCREEN_BUILD: Partial<ModesFullscreen> = {
  disabled: false,
  orientationLock: "auto",
  onRotate: 90,
};

export const MODES_THEATER_BUILD: Partial<ModesTheater> = {
  disabled: IS_MOBILE,
};

export const MODES_PICTURE_IN_PICTURE_BUILD: Partial<ModesPictureInPicture> = {
  disabled: false,
  floatingPlayer: {
    disabled: false,
    width: 500,
    height: 281,
    disallowReturnToOpener: false,
    preferInitialWindowPlacement: false,
  },
};

export const MODES_MINIPLAYER_BUILD: Partial<ModesMiniplayer> = {
  disabled: false,
  minWindowWidth: 240,
};

export const MODES_BUILD: DeepPartial<Modes> = {
  // fullscreen: MODES_FULLSCREEN_BUILD,
  // theater: MODES_THEATER_BUILD,
  // pictureInPicture: MODES_PICTURE_IN_PICTURE_BUILD,
  // miniplayer: MODES_MINIPLAYER_BUILD,
};
