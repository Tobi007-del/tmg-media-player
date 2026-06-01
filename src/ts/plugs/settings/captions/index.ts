import { BasePlug } from "../../base";
import type { CueLike, Captions } from "./types";
import { CAPTIONS_BUILD } from "./build";
import { ROTATE_PATHS, STYLE_PATHS } from "./build";
import type { CaptionsView } from "@components/captionsview";
import { ComponentRegistry } from "@core/registries";
import { type REvent, type PathValue } from "sia-reactor";
import { setPath } from "sia-reactor/utils";
import type { CtlrConfig } from "@defs/config";
import type { CtlrMedia } from "@defs/contract";
import { rotateAny } from "@utils/num";
import { parseUIObj } from "@utils/obj";
import { camelize } from "@utils/str";

export class CaptionsPlug extends BasePlug<Captions> {
  public static readonly plugName = "captions";
  public static readonly BUILD = CAPTIONS_BUILD;
  protected view: CaptionsView | null = null;
  protected iView: CaptionsView | null = null; // info view

  public override mount(): void {
    // Variables Assignment
    this.view = ComponentRegistry.init("captionsview", this.ctlr);
    this.iView = ComponentRegistry.init("captionsview", this.ctlr);
    if (this.view) this.ctlr.DOM.captionsContainer = this.view.element;
    // DOM Injection
    this.view?.mount(), this.iView?.mount();
  }

