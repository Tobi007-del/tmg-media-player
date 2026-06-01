import { Controllable } from "@core/controllable";
import type { Controller } from "@core/controller";
import type { Player } from "@core/player";
import type { CtlrMedia, MediaFeatures } from "@defs/contract";
import { type REvent, type Reactive, ListenerOptions } from "sia-reactor";
import { fanout, force } from "sia-reactor/utils";
import { silence } from "sia-reactor/modules";
import { getMediaStatus } from "@utils/media";
import { capitalize } from "@utils/str";

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
  public element!: El & { tmgPlayer?: Player };
  public get el() {
    return this.element;
  }
  protected readonly wiredFeatures: Set<keyof MediaFeatures> = new Set(); // Tracking to avoid rewiring
  protected readonly evtOpts: { EL: AddEventListenerOptions; CONFIG: ListenerOptions };

  constructor(ctlr: Controller, features: MediaFeatures = {}) {
    ctlr.media.tech.destroy?.(), ctlr.log(`Using ${new.target.techName} Media Technology.`);
    super(ctlr, ctlr.media);
    ctlr.config.mediaPlayer = "TMG"; // tell them! tell them!! tell them!!! ~ Kendrick Lamar
    this.element = ctlr.media.element; // must reassign if not using original
    this.evtOpts = { EL: { capture: true, signal: this.signal }, CONFIG: { capture: true, signal: this.signal } }; // "set" -> Avengers(Resolution lineup) assemble!
    for (const key of Object.keys(ctlr.media.features)) ctlr.media.features[key] = false;
    fanout(ctlr.media.features, features); // dynamics baby!
    ctlr.media.tech = this;
  }
  protected override onSetup(): void {
    this.mount();
    this.ctlr.state.readyState ? this.wire() : this.ctlr.state.wonce("readyState", this.wire, { signal: this.signal }); // wire after all plugs setup
  }
  protected override onDestroy(): void {
    this.unmount();
  }

  public mount(): void {
    this.element !== this.config.element && this.config.element.replaceWith(this.element);
  }
  public unmount(): void {
    this.element !== this.config.element && this.element.replaceWith(this.config.element);
  }

  public wire(): void {
    // Variables Assignments
    this.element.tmgPlayer = this.config.element.tmgPlayer; // ref is maintained if element was replaced in mount
    // Ctlr Media Listeners
    this.config.on("intent", this.handleIntent, { capture: true, signal: this.signal, depth: 1 }); // protecting just my ppl, so higher power; keep your guard up too
    this.wireSrc(), this.wireCurrentTime(), this.wireDuration(), this.wirePaused(), this.wireEnded(), this.wireFeatures();
    silence(() => {
      !this.ctlr.payload.wired && this.ctlr.isNativeTech && fanout(this.config.status, getMediaStatus(this.el)); // incase of async init
      fanout(this.config.intent, this.ctlr.payload.wired ? this.config.state : this.config.intent); // over to you, child. an implicit queue for init :)
      fanout(this.config.settings, this.config.settings); // over to you, child
    }); // it go touch everybodyyyyy, no fear!
    !this.ctlr.payload.wired && force(() => this.config.tick()); // state isn't volatile but it must touch
  }
  // --- THE MANDATORY CORE 5 (Media "Must Haves") ---
  protected abstract wireSrc(): void;
  protected abstract wireCurrentTime(): void;
  protected abstract wireDuration(): void;
  protected abstract wirePaused(): void;
  protected abstract wireEnded(): void;
  // --- THE EXTENSIONS ---
  protected wireFeatures(): void {
    this.config.features.on("*", this.handleFeatures, { init: true, signal: this.signal });
  }
  // --- MISCELLANEOUS ---
  protected handleFeatures({ type, target }: REvent<MediaFeatures, "*">): void {
    type === "update" ? this.wireFeature(target.key) : type === "init" && (Object.keys(target.value) as (keyof MediaFeatures)[]).forEach(this.wireFeature);
  }
  protected handleIntent(e: REvent<CtlrMedia, "intent", 1>): void {
    e.type === "update" && this.config.features[e.target.key as keyof MediaFeatures] === false && e.value && e.stopImmediatePropagation(); // falsy values pass so that they can turn off but not on
  }
  protected wireFeature(feature: keyof MediaFeatures): void {
    !this.wiredFeatures.has(feature) && (this as any)[`wire${capitalize(feature)}`]?.();
    this.wiredFeatures.add(feature);
  }
}
