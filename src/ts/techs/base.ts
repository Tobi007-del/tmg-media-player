import { Controllable } from "@core/controllable";
import type { Controller } from "@core/controller";
import type { CtlrMedia, MediaFeatures } from "@defs/contract";
import { type REvent, type Reactive, ListenerOptionsTuple } from "sia-reactor";
import { deepClone, fanout, force } from "sia-reactor/utils";
import { silence } from "sia-reactor/modules";
import { getMediaStatus, isFeatured } from "@utils/media";
import { capitalize } from "@utils/str";
import { isArr, isBool, isNum } from "@utils/obj";
import { setTimeout } from "@utils/fn";
import { MEDIA_STATE_BUILD, MEDIA_STATUS_BUILD } from "@consts/media";

export interface TechConstructor<T extends BaseTech = BaseTech> {
  new (ctlr: Controller, features?: MediaFeatures): T;
  techName: string;
  canPlaySource(src: string): boolean;
}

export abstract class BaseTech<El extends HTMLElement = HTMLElement> extends Controllable<Reactive<CtlrMedia>> {
  public static readonly techName: string;
  public static canPlaySource(_src: string): boolean {
    return false;
  }
  public get name() {
    return (this.constructor as TechConstructor).techName;
  }
  public element!: El;
  public get el() {
    return this.element;
  }
  public wired = false; // for light checks where needed
  public cache?: Pick<CtlrMedia, CacheKey> | null; // for pseudo media, e.g. ads
  public readonly caching: boolean = false; // turn on for caching logic
  public readonly evtOpts: { EL: AddEventListenerOptions; CONFIG: ListenerOptionsTuple } = { EL: { capture: true, signal: this.signal }, CONFIG: { capture: true, signal: this.signal } };
  public readonly features!: MediaFeatures;
  public readonly wiredSet: Set<keyof MediaFeatures> = new Set(); // Tracking to avoid rewiring
  public autoChapters: boolean = false; // turn on if handling `currentChapter`

  constructor(ctlr: Controller, features: MediaFeatures = {}) {
    ctlr.media.tech.wired && ctlr.media.tech.destroy?.(), ctlr.log(`Using ${new.target.techName} media technology.`); // kill if listening
    super(ctlr, ctlr.media); // Odekunle Olasubomi Abimbola Cornelius Adisun was here; Aug 14th 2026
    ctlr.config.courtesy = "TMG"; // tell them! tell them!! tell them!!! ~ Kendrick Lamar
    this.element = ctlr.media.element as any; // must reassign if not using original
    for (const key of Object.keys(ctlr.media.features)) ctlr.media.features[key as keyof MediaFeatures] = false;
    // prettier-ignore
    fanout(ctlr.media.features, (this.features = {
      // Currents
      currentChapter: true,
      // Settings
      srcObject: true, metadata: true, timePlayedMin: true, flushKeys: true, ...features
    })); // dynamics baby!
  }
  protected override onSetup(): void {
    this.mount(), this.onAwaken();
  }
  protected override onDestroy(): void {
    this.unmount(), this.onHibernate();
    this.config.status.hostReady = false;
  }
  protected onAwaken(): void {
    if (this.caching) for (const key of cacheKeys) (this.cache ??= {} as any)[key] = this.config.snapshot(false, this.config[key]); // all that once was
    this.evtOpts.CONFIG.signal = this.evtOpts.EL.signal = this.signal;
    this.ctlr.state.readyState ? this.wire() : this.ctlr.state.wonce("readyState", this.wire, { signal: this.signal }); // wire after all plugs setup
  }
  protected onHibernate(): void {
    this.wiredSet.clear(), (this.wired = false);
    if (this.cache) silence(() => fanout(this.config, this.cache!)), (this.cache = null); // all that will be
  }

  public mount(): void {
    if ((this.el as any) !== this.config.element) (this.ctlr.mutating = true), this.config.element.replaceWith(this.el), setTimeout(() => (this.ctlr.mutating = false), 0, this.signal);
  }
  public unmount(): void {
    if ((this.el as any) !== this.config.element) (this.ctlr.mutating = true), this.el.replaceWith(this.config.element), setTimeout(() => (this.ctlr.mutating = false), 0, this.signal);
  }

