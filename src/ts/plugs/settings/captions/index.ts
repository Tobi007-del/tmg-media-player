import { BasePlug } from "../../base";
import type { Controller } from "@core/controller";
import type { CueLike, CaptionsConfig, CaptionsState } from "./types";
import { CAPTIONS_BUILD } from "./build";
import { ROTATE_PATHS, STYLE_PATHS } from "./build";
import type { CaptionsView } from "@components/captionsView";
import { ComponentRegistry, MenuRegistry } from "@core/registries";
import { type REvent, type PathValue, TERMINATOR } from "sia-reactor";
import { getPath, setPath } from "sia-reactor/utils";
import type { CtlrConfig } from "@defs/config";
import type { CtlrMedia } from "@defs/contract";
import { rotateAny } from "@utils/num";
import { getTrackIdx, getTrackKind, getTrackLabel } from "@utils/media";
import { camelize, uncamelize } from "@utils/str";
import { silence } from "sia-reactor/modules";
import { isArr, parseUIOpt } from "@utils/obj";
import { HTML5Tech } from "@techs/html5";
import { KeyMod } from "../keys";

export class CaptionsPlug extends BasePlug<CaptionsConfig, CaptionsState> {
  public static readonly plugName = "captions";
  public static readonly BUILD = CAPTIONS_BUILD;
  protected views = new Map<string, CaptionsView>();
  protected iView: CaptionsView | null = null; // info view
  protected viewMaps = new Map<number, Map<string, CaptionsView>>();
  protected isNative = false;
  protected shadowCurrentIndex?: number;

  constructor(ctlr: Controller, config = ctlr.settings.captions) {
    super(ctlr, config, { snubbingCurrentTextTrack: false });
  }

