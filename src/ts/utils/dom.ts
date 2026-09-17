import { NOOP } from "sia-reactor";
import { bindCleanupToSignal as bindSig } from "./fn";
import { Dimensions } from "@defs/generics";
const win = "undefined" !== typeof window ? window : undefined;

// Element Factory
export { createEl, assignEl, getWindow, createListRenderer } from "@t007/utils";
export { initVScrollerator } from "@t007/utils/hooks/vanilla";

// Resource Loading
export { loadResource } from "@t007/utils";

// Fullscreen & Picture-in-Picture
export const queryFullscreen = (): boolean => Boolean(queryFullscreenEl());
export const queryFullscreenEl = (d = document as any): Element | null => d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement || null;

export const queryPictureInPicture = (): boolean => Boolean(queryPictureInPictureEl());
export const queryPictureInPictureEl = () => document.pictureInPictureElement;

export const supportsFullscreen = (video = true, vp = HTMLVideoElement.prototype as any, d = document as any) => Boolean(d.fullscreenEnabled || d.mozFullscreenEnabled || d.msFullscreenEnabled || d.webkitFullscreenEnabled || d.webkitSupportsFullscreen || (video && vp.webkitEnterFullscreen));
export const supportsPictureInPicture = (video = true, vp = HTMLVideoElement.prototype as any, d = document as any, w = window as any) => Boolean(video ? d.pictureInPictureEnabled || vp.requestPictureInPicture : w.documentPictureInPicture);

export const enterFullscreen = (el: any): Promise<void> => (el.webkitEnterFullscreen ? el.webkitEnterFullscreen() : el.requestFullscreen ? el.requestFullscreen() : el.mozRequestFullScreen ? el.mozRequestFullScreen() : el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : el.msRequestFullscreen ? el.msRequestFullscreen() : Promise.reject(new Error("Fullscreen API is not supported")));
export const exitFullscreen = (el: any, d = document as any): Promise<void> => (queryFullscreenEl(d) === el ? (el.webkitExitFullscreen ? el.webkitExitFullscreen() : d.exitFullscreen ? d.exitFullscreen() : d.mozCancelFullScreen ? d.mozCancelFullScreen() : d.webkitExitFullscreen ? d.webkitExitFullscreen() : d.msExitFullscreen ? d.msExitFullscreen() : Promise.reject(new Error("Fullscreen API is not supported"))) : Promise.resolve());

// Geometry
export const getClientWH = (el?: HTMLElement | null, { clientWidth, clientHeight } = el === document.body ? document.documentElement : el || document.documentElement) => ({ clientWidth, clientHeight });

export const getSizeTier = ({ offsetWidth: w, offsetHeight: h }: HTMLElement) => ({ width: w, height: h, tier: h <= 130 ? "xxxxx" : w <= 280 ? "xxxx" : w <= 380 ? "xxx" : w <= 480 ? "xx" : w <= 630 ? "x" : "" });

