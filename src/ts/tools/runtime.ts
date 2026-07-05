import { Player } from "./player";
import { type Controller } from "@core/controller";
import { type Dimensions } from "@defs/generics";
import { setTimeout } from "@utils/fn";
import { queryFullscreen, observeMutation } from "@utils/dom";
const win = "undefined" !== typeof window ? window : undefined;

// Defines states explicitly managed by the TMG Environment Observers
export interface CtlrState {
  readyState: number;
  audioContextReady: boolean;
  mediaIntersecting: boolean;
  mediaParentIntersecting: boolean;
  dimensions: { container: Dimensions & { tier: string }; pseudoContainer: Dimensions & { tier: string }; window: Dimensions };
  screenOrientation: { type: string; angle: number };
  docVisibilityState: DocumentVisibilityState;
  docInFullscreen: boolean;
  frameReadyPromise?: Promise<null> | null;
}

// --- GLOBAL STATE ---
const flagMutationSet = new WeakSet<HTMLElement>(); // weak set for true magic
let flagMutationId: number | undefined;
// --- EXPORTS ---
export let AUDIO_CONTEXT: AudioContext | null = null;
export let AUDIO_LIMITER: DynamicsCompressorNode | null = null;
export let IS_DOC_TRANSIENT = false;
export const STATE_BUILD: CtlrState = { readyState: 0, audioContextReady: !!AUDIO_CONTEXT, mediaIntersecting: true, mediaParentIntersecting: true, dimensions: { container: { width: 0, height: 0, tier: "x" }, pseudoContainer: { width: 0, height: 0, tier: "x" }, window: { width: win?.innerWidth!, height: win?.innerHeight! } }, screenOrientation: { type: win?.screen?.orientation?.type ?? "", angle: win?.screen?.orientation?.angle ?? (win as any)?.orientation ?? 0 }, docVisibilityState: win?.document.visibilityState!, docInFullscreen: queryFullscreen() };
export const Controllers: Controller[] = [];

export function handleVidMutation(mutations: MutationRecord[]): void {
  for (const mutation of mutations) {
    if (mutation.type !== "attributes") continue;
    const target = mutation.target as HTMLMediaElement;
    if (mutation.attributeName === "tmgcontrols") !flagMutationSet.has(target) && (target.tmgcontrols = target.hasAttribute("tmgcontrols"));
    else if (mutation.attributeName?.startsWith("tmg")) target.hasAttribute(mutation.attributeName) && target.tmgPlayer?.fetchOptions();
    else if (mutation.attributeName === "controls") target.hasAttribute("tmgcontrols") && target.removeAttribute("controls");
  }
}

export function handleDOMMutation(mutations: MutationRecord[]): void {
  for (const mutation of mutations) {
    for (const node of Array.from(mutation.addedNodes)) {
      if (!(node instanceof HTMLElement)) continue;
      const els = node.matches(":is(video,audio):not(.tmg-host)") ? [node] : node.querySelectorAll(":is(video,audio):not(.tmg-host)");
      for (const el of els) {
        observeMutation(el, handleVidMutation, { attributes: true });
        (el as HTMLMediaElement).tmgcontrols = el.hasAttribute("tmgcontrols");
      }
    }
    for (const node of Array.from(mutation.removedNodes)) {
      if (!(node instanceof HTMLElement)) continue;
      const els = node.matches(".tmg-host") ? [node] : node.querySelectorAll(".tmg-host");
      for (const el of els) !(el as HTMLMediaElement).tmgPlayer?.Controller?.mutatingDOMM && (el as HTMLMediaElement).tmgPlayer?.detach();
    }
  }
}

function flagMutation(m: HTMLElement, check = true): void {
  !flagMutationSet.has(m) && check && flagMutationSet.add(m);
}

function freeMutation(m: HTMLElement): void {
  clearTimeout(flagMutationId);
  flagMutationId = setTimeout(() => !(flagMutationId = undefined) && flagMutationSet.delete(m));
}

