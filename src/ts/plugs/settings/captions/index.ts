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
import { camelize } from "@utils/str";
import { silence } from "sia-reactor/modules";
import { parseUIObj } from "@utils/obj";

export class CaptionsPlug extends BasePlug<CaptionsConfig, CaptionsState> {
  public static readonly plugName = "captions";
  public static readonly BUILD = CAPTIONS_BUILD;
  protected view: CaptionsView | null = null;
  protected iView: CaptionsView | null = null; // info view
  protected shadowCurrentIndex?: number;
  protected secondaryViews = new Map<number, CaptionsView>();

  constructor(ctlr: Controller, config = ctlr.settings.captions) {
    super(ctlr, config, { secondaryTracks: [] });
  }

  public override mount(): void {
    // Variables Assignment
    this.view = ComponentRegistry.init("captionsview", this.ctlr);
    this.iView = ComponentRegistry.init("captionsview", this.ctlr);
    if (this.view) this.ctlr.DOM.captionsContainer = this.view.element;
    // DOM Injection
    this.view?.mount(), this.iView?.mount();
  }

  public override wire(): void {
    // Variables Assignment
    this.config.multiple ??= false;
    this.settings.css.currentCaptionsX, this.settings.css.currentCaptionsY; // Read once so CSSPlug can cache computed values.
    // State Watchers
    this.state.watch("secondaryTracks", this.syncTracks, { signal: this.signal });
    // Ctlr Media Setters
    this.media.set("state.currentTextTrack", (v) => (this.ctlr.isNativeEl && v !== this.shadowCurrentIndex ? TERMINATOR : v), { signal: this.signal }); // #DICTATOR: reliable authority
    // ----------- Watchers
    this.media.watch("tech", () => ((this.media.features.textTracks ||= this.ctlr.isNativeEl), (this.media.features.currentTextTrack ||= this.ctlr.isNativeEl && this.media.features.textTracks), (this.media.features.textVisible ||= this.media.features.activeCue), (this.media.features.multipleCaptions ||= this.media.features.currentTextTrack)), { init: true, signal: this.signal });
    // ---- Config -------
    this.ctlr.config.watch("settings.captions.multiple", this.syncTracks, { signal: this.signal });
    for (const p of STYLE_PATHS) this.ctlr.config.watch(`settings.${p}`, (value) => ((this.settings.css[camelize(p.replace(".value", ""), /\./)] = p.includes("opacity") ? +value / 100 : value), this.view?.syncSize()), { init: true, signal: this.signal });
    // ---- Media Listeners
    this.media.on("intent.currentTextTrack", this.handleCurrentTextTrackIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("intent.textVisible", this.handleTextVisibleIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("state.currentTextTrack", this.syncUI, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("state.textVisible", this.handleTextVisibleState, { init: true, signal: this.signal });
    this.media.on("state.src", () => ((this.state.secondaryTracks = []), (this.config.multiple = false)), { signal: this.signal });
    this.media.on("status.textTracks", () => (this.syncTracks(), this.syncUI()), { signal: this.signal });
    this.media.on("status.activeCue", this.handleActiveCueStatus, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("state.currentTime", () => (this.view?.syncKaraoke(), this.secondaryViews.forEach((view) => view.syncKaraoke())), { init: this.ctlr.payload.wired, signal: this.signal });
    // Post Wiring
    this.ctlr.registerAction("captions", { fn: () => (this.toggleVisible(), this.media.features.textVisible && this.ctlr.plug("settings.notifiers")?.notify("captions")), keyboard: { phase: "keyup" } });
    this.ctlr.registerAction("captionsFontSizeUp", { fn: () => this.changeFontSize(this.ctlr.plug("settings.keys")?.getModded("captionsFontSize", "", this.config.font.size.skip) ?? this.config.font.size.skip), keyboard: { phase: "keydown" } });
    this.ctlr.registerAction("captionsFontSizeDown", { fn: () => this.changeFontSize(-(this.ctlr.plug("settings.keys")?.getModded("captionsFontSize", "", this.config.font.size.skip) ?? this.config.font.size.skip)), keyboard: { phase: "keydown" } });
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
    if (!this.ctlr.isNativeEl) return e.reject(this.name);
    this.media.tech.when("loadedMetadata", e, () => {
      this.media.state.currentTextTrack = this.shadowCurrentIndex = e.value as number; // #VALIDATED: mediated for cast conformity; no-opy
      this.syncTracks();
    });
    e.resolve(this.name);
  }

  protected handleTextVisibleIntent(e: REvent<CtlrMedia, "intent.textVisible">): void {
    if (e.resolved) return;
    if (!this.media.features.activeCue) return e.reject(this.name); // this ain't no cue mega lib
    this.media.tech.when("loadedMetadata", e, () => {
      if (e.value && this.media.status.textTracks.length && this.media.state.currentTextTrack === -1) silence(() => (this.media.intent.currentTextTrack = Math.max(0, getTrackIdx(this.media.element, "Text", this.media.state.tracks.find((t) => t.default)?.id, this.media.status.textTracks))));
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

  protected handleActiveCueStatus({ value }: REvent<CtlrMedia, "status.activeCue">): void {
    !(!this.ctlr.isUIActive("captions") && this.view?.isPreviewing()) && this.view?.render(value);
  }

  public toggleVisible(): void {
    if (!this.canVisible) return this.view?.preview(this.media.features.textTracks ? `No captions available for this ${this.media.type}` : `Captions not supported for this ${this.media.type}`);
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
    this.media.features.activeCue && this.view && this.ctlr.config.stall(this.view.preview), this.iView && this.ctlr.config.stall(() => this.iView!.isPreviewing() && this.iView!.preview(this.getPreviewTip()));
  }

  protected rotateProp(steps: PathValue<CtlrConfig["settings"], (typeof ROTATE_PATHS)[number]>[], prop: (typeof ROTATE_PATHS)[number], numeric = true, rerender = false): void {
    if (!steps.length) return;
    const cssVal = this.settings.css[camelize(prop.replace(".value", ""), /\./)];
    setPath(this.settings, prop, rotateAny((numeric ? Number : String)(prop.includes("opacity") ? Number(cssVal) * 100 : cssVal), steps));
    rerender && this.media.features.activeCue && this.view && this.ctlr.config.stall(this.view.preview);
  }

  public syncUI(): void {
    this.media.container.classList.toggle("tmg-media-captions", this.canVisible && this.media.state.textVisible);
    this.media.container.dataset.trackKind = this.getTrackKind();
  }

  public get canVisible(): boolean {
    return (this.media.features.textTracks && this.media.features.activeCue ? !!this.media.status.textTracks.length : !this.media.features.activeCue) && !!this.media.features.textVisible;
  }

  public getTrackKind(track = this.media.status.textTracks[this.media.state.currentTextTrack]): string {
    return (track?.kind ?? track?.type) || "captions";
  }

  public getPreviewTip(track = this.media.status.textTracks[this.media.state.currentTextTrack]): CueLike {
    return { text: `${track?.label ?? track?.name} ${this.getTrackKind(track)} \n Click ⚙ for settings`, region: { viewportAnchorX: 10, viewportAnchorY: 20 } };
  }

  protected syncTracks(): void {
    const list = this.media.status.textTracks;
    if (!list) return;
    for (const [idx, view] of this.secondaryViews) {
      if (!this.config.multiple || !this.state.secondaryTracks.includes(idx)) {
        view.destroy(), this.secondaryViews.delete(idx);
        const track = list[idx];
        track && idx !== this.media.state.currentTextTrack && ((track.mode = "disabled"), track.removeEventListener("cuechange", this.handleCueChange));
      }
    }
    for (let i = 0, len = list.length; i < len; i++) {
      const isSecondary = this.config.multiple && this.state.secondaryTracks.includes(i);
      list[i].mode = i === this.media.state.currentTextTrack || isSecondary ? "hidden" : "disabled";
      if (isSecondary && !this.secondaryViews.has(i)) {
        const view = ComponentRegistry.init<CaptionsView>("captionsview", this.ctlr)!;
        view.mount(), this.secondaryViews.set(i, view), list[i].addEventListener("cuechange", this.handleCueChange, { signal: this.signal });
        view.element.style.setProperty("--tmg-media-current-captions-y", `${90 - this.secondaryViews.size * 10}%`, "important");
      }
    }
  }

  protected handleCueChange(e: Event): void {
    const track = e.target as TextTrack;
    if (!track) return;
    const idx = Array.prototype.indexOf.call(this.media.status.textTracks, track);
    idx !== -1 && idx !== this.media.state.currentTextTrack && this.secondaryViews.get(idx)?.render(track.activeCues?.[0] || null);
  }

  protected override registerMenu(): void {
    const items = MenuRegistry.get("settings.captions")?.(this);
    if (items) {
      const menu = this.ctlr.plug("settings.settingsView")?.menu;
      if (!menu) return;
      menu.unregister("captions");
      Array.isArray(items) ? items.forEach((item) => menu.registerBefore("chapters", item)) : menu.registerBefore("chapters", items);
    }
  }

  protected override onDestroy(): void {
    this.view?.destroy(), this.iView?.destroy();
    for (const view of this.secondaryViews.values()) view.destroy();
    this.secondaryViews.clear();
    const list = this.media.status.textTracks;
    if (list) for (let i = 0; i < list.length; i++) list[i].removeEventListener("cuechange", this.handleCueChange);
    if (this.ctlr.DOM.captionsContainer === this.view?.element) this.ctlr.DOM.captionsContainer = null;
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

declare module "@plugs/settings/css/types" {
  interface CSSMap {
    captionsCharacterEdgeStyle: "none" | "raised" | "depressed" | "outline" | "drop-shadow";
    captionsTextAlignment: "left" | "center" | "right";
  }
}