  // --- THE WIRING ---
  public wire(): void {
    // Variables Assignments
    (this.el as any).tmgPlayer = this.config.element.tmgPlayer; // ref is maintained if element was replaced in mount
    // Config Watchers
    this.config.watch("state.currentTime", this.onCurrentTime, this.evtOpts.CONFIG);
    // ------ Listeners
    this.config.on("intent", this.handleWrite, this.evtOpts.CONFIG), this.config.on("settings", this.handleWrite, this.evtOpts.CONFIG); // protecting everybody
    // Bulk Wiring
    this.wireSrc(), this.wireCurrentTime(), this.wireDuration(), this.wirePaused(), this.wireEnded(), this.wireFeatures();
    // Post Wiring
    (this.ctlr.flags.wired || !this.ctlr.isNativeEl) && this.flush();
    !this.ctlr.flags.wired && force(() => fanout(this.config.status, { ...this.config.status, ...(this.ctlr.isNativeEl && getMediaStatus(this.el as any, true)) }, { skipUndef: true })); // async init proof
    silence(() => (fanout(this.config.intent, this.config[this.ctlr.gospel]), fanout(this.config.settings))); // contemplating intent only
    force(() => this.config.tick(), !this.ctlr.flags.wired), (this.wired = true); // state isn't volatile but it must touch
  }
  // --- THE CORE 5 (Media "Must Haves") ---
  protected abstract wireSrc(): void;
  protected abstract wireCurrentTime(): void;
  protected abstract wireDuration(): void;
  protected abstract wirePaused(): void;
  protected abstract wireEnded(): void;
  // --- THE EXTENSIONS ---
  protected wireFeatures(): void {
    this.config.on("features", this.handleFeatures, { init: true, signal: this.signal });
  }
  protected wireFeature(feature: keyof MediaFeatures): void {
    if (!this.wiredSet.has(feature)) this.wiredSet.add(feature), (this as any)[`wire${capitalize(feature)}`]?.();
  }
  // Track Switching Wiring
  protected wireCurrentChapter(): void {
    this.config.set("intent.currentChapter", (term) => (isNum(term) ? term : this.config.settings.metadata.chapterInfo.findIndex((c) => c.title === term || c.artwork === term)), { signal: this.signal }); // #VALIDATOR: intent type conformation
    this.config.on("intent.currentChapter", this.handleCurrentChapterIntent, this.evtOpts.CONFIG);
  }
  // ive Content Wiring
  protected wireLive(): void {
    this.config.on("intent.live", this.handleLiveIntent, this.evtOpts.CONFIG);
    this.config.watch("status.isLive", this.onIsLiveStatus, this.evtOpts.CONFIG);
  }

  // --- THE HANDLERS ---
  protected handleFeatures({ type, target }: REvent<CtlrMedia, "features">): void {
    if (type === "update") return this.wireFeature(target.key);
    if (type === "init") for (const feature of Object.keys(target.value)) this.wireFeature(feature as keyof MediaFeatures);
  }
  protected handleWrite(e: REvent<CtlrMedia, "intent" | "settings">): void {
    if (e.type === "update" && !isFeatured(this.media, e.target.key as keyof MediaFeatures)) return e.reject(this.name), e.stopImmediatePropagation(); // (`&& (e.value || !this.ctlr.flags.wired)` = turn off at runtime) -> polyfill()
  }
  protected handleCurrentChapterIntent(e: REvent<CtlrMedia, "intent.currentChapter">): void {
    if (e.resolved || !this.wired) return;
    const chapter = this.config.settings.metadata.chapterInfo[e.value as number]; // #VALIDATED: mediated for cast conformity; no-opy
    chapter && silence(() => ((this.config.intent.currentTime = chapter.startTime), (this.config.state.currentChapter = e.value as number))); // #FACADED: silenced intent actual op // #NEED FOR SPEED: optimistic but eventual
    this.ctlr.plug("settings.notifiers")?.notify("chapter");
    e.resolve(this.name);
  }
  protected handleLiveIntent(e: REvent<CtlrMedia, "intent.live">): void {
    if (e.resolved) return;
    this.ctlr.when("loadedMetadata", e, (seekable = this.config.status.seekable) => e.value && seekable.length && (this.config.intent.currentTime = seekable.end(seekable.length - 1) - 1)); // #FACADED: silenced intent actual op
    e.resolve(this.name);
  }
  // Dog Feeders
  protected onCurrentTime(time = this.config.state.currentTime): void {
    if (!this.autoChapters) return;
    const chapters = this.config.settings.metadata.chapterInfo;
    if (chapters?.length) for (let len = chapters.length, i = len - 1; i >= 0; i--) if (time >= chapters[i].startTime) return void (this.config.state.currentChapter = i);
    this.config.state.currentChapter = -1;
  }
  protected onIsLiveStatus(v: boolean): void {
    this.config.features.live = v;
  }

  // --- THE HELPERS ---
  protected flush(): void {
    for (const path of this.config.settings.flushKeys.status) this.config.status[path] = deepClone(MEDIA_STATUS_BUILD[path]) as never;
    for (const path of this.config.settings.flushKeys.state) this.config.state[path] = deepClone(MEDIA_STATE_BUILD[path]) as never;
  }
  public polyfill(feature: keyof MediaFeatures | Array<keyof MediaFeatures>, condition?: any, disabled?: any): boolean | void {
    const apply = (f: keyof MediaFeatures, v = !disabled && (!!this.features[f] || !!condition)) => (!v && isBool(disabled) && (this.config.state as any)[f] === true && (silence(() => ((this.config.intent as any)[f] = false)), this.config.tick(`intent.${f}` as any)), (this.config.features[f] = v));
    return !isArr(feature) ? apply(feature) : feature.forEach((f) => apply(f));
  } // #EXTRA-MILE: doing the most with the least
}

export const cacheKeys = ["state", "status", "settings", "features"] as const;

export type CacheKey = (typeof cacheKeys)[number];

declare module "@defs/contract" {
  interface MediaStatus {
    hostReady: boolean;
  }
}