  public override wire(): void {
    this.settings.css.currentCaptionsX, this.settings.css.currentCaptionsY; // Read once so CSSPlug can cache computed values.
    // Ctlr Media Setters
    this.media.set("state.currentTextTrack", (v) => (this.isNative && v !== this.shadowCurrentIndex ? TERMINATOR : v), { signal: this.signal }); // #DICTATOR: reliable authority
    // ----------- Watchers
    this.media.watch("tech", (t) => ((this.isNative = t.constructor === HTML5Tech), this.syncFeatures()), { init: true, signal: this.signal });
    // ---- Config --------
    STYLE_PATHS.forEach((p, _, __, vP = p.replace(".value", "")) => this.ctlr.config.watch(`settings.${p}`, (v) => (setPath(this.settings.css, camelize(vP, /\./), p.includes("opacity") ? +v / 100 : (v as string)), this.views.forEach((v) => v.rerender()), this.iView?.rerender()), { init: true, signal: this.signal }));
    // ---- Media Listeners
    this.media.on("intent.currentTextTrack", this.handleCurrentTextTrackIntent, { capture: true, init: this.ctlr.flags.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("intent.textVisible", this.handleTextVisibleIntent, { capture: true, init: this.ctlr.flags.wired, initType: "set", signal: this.signal }); // #HIGHER-POWER: power arbitration
    this.media.on("state.currentTextTrack", this.syncUI, { init: this.ctlr.flags.wired, signal: this.signal });
    this.media.on("state.textVisible", this.handleTextVisibleState, { init: this.ctlr.flags.wired, signal: this.signal });
    this.media.on("state.currentTime", () => (this.views.forEach((v) => v.syncKaraoke()), this.viewMaps.forEach((map) => map.forEach((v) => v.syncKaraoke()))), { init: this.ctlr.flags.wired, signal: this.signal });
    this.media.on("status.textTracks", () => (this.syncTracks(), this.syncUI()), { signal: this.signal });
    this.media.on("status.activeCues", this.handleActiveCuesStatus, { init: this.ctlr.flags.wired, signal: this.signal });
    // ---- Config --------
    for (const k of ["multiple", "secondaryTracks"] as const) this.ctlr.config.on(`settings.captions.${k}`, this.syncTracks, { signal: this.signal });
    this.ctlr.config.on("settings.captions.font.size.min", ({ value }) => this.settings.captions.font.size.value < value && (this.settings.captions.font.size.value = value), { init: true, signal: this.signal });
    this.ctlr.config.on("settings.captions.font.size.max", ({ value }) => this.settings.captions.font.size.value > value && (this.settings.captions.font.size.value = value), { init: true, signal: this.signal });
    for (const k of ["lockToPanel", "lockToVideo"] as const) this.ctlr.config.on(`settings.captions.window.position.${k}`, ({ value }) => this.media.container.classList.toggle(`tmg-media-captions-${uncamelize(k, "-")}`, value), { init: true, signal: this.signal });
    // Post Wiring
    this.ctlr.learn("captions", { fn: this.toggleVisible }, this.signal);
    for (const k of ["Up", "Down"] as const) this.ctlr.learn(`captionsFontSize${k}`, { fn: (_: KeyboardEvent, mod: KeyMod) => this.changeFontSize((this.ctlr.plug("settings.keys")?.getModded("captionsFontSize", mod, this.config.font.size.skip) ?? this.config.font.size.skip) * (k === "Up" ? 1 : -1)), keyboard: { phase: "keydown" } }, this.signal);
    // prettier-ignore
    ROTATE_PATHS.forEach((p, _, __, vP = p.replace(".value", ""), cP = vP.replace("captions.", "")) => this.ctlr.learn(camelize(vP, /\./), { fn: () => this.rotateProp(getPath(this.config, cP as any).options.map((opt: any) => parseUIOpt(opt).value), p), keyboard: { phase: "keydown" } }, this.signal));
    super.wire();
  }

  protected handleCurrentTextTrackIntent(e: REvent<CtlrMedia, "intent.currentTextTrack">): void {
    if ((this.state.snubbingCurrentTextTrack = !!e.resolved || !this.isNative)) return void (!e.resolved && e.reject(this.name));
    const handle = () => {
      if ((e.value as number) >= this.media.status.textTracks.length) return;
      this.media.state.currentTextTrack = this.shadowCurrentIndex = e.value as number; // #VALIDATED: mediated for cast conformity; no-opy
      this.syncTracks(), silence(() => (this.media.intent.textVisible = e.value === -1 ? false : this.media.intent.textVisible)); // #RE-TRIGGER: sync intent resolution
    };
    this.ctlr.when("loadedMetadata", e, handle, this.signal);
    e.resolve(this.name);
  }

  protected handleTextVisibleIntent(e: REvent<CtlrMedia, "intent.textVisible">, idx = this.media[this.ctlr.gospel].currentTextTrack): void {
    if (e.resolved || !this.media.features.activeCues) return void (!e.resolved && e.reject(this.name)); // this ain't no mega cue lib
    const handle = (iidx = this.media.intent.currentTextTrack) => {
      // prettier-ignore
      if (e.value && this.media.status.textTracks.length && idx === -1) silence(() => (this.media.intent.currentTextTrack = iidx !== -1 ? iidx : this.isNative ? Math.max(0, getTrackIdx(this.media.element, "Text", this.media.state.tracks.find((t) => t.default), this.media.status.textTracks)) : 0)); // #BULLET-PROOF: should come clutch
      this.handleActiveCuesStatus(undefined, e.value ? this.media.status.activeCues : null), !e.value && this.iView?.render(null), this.viewMaps.forEach((map, i) => this.handleCueChange(undefined, e.value ? this.media.status.textTracks[i] : ({ activeCues: null } as any)));
      this.media.state.textVisible = e.value;
    };
    this.ctlr.when("loadedMetadata", e, handle, this.signal);
    e.resolve(this.name); // hid everytin already but need minors to shutup
  }

  protected handleTextVisibleState({ value }: REvent<CtlrMedia, "state.textVisible">): void {
    this.media.container.classList.toggle("tmg-media-captions", this.canVisible && value);
    const track = value && this.media.status.textTracks[this.media.state.currentTextTrack];
    track && (this.iView ??= ComponentRegistry.init("captionsView", this.ctlr) || null)?.preview(this.getPreviewTip(track));
  }

  protected handleActiveCuesStatus(e?: REvent<CtlrMedia, "status.activeCues">, value = e?.value): void {
    this.media.state.textVisible && (e || !this.mainView?.previewing) && this.syncCues(value as CueLike[] | null, this.views, this.initView);
  }

  protected handleCueChange(e?: globalThis.Event, track = e?.target as TextTrack | null): void {
    const idx = this.media.state.textVisible ? Array.prototype.indexOf.call(this.media.status.textTracks, track) : -1;
    if (!track || idx === -1 || idx === this.media.state.currentTextTrack) return;
    const map = this.viewMaps.get(idx),
      opts = { secondaryOrder: this.viewMaps.size };
    map && this.syncCues(track.activeCues ? [...track.activeCues] : null, map, (key, v = ComponentRegistry.init("captionsView", this.ctlr, opts)) => v && (map.set(key, v), v));
  }

  public toggleVisible(): void {
    if (!this.canVisible) return this.mainView?.preview(this.media.features.textTracks ? `No captions available for this ${this.media.type}` : `Captions not supported for this ${this.media.type}`);
    this.media.intent.textVisible = !this.media.state.textVisible;
  }
  protected rotateProp(steps: PathValue<CtlrConfig["settings"], (typeof ROTATE_PATHS)[number]>[], prop: (typeof ROTATE_PATHS)[number], numeric = prop.includes("opacity")): void {
    if (!steps.length) return;
    const cssVal = this.settings.css[camelize(prop.replace(".value", ""), /\./)];
    setPath(this.settings, prop, rotateAny((numeric ? Number : String)(prop.includes("opacity") ? +cssVal * 100 : cssVal), steps));
    this.media.features.activeCues && this.ctlr.config.stall(() => (this.views.size ? this.views.forEach((v) => v.preview()) : this.mainView?.preview())); // rerender && }
  }
  public changeFontSize(value: number, sign = value >= 0 ? "+" : "-"): void {
    value = Math.abs(value);
    const size = Number(this.settings.css.captionsFontSize);
    switch (sign) {
      case "-":
        if (size > this.config.font.size.min) this.config.font.size.value = size - (size % value || value);
        break;
      default:
        if (size < this.config.font.size.max) this.config.font.size.value = size + (size % value ? size % value : value);
    }
    this.media.features.activeCues && this.ctlr.config.stall(() => (this.views.size ? this.views.forEach((v) => v.preview()) : this.mainView?.preview()));
  }

  protected initView(key: string): CaptionsView | undefined {
    const view = ComponentRegistry.init<CaptionsView>("captionsView", this.ctlr, { isMain: key === "main" }) || undefined;
    return view && this.views.set(key, view), view;
  }
  public get mainView(): CaptionsView | undefined {
    return this.views.get("main") || this.initView("main");
  }

  public get canVisible(): boolean {
    return (this.media.features.textTracks ? !!this.media.status.textTracks.length : !this.media.features.activeCues) && !!this.media.features.textVisible;
  }
  public getPreviewTip(track = this.media.status.textTracks[this.media.state.currentTextTrack], index = this.media.state.currentTextTrack): CueLike {
    return { text: `${getTrackLabel(this.media.status.textTracks, index)} ${getTrackKind(track)}`.trim() + "\n Click ⚙ for settings", region: { viewportAnchorX: 10, viewportAnchorY: 20 } };
  }

  public syncUI(): void {
    this.media.container.classList.toggle("tmg-media-captions", this.canVisible && this.media.state.textVisible);
    this.media.container.dataset.textKind = this.media.status.textKind = getTrackKind(this.media.status.textTracks[this.media.state.currentTextTrack]);
  }
  protected syncTracks(): void {
    const list = this.media.status.textTracks;
    if (!list || this.state.snubbingCurrentTextTrack) return;
    for (const [i, map] of this.viewMaps) {
      if (this.config.multiple && this.config.secondaryTracks.includes(i)) continue;
      map.forEach((v) => v.destroy()), this.viewMaps.delete(i);
      this.isNative && i !== this.media.state.currentTextTrack && list[i] && ((list[i].mode = "disabled"), list[i].removeEventListener("cuechange", this.handleCueChange));
    }
    if (!this.isNative) return;
    for (let i = 0, len = list.length; i < len; i++) {
      const sec = this.config.multiple && this.config.secondaryTracks.includes(i);
      list[i].mode = i === this.media.state.currentTextTrack || sec ? "hidden" : "disabled";
      if (sec) list[i].addEventListener("cuechange", this.handleCueChange, { signal: this.signal }), !this.viewMaps.has(i) && (this.viewMaps.set(i, new Map()), this.handleCueChange(undefined, list[i]));
    }
  }
  protected syncCues(value: CueLike[] | null, map: Map<string, CaptionsView>, spawn: (key: string) => CaptionsView | undefined | null): void {
    const groups = new Map<string, CueLike[]>();
    for (const cue of value ?? []) {
      const key = cue.region ? `region-${cue.region.id || `${cue.region.viewportAnchorX}-${cue.region.viewportAnchorY}`}` : "main";
      (groups.get(key) ?? (groups.set(key, []), groups.get(key)!)).push(cue);
    }
    !groups.has("main") && groups.set("main", []);
    for (const [key, cues] of groups) (map.get(key) ?? spawn(key))?.render(cues);
    for (const [key, view] of map) groups.has(key) || (view.destroy(), map.delete(key));
  }
  public syncFeatures(): void {
    this.media.tech.polyfill("textTracks", this.isNative), this.media.tech.polyfill("currentTextTrack", this.isNative && this.media.features.textTracks);
    this.media.tech.polyfill("textVisible", this.media.features.activeCues), this.media.tech.polyfill("textsVisible", this.isNative && this.media.features.currentTextTrack); // this.media.features.activeCues -> true
  }

  protected override registerMenu(items = MenuRegistry.get("settings.captions")?.(this), menu = this.ctlr.plug("settings.panel")?.menu): void {
    if (items && menu) menu.unregister("captions"), isArr(items) ? items.forEach((item) => menu.registerBefore("chapters", item)) : menu.registerBefore("chapters", items);
  }

  protected override onDestroy(): void {
    this.iView?.destroy(), this.views.forEach((v) => v.destroy()), this.viewMaps.forEach((map) => map.forEach((v) => v.destroy()));
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
    textKind: string;
  }
  interface MediaFeaturesExt {
    textsVisible: boolean;
  }
}

declare module "@plugs/settings/css/types" {
  interface CSSMap {
    captionsCharacterEdgeStyle: "none" | "raised" | "depressed" | "outline" | "drop-shadow";
  }
}
