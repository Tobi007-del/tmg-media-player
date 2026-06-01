// ============ Constants ============

export const FN_KEY = "tmg_fn_registry";
export const LUID_KEY = "tmg_local_uid";

export const KEYS_WHITELIST = [" ", "enter", "escape", "arrowup", "arrowdown", "arrowleft", "arrowright", "home", "end", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export { KEYS_BLOCKS } from "@t007/utils";

export const ERROR_CODES = [
  1, // MEDIA_ERR_ABORTED
  2, // MEDIA_ERR_NETWORK
  3, // MEDIA_ERR_DECODE
  4, // MEDIA_ERR_SRC_NOT_SUPPORTED
  5, // MEDIA_ERR_UNKNOWN
] as const;

// ============ Configurations ============

export const MODES = ["fullscreen", "theater", "pictureInPicture", "miniplayer"] as const;

export const CONTROLS = ["expandminiplayer", "removeminiplayer", "meta", "timeline", "capture", "fullscreenorientation", "fullscreenlock", "prev", "playpause", "next", "brightness", "volume", "timeandduration", "spacer", "playbackrate", "captions", "settings", "objectfit", "pictureinpicture", "theater", "fullscreen"] as const;

export const BIG_CONTROLS = ["bigprev", "bigplaypause", "bignext"] as const;

export const KEY_SHORTCUT_ACTIONS = ["prev", "next", "playPause", "skipBwd", "skipFwd", "stepFwd", "stepBwd", "mute", "dark", "volumeUp", "volumeDown", "brightnessUp", "brightnessDown", "playbackRateUp", "playbackRateDown", "timeMode", "timeFormat", "capture", "objectFit", "pictureInPicture", "theater", "fullscreen", "captions", "captionsFontSizeUp", "captionsFontSizeDown", "captionsFontFamily", "captionsFontWeight", "captionsFontVariant", "captionsFontOpacity", "captionsBackgroundOpacity", "captionsWindowOpacity", "captionsCharacterEdgeStyle", "captionsTextAlignment", "settings"] as const;

export const KEY_SHORTCUT_MOD_ACTIONS = ["skip", "volume", "brightness", "playbackRate", "captionsFontSize"] as const; // numerical values

export const APT_AUTOPLAY_OPTIONS = ["in-view", "out-view", "in-view-always", "out-view-always"];

export const ORIENTATION_OPTIONS = ["auto", "landscape", "portrait", "portrait-primary", "portrait-secondary", "landscape-primary", "landscape-secondary"] as const;