  public override wire(): void {
    this.ctlr.settings.css.currentCaptionsX, this.ctlr.settings.css.currentCaptionsY; // Read once so CSSPlug can cache computed values.
    // Ctlr Config Watchers
    STYLE_PATHS.forEach((p) => this.ctlr.config.watch(`settings.${p}`, (value) => ((this.ctlr.settings.css[camelize(p.replace(".value", ""), /\./)] = value), this.view?.syncSize()), { init: true, signal: this.signal }));
    // ---- Media Listeners
    this.media.on("tech", () => (this.media.features.textTracks ||= this.media.features.currentTextTrack = this.ctlr.isNativeTech), { init: true, signal: this.signal });
    this.media.on("intent.currentTextTrack", this.handleCurrentTextTrackIntent, { capture: true, init: this.ctlr.payload.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("status.loadedMetadata", this.syncUI, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.textTracks", this.syncUI, { signal: this.signal });
    this.media.on("state.currentTextTrack", this.syncUI, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.activeCue", this.handleActiveCueStatus, { init: this.ctlr.payload.wired, signal: this.signal });
    this.view && this.media.on("state.currentTime", this.view.syncKaraoke, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config ---------
    this.ctlr.config.on("settings.captions.visible", this.handleVisible, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.captions.font.size.min", this.handleFontSizeMin, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.captions.font.size.max", this.handleFontSizeMax, { init: true, signal: this.signal });
    // Post Wiring
    this.ctlr.plug("settings.css")?.classKeys.push("captionsCharacterEdgeStyle", "captionsTextAlignment");
    const keys = this.ctlr.plug("settings.keys");
    if (!keys) return;
    keys.register("captions", () => (this.ctlr.plug("settings.notifiers")?.notify("captions"), this.toggleVisible()), { phase: "keyup" });
    keys.register("captionsFontSizeUp", (_, mod) => this.changeFontSize(keys.getModded("captionsFontSize", mod, this.config.font.size.skip)), { phase: "keydown" });
    keys.register("captionsFontSizeDown", (_, mod) => this.changeFontSize(-keys.getModded("captionsFontSize", mod, this.config.font.size.skip)), { phase: "keydown" });
    keys.register("captionsFontFamily", () => this.rotateProp(parseUIObj(this.config).font.family.values, "captions.font.family.value", false), { phase: "keydown" });
    keys.register("captionsFontWeight", () => this.rotateProp(parseUIObj(this.config).font.weight.values, "captions.font.weight.value", false), { phase: "keydown" });
    keys.register("captionsFontVariant", () => this.rotateProp(parseUIObj(this.config).font.variant.values, "captions.font.variant.value", false), { phase: "keydown" });
    keys.register("captionsFontOpacity", () => this.rotateProp(parseUIObj(this.config).font.opacity.values, "captions.font.opacity.value"), { phase: "keydown" });
    keys.register("captionsBackgroundOpacity", () => this.rotateProp(parseUIObj(this.config).background.opacity.values, "captions.background.opacity.value"), { phase: "keydown" });
    keys.register("captionsWindowOpacity", () => this.rotateProp(parseUIObj(this.config).window.opacity.values, "captions.window.opacity.value"), { phase: "keydown" });
    keys.register("captionsCharacterEdgeStyle", () => this.rotateProp(parseUIObj(this.config).characterEdgeStyle.values, "captions.characterEdgeStyle.value", false), { phase: "keydown" });
    keys.register("captionsTextAlignment", () => this.rotateProp(parseUIObj(this.config).textAlignment.values, "captions.textAlignment.value", false), { phase: "keydown" });
  }

  protected handleCurrentTextTrackIntent(e: REvent<CtlrMedia, "intent.currentTextTrack">): void {
    if (e.resolved || !this.ctlr.isNativeTech) return;
    const list = this.media.status.textTracks;
    for (let i = 0; i < list.length; i++) list[i].mode = "hidden";
    this.media.state.currentTextTrack = e.value as number; // tech handles `number` in setter
    e.resolve(this.name);
  }

  protected handleVisible({ value }: REvent<CtlrConfig, "settings.captions.visible">): void {
    const cssPlug = this.ctlr.plug("settings.css"),
      track = this.media.status.textTracks[this.media.state.currentTextTrack]; // native, hls, dash compat
    (this.ctlr.settings.css.currentCaptionsX = cssPlug?._cache.currentCaptionsX!), (this.ctlr.settings.css.currentCaptionsY = cssPlug?._cache.currentCaptionsY!);
    if (!track) return;
    !value ? this.media.container.classList.add("tmg-media-captions") : this.media.container.classList.remove("tmg-media-captions", "tmg-media-captions-preview");
    !value && this.iView?.preview(this.getPreviewTip(track));
  }

  protected handleFontSizeMin({ value: min }: REvent<CtlrConfig, "settings.captions.font.size.min">): void {
    if (this.config.font.size.value < min) this.config.font.size.value = min;
  }

  protected handleFontSizeMax({ value: max }: REvent<CtlrConfig, "settings.captions.font.size.max">): void {
    if (this.config.font.size.value > max) this.config.font.size.value = max;
  }

  protected handleActiveCueStatus({ value }: REvent<CtlrMedia, "status.activeCue">): void {
    !(!this.ctlr.isUIActive("captions") && this.ctlr.isUIActive("captionsPreview")) && this.view?.render(value);
  }

  public toggleVisible(): void {
    if (!this.media.status.textTracks[this.media.state.currentTextTrack]) return this.view?.preview(`No captions available for this ${this.media.type}`);
    this.config.visible = !this.config.visible;
  }

  public changeFontSize(value: number): void {
    const sign = value >= 0 ? "+" : "-";
    value = Math.abs(value);
    const size = Number(this.ctlr.settings.css.captionsFontSize);
    switch (sign) {
      case "-":
        if (size > this.config.font.size.min) this.config.font.size.value = size - (size % value || value);
        break;
      default:
        if (size < this.config.font.size.max) this.config.font.size.value = size + (size % value ? size % value : value);
    }
    this.view && this.ctlr.config.stall(this.view.preview), this.iView && this.ctlr.config.stall(() => this.iView?.preview(this.getPreviewTip()));
  }

  protected rotateProp(steps: PathValue<CtlrConfig["settings"], (typeof ROTATE_PATHS)[number]>[], prop: (typeof ROTATE_PATHS)[number], numeric = true): void {
    if (!steps.length) return;
    setPath(this.ctlr.settings, prop, rotateAny((numeric ? Number : String)(this.ctlr.settings.css[camelize(prop.replace(".value", ""), /\./)]), steps));
    this.view && this.ctlr.config.stall(this.view.preview);
  }

  public syncUI(): void {
    if (this.config.visible && this.media.status.textTracks.length && this.media.state.currentTextTrack === -1) this.media.intent.currentTextTrack = 0;
    this.media.container.classList.toggle("tmg-media-captions", !!this.media.status.textTracks.length && this.config.visible);
    this.media.container.dataset.trackKind = this.getTrackKind();
  }

  public getTrackKind(track = this.media.status.textTracks[this.media.state.currentTextTrack]): string {
    return (track?.kind ?? track?.type) || "captions";
  }

  public getPreviewTip(track = this.media.status.textTracks[this.media.state.currentTextTrack]): CueLike {
    return { text: `${track?.label ?? track?.name} ${this.getTrackKind(track)} \n Click ⚙ for settings`, region: { viewportAnchorX: 10, viewportAnchorY: 10 } };
  }

  protected override onDestroy(): void {
    this.view?.destroy(), this.iView?.destroy();
    if (this.ctlr.DOM.captionsContainer === this.view?.element) this.ctlr.DOM.captionsContainer = null;
    super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface ControllerDOMMap {
    captionsContainer?: HTMLDivElement | null;
  }
}

export type * from "./types";
export * from "./build";

declare module "@plugs/settings/css/types" {
  interface CSSMap {
    captionsCharacterEdgeStyle: "none" | "raised" | "depressed" | "outline" | "drop-shadow";
    captionsTextAlignment: "left" | "center" | "right";
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.captions": typeof CaptionsPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    captions: Captions;
  }
}
