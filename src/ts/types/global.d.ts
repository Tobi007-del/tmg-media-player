import { Player } from "@tools/player";
import * as TMGGlobal from "../../super";
import "@t007/toast";
import "@t007/input";
import "@t007/dialog";

declare global {
  interface HTMLMediaElement {
    // Auto-patched Props
    controlsList: DOMTokenList;
    playsInline: boolean;
    disablePictureInPicture: boolean;
    webkitShowPlaybackTargetPicker?: () => void;
    webkitCurrentPlaybackTargetIsWireless?: boolean;
    // Optional Public Props
    tmgcontrols: boolean;
    tmgPlayer?: Player | null;
    mediaElementSourceNode?: MediaElementAudioSourceNode | null; // Public since it's 1 per media element
    // Optional Private Props
    _tmgGainNode?: GainNode | null;
    _tmgDynamicsCompressorNode?: DynamicsCompressorNode | null;
    _tmgStereoPannerNode?: StereoPannerNode | null;
    _tmgPannerNode?: PannerNode | null;
  }

  interface TMGNamespace extends TMGGlobal {}

  interface Window {
    // Auto-patched Props
    WebKitPlaybackTargetAvailabilityEvent?: any;
    // Optional Public Props
    /** Shared TMG namespace. */
    tmg: TMGNamespace;
    TMG_MEDIA_ALT_IMG_SRC?: string;
    /** CDN stylesheet for `tmg-media-player`, assign a symbol if bundling, e.g. `VIRTUAL_RESOURCE` from `@t007/utils`. */
    TMG_MEDIA_CSS_SRC?: string | symbol;
    /** CDN js entrypoint for `shaka-player`, assign a symbol if bundling, e.g. `VIRTUAL_RESOURCE` from `@t007/utils`. */
    TMG_SHAKA_JS_SRC?: string | symbol;
    /** CDN js entrypoint for `hls.js`, assign a symbol if bundling, e.g. `VIRTUAL_RESOURCE` from `@t007/utils`. */
    TMG_HLS_JS_SRC?: string | symbol;
    /** CDN js entrypoint for `dashjs`, assign a symbol if bundling, e.g. `VIRTUAL_RESOURCE` from `@t007/utils`. */
    TMG_DASH_JS_SRC?: string | symbol;
    /** API js entrypoint for `youtube.com`, assign a symbol if bundling, e.g. `VIRTUAL_RESOURCE` from `@t007/utils`. */
    TMG_YT_API_SRC?: string | symbol;
    /** API js entrypoint for `vimeo.com`, assign a symbol if bundling, e.g. `VIRTUAL_RESOURCE` from `@t007/utils`. */
    TMG_VIMEO_API_SRC?: string | symbol;
    /** CDN js entrypoint for Google's `cast_sender.js`, assign a symbol if bundling, e.g. `VIRTUAL_RESOURCE` from `@t007/utils`. */
    TMG_CAST_SENDER_SRC?: string | symbol;
  }

  var tmg: TMGNamespace; // for IIFE build
}

export {};
