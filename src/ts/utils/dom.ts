import { NOOP } from "sia-reactor";
import { bindCleanupToSignal as bindSig } from "./fn";
const win = "undefined" !== typeof window ? window : undefined;

// Element Factory
export { createEl, assignEl, getWindow, createListRenderer } from "@t007/utils";
export { initVScrollerator } from "@t007/utils/hooks/vanilla";

// Resource Loading
export { loadResource } from "@t007/utils";

// Viewport Checks
export function inDocView(el: Element, axis: "x" | "y" = "y"): boolean {
  const { left, top, right, bottom } = el.getBoundingClientRect(),
    inX = left + win!.scrollX >= 0 && right + win!.scrollX <= win!.scrollX + (win!.innerWidth || win!.document.documentElement.clientWidth),
    inY = top + win!.scrollY >= 0 && bottom + win!.scrollY <= win!.scrollY + (win!.innerHeight || win!.document.documentElement.clientHeight);
  return axis === "x" ? inY : axis === "y" ? inX : inY && inX;
}

export function getElSiblingAt(p: number, dir: "x" | "y", els: HTMLElement[] | NodeListOf<HTMLElement>, pos: "before" | "after" | "at" = "after"): HTMLElement | undefined {
  return (
    els.length &&
    (
      Array.prototype.reduce.call(
        els,
        ((closest: { offset: number; element: Element | undefined }, child: Element) => {
          const { top: cT, left: cL, width: cW, height: cH } = child.getBoundingClientRect(),
            offset = p - (dir === "y" ? cT : cL) - (dir === "y" ? cH : cW) / 2,
            condition = pos === "after" ? offset < 0 && offset > closest.offset : pos === "before" ? offset > 0 && offset < closest.offset : pos === "at" ? Math.abs(offset) <= (dir === "y" ? cH : cW) / 2 && Math.abs(offset) < Math.abs(closest.offset) : false;
          return condition ? { offset, element: child } : closest;
        }) as any,
        { offset: pos === "after" ? -Infinity : Infinity, element: undefined }
      ) as any
    ).element
  );
}

export function getClientWH(el?: HTMLElement | null) {
  const { clientWidth, clientHeight } = el === document.body ? document.documentElement : el || document.documentElement;
  return { clientWidth, clientHeight };
}

// Fullscreen & Picture-in-Picture
export const queryFullscreen = (): boolean => Boolean(queryFullscreenEl());
export const queryFullscreenEl = (d = document as any): Element | null => d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement || null;

export const queryPictureInPicture = (): boolean => Boolean(queryPictureInPictureEl());
export const queryPictureInPictureEl = () => document.pictureInPictureElement;

export const supportsFullscreen = (video = true, vp = HTMLVideoElement.prototype as any, d = document as any) => Boolean(d.fullscreenEnabled || d.mozFullscreenEnabled || d.msFullscreenEnabled || d.webkitFullscreenEnabled || d.webkitSupportsFullscreen || (video && vp.webkitEnterFullscreen));
export const supportsPictureInPicture = (video = true, vp = HTMLVideoElement.prototype as any, d = document as any, w = window as any) => Boolean(video ? d.pictureInPictureEnabled || vp.requestPictureInPicture : w.documentPictureInPicture);

export const enterFullscreen = (el: any): Promise<void> => (el.webkitEnterFullscreen ? el.webkitEnterFullscreen() : el.requestFullscreen ? el.requestFullscreen() : el.mozRequestFullScreen ? el.mozRequestFullScreen() : el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : el.msRequestFullscreen ? el.msRequestFullscreen() : Promise.reject(new Error("Fullscreen API is not supported")));
export const exitFullscreen = (el: any, d = document as any): Promise<void> => (queryFullscreenEl(d) === el ? (el.webkitExitFullscreen ? el.webkitExitFullscreen() : d.exitFullscreen ? d.exitFullscreen() : d.mozCancelFullScreen ? d.mozCancelFullScreen() : d.webkitExitFullscreen ? d.webkitExitFullscreen() : d.msExitFullscreen ? d.msExitFullscreen() : Promise.reject(new Error("Fullscreen API is not supported"))) : Promise.resolve());

// Safe Click Handling
type SafeClickEl = HTMLElement & {
  _clickHandler?: (e: MouseEvent) => void;
  _dblClickHandler?: (e: MouseEvent) => void;
  _clickTimeoutId?: ReturnType<typeof setTimeout>;
};
export function addSafeClicks(el?: SafeClickEl | null, onClick: (e: MouseEvent) => any = NOOP, onDblClick: (e: MouseEvent) => any = NOOP, options?: boolean | AddEventListenerOptions): void {
  el && removeSafeClicks(el);
  el?.addEventListener("click", (el._clickHandler = (e: MouseEvent) => (clearTimeout(el._clickTimeoutId), (el._clickTimeoutId = setTimeout(() => onClick(e), 300)))), options);
  el?.addEventListener("dblclick", (el._dblClickHandler = (e: MouseEvent) => (clearTimeout(el._clickTimeoutId), onDblClick(e))), options);
}
export function removeSafeClicks(el?: SafeClickEl | null): void {
  el?.removeEventListener("click", el._clickHandler as EventListener);
  el?.removeEventListener("dblclick", el._dblClickHandler as EventListener);
}

// DOM Observers
declare global {
  interface Element {
    _resizeCallbacks?: Set<(entry: ResizeObserverEntry) => void>;
    _intersectCallbacks?: Set<(entry: IntersectionObserverEntry) => void>;
    _mutationCallbacks?: Set<(mutations: MutationRecord[]) => void>;
  }
}

export const intersectionObserver = win
  ? new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.target._intersectCallbacks) for (const cb of entry.target._intersectCallbacks) cb(entry);
      },
      { root: null, rootMargin: "0px", threshold: 0.3 }
    )
  : null;

export const resizeObserver = win
  ? new ResizeObserver((entries) => {
      for (const entry of entries) if (entry.target._resizeCallbacks) for (const cb of entry.target._resizeCallbacks) cb(entry);
    })
  : null;

export const mutationObserver = win
  ? new MutationObserver((mutations) => {
      // Single global observer routing mutations back to the specific observed node. Assumes the caller handles the mutation list.
      const target = mutations[0].target as Element; // Batch usually targets one observer
      if (target._mutationCallbacks) for (const cb of target._mutationCallbacks) cb(mutations);
    })
  : null;

// --- PUBLIC API ---
export function observeResize(el: Element, cb: (entry: ResizeObserverEntry) => void, sig?: AbortSignal) {
  (el._resizeCallbacks ?? (el._resizeCallbacks = new Set())).add(cb);
  resizeObserver?.observe(el);
  return bindSig(() => (el._resizeCallbacks?.delete(cb), !el._resizeCallbacks?.size && resizeObserver?.unobserve(el)), sig);
}

export function observeIntersection(el: Element, cb: (entry: IntersectionObserverEntry) => void, sig?: AbortSignal) {
  (el._intersectCallbacks ?? (el._intersectCallbacks = new Set())).add(cb);
  intersectionObserver?.observe(el);
  return bindSig(() => (el._intersectCallbacks?.delete(cb), !el._intersectCallbacks?.size && intersectionObserver?.unobserve(el)), sig);
}

export function observeMutation(el: Element, cb: (mutations: MutationRecord[]) => void, options: MutationObserverInit, sig?: AbortSignal) {
  (el._mutationCallbacks ?? (el._mutationCallbacks = new Set())).add(cb);
  mutationObserver?.observe(el, options);
  return bindSig(() => el._mutationCallbacks?.delete(cb), sig);
}
