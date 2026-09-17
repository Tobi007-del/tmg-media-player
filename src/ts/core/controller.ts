import type { CtlrConfig } from "@defs/config";
import type { CtlrMedia } from "@defs/contract";
import type { Action } from "@defs/action";
import { TechRegistry, PlugRegistry } from "./registries";
import { type CtlrState } from "@tools/runtime";
import { HTML5Tech } from "@techs/html5";
import type { TechConstructor } from "@techs/base";
import { PlugConstructor as PC, type BasePlug as Plug } from "@plugs/base";
import { guardAllMethods, guardMethod } from "@t007/utils";
import { setTimeout, throttle, cancelRAFLoop, RAFLoop, mockAsync, debounce } from "@utils/fn";
import { getSizeTier, getWindow } from "@utils/dom";
import { createEl, observeIntersection, observeResize } from "@utils/dom";
import { collator, capitalize, uncamelize } from "@utils/str";
import { cloneMedia, getMediaReport, isFeatured, isSameSources } from "@utils/media";
import { type Volatile, reactive, type Reactive, inert, intent, volatile, getRaw, NOOP, NIL } from "sia-reactor";
import { fanout, getPath, getPaths, isLeafPath, mergeObjs, nuke, setPath } from "sia-reactor/utils";
import type { PlugRegistryMap, ControllerDOMMap } from "@defs/registries";
import { isArr, isFunc, isStr } from "@utils/obj";
import { silence, transaction } from "sia-reactor/modules";
import { AUDIO_EXTENSIONS } from "@utils/match";
import { MediaType } from "@defs/generics";
import { STATE_BUILD } from "@consts/config";

// --- CONTROLLER (The Orchestrator) ---
export class Controller {
  // --- CORE ---
  protected ac = new AbortController();
  public readonly signal = this.ac.signal;
  public plugs = new Map<string, Plug>();
  // --- RUNTIME ---
  public media: Reactive<CtlrMedia>;
  public state: Reactive<CtlrState> & Record<string, any>; // runtime state and states to be populated for easy reach
  public config: Reactive<Volatile<CtlrConfig>>;
  public get settings() {
    return this.config.settings; // can change ref
  } // for easy reach, better devx
  public get actions() {
    return this.config.actions;
  } // same as above
  public get gospel(): "state" | "intent" {
    return this.flags.wired ? "state" : "intent";
  } // "gospel" truth, init edgecases
  // --- MEMORY ---
  public flags: { readyState: number; initialized: boolean; wired: boolean; destroyed: boolean; instance: Controller } = { instance: this } as any;
  public build: CtlrConfig; // Build Cache
  // --- DOM ---
  public DOM: ControllerDOMMap = {}; // To be populated with common elements for easy reach
  public hash = "#tmg-auto-gen";
  public mutating = true; // for external watchers that need to know
  public UIZenList = ["settings"]; // #DEFAULT: build privilege; block actions while UI is active

  constructor(medium: HTMLMediaElement, build: CtlrConfig) {
    guardAllMethods(this, this.guard);
    const defs = mergeObjs(getMediaReport(medium), build.media); // returns defaults and initials
    this.config = reactive(volatile(build), { referenceTracking: true, smartCloning: true }); // `lineageTracing: false` so clone before reassigning "already in state" objects
    this.state = reactive<CtlrState>(STATE_BUILD());
    this.state.watch("readyState", (v) => ((this.flags.readyState = v), (this.flags.initialized = v > 0), (this.flags.wired = v > 1), (this.flags.destroyed = v < 0)), { signal: this.signal });
    this.media = reactive({ intent: volatile(intent(defs.intent)), state: defs.state, status: defs.status, settings: volatile(intent(defs.settings)), type: medium.tagName.toLowerCase() as MediaType, tech: inert({}), features: {}, element: medium, pseudoElement: createEl(medium.tagName.toLowerCase()), container: createEl("div"), pseudoContainer: createEl("div") }, { crossRealms: true }) as any;
    this.media.set("tech", (t) => inert(t!), { signal: this.signal });
    this.log((this.build = this.config.snapshot())), delete this.config.media; // clone for resets and fast subsequents
    this.setReadyState(0), this.boot();
  }
  private async boot(): Promise<void> {
    this.connectPlugs(), this.wireTechHandler(), this.wireStateHandler();
    await mockAsync(0), this.setReadyState(1); // wiring the machinery
    this.state.wonce("readyState", () => (!this.media.state.paused ? this.setReadyState(3) : this.media.wonce("state.paused", () => this.setReadyState(3), { signal: this.signal })), { signal: this.signal }); // first play(ed), matters to some
    await mockAsync(0), this.setReadyState(2); // block `set` to stall, e.g lightState
    setTimeout(() => (this.mutating = false), 0, this.signal);
  }

