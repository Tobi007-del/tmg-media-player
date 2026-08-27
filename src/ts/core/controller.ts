import type { CtlrConfig } from "@defs/config";
import type { CtlrMedia } from "@defs/contract";
import type { Action } from "@defs/actions";
import { TechRegistry, PlugRegistry } from "./registries";
import { type CtlrState } from "@tools/runtime";
import { HTML5Tech } from "@techs/html5";
import type { TechConstructor } from "@techs/base";
import { PlugConstructor as PC, type BasePlug as Plug } from "@plugs/base";
import { guardAllMethods, guardMethod } from "@utils/methd";
import { setTimeout, throttle, cancelRAFLoop, RAFLoop, mockAsync, debounce } from "@utils/fn";
import { getWindow } from "@utils/dom";
import { createEl, observeIntersection, observeResize } from "@utils/dom";
import { uncamelize } from "@utils/str";
import { cloneMedia, getMediaReport, isSameSources, getSizeTier } from "@utils/media";
import { type Volatile, reactive, type Reactive, inert, intent, volatile, getRaw } from "sia-reactor";
import { fanout, getPath, mergeObjs, nuke, setPath } from "sia-reactor/utils";
import type { PlugRegistryMap, ControllerDOMMap } from "@defs/registries";
import { isFunc, isStr } from "@utils/obj";
import { silence, transaction } from "sia-reactor/modules";
import { AUDIO_EXTENSIONS } from "@utils/match";
import { MediaType } from "@defs/generics";
import { STATE_BUILD } from "@consts/config";

// --- CONTROLLER (The Orchestrator) ---
export class Controller {
  // --- CORE SYSTEM ---
  private ac = new AbortController();
  public readonly signal = this.ac.signal;
  public plugs = new Map<string, Plug>();
  // --- RUNTIME (Global Controller States) ---
  public media: Reactive<CtlrMedia>;
  public state: Reactive<CtlrState> & Record<string, any>; // runtime state and states to be populated for easy reach
  public config: Reactive<Volatile<CtlrConfig>>;
  public get settings() {
    return this.config.settings; // can change ref
  } // for easy reach, better devx
  public get actions() {
    return this.config.actions; // for easy reach
  }
  public zenlist: string[] = ["settings"]; // #DEFAULT: build privilege; block actions while UI is active
  // --- MEMORY ---
  public payload: { readyState: number; initialized: boolean; wired: boolean; destroyed: boolean; instance: Controller } = { instance: this } as any;
  public _build: CtlrConfig; // Build Cache
  // --- DOM (Utilized by Externals) ---
  public DOM: ControllerDOMMap = {}; // To be populated with common elements for easy reach
  public hash = "#tmg-auto-gen";
  public mutatingDOMM = true; // mutatingDOMMedia: for external watchers that need to know

  constructor(medium: HTMLMediaElement, build: CtlrConfig) {
    guardAllMethods(this, this.guard);
    const defs = mergeObjs(getMediaReport(medium), build.media); // returns defaults and initials
    this.config = reactive(volatile(build), { referenceTracking: true, smartCloning: true }); // `lineageTracing: false` so clone before reassigning "already in state" objects
    this.state = reactive<CtlrState>(STATE_BUILD());
    this.state.watch("readyState", (v) => ((this.payload.readyState = v), (this.payload.initialized = v > 0), (this.payload.wired = v > 1), (this.payload.destroyed = v < 0)), { signal: this.signal });
    this.media = reactive({ intent: volatile(intent(defs.intent)), state: defs.state, status: defs.status, settings: volatile(intent(defs.settings)), type: medium.tagName.toLowerCase() as MediaType, tech: inert({}), features: {}, element: medium, pseudoElement: createEl(medium.tagName.toLowerCase()), container: createEl("div"), pseudoContainer: createEl("div") }, { crossRealms: true }) as any;
    this.media.set("tech", (t) => inert(t!), { signal: this.signal });
    this.log((this._build = this.config.snapshot())), delete this.config.media; // clone for resets and fast subsequents
    this.setReadyState(0), this.boot();
  }
  private async boot(): Promise<void> {
    this.connectPlugs(), this.wireTechHandler(), this.wireStateHandler();
    await mockAsync(0), this.setReadyState(1); // wiring the machinery
    this.state.wonce("readyState", () => (!this.media.state.paused ? this.setReadyState(3) : this.media.wonce("state.paused", () => this.setReadyState(3), { signal: this.signal })), { signal: this.signal }); // first play(ed), matters to some
    await mockAsync(0), this.setReadyState(2); // block `set` to stall, e.g lightState
    setTimeout(() => (this.mutatingDOMM = false), 0, this.signal);
  }

