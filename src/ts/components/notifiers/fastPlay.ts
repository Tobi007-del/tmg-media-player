import { BaseNotifier, ComponentState } from "./base";
import { createEl } from "@utils/dom";
import { IconRegistry } from "@core/registries";

export class FastPlayNotifier extends BaseNotifier<undefined, ComponentState, HTMLDivElement> {
  public static readonly componentName = "fastPlayNotifier";
  public static readonly triggers = ["fastPlay"];
  public text!: HTMLParagraphElement;

  public override create() {
    this.element = createEl("div", { className: "tmg-media-fast-play-notifier tmg-media-text-notifier tmg-media-top-text-notifier", innerHTML: `${IconRegistry.get("doubleTriangleLeft")}${IconRegistry.get("doubleTriangleRight")}` });
    this.text = createEl("p", { className: "tmg-media-fast-play-notifier-text" });
    return this.el.insertBefore(this.text, this.el.lastChild), this.el;
  }

  public override wire(): void {
    super.wire();
    // State Listeners
    this.state.on("active", this.handleTimeState, { signal: this.signal });
    // Ctlr Media Listeners
    for (const k of ["state", "intent"] as const) this.media.on(`${k}.currentTime`, this.handleTimeState, { signal: this.signal });
    for (const p of ["state.playbackRate", "status.rewindRate"] as const) this.media.on(p, this.handleRateState, { init: p === "state.playbackRate" && this.ctlr.flags.wired, signal: this.signal });
  }

  protected handleRateState(): void {
    this.text.textContent = `${this.media.status.rewindRate || this.media.state.playbackRate}x`;
    this.el.classList.toggle("tmg-media-rewind", !!this.media.status.rewindRate);
  }

  protected handleTimeState(): void {
    this.state.active && this.el.setAttribute("data-current-time", this.ctlr.plug("settings.time")?.toTimeText(this.media[this.media.status.rewindRate ? "intent" : "state"].currentTime, true) || "");
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    fastPlayNotifier: typeof FastPlayNotifier;
  }
}