  public connectPlugs(Plugs = PlugRegistry.getOrdered()): void {
    if (!this.flags.wired) for (const Plug of Plugs) this.plugIn(Plug); // solve the "must wire before tech to capture" or plugs go from "higher power" to slaves on re-connect
    const plugs = this.flags.wired && Plugs.filter((Plug) => this.config.noPlugList !== "*" && (!this.config.noPlugList.includes(Plug.fullName) || Plug.isCore)).map((Plug) => new Plug(this));
    if (plugs) plugs.forEach((plug) => plug.mount?.()), plugs.forEach((plug) => plug.wire?.()); // plugs might rely on others being plugged in
  }
  public disconnectPlugs(): void {
    for (const plug of [...this.plugs.values()].reverse()) plug.destroy();
  }
  public plugIn(Plug: PC, config?: any): this {
    return this.config.noPlugList !== "*" && (!this.config.noPlugList.includes(Plug.fullName) || Plug.isCore) && new Plug(this, config).setup(), this; // #RESPONSIBLE: no external setup
  }
  public plug<K extends keyof PlugRegistryMap>(fullName: K): InstanceType<PlugRegistryMap[K]> | undefined;
  public plug<T extends Plug = Plug>(fullName: string): T | undefined;
  public plug(fullName: string): any {
    return this.plugs.get(fullName);
  }

  protected wireTechHandler(): void {
    this.media.watch("intent.src", this.handleTech, { signal: this.signal, init: true }); // load initial
    this.media.watch("intent.sources", this.handleTech, { signal: this.signal });
    this.media.watch("settings.srcObject", this.handleTech, { signal: this.signal });
  }
  protected handleTech(): void {
    if (this.media.status.ads) return;
    const { src, sources } = this.media.intent;
    if (this.media.settings.srcObject) return this.useTech(); // `MediaProvider` is native only
    let techPick: TechConstructor | null = TechRegistry.pick(src, this.config.settings.techOrder),
      srcPick: string | null = techPick ? src : null;
    if (!techPick && !isSameSources(sources, this.media.state.sources))
      for (const source of sources) {
        techPick = TechRegistry.pick(source.src, this.config.settings.techOrder);
        // prettier-ignore
        if (techPick) { srcPick = source.src; break; }
      }
    (getRaw(this.media.state).src = src), (getRaw(this.media.state).sources = inert(sources)); // for tech fanout accuracy
    this.useTech(techPick || undefined);
    if (srcPick !== src && !this.media.features.sources) silence(() => (this.media.intent.src = srcPick!)); // bonus since tech can't handle sources
  }
  public useTech(TechClass: TechConstructor = HTML5Tech, reload = false): void {
    this.media.type = AUDIO_EXTENSIONS.test(this.media.state.src) ? "audio" : "video";
    (reload || TechClass !== this.media.tech.constructor) && (this.media.tech = new TechClass(this)).setup(); // #RESPONSIBLE: no external setup
  }
  public get isNativeEl(): boolean {
    return this.media.element === this.media.tech.element;
  }

  private wireStateHandler(): void {
    observeIntersection(this.media.container.parentElement!, (entry) => (this.state.parentIntersecting = entry.isIntersecting), this.signal);
    observeIntersection(this.media.container, (entry) => (this.state.mediaIntersecting = entry.isIntersecting), this.signal);
    observeResize(this.media.container, () => fanout(this.state.dimensions.container, getSizeTier(this.media.container)), this.signal);
    observeResize(this.media.pseudoContainer, () => fanout(this.state.dimensions.pseudoContainer, getSizeTier(this.media.pseudoContainer)), this.signal);
  }
  public setReadyState(state?: number): void {
    this.state.readyState = !this.state ? 0 : state ?? this.state.readyState + 1;
    const rS = this.state.readyState; // incase of blocked sets, e.g. lightState
    this.fire("tmgreadystatechange", this.flags), this.fire(rS === 0 ? "tmgcreate" : rS === 1 ? "tmginit" : rS === 2 ? "tmgwire" : rS === 3 ? "tmgfirstplay" : rS === -1 ? "tmgdestroy" : "", this.flags);
  }

