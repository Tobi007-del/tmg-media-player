import { BasePlug } from "../../base";
import type { Controller } from "@core/controller";
import type { CueLike, CaptionsConfig, CaptionsState } from "./types";
import { CAPTIONS_BUILD } from "./build";
import { ROTATE_PATHS, STYLE_PATHS } from "./build";
import type { CaptionsView } from "@components/captionsview";
import { ComponentRegistry, MenuRegistry } from "@core/registries";
import { type REvent, type PathValue, TERMINATOR } from "sia-reactor";
import { setPath } from "sia-reactor/utils";
import type { CtlrConfig } from "@defs/config";
import type { CtlrMedia } from "@defs/contract";
import { rotateAny } from "@utils/num";
import { getTrackIdx } from "@utils/media";
import { camelize, capitalize } from "@utils/str";
import { silence } from "sia-reactor/modules";
import { parseUIObj } from "@utils/obj";
import { HTML5Tech } from "@techs/html5";
import { KeyMod } from "../keys";

export class CaptionsPlug extends BasePlug<CaptionsConfig, CaptionsState> {
  public static readonly plugName = "captions";
  public static readonly BUILD = CAPTIONS_BUILD;
  protected views = new Map<string, CaptionsView>();
  protected iView: CaptionsView | null = null; // info view
  protected isNative = false;
  protected shadowCurrentIndex?: number;
  protected secondaryViews = new Map<number, Map<string, CaptionsView>>();

  constructor(ctlr: Controller, config = ctlr.settings.captions) {
    super(ctlr, config, { secondaryTracks: [] });
  }

  public override mount(): void {
    // Variables Assignment
    this.iView = ComponentRegistry.init("captionsview", this.ctlr) || null;
    this.mainView; // Proactively initialize main view
  }

