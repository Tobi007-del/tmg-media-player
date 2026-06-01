import type { CtlrConfig } from "@defs/config";
import type { CtlrMedia } from "@defs/contract";
import { TechRegistry, PlugRegistry } from "./registries";
import { STATE_BUILD, type CtlrState } from "@tools/runtime";
import { HTML5Tech } from "@techs/html5";
import type { TechConstructor } from "@techs/base";
import { PlugConstructor as PC, type BasePlug as Plug } from "@plugs/base";
import { guardAllMethods, guardMethod } from "@utils/methd";
import { setTimeout, throttle, cancelRAFLoop, RAFLoop, rafLoopMap, breath } from "@utils/fn";
import { getWindow } from "@utils/dom";
import { clamp } from "@utils/num";
import { observeIntersection, observeResize } from "@utils/dom";
import { uncamelize, isSameURL } from "@utils/str";
import { cloneMedia, getMediaReport, isSameSources, getSizeTier } from "@utils/media";
import { createEl } from "@utils/dom";
import { type Volatile, reactive, type Reactive, inert, intent, state, volatile } from "sia-reactor";
import { fanout, nuke } from "sia-reactor/utils";
import type { PlugRegistryMap, ControllerDOMMap } from "@defs/registries";

// --- CONTROLLER (The Orchestrator) ---
export class Controller {
  // --- CORE SYSTEM ---
  private ac = new AbortController();
  public readonly signal = this.ac.signal;
  public plugs = new Map<string, Plug>();
  // --- RUNTIME (Global Controller States) ---
  public config: Reactive<Volatile<CtlrConfig>>;
  public state: Reactive<CtlrState> & Record<string, any>; // runtime state and states to be populated for easy reach
  public media: Reactive<CtlrMedia>;
  public settings!: CtlrConfig["settings"]; // for easy reach, better devx
  // --- MEMORY ---
  public _build: CtlrConfig; // Build Cache
  private _payload: { readyState: number; initialized: boolean; wired: boolean; destroyed: boolean; instance: Controller } = { instance: this } as any; // must use getter for payload
  // DOM References (Utilized by Plugs)
  public DOM: ControllerDOMMap = {}; // To be populated with common elements for easy reach
  // --- FLAGS (Essential Only) ---
  public mutatingDOMM = true; // Critical for Player wrapper to know when swapping modes

  constructor(medium: HTMLMediaElement, build: CtlrConfig) {
    this.setReadyState(0, medium);
    guardAllMethods(this, this.guard);
    const defs = getMediaReport(medium); // returns defaults and initials
    this.config = reactive(volatile(build), { debug: false, referenceTracking: true, smartCloning: true }); // `lineageTracing: false` so clone before reassigning "already in state" objects
    this.state = reactive<CtlrState>(structuredClone(STATE_BUILD), { debug: false });
    this.media = reactive({ intent: volatile(intent({ ...defs.intent, ...build.startup.intent })), state: state(defs.state), status: state(defs.status), settings: state({ ...defs.settings, ...build.startup.settings }), tech: inert({}), features: reactive({}), type: build.mediaType, element: inert(medium), pseudoElement: inert(createEl(build.mediaType)), container: inert(createEl("div")), pseudoContainer: inert(createEl("div")) }, { debug: false }) as any;
    this.media.set("tech", (t) => inert(t!), { signal: this.signal });
    this.config.watch("settings", (v) => (this.settings = v), { init: true, signal: this.signal }); // COMPUTED: settings can lose reference
    this.log((this._build = this.config.snapshot())); // clone initial config for resets and fast subsequent cloning
    this.boot();
  }

  private async boot(): Promise<void> {
    await breath(), await this.connectPlugs();
    this.wireTechHandler(), this.wireStateHandler();
    await breath(), this.setReadyState(); // stalling wiring b4 boot complete
    !this.media.state.paused ? this.setReadyState() : this.media.wonce("state.paused", () => this.setReadyState(), { signal: this.signal }); // first play(ed)
    setTimeout(() => (this.mutatingDOMM = false), 0, this.signal); // everything banks on "a video can't load in less than 2 RAFs"
  }