  public guard = <Fn extends Function>(fn: Fn, silent = false) => guardMethod(fn, (e) => this.notice(e, "error", !silent)); // `()=>{}`: bounded even before init
  public notice(mssg: any, type: "error" | "warn" | "log" = "error", toast?: string | boolean | null, swallow = true): void {
    this.log(mssg, type, swallow), toast !== false && ((type = type === "error" && swallow ? "warn" : type) === "log" ? this.toast : this.toast?.[type])?.(toast === null || this.config.devMode ? mssg : isStr(toast) ? toast : "Something went wrong", { tag: "tmg-stwr" });
  }
  public log(mssg: any, type: "error" | "warn" | "log" = "log", swallow = false): void {
    if (this.config.devMode) type === "error" ? (swallow ? console.warn(`[TMG Controller] Error swallowed →`, mssg) : console.error(`[TMG Controller] Error occurred →`, mssg)) : type === "warn" ? console.warn(`[TMG Controller] Warning →`, mssg) : console.log(`[TMG Controller] Log →`, mssg); // swallow = errors that don't leave cracks
  }
  public fire(eN: string, detail: any = null, el: HTMLElement | EventTarget = this.media.element, bubbles = true, cancelable = true): void {
    eN && el?.dispatchEvent(new CustomEvent(eN, { detail, bubbles, cancelable }));
  }
  public get toast() {
    return this.plug("settings.toasts")?.toast;
  }
  public when(status: keyof CtlrMedia["status"], e?: { path?: string; value?: any }, task: () => any = NOOP, signal = this.signal, always = true, _key = status + (e?.path || ""), _value = (!always && this.flags.wired) || this.media.status[status], _log = this.config.devMode && !this.media.status[status]): void {
    const callback = this.guard((v: any, __: any, stalled = true) => v && (stalled && this.stalled.get(_key)?.(), this.stalled.delete(_key), _log && this.log(`${e?.path || "-"} stalled by ${status}: ${"object" === typeof e?.value ? "{-}" : e?.value ?? "-"}`), task())); // RS(${this.flags.readyState})
    this.stalled.get(_key)?.(), _value ? callback(_value, null, false) : this.stalled.set(_key, this.media.watch(`status.${status}`, callback, { signal }));
  } // #EXTRA-MILE: doing the most with the least
  protected stalled = new Map<string, () => void>();

  public learn(key: string, act: Omit<Action, "id"> = NIL, signal = this.signal, old = this.actions.entries[key] ?? {}): void {
    this.actions.entries[key] = { ...act, ...old, id: key as any, fn: act.fn }; // fn must comes from the registering plug (runtime source of truth), persisted fields (label, logic, notify) survive from old entry
    this.config.on(`actions.entries.${key}` as any, () => this.actions.entries[key] && this.actions.entries[key].fn !== act.fn && (this.actions.entries[key].fn = act.fn), { signal });
  }
  public perform(id?: string, ...args: any[]): boolean {
    const act = id && this.actions.entries[id];
    if (!act || act.disabled || (!act.zen && this.UIZenList.some(this.isUIActive))) return false;
    const can = !act.gates?.some((g) => !this.media.features[g]);
    transaction((root = act.logic?.length ? (this.logicRoot as any) : undefined) => {
      if (act.logic?.length) for (const { op, path, value, curr = op === "set" ? value : getPath(root, !path.includes("intent") ? path : path.replace("intent", "state")) } of act.logic as any) setPath(root, path, op === "toggle" ? !curr : op === "increment" ? curr + (value ?? 1) : op === "decrement" ? curr - (value ?? 1) : value);
      can && act.notify && this.plug("settings.notifiers")?.notify(act.notify), act.fn?.(...args), can && act.toast && this.toast?.((isFunc(act.toast.render) ? act.toast.render() : act.toast.render) || `Performed ${act.label ?? capitalize(uncamelize(act.id))}`, { tag: this.config.id + act.id, renotify: true, ...act.toast });
    }, act.label ?? act.id);
    return can;
  }
  public isLogical(path: string, leaf = false, value = leaf && getPath(this.logicRoot as any, path as any)): boolean {
    return !leaf ? !(this.config.actions.blacklist.some((b) => path === b || path.startsWith(b + ".")) || (/^media\.(intent|settings)\./.test(path) && !isFeatured(this.media, path.slice(path.lastIndexOf(".") + 1)))) : isArr(value) || isLeafPath(this.logicRoot as any, path as any, undefined, value);
  }
  public get logicRoot() {
    return { media: this.media, settings: this.config.settings };
  }
  public get logicActions() {
    return (Object.values(this.actions.entries) as Action[]).filter((a) => !a.system || this.config.devMode).sort((a, b) => collator.compare(a.label || "", b.label || ""));
  }
  public getLogicPaths(path: string): string[] {
    // prettier-ignore
    return getPaths(this.logicRoot as any, path, { depth: 1 }).filter((p) => this.isLogical(p)).sort();
  }