export function mountMedia() {
  if ("undefined" === typeof HTMLMediaElement) return;
  for (const el of [HTMLVideoElement, HTMLAudioElement])
    Object.defineProperty(el.prototype, "tmgcontrols", {
      get: function () {
        return this.hasAttribute("tmgcontrols");
      },
      set: async function (value) {
        if (value) {
          flagMutation(this);
          await ((this as HTMLMediaElement).tmgPlayer || new Player()).attach(this);
          this.setAttribute("tmgcontrols", "");
          freeMutation(this);
        } else {
          flagMutation(this, this.hasAttribute("tmgcontrols"));
          this.removeAttribute("tmgcontrols");
          (this as HTMLMediaElement).tmgPlayer?.detach();
          freeMutation(this);
        }
      },
      enumerable: true,
      configurable: true,
    });
}

export function unmountMedia(): void {
  for (const el of [HTMLVideoElement, HTMLAudioElement]) delete (el.prototype as any).tmgcontrols;
}

export function startAudioManager(): void {
  if (!AUDIO_CONTEXT && IS_DOC_TRANSIENT) {
    AUDIO_CONTEXT = new (win!.AudioContext || (win as any).webkitAudioContext)() as AudioContext;
    const L = (AUDIO_LIMITER = AUDIO_CONTEXT!.createDynamicsCompressor());
    (L.threshold.value = -1.0), (L.knee.value = 0.0), (L.ratio.value = 20), (L.attack.value = 0.001), (L.release.value = 0.05);
    for (const c of Controllers) if (c.state) c.state.audioContextReady = true;
  } else if (AUDIO_CONTEXT?.state === "suspended") AUDIO_CONTEXT.resume();
}

export function connectMediaToAudioManager(medium: HTMLMediaElement) {
  if (!AUDIO_CONTEXT) return "unavailable";
  medium.mediaElementSourceNode ??= AUDIO_CONTEXT.createMediaElementSource(medium);
  medium._tmgGainNode ??= AUDIO_CONTEXT.createGain();
  medium._tmgDynamicsCompressorNode ??= AUDIO_CONTEXT.createDynamicsCompressor();
  medium.mediaElementSourceNode.connect(medium._tmgDynamicsCompressorNode);
  medium._tmgDynamicsCompressorNode.connect(medium._tmgGainNode);
  medium._tmgGainNode.connect(AUDIO_LIMITER!);
  AUDIO_LIMITER!.connect(AUDIO_CONTEXT!.destination);
}

export function init(): void {
  mountMedia();
  for (const e of ["click", "pointerdown", "keydown"]) document.addEventListener(e, () => ((IS_DOC_TRANSIENT = true), startAudioManager()), true);
  for (const medium of document.querySelectorAll<HTMLMediaElement>("video,audio")) {
    observeMutation(medium, handleVidMutation, { attributes: true });
    medium.tmgcontrols = medium.hasAttribute("tmgcontrols");
  }
  observeMutation(document.documentElement, handleDOMMutation, { childList: true, subtree: true });
  win!.addEventListener("resize", () => {
    for (const c of Controllers) if (c.state) (c.state.dimensions.window.width = win!.innerWidth), (c.state.dimensions.window.height = win!.innerHeight);
  });
  if (win?.screen?.orientation)
    win.screen.orientation.addEventListener("change", ({ target }, t = target as ScreenOrientation) => {
      for (const c of Controllers) if (c.state) (c.state.screenOrientation.type = t.type), (c.state.screenOrientation.angle = t.angle);
    });
  else
    win?.addEventListener("orientationchange", () => {
      for (const c of Controllers) if (c.state) c.state.screenOrientation.angle = (win as any).orientation || 0;
    });
  document.addEventListener("visibilitychange", () => {
    for (const c of Controllers) if (c.state) c.state.docVisibilityState = document.visibilityState;
  });
  for (const e of ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "msfullscreenchange"])
    document.addEventListener(e, (_, inFs = queryFullscreen()) => {
      for (const c of Controllers) if (c.state) c.state.docInFullscreen = inFs;
    });
}