  public async connectPlugs(Plugs = PlugRegistry.getOrdered()): Promise<void> {
    for (const Plug of Plugs) this.plugIn(Plug), await breath();
  }
  public disconnectPlugs(): void {
    for (const plug of [...this.plugs.values()].reverse()) plug.destroy();
  }
  public plugIn(Plug: PC, config?: any): this {
    return (!this.config.noPlugList.includes(Plug.fullName) || Plug.isCore) && new Plug(this, config).setup(), this; // #RESPONSIBLE: no external setup
  }
  public plug<K extends keyof PlugRegistryMap>(fullName: K): InstanceType<PlugRegistryMap[K]> | undefined;
  public plug<T extends Plug = Plug>(fullName: string): T | undefined;
  public plug(fullName: string): any {
    return this.plugs.get(fullName);
  }

  protected wireTechHandler(): void {
    this.media.on("intent.src", () => this.handleTech(), { capture: true, signal: this.signal, init: true }); // load initial
    this.media.on("intent.sources", () => this.handleTech(), { capture: true, signal: this.signal });
    this.media.on("state.src", () => this.handleTech("state"), { capture: true, signal: this.signal }); // wingardium leviosa !
    this.media.on("state.sources", () => this.handleTech("state"), { capture: true, signal: this.signal }); // wingardium leviosa !
    this.media.on("settings.srcObject", () => this.handleTech(), { capture: true, signal: this.signal });
  }
  protected handleTech(pref: "state" | "intent" = "intent"): void {
    const { src: prefSrc, sources: prefSources } = pref === "intent" ? this.media.intent : this.media.state,
      { src: altSrc, sources: altSources } = pref === "intent" ? this.media.state : this.media.intent;
    if (this.media.settings.srcObject) return this.useTech();
    let selectedTech: TechConstructor | null = null,
      selectedSource: string | null = null;
    if (!isSameURL(prefSrc, altSrc)) {
      selectedTech = TechRegistry.pick(prefSrc, this.config.settings.techOrder);
      if (selectedTech) selectedSource = prefSrc;
    }
    if (!selectedTech && !isSameSources(prefSources, altSources)) {
      for (const source of prefSources) {
        selectedTech = TechRegistry.pick(source.src, this.config.settings.techOrder);
        if (selectedTech) {
          selectedSource = source.src;
          break;
        }
      }
    }
    this.useTech(selectedTech || undefined);
    if (selectedSource !== prefSrc && !this.media.features.sources) this.media.intent.src = selectedSource!; // since tech can't handle sources
  }
  public useTech(TechClass: TechConstructor = HTML5Tech): void {
    TechClass !== this.media.tech.constructor && new TechClass(this).setup(); // #RESPONSIBLE: no external setup
  }
  public get isNativeTech(): boolean {
    return this.media.element === this.media.tech.element;
  }

  private wireStateHandler(): void {
    observeIntersection(this.media.container.parentElement!, (entry) => (this.state.mediaParentIntersecting = entry.isIntersecting), this.signal);
    observeIntersection(this.media.container, (entry) => (this.state.mediaIntersecting = entry.isIntersecting), this.signal);
    observeResize(this.media.container, () => fanout(this.state.dimensions.container, getSizeTier(this.media.container)), this.signal);
    observeResize(this.media.pseudoContainer, () => fanout(this.state.dimensions.pseudoContainer, getSizeTier(this.media.pseudoContainer)), this.signal);
  }

  public get payload() {
    const rS = this.state?.readyState ?? 0;
    return ((this._payload.readyState = rS), (this._payload.initialized = rS > 0), (this._payload.wired = rS > 1), (this._payload.destroyed = rS < 0)), this._payload;
  } // cached due to frequent access
  public setReadyState(state?: number, medium?: HTMLMediaElement): void {
    const readyState = !this.state ? 0 : clamp(0, state ?? this.state.readyState + 1, 3);
    this.state && (this.state.readyState = readyState), this.fire("tmgreadystatechange", this.payload, medium);
  }