  public throttle(key: string, fn: Function, delay = 30, strict: ((fn: Function) => number) | boolean = true, signal = this.signal) {
    throttle(this.config.id + key, fn, delay, strict, signal, getWindow(this.media.container));
  }
  public debounce(key: string, fn: Function, delay = 30, strict = false, signal = this.signal) {
    debounce(this.config.id + key, fn, delay, strict, signal, getWindow(this.media.container));
  }
  public RAFLoop(key: string, fn: Function, signal = this.signal): void {
    RAFLoop(this.config.id + key, fn, signal, getWindow(this.media.container));
  }
  public cancelRAFLoop(key: string): void {
    cancelRAFLoop(this.config.id + key);
  }
  public cancelRAFLoops(): void {
    if (t007._RAFLoopers) for (const k of t007._RAFLoopers.keys()) k.startsWith(this.config.id) && cancelRAFLoop(k);
  }

  public isUIActive(mode: string): boolean {
    return this.media.container.classList.contains(`tmg-media-${uncamelize(mode === "settings" ? "settings-view" : mode, "-")}`);
  }
  public queryDOM<K extends keyof HTMLElementTagNameMap>(query: K, all: true, isPseudo?: boolean): NodeListOf<HTMLElementTagNameMap[K]>;
  public queryDOM<E extends Element = HTMLElement>(query: string, all: true, isPseudo?: boolean): NodeListOf<E>;
  public queryDOM<K extends keyof HTMLElementTagNameMap>(query: K, all?: false, isPseudo?: boolean): HTMLElementTagNameMap[K] | null;
  public queryDOM<E extends Element = HTMLElement>(query: string, all?: false, isPseudo?: boolean): E | null;
  public queryDOM(query: string, all = false, isPseudo = false) {
    return all ? (isPseudo ? this.media.pseudoContainer : this.media.container).querySelectorAll(query) : (isPseudo ? this.media.pseudoContainer : this.media.container).querySelector(query);
  }

  public syncImgLoadState(img: HTMLImageElement, now = true): HTMLImageElement {
    return ["load", "error"].forEach((ev) => img.addEventListener(ev, this.setImgLoadState, { signal: this.signal })), now && this.setImgLoadState({ target: img }), img;
  }
  public setImgLoadState<Ev extends Partial<Pick<Event, "target" | "type">>>({ target: img, type = "load" }: Ev): void {
    img instanceof HTMLImageElement && img?.setAttribute("data-loaded", String(type === "load" && img.complete && img.naturalWidth > 0));
  }
  public setImgFallback<Ev extends Partial<Pick<Event, "target">>>({ target: img }: Ev): void {
    img instanceof HTMLImageElement && img.src !== window.TMG_MEDIA_ALT_IMG_SRC && (img.src = window.TMG_MEDIA_ALT_IMG_SRC!);
  }
  public setCanvasFallback(canvas: HTMLCanvasElement, ctx?: CanvasRenderingContext2D | null, callback = (img = this.altImg) => ctx?.drawImage((this.altImg = img)!, 0, 0, canvas.width, canvas.height)): void {
    const _img = canvas && (this.altImg && this.altImg.src === window.TMG_MEDIA_ALT_IMG_SRC ? callback() : createEl("img", { src: window.TMG_MEDIA_ALT_IMG_SRC, onload: () => callback(_img as HTMLImageElement) }));
  }
  private altImg?: HTMLImageElement;

  public destroy(): HTMLMediaElement {
    this.mutating = true; // destruction will mutate, raise flag
    this.setReadyState(-1), this.ac.abort("[TMG Controller] Instance annihilation"), this.cancelRAFLoops();
    this.disconnectPlugs(), this.media.tech.destroy();
    const el = this.config.safeDetach ? cloneMedia(this.media.element) : this.media.element;
    this.state.destroy(), this.config.destroy(), this.media.destroy();
    return nuke(this), el;
  }
}
