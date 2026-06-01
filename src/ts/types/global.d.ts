import { Player } from "@tools/player";
import * as TMGGlobal from "../../index";
import * as _ from "@t007/toast";
import * as __ from "@t007/input";
import * as ___ from "@t007/dialog";

declare global {
  interface HTMLMediaElement {
    // Monkey-patched Props
    controlsList: DOMTokenList;
    playsInline: boolean;
    disablePictureInPicture: boolean;
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
    /** Shared TMG namespace. */
    tmg: TMGNamespace;
    TMG_MEDIA_ALT_IMG_SRC?: string;
    /** CDN stylesheet for `tmg-media-player`, assign a symbol if bundling, e.g. `VIRTUAL_RESOURCE` from `@t007/utils`. */
    TMG_MEDIA_CSS_SRC?: string | symbol;
    /** CDN js entrypoint for `hls.js`, assign a symbol if bundling, e.g. `VIRTUAL_RESOURCE` from `@t007/utils`. */
    TMG_HLS_JS_SRC?: string | symbol;
    /** CDN js entrypoint for `dashjs`, assign a symbol if bundling, e.g. `VIRTUAL_RESOURCE` from `@t007/utils`. */
    TMG_DASH_JS_SRC?: string | symbol;
    /** API js entrypoint for `youtube.com`, assign a symbol if bundling, e.g. `VIRTUAL_RESOURCE` from `@t007/utils`. */
    TMG_YT_API_SRC?: string | symbol;
    /** API js entrypoint for `vimeo.com`, assign a symbol if bundling, e.g. `VIRTUAL_RESOURCE` from `@t007/utils`. */
    TMG_VIMEO_API_SRC?: string | symbol;
  }

  var tmg: TMGNamespace; // for IIFE build
}

export {};