  public override wire(): void {
    this.settings.css.currentCaptionsX, this.settings.css.currentCaptionsY; // Read once so CSSPlug can cache computed values.
    // State Listeners
    this.state.on("secondaryTracks", this.syncTracks, { signal: this.signal });
    // Ctlr Media Setters
    this.media.set("state.currentTextTrack", (v) => (this.isNative && v !== this.shadowCurrentIndex ? TERMINATOR : v), { signal: this.signal }); // #DICTATOR: reliable authority
    // ----------- Watchers
    this.media.watch("tech", () => ((this.isNative = this.media.tech.constructor === HTML5Tech), (this.media.features.textTracks ||= this.isNative), (this.media.features.currentTextTrack ||= this.isNative && this.media.features.textTracks), (this.media.features.textVisible ||= this.media.features.activeCues), (this.media.features.multipleCaptions ||= this.isNative && this.media.features.currentTextTrack)), { init: true, signal: this.signal });
    // ---- Config -------
    for (const p of STYLE_PATHS.filter((p) => !p.includes("lockTo"))) this.ctlr.config.watch(`settings.${p}`, (value) => ((this.settings.css[camelize(p.replace(".value", ""), /\./)] = p.includes("opacity") ? +value / 100 : (value as string)), this.views.forEach((v) => v.syncSize())), { init: true, signal: this.signal });
    // ---- Media Listeners
    this.media.on("intent.src", (e) => e.resolved && (this.state.secondaryTracks = []), { signal: this.signal });
    this.media.on("intent.currentTextTrack", this.handleCurrentTextTrackIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("intent.textVisible", this.handleTextVisibleIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("state.currentTextTrack", this.syncUI, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("state.textVisible", this.handleTextVisibleState, { init: true, signal: this.signal });
    this.media.on("state.currentTime", () => (this.views.forEach((v) => v.syncKaraoke()), this.secondaryViews.forEach((regionMap) => regionMap.forEach((v) => v.syncKaraoke()))), { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.textTracks", () => (this.syncTracks(), this.syncUI()), { signal: this.signal });
    this.media.on("status.activeCues", this.handleActiveCuesStatus, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config ---------
    this.ctlr.config.on("settings.captions.multiple", this.syncTracks, { signal: this.signal });
    this.ctlr.config.on("settings.captions.font.size.min", ({ value }) => this.settings.captions.font.size.value < value && (this.settings.captions.font.size.value = value), { init: true, signal: this.signal });
    this.ctlr.config.on("settings.captions.font.size.max", ({ value }) => this.settings.captions.font.size.value > value && (this.settings.captions.font.size.value = value), { init: true, signal: this.signal });
    this.ctlr.config.on("settings.captions.window.position.lockToPanel", ({ value }) => this.media.container.classList.toggle("tmg-media-captions-lock-to-panel", value), { init: true, signal: this.signal });
    this.ctlr.config.on("settings.captions.window.position.lockToVideo", ({ value }) => this.media.container.classList.toggle("tmg-media-captions-lock-to-video", value), { init: true, signal: this.signal });
    // Post Wiring
    this.ctlr.registerAction("captions", { fn: () => (this.toggleVisible(), this.media.features.textVisible && this.ctlr.plug("settings.notifiers")?.notify("captions")), keyboard: { phase: "keyup" } });
    this.ctlr.registerAction("captionsFontSizeUp", { fn: (_: KeyboardEvent, mod: KeyMod) => this.changeFontSize(this.ctlr.plug("settings.keys")?.getModded("captionsFontSize", mod, this.config.font.size.skip) ?? this.config.font.size.skip), keyboard: { phase: "keydown" } });
    this.ctlr.registerAction("captionsFontSizeDown", { fn: (_: KeyboardEvent, mod: KeyMod) => this.changeFontSize(-(this.ctlr.plug("settings.keys")?.getModded("captionsFontSize", mod, this.config.font.size.skip) ?? this.config.font.size.skip)), keyboard: { phase: "keydown" } });
    this.ctlr.registerAction("captionsFontFamily", { fn: () => this.rotateProp(parseUIObj(this.config).font.family.values, "captions.font.family.value", false, true), keyboard: { phase: "keydown" } });
    this.ctlr.registerAction("captionsFontWeight", { fn: () => this.rotateProp(parseUIObj(this.config).font.weight.values, "captions.font.weight.value", false, true), keyboard: { phase: "keydown" } });
    this.ctlr.registerAction("captionsFontVariant", { fn: () => this.rotateProp(parseUIObj(this.config).font.variant.values, "captions.font.variant.value", false, true), keyboard: { phase: "keydown" } });
    this.ctlr.registerAction("captionsFontOpacity", { fn: () => this.rotateProp(parseUIObj(this.config).font.opacity.values, "captions.font.opacity.value"), keyboard: { phase: "keydown" } });
    this.ctlr.registerAction("captionsBackgroundOpacity", { fn: () => this.rotateProp(parseUIObj(this.config).background.opacity.values, "captions.background.opacity.value"), keyboard: { phase: "keydown" } });
    this.ctlr.registerAction("captionsWindowOpacity", { fn: () => this.rotateProp(parseUIObj(this.config).window.opacity.values, "captions.window.opacity.value"), keyboard: { phase: "keydown" } });
    this.ctlr.registerAction("captionsCharacterEdgeStyle", { fn: () => this.rotateProp(parseUIObj(this.config).characterEdgeStyle.values, "captions.characterEdgeStyle.value", false), keyboard: { phase: "keydown" } });
    this.ctlr.registerAction("captionsTextAlignment", { fn: () => this.rotateProp(parseUIObj(this.config).textAlignment.values, "captions.textAlignment.value", false), keyboard: { phase: "keydown" } });
    super.wire();
  }

  protected handleCurrentTextTrackIntent(e: REvent<CtlrMedia, "intent.currentTextTrack">): void {
    if (e.resolved) return;
    if (!this.isNative) return e.reject(this.name);
    this.media.tech.when("loadedMetadata", e, () => {
      this.media.state.currentTextTrack = this.shadowCurrentIndex = e.value as number; // #VALIDATED: mediated for cast conformity; no-opy
      this.syncTracks();
    });
    e.resolve(this.name);
  }

  protected handleTextVisibleIntent(e: REvent<CtlrMedia, "intent.textVisible">): void {
    if (e.resolved) return;
    if (!this.media.features.activeCues) return e.reject(this.name); // this ain't no mega cue lib
    this.media.tech.when("loadedMetadata", e, () => {
      if (e.value && this.media.status.textTracks.length && this.media.state.currentTextTrack === -1) silence(() => (this.media.intent.currentTextTrack = this.isNative ? Math.max(0, getTrackIdx(this.media.element, "Text", this.media.state.tracks.find((t) => t.default)?.id, this.media.status.textTracks)) : 0));
      const cssPlug = this.ctlr.plug("settings.css");
      if (cssPlug) (this.settings.css.currentCaptionsX = cssPlug._cache.currentCaptionsX!), (this.settings.css.currentCaptionsY = cssPlug._cache.currentCaptionsY!);
      this.media.state.textVisible = e.value;
    });
    e.resolve(this.name); // hid everytin already but need minors to shutup
  }

  protected handleTextVisibleState({ value }: REvent<CtlrMedia, "state.textVisible">): void {
    this.media.container.classList.toggle("tmg-media-captions", this.canVisible && value);
    const track = this.media.status.textTracks[this.media.state.currentTextTrack]; // native, hls, dash compat
    value && track && this.iView?.preview(this.getPreviewTip(track));
  }

  protected handleActiveCuesStatus({ value }: REvent<CtlrMedia, "status.activeCues">): void {
    if (!this.ctlr.isUIActive("captions") && Array.prototype.some.call(this.views.values(), (v: CaptionsView) => v.isPreviewing())) return;
    this.syncCueMap(value as CueLike[] | null, this.views, this.initView);
  }

  protected handleCueChange(e?: globalThis.Event | { target?: TextTrack }, track = e?.target as TextTrack | null): void {
    const idx = Array.prototype.indexOf.call(this.media.status.textTracks, track);
    if (!track || idx === -1 || idx === this.media.state.currentTextTrack) return;
    const regionMap = this.secondaryViews.get(idx);
    if (!regionMap) return;
    const order = this.secondaryViews.size;
    this.syncCueMap(track.activeCues ? Array.from(track.activeCues) : null, regionMap, (key) => {
      const v = ComponentRegistry.init("captionsview", this.ctlr, { secondaryOrder: order }) || undefined;
      return v && (regionMap.set(key, v), v);
    });
  }

  public toggleVisible(): void {
    if (!this.canVisible) return this.mainView?.preview(this.media.features.textTracks ? `No captions available for this ${this.media.type}` : `Captions not supported for this ${this.media.type}`);
    this.media.intent.textVisible = !this.media.state.textVisible;
  }

  public changeFontSize(value: number): void {
    const sign = value >= 0 ? "+" : "-";
    value = Math.abs(value);
    const size = Number(this.settings.css.captionsFontSize);
    switch (sign) {
      case "-":
        if (size > this.config.font.size.min) this.config.font.size.value = size - (size % value || value);
        break;
      default:
        if (size < this.config.font.size.max) this.config.font.size.value = size + (size % value ? size % value : value);
    }
    this.media.features.activeCues && this.ctlr.config.stall(() => (this.views.size ? this.views.forEach((v) => v.preview()) : this.mainView?.preview(), this.iView?.isPreviewing() && this.iView!.preview(this.getPreviewTip())));
  }

  protected rotateProp(steps: PathValue<CtlrConfig["settings"], (typeof ROTATE_PATHS)[number]>[], prop: (typeof ROTATE_PATHS)[number], numeric = true, rerender = false): void {
    if (!steps.length) return;
    const cssVal = this.settings.css[camelize(prop.replace(".value", ""), /\./)];
    setPath(this.settings, prop, rotateAny((numeric ? Number : String)(prop.includes("opacity") ? +cssVal * 100 : cssVal), steps));
    rerender && this.media.features.activeCues && this.ctlr.config.stall(() => (this.views.size ? this.views.forEach((v) => v.preview()) : this.mainView?.preview()));
  }

  public get canVisible(): boolean {
    return (this.media.features.textTracks && this.media.features.activeCues ? !!this.media.status.textTracks.length : !this.media.features.activeCues) && !!this.media.features.textVisible;
  }

  public getTrackKind(track = this.media.status.textTracks[this.media.state.currentTextTrack]): string {
    return (track?.kind ?? track?.type) || "captions";
  }
  public getPreviewTip(track = this.media.status.textTracks[this.media.state.currentTextTrack]): CueLike {
    return { text: capitalize(`${track?.label || track?.language} ${this.getTrackKind(track)}`) + "\n Click ⚙ for settings", region: { viewportAnchorX: 10, viewportAnchorY: 20 } };
  }

  protected initView(key: string): CaptionsView | undefined {
    const view = ComponentRegistry.init<CaptionsView>("captionsview", this.ctlr, { isMain: key === "main" }) || undefined;
    return view && this.views.set(key, view), view;
  }
  public get mainView(): CaptionsView | undefined {
    return this.views.get("main") || this.initView("main");
  }

  public syncUI(): void {
    this.media.container.classList.toggle("tmg-media-captions", this.canVisible && this.media.state.textVisible);
    this.media.container.dataset.trackKind = this.media.status.trackKind = this.getTrackKind();
  }

  protected syncTracks(): void {
    const list = this.media.status.textTracks;
    if (!list) return;
    for (const [idx, regionMap] of this.secondaryViews) {
      if (!this.config.multiple || !this.state.secondaryTracks.includes(idx)) {
        regionMap.forEach((v) => v.destroy()), this.secondaryViews.delete(idx);
        const track = list[idx];
        this.isNative && idx !== this.media.state.currentTextTrack && track && ((track.mode = "disabled"), track.removeEventListener("cuechange", this.handleCueChange));
      }
    }
    if (!this.isNative) return;
    for (let i = 0, len = list.length; i < len; i++) {
      const isSecondary = this.config.multiple && this.state.secondaryTracks.includes(i);
      list[i].mode = i === this.media.state.currentTextTrack || isSecondary ? "hidden" : "disabled";
      if (isSecondary && !this.secondaryViews.has(i)) {
        this.secondaryViews.set(i, new Map());
        list[i].addEventListener("cuechange", this.handleCueChange, { signal: this.signal });
        this.handleCueChange({ target: list[i] });
      }
    }
  }

  protected syncCueMap(value: CueLike[] | null, map: Map<string, CaptionsView>, spawn: (key: string) => CaptionsView | undefined): void {
    const groups = new Map<string, CueLike[]>();
    for (const cue of Array.from(value ?? [])) {
      const key = cue.region ? `region-${cue.region.id || `${cue.region.viewportAnchorX}-${cue.region.viewportAnchorY}`}` : "main";
      (groups.get(key) ?? (groups.set(key, []), groups.get(key)!)).push(cue);
    }
    !groups.has("main") && groups.set("main", []);
    for (const [key, cues] of groups) (map.get(key) ?? spawn(key))?.render(cues);
    for (const [key, view] of map) groups.has(key) || (view.destroy(), map.delete(key));
  }

  protected override registerMenu(items = MenuRegistry.get("settings.captions")?.(this), menu = this.ctlr.plug("settings.settingsView")?.menu): void {
    if (items && menu) menu.unregister("captions"), Array.isArray(items) ? items.forEach((item) => menu.registerBefore("chapters", item)) : menu.registerBefore("chapters", items);
  }

  protected override onDestroy(): void {
    this.iView?.destroy(), this.views.forEach((v) => v.destroy()), this.secondaryViews.forEach((regionMap) => regionMap.forEach((v) => v.destroy()));
    const list = this.media.status.textTracks;
    if (list) for (let i = 0; i < list.length; i++) list[i].removeEventListener("cuechange", this.handleCueChange);
    super.onDestroy();
  }
}

export type * from "./types";
export * from "./build";
declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.captions": typeof CaptionsPlug;
  }
  interface ControllerDOMMap {
    captionsContainer?: HTMLDivElement | null;
  }
}

declare module "@defs/config" {
  interface Settings {
    captions: CaptionsConfig;
  }
}

declare module "@defs/contract" {
  interface MediaStatus {
    trackKind?: string;
  }
  interface MediaExtraFeatures {
    multipleCaptions?: boolean;
  }
}

declare module "@plugs/settings/css/types" {
  interface CSSMap {
    captionsCharacterEdgeStyle: "none" | "raised" | "depressed" | "outline" | "drop-shadow";
  }
}
