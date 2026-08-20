import { Controllable } from "@core/controllable";
import type { Controller } from "@core/controller";
import type { CtlrMedia, MediaFeatures, MediaStatus } from "@defs/contract";
import { type REvent, type Reactive, ListenerOptions, NOOP } from "sia-reactor";
import { deepClone, fanout, force } from "sia-reactor/utils";
import { silence } from "sia-reactor/modules";
import { getMediaStatus } from "@utils/media";
import { capitalize } from "@utils/str";
import { isNum } from "@utils/obj";
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
  public wired = false; // for light status checks where needed
  public readonly evtOpts: { EL: AddEventListenerOptions; CONFIG: ListenerOptions } = { EL: { capture: true, signal: this.signal }, CONFIG: { capture: true, signal: this.signal } }; // "set" -> Avengers(Resolution lineup) assemble!;
  public readonly wiredFeatures: Set<keyof MediaFeatures> = new Set(); // Tracking to avoid rewiring
  protected readonly pending = new Map<string, () => void>();
  protected autoChapters: boolean = false;

  constructor(ctlr: Controller, features: MediaFeatures = {}) {
    ctlr.media.tech.destroy?.(), ctlr.log(`Using ${new.target.techName} media technology.`);
    super(ctlr, ctlr.media); // Odekunle Olasubomi Abimbola Cornelius Adisun was here; Aug 14th 2026
    ctlr.config.mediaPlayer = "TMG"; // tell them! tell them!! tell them!!! ~ Kendrick Lamar
    this.element = ctlr.media.element as any; // must reassign if not using original
    for (const key of Object.keys(ctlr.media.features)) ctlr.media.features[key as keyof MediaFeatures] = false;
    fanout(ctlr.media.features, features); // dynamics baby!
  }
  protected override onSetup(): void {
    this.mount();
    this.ctlr.state.readyState ? this.wire() : this.ctlr.state.wonce("readyState", this.wire, { signal: this.signal }); // wire after all plugs setup
  }
  protected override onDestroy(): void {
    this.unmount(), (this.config.status.hostReady = false);
  }

  public mount(): void {
    (this.el as any) !== this.config.element && this.config.element.replaceWith(this.el);
  }
  public unmount(): void {
    (this.el as any) !== this.config.element && this.el.replaceWith(this.config.element);
  }

  // --- THE WIRING ---
  public wire(): void {
    // Variables Assignments
    (this.el as any).tmgPlayer = this.config.element.tmgPlayer; // ref is maintained if element was replaced in mount
    // Ctlr Media Watchers
    this.config.watch("state.currentTime", this.onCurrentTime, this.evtOpts.CONFIG);
    // --------- Listeners
    this.config.on("intent", this.handleWrite, this.evtOpts.CONFIG), this.config.on("settings", this.handleWrite, this.evtOpts.CONFIG); // protecting everybody
    // Bulk Wiring
    this.wireSrc(), this.wireCurrentTime(), this.wireDuration(), this.wirePaused(), this.wireEnded(), this.wireFeatures();
    // Post Wiring
    (this.ctlr.payload.wired || !this.ctlr.isNativeEl) && this.resetLoadInfo();
    !this.ctlr.payload.wired && force(() => fanout(this.config.status, { ...this.config.status, ...(this.ctlr.isNativeEl ? getMediaStatus(this.el as any, undefined, undefined, true) : {}) }, { skipUndef: true })); // incase of async init
    silence(() => (fanout(this.config.intent, this.config[this.ctlr.techTruth]), fanout(this.config.settings, this.config.settings))); // over to you, child. it go touch everybodyyyyy, no fear!
    !this.ctlr.payload.wired ? force(() => this.config.tick()) : this.config.tick(); // state isn't volatile but it must touch
    this.wired = true;
  }
  // --- THE CORE 5 (Media "Must Haves") ---
  protected abstract wireSrc(): void;
  protected abstract wireCurrentTime(): void;
  protected abstract wireDuration(): void;
  protected abstract wirePaused(): void;
  protected abstract wireEnded(): void;
  // --- THE EXTENSIONS ---
  protected wireFeatures(): void {
    this.media.on("features", this.handleFeatures, { init: true, signal: this.signal });
  }
  protected wireFeature(feature: keyof MediaFeatures): void {
    !this.wiredFeatures.has(feature) && (this.wiredFeatures.add(feature), (this as any)[`wire${capitalize(feature)}`]?.());
  }
  // Track Switching Wiring
  protected wireCurrentChapter(): void {
    this.config.set("intent.currentChapter", (term) => (isNum(term) ? term : this.config.settings.metadata.chapterInfo.findIndex((c) => c.title === term || c.startTime === term || c.artwork === term)), { signal: this.signal }); // #VALIDATOR: intent type conformation
    this.config.on("intent.currentChapter", this.handleCurrentChapterIntent, this.evtOpts.CONFIG);
  }

  // --- THE HANDLERS ---
  protected handleFeatures({ type, target }: REvent<CtlrMedia, "features">): void {
    if (type === "update") this.wireFeature(target.key);
    else if (type === "init") for (const feature of Object.keys(target.value)) this.wireFeature(feature as keyof MediaFeatures);
  }
  protected handleWrite(e: REvent<CtlrMedia, "intent" | "settings">): void {
    if (e.type === "update" && this.config.features[e.target.key as keyof MediaFeatures] === false && (e.value || !this.ctlr.payload.wired)) return e.reject(this.name), e.stopImmediatePropagation(); // falsy values pass during runtime so they can turn off
  }
  protected handleCurrentChapterIntent(e: REvent<CtlrMedia, "intent.currentChapter">): void {
    if (e.resolved || !this.wired) return;
    const chapter = this.config.settings.metadata.chapterInfo[e.value as number];
    if (chapter) this.media.intent.currentTime = chapter.startTime; // #VALIDATED: mediated for cast conformity; no-opy // #FACADED: silenced intent actual op
    this.ctlr.plug("settings.notifiers")?.notify("chapter");
    e.resolve(this.name);
  }

  // --- THE HELPERS ---
  protected resetLoadInfo(): void {
    for (const path of this.config.settings.resetPaths.status) this.config.status[path] = deepClone(MEDIA_STATUS_BUILD[path]) as never;
    for (const path of this.config.settings.resetPaths.state) this.config.state[path] = deepClone(MEDIA_STATE_BUILD[path]) as never;
  }
  public when<Evt extends REvent<CtlrMedia>>(status: keyof MediaStatus, e?: Evt, task: () => void = NOOP, always = true, _key = status + e?.path || "", _value = (!always && this.wired) || this.config.status[status], _log = this.ctlr.config.devMode && !this.config.status[status]): void {
    const callback = this.ctlr.guard((v: any, __: any, stalled = true) => v && (stalled && this.pending.get(_key)?.(), this.pending.delete(_key), _log && this.ctlr.log(`${e?.path} stalled by ${status} executing with ${e?.value}`), task())); // RS(${this.ctlr.payload.readyState})
    this.pending.get(_key)?.(), _value ? callback(_value, null, false) : this.pending.set(_key, this.config.watch(`status.${status}`, callback, { signal: this.signal }));
  } // #EXTRA-MILE: doing the most with the least
  // Dog Feeders
  protected onCurrentTime(v: number): void {
    if (!this.autoChapters) return;
    const chapters = this.config.settings.metadata.chapterInfo;
    if (chapters?.length) for (let len = chapters.length, i = len - 1; i >= 0; i--) if (v >= chapters[i].startTime) return void (this.config.state.currentChapter = i);
    this.media.state.currentChapter = -1;
  }
}

declare module "@defs/contract" {
  interface MediaStatus {
    hostReady: boolean;
  }
}
