import { Player } from "../player";
import { setTimeout } from "@utils/fn";
import { queryFullscreen, observeMutation } from "@utils/dom";
import { NOOP } from "sia-reactor";
import { ATTR, controllers, globalState } from "./build";

export let AUDIO_CONTEXT: AudioContext | null = null;
export let AUDIO_LIMITER: DynamicsCompressorNode | null = null;

const mutSet = new WeakSet<HTMLElement>(), // weak set for true magic
  mutOpts: MutationObserverInit = { attributes: true, attributeFilter: [ATTR, "controls"] };

export function init(): void {
  mountMedia();
  for (const evt of ["click", "pointerdown", "keydown"]) document.addEventListener(evt, () => ((globalState.isTransient = true), startAudioManager()), true);
  for (const medium of document.querySelectorAll<HTMLMediaElement>("video,audio")) observeMutation(medium, handleMediaMutation, mutOpts), (medium[ATTR] = medium.hasAttribute(ATTR));
  observeMutation(document.documentElement, handleDOMMutation, { childList: true, subtree: true });
  window.addEventListener("resize", () => ((globalState.dimensions.window.width = window.innerWidth), (globalState.dimensions.window.height = window.innerHeight)));
  document.addEventListener("visibilitychange", () => (globalState.isVisible = document.visibilityState !== "hidden"));
  for (const e of ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "msfullscreenchange"]) document.addEventListener(e, () => (globalState.inFullscreen = queryFullscreen()));
  screen?.orientation?.addEventListener("change", ({ target }, t = target as ScreenOrientation) => ((globalState.screenOrientation.type = t.type), (globalState.screenOrientation.angle = t.angle)));
  setInterval(() => globalState.clock++, 1000);
}

export function handleMediaMutation({ target, attributeName: attr }: MutationRecord, _: MutationRecord[], t = target as HTMLMediaElement): void {
  if (attr === ATTR) !mutSet.has(t) && (t[ATTR] = t.hasAttribute(ATTR));
  else if (attr === "controls" && !(t as HTMLMediaElement).tmgPlayer?.ctlr?.media.intent.controls) t.hasAttribute(ATTR) && t.removeAttribute("controls"); // UX boost
}

export function handleDOMMutation({ addedNodes, removedNodes }: MutationRecord): void {
  for (const node of addedNodes as NodeListOf<HTMLElement>) {
    if (!node?.tagName) continue;
    const els = node.matches(":is(video,audio):not(.tmg-host)") ? [node] : node.querySelectorAll(":is(video,audio):not(.tmg-host)");
    for (const el of els) observeMutation(el, handleMediaMutation, mutOpts), ((el as HTMLMediaElement)[ATTR] = el.hasAttribute(ATTR));
  }
  for (const node of removedNodes as NodeListOf<HTMLElement>) {
    if (!node?.tagName || node.isConnected) continue;
    const els = node.matches(".tmg-host") ? [node] : node.querySelectorAll(".tmg-host");
    for (const el of els) !(el as HTMLMediaElement).tmgPlayer?.ctlr?.mutating && (el as HTMLMediaElement).tmgPlayer?.detach();
  }
}

export function mountMedia() {
  if ("undefined" === typeof HTMLMediaElement) return;
  for (const el of [HTMLVideoElement, HTMLAudioElement])
    Object.defineProperty(el.prototype, ATTR, {
      get: function () {
        return this.hasAttribute(ATTR);
      },
      set: async function (value) {
        if (value) {
          !mutSet.has(this) && mutSet.add(this);
          await ((this as HTMLMediaElement).tmgPlayer ?? new Player()).attach(this);
          this.setAttribute(ATTR, "");
          setTimeout(() => mutSet.delete(this));
        } else {
          this.hasAttribute(ATTR) && !mutSet.has(this) && mutSet.add(this);
          this.removeAttribute(ATTR);
          (this as HTMLMediaElement).tmgPlayer?.detach();
          setTimeout(() => mutSet.delete(this));
        }
      },
      enumerable: true,
      configurable: true,
    });
}
export function unmountMedia(): void {
  for (const el of [HTMLVideoElement, HTMLAudioElement]) delete (el.prototype as any)[ATTR];
}

export function startAudioManager(): void {
  if (!AUDIO_CONTEXT && globalState.isTransient) {
    AUDIO_CONTEXT = new (window.AudioContext || (window as any).webkitAudioContext)() as AudioContext;
    const L = (AUDIO_LIMITER = AUDIO_CONTEXT!.createDynamicsCompressor());
    (L.threshold.value = -1.0), (L.knee.value = 0.0), (L.ratio.value = 20), (L.attack.value = 0.001), (L.release.value = 0.05); // peak logic = peak sound
    globalState.audioCtxReady = true;
  } else if (AUDIO_CONTEXT?.state === "suspended") AUDIO_CONTEXT.resume();
}
export function connectToAudioManager(medium: HTMLMediaElement) {
  if (!AUDIO_CONTEXT) return "unavailable";
  medium.mediaElementSourceNode?.disconnect();
  medium.mediaElementSourceNode ??= AUDIO_CONTEXT.createMediaElementSource(medium);
  medium._tmgGainNode ??= AUDIO_CONTEXT.createGain();
  medium._tmgDynamicsCompressorNode ??= AUDIO_CONTEXT.createDynamicsCompressor();
  medium.mediaElementSourceNode.connect(medium._tmgDynamicsCompressorNode);
  medium._tmgDynamicsCompressorNode.connect(medium._tmgGainNode);
  medium._tmgGainNode.connect(AUDIO_LIMITER!), AUDIO_LIMITER!.connect(AUDIO_CONTEXT!.destination);
}
export function disconnectFromAudioManager(medium: HTMLMediaElement) {
  if (!AUDIO_CONTEXT) return "unavailable";
  medium._tmgGainNode?.disconnect(), medium._tmgDynamicsCompressorNode?.disconnect();
  medium.mediaElementSourceNode?.disconnect(), medium.mediaElementSourceNode?.connect(AUDIO_CONTEXT.destination);
} // reroutes sourceNode to destination so audio keeps flowing

let orientated = false,
  prevScreenType: OrientationType | undefined;
export function connectOrientationManager(): void {
  if (orientated) return;
  orientated = true;
  (window as any).DeviceOrientationEvent?.requestPermission?.().then(NOOP), window.addEventListener("deviceorientation", handleOrientation);
}
export function disconnectOrientationManager(): void {
  if (!orientated) return;
  orientated = false;
  window.removeEventListener("deviceorientation", handleOrientation);
}
export function handleOrientation({ beta: b, gamma: g }: DeviceOrientationEvent): void {
  if (b === null || g === null) return;
  const aG = Math.abs(g),
    aB = Math.abs(b);
  if ((aB < 20 && aG < 20) || (aB > 85 && aB < 95)) return; // Guard against flat tables (< 20) AND Gimbal Lock inversions in bed (85-95)
  let type = prevScreenType;
  aG > 50 && aB < 35 ? (type = g > 0 ? "landscape-secondary" : "landscape-primary") : aB > 50 && aG < 35 && (type = b > 0 ? "portrait-primary" : "portrait-secondary");
  if (type === prevScreenType || !type) return;
  prevScreenType = type;
  for (const c of controllers) if (c.media?.state.autoFullscreenOrientation) c.media.state.fullscreenOrientation = type;
}

export type * from "./types";
export * from "./build";