  public connectPlugs(Plugs = PlugRegistry.getOrdered()): void {
    if (!this.payload.wired) for (const Plug of Plugs) this.plugIn(Plug); // solve the "must wire before tech to capture" or plugs go from "higher power" to slaves on re-connect
    const plugs = this.payload.wired && Plugs.filter((Plug) => this.config.noPlugList !== "*" && (!this.config.noPlugList.includes(Plug.fullName) || Plug.isCore)).map((Plug) => new Plug(this));
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
    const { src, sources } = this.media.intent;
    if (this.media.settings.srcObject) return this.useTech(); // `MediaProvider` is native only
    let selectedTech: TechConstructor | null = TechRegistry.pick(src, this.config.settings.techOrder),
      selectedSource: string | null = selectedTech ? src : null;
    if (!selectedTech && !isSameSources(sources, this.media.state.sources))
      for (const source of sources) {
        selectedTech = TechRegistry.pick(source.src, this.config.settings.techOrder);
        if (selectedTech) {
          selectedSource = source.src;
          break;
        }
      }
    (getRaw(this.media.state).src = src), (getRaw(this.media.state).sources = inert(sources)); // for tech fanout accuracy
    this.useTech(selectedTech || undefined);
    if (selectedSource !== src && !this.media.features.sources) silence(() => (this.media.intent.src = selectedSource!)); // bonus since tech can't handle sources
  }
  public useTech(TechClass: TechConstructor = HTML5Tech, reload = false): void {
    this.media.type = AUDIO_EXTENSIONS.test(this.media.state.src) ? "audio" : "video";
    (reload || TechClass !== this.media.tech.constructor) && (this.media.tech = new TechClass(this)).setup(); // #RESPONSIBLE: no external setup
  }
  public get techTruth(): "state" | "intent" {
    return this.payload.wired ? "state" : "intent";
  }
  public get isNativeEl(): boolean {
    return this.media.element === this.media.tech.element;
  }

  private wireStateHandler(): void {
    observeIntersection(this.media.container.parentElement!, (entry) => (this.state.mediaParentIntersecting = entry.isIntersecting), this.signal);
    observeIntersection(this.media.container, (entry) => (this.state.mediaIntersecting = entry.isIntersecting), this.signal);
    observeResize(this.media.container, () => fanout(this.state.dimensions.container, getSizeTier(this.media.container)), this.signal);
    observeResize(this.media.pseudoContainer, () => fanout(this.state.dimensions.pseudoContainer, getSizeTier(this.media.pseudoContainer)), this.signal);
  }
  public setReadyState(state?: number): void {
    this.state.readyState = !this.state ? 0 : state ?? this.state.readyState + 1;
    const rS = this.state.readyState; // incase of blocked sets, e.g. lightState
    this.fire("tmgreadystatechange", this.payload), this.fire(rS === 0 ? "tmgcreate" : rS === 1 ? "tmginit" : rS === 2 ? "tmgwire" : rS === 3 ? "tmgfirstplay" : rS === -1 ? "tmgdestroy" : "", this.payload);
  }

  public guard = <Fn extends Function>(fn: Fn, silent = false) => guardMethod(fn, (e) => this.notice(e, "error", !silent)); // `()=>{}`: needs to be bounded even before initialization
  public notice(mssg: any, type: "error" | "warn" | "log" = "error", toast?: string | boolean | null, swallow = true): void {
    this.log(mssg, type, swallow), toast !== false && (type === "log" || (type === "error" && swallow && !this.config.devMode) ? this.plug("settings.toasts")?.toast : this.plug("settings.toasts")?.toast?.[type])?.(toast === null || this.config.devMode ? mssg : isStr(toast) ? toast : "Something went wrong", { tag: "tmg-stwr" });
  }
  public log(mssg: any, type: "error" | "warn" | "log" = "log", swallow = false): void {
    if (!this.config.debug) return;
    if (type === "error") return swallow && !this.config.devMode ? console.warn(`[TMG Controller] Error swallowed →`, mssg) : console.error(`[TMG Controller] Error occurred →`, mssg);
    else type === "warn" ? console.warn(`[TMG Controller] Warning →`, mssg) : console.log(`[TMG Controller] Log →`, mssg);
  }
  public fire(eN: string, detail: any = null, el: HTMLElement | EventTarget = this.media.element, bubbles = true, cancelable = true): void {
    eN && el?.dispatchEvent(new CustomEvent(eN, { detail, bubbles, cancelable }));
  }

