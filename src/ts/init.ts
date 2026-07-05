import "./types/global.d.ts"; // bundler handles the stylesheet side effect
import { init } from "./tools/runtime";
import { loadResource } from "./utils/dom";

if ("undefined" !== typeof window) {
  window.tmg ??= {} as any; // bundler will handle the rest
  window.TMG_MEDIA_ALT_IMG_SRC ??= "https://cdn.jsdelivr.net/npm/tmg-media-player/assets/movie-tape.png";
  window.TMG_MEDIA_CSS_SRC ??= "https://cdn.jsdelivr.net/npm/tmg-media-player@latest/dist/index.min.css";
  window.TMG_SHAKA_JS_SRC ??= "https://cdn.jsdelivr.net/npm/shaka-player/dist/shaka-player.compiled.js";
  window.TMG_HLS_JS_SRC ??= "https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js";
  window.TMG_DASH_JS_SRC ??= "https://cdn.jsdelivr.net/npm/dashjs@4/dist/dash.all.min.js";
  window.TMG_YT_API_SRC ??= "https://www.youtube.com/iframe_api";
  window.TMG_VIMEO_API_SRC ??= "https://player.vimeo.com/api/player.js";
  window.TMG_CAST_SENDER_SRC ??= "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
  init(), loadResource(window.TMG_MEDIA_CSS_SRC), loadResource(window.T007_TOAST_JS_SRC!, "script"), loadResource(window.T007_INPUT_JS_SRC!, "script"), loadResource(window.T007_DIALOG_JS_SRC!, "script");
  console.log("%cTMG Media Player Available", "color: darkturquoise");
} else {
  console.log("\x1b[38;2;139;69;19mTMG Media Player Unavailable\x1b[0m");
  console.error("TMG Media Player cannot run in a terminal!"), console.warn("Consider moving to a browser environment to use the TMG Media Player");
}