export function inDocView(el: Element, axis: "x" | "y" = "y", { left, top, right, bottom } = el.getBoundingClientRect()): boolean {
  const inX = left + win!.scrollX >= 0 && right + win!.scrollX <= win!.scrollX + (win!.innerWidth || win!.document.documentElement.clientWidth),
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
export function getRenderedBox({ videoHeight, videoWidth }: { videoHeight?: number; videoWidth?: number }, { width: clientWidth = 0, height: clientHeight = 0 }: { width?: number; height?: number }, { objectFit = "cover", objectPosition = "50% 50%" }: { objectFit?: string; objectPosition?: string }): Partial<Dimensions & { left: number; top: number }> {
  const bbox = { width: clientWidth, height: clientHeight } as DOMRect,
    obj = (((videoHeight ||= 1080), (videoWidth ||= videoHeight * (16 / 9))), videoWidth && videoHeight ? { width: videoWidth, height: videoHeight } : null);
  if (!obj || !objectFit || !objectPosition) return {};
  if (objectFit === "scale-down") objectFit = bbox.width < obj.width || bbox.height < obj.height ? "contain" : "none";
  if (objectFit === "none") return { ...parseObjectPos(objectPosition, bbox, obj), ...obj };
  else if (objectFit === "contain") {
    const objRatio = obj.height / obj.width,
      bboxRatio = bbox.height / bbox.width,
      width = Math.min(bbox.width, bboxRatio > objRatio ? bbox.width : bbox.height / objRatio),
      height = Math.min(bbox.height, bboxRatio > objRatio ? bbox.width * objRatio : bbox.height);
    return { ...parseObjectPos(objectPosition, bbox, { width, height }), width, height };
  } else if (objectFit === "fill") {
    const { left, top, rawLeft, rawTop } = parseObjectPos(objectPosition, bbox, obj);
    return { left: rawLeft.endsWith("%") ? 0 : left, top: rawTop.endsWith("%") ? 0 : top, width: bbox.width, height: bbox.height }; // Relative positioning is discarded with `obj-fit: fill`, so we need to check here if it's relative or not
  } else if (objectFit === "cover") {
    const minRatio = Math.min(bbox.width / obj.width, bbox.height / obj.height);
    let width = obj.width * minRatio,
      height = obj.height * minRatio,
      outRatio = 1;
    if (width < bbox.width) outRatio = bbox.width / width;
    if (Math.abs(outRatio - 1) < 1e-14 && height < bbox.height) outRatio = bbox.height / height;
    (width *= outRatio), (height *= outRatio);
    return { ...parseObjectPos(objectPosition, bbox, { width, height }), width, height };
  } else return {};
}
const parsePosAsPx = (str: string, bboxSize: number, objectSize: number): number => {
  str === "center" ? (str = "50%") : str === "left" || str === "top" ? (str = "0%") : (str === "right" || str === "bottom") && (str = "100%");
  const num = parseFloat(str);
  return !str.endsWith("%") ? num : (bboxSize - objectSize) * (num / 100);
};
const parseObjectPos = (position: string, bbox: DOMRect, object: Dimensions): { left: number; top: number; rawLeft: string; rawTop: string } => {
  if (position === "center") position = "50% 50%";
  const [left, top = "50%"] = position.split(" ");
  return { left: parsePosAsPx(left, bbox.width, object.width), top: parsePosAsPx(top, bbox.height, object.height), rawLeft: left, rawTop: top };
};

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
  interface Node {
    _resizeCallbacks?: Set<(entry: ResizeObserverEntry, entries: ResizeObserverEntry[]) => void>;
    _intersectCallbacks?: Set<(entry: IntersectionObserverEntry, entries: IntersectionObserverEntry[]) => void>;
    _mutationCallbacks?: Set<(mutation: MutationRecord, mutations: MutationRecord[]) => void>;
  }
}

export const intersectionObserver = win
  ? new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.target._intersectCallbacks) for (const cb of entry.target._intersectCallbacks) cb(entry, entries);
      },
      { root: null, rootMargin: "0px", threshold: 0.3 }
    )
  : null;

export const resizeObserver = win
  ? new ResizeObserver((entries) => {
      for (const entry of entries) if (entry.target._resizeCallbacks) for (const cb of entry.target._resizeCallbacks) cb(entry, entries);
    })
  : null;

export const mutationObserver = win
  ? new MutationObserver((mutations) => {
      for (const mutation of mutations) if (mutation.target._mutationCallbacks) for (const cb of mutation.target._mutationCallbacks) cb(mutation, mutations);
    })
  : null;

// --- PUBLIC API ---
export function observeResize(el: Element, cb: (entry: ResizeObserverEntry, entries: ResizeObserverEntry[]) => void, sig?: AbortSignal) {
  (el._resizeCallbacks ??= new Set()).add(cb);
  resizeObserver?.observe(el);
  return bindSig(() => (el._resizeCallbacks?.delete(cb), !el._resizeCallbacks?.size && resizeObserver?.unobserve(el)), sig);
}

export function observeIntersection(el: Element, cb: (entry: IntersectionObserverEntry, entries: IntersectionObserverEntry[]) => void, sig?: AbortSignal) {
  (el._intersectCallbacks ??= new Set()).add(cb);
  intersectionObserver?.observe(el);
  return bindSig(() => (el._intersectCallbacks?.delete(cb), !el._intersectCallbacks?.size && intersectionObserver?.unobserve(el)), sig);
}

export function observeMutation(el: Element, cb: (mutation: MutationRecord, mutations: MutationRecord[]) => void, options: MutationObserverInit, sig?: AbortSignal) {
  if (!options.subtree) return (el._mutationCallbacks ??= new Set()).add(cb), mutationObserver?.observe(el, options), bindSig(() => el._mutationCallbacks?.delete(cb), sig);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) cb(mutation, mutations);
  });
  observer.observe(el, options), bindSig(() => observer.disconnect(), sig);
}