  public throttle(key: string, fn: Function, delay = 30, strict: ((fn: Function) => number) | boolean = true, signal = this.signal) {
    throttle(this.config.id + key, fn, delay, strict, signal, getWindow(this.media.container));
  }
  public debounce(key: string, fn: Function, delay = 30, strict = true, signal = this.signal) {
    debounce(this.config.id + key, fn, delay, strict, signal, getWindow(this.media.container));
  }
  public RAFLoop(key: string, fn: Function, signal = this.signal): void {
    RAFLoop(this.config.id + key, fn, signal, getWindow(this.media.container));
  }
  public cancelRAFLoop(key: string): void {
    cancelRAFLoop(this.config.id + key);
  }
  public cancelAllLoops(): void {
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
  public setCanvasFallback(canvas: HTMLCanvasElement, context?: CanvasRenderingContext2D | null, callback = (img = this.altImg) => context?.drawImage((this.altImg = img)!, 0, 0, canvas.width, canvas.height)): void {
    const _img = canvas && (this.altImg && this.altImg.src === window.TMG_MEDIA_ALT_IMG_SRC ? callback() : createEl("img", { src: window.TMG_MEDIA_ALT_IMG_SRC, onload: () => callback(_img as HTMLImageElement) }));
  }
  private altImg?: HTMLImageElement;

  public addAction(key: string, action: Omit<Action, "id">, signal = this.signal, existing = this.actions.entries[key] ?? {}): void {
    this.actions.entries[key] = { ...action, ...existing, id: key as any, fn: action.fn }; // fn must comes from the registering plug (runtime source of truth), persisted fields (label, logic, notify) survive from existing entry
    this.config.on(`actions.entries.${key}` as any, () => this.actions.entries[key] && this.actions.entries[key].fn !== action.fn && (this.actions.entries[key].fn = action.fn), { signal });
  }
  public getActions() {
    return (Object.values(this.actions.entries) as Action[]).filter((a) => !a.system || this.config.devMode).sort((a, b) => (a.label || "").localeCompare(b.label || ""));
  }
  public perform(id: string, ...args: any[]): void {
    const action = this.actions.entries[id];
    if (!action || action.disabled || (!action.zen && this.zenlist.some(this.isUIActive))) return;
    transaction((can = !action.gates?.some((g) => this.media.features[g] === false), root = action.logic?.length ? ({ media: this.media, settings: this.config.settings } as any) : undefined) => {
      if (action.logic?.length) for (const step of action.logic) step.op === "toggle" ? setPath(root, step.path, !getPath(root, step.path)) : step.op === "increment" ? setPath(root, step.path, getPath(root, step.path) + (step.value ?? 1)) : step.op === "decrement" ? setPath(root, step.path, getPath(root, step.path) - (step.value ?? 1)) : setPath(root, step.path, step.value);
      can && action.notify && this.plug("settings.notifiers")?.notify(action.notify), action.fn?.(...args), can && action.toast && this.plug("settings.toasts")?.toast?.((isFunc(action.toast.render) ? action.toast.render() : action.toast.render) || `Executed ${action.label ?? action.id}`, action.toast);
    }, action.label ?? action.id);
  }
  public isLogical(path: string): boolean {
    return this.config.actions.logicBlacklist.some((b) => path === b || path.startsWith(b + ".")) || (path.startsWith("media.intent.") && (this.media.features as any)[path.split(".").pop()!] === false) ? false : true;
  }

  public destroy() {
    this.mutatingDOMM = true; // destruction will mutate, flag external watchers
    this.setReadyState(-1);
    this.ac.abort("[TMG Controller] Instance annihilation"), this.cancelAllLoops();
    this.disconnectPlugs(), this.media.tech.destroy();
    const el = this.config.cloneOnDetach ? cloneMedia(this.media.element) : this.media.element;
    this.state.destroy(), this.config.destroy(), this.media.destroy();
    return nuke(this), el;
  }
}