  public guard = <Fn extends Function>(fn: Fn, { silent = false } = {}) => {
    return guardMethod(fn, (e) => (this.log(e, "error", "swallow"), !silent && this.plug("settings.toasts")?.toast?.("Something went wrong", { tag: "tmg-stwr" }))); // treated as one log identity
  }; // `()=>{}`: needs to be bounded even before initialization

  public log(mssg: any, type: "error" | "warn" | "log" = "log", action?: "swallow") {
    if (!this.config.debug) return;
    if (type === "error") return action === "swallow" ? console.warn(`[TMG Controller] swallowed error:`, mssg) : console.error(`[TMG Controller] error:`, mssg);
    else type === "warn" ? console.warn(`[TMG Controller] warning:`, mssg) : console.log(`[TMG Controller] log:`, mssg);
  }

  public fire(eN: string, detail: any = null, el: HTMLElement | EventTarget = this.media.element, bubbles = true, cancelable = true): void {
    eN && el?.dispatchEvent(new CustomEvent(eN, { detail, bubbles, cancelable }));
  }

  public throttle(key: string, fn: Function, delay = 30, strict = true) {
    throttle(this.config.id + key, fn, delay, strict, this.signal, getWindow(this.media.container));
  }

  public RAFLoop(key: string, fn: Function): void {
    RAFLoop(this.config.id + key, fn, this.signal, getWindow(this.media.container));
  }
  public cancelRAFLoop(key: string): void {
    cancelRAFLoop(this.config.id + key);
  }
  public cancelAllLoops(): void {
    rafLoopMap.keys().forEach((k) => k.startsWith(this.config.id) && this.cancelRAFLoop(k));
  }

  public isUIActive(mode: string, el = this.media.container): boolean {
    return el.classList.contains(`tmg-media-${uncamelize(mode === "settings" ? "settings-view" : mode, "-")}`);
  }

  public queryDOM<K extends keyof HTMLElementTagNameMap>(query: K, all: true, isPseudo?: boolean): NodeListOf<HTMLElementTagNameMap[K]>;
  public queryDOM<E extends Element = HTMLElement>(query: string, all: true, isPseudo?: boolean): NodeListOf<E>;
  public queryDOM<K extends keyof HTMLElementTagNameMap>(query: K, all?: false, isPseudo?: boolean): HTMLElementTagNameMap[K] | null;
  public queryDOM<E extends Element = HTMLElement>(query: string, all?: false, isPseudo?: boolean): E | null;
  public queryDOM(query: string, all = false, isPseudo = false) {
    return all ? (isPseudo ? this.media.pseudoContainer : this.media.container).querySelectorAll(query) : (isPseudo ? this.media.pseudoContainer : this.media.container).querySelector(query);
  }

  setImgLoadState<Ev extends Pick<Event, "target">>({ target: img }: Ev): void {
    img instanceof HTMLImageElement && img?.setAttribute("data-loaded", String(img.complete && img.naturalWidth > 0));
  }
  setImgFallback<Ev extends Pick<Event, "target">>({ target: img }: Ev): void {
    img instanceof HTMLImageElement && img.src !== window.TMG_MEDIA_ALT_IMG_SRC && (img.src = window.TMG_MEDIA_ALT_IMG_SRC!);
  }
  setCanvasFallback(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, img?: HTMLImageElement): void {
    img = canvas && createEl("img", { src: window.TMG_MEDIA_ALT_IMG_SRC, onload: () => context?.drawImage(img!, 0, 0, canvas.width, canvas.height) });
  }

  public destroy() {
    this.mutatingDOMM = true; // destruction will mutate, flag external watchers
    const el = this.config.cloneOnDetach ? cloneMedia(this.media.element) : this.media.element;
    this.setReadyState(-1);
    this.ac.abort("[TMG Controller] Instance is being destroyed");
    this.disconnectPlugs(), this.media.tech.destroy();
    this.state.destroy(), this.config.destroy(); // this.media.destroy() already handled by tech i.e. tech.config.destroy()
    return nuke(this), el;
  }
}
