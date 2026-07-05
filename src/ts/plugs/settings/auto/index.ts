import { BasePlug } from "../../base";
import type { AutoConfig, AptAutoplayOption } from "./types";
import { AUTO_BUILD } from "./build";
import { type REvent } from "sia-reactor";
import { CtlrConfig } from "@defs/config";
import { CtlrMedia } from "@defs/contract";
import { isStr } from "@utils/obj";
import { clamp, safeNum } from "@utils/num";
import { addSources } from "@utils/media";
import { capitalize } from "@utils/str";
import { silence } from "sia-reactor/modules";
import { MenuRegistry } from "@core/registries";

export class AutoPlug extends BasePlug<AutoConfig> {
  public static readonly plugName = "auto";
  public static readonly BUILD = AUTO_BUILD;
  protected nextPreview: HTMLVideoElement | null = null;
  protected canAutoMovePlaylist = true;

  public override wire(): void {
    // Plug Watchers
    this.ctlr.plug("playlist")?.state.watch("currentIndex", () => (this.canAutoMovePlaylist = true), { signal: this.signal });
    // Ctlr Config Watchers
    this.ctlr.config.watch("settings.auto.play.value", this.forwardAutoPlay, { init: "auto", signal: this.signal });
    // ---- Media Listeners
    this.media.on("state.currentTime", this.handleCurrentTimeState, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- State ---------
    this.ctlr.state.on("mediaParentIntersecting", this.handleMediaParentIntersecting, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.auto.next.preview.usePoster", this.handleNextPreviewUsePoster, { signal: this.signal });
    this.ctlr.config.on("settings.auto.next.preview.tease", this.handleNextPreviewTease, { signal: this.signal });
    this.ctlr.config.on("settings.auto.next.preview.time", this.handleNextPreviewTime, { signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected forwardAutoPlay(value?: boolean | AptAutoplayOption): void {
    silence(() => (this.media.intent.autoplay = isStr(value) ? false : !!value));
  }

  protected handleCurrentTimeState({ value: curr }: REvent<CtlrMedia, "state.currentTime">): void {
    if (this.media.status.readyState && curr && this.ctlr.payload.wired && Math.floor((this.settings.time.end ?? this.media.status.duration) - curr) <= this.config.next.value / 1000) this.autonextMedia();
  }

  protected handleMediaParentIntersecting(): void {
    this.mediaAptAutoplay(this.config.pause.value, false), this.mediaAptAutoplay();
  }

  protected handleNextPreviewUsePoster({ target: { value, object } }: REvent<CtlrConfig, "settings.auto.next.preview.usePoster">): void {
    if (!this.nextPreview || (value && this.nextPreview.poster)) return;
    if (object.tease) this.config.next.preview.tease = true;
    else this.nextPreview.currentTime = object.time;
  }

  protected handleNextPreviewTease({ target: { value, object } }: REvent<CtlrConfig, "settings.auto.next.preview.tease">): void {
    if (!this.nextPreview) return;
    this.nextPreview.ontimeupdate = () => this.nextPreview && Number(this.nextPreview.currentTime) >= object.time && this.nextPreview.pause();
    if (value && (!object.usePoster || !this.nextPreview.poster)) this.nextPreview.play();
  }

  protected handleNextPreviewTime({ target: { value, object } }: REvent<CtlrConfig, "settings.auto.next.preview.time">): void {
    if (!this.nextPreview || (object.usePoster && this.nextPreview.poster)) return;
    this.nextPreview.currentTime = Number(value);
  }

  protected mediaAptAutoplay(auto = this.config.play.value, bool = true, p = this.ctlr.state.mediaParentIntersecting ? "in" : "out"): void {
    if (auto === `${p}-view-always`) this.media.intent.paused = !bool;
    else if (auto === `${p}-view` && this.ctlr.state.readyState < 3) this.media.intent.paused = !bool; // #PATIENT: only after first play
  }

  protected autonextMedia(): void {
    if (!this.media.status.loadedMetadata || !this.ctlr.config.playlist.content || this.config.next.value < 0 || !this.canAutoMovePlaylist || this.ctlr.plug("playlist")!.state.currentIndex >= this.ctlr.config.playlist.content.length - 1 || this.media.state.paused || this.media.status.waiting) return;
    this.canAutoMovePlaylist = false;
    const count = clamp(1, Math.round(safeNum(this.settings.time.end ?? this.media.status.duration) - safeNum(this.media.state.currentTime)), this.config.next.value / 1000),
      m = this.ctlr.config.playlist.content[this.ctlr.plug("playlist")!.state.currentIndex + 1].media;
    const nVTId = this.ctlr.plug("settings.toasts")?.toast?.("", {
      autoClose: count * 1000,
      hideProgressBar: false,
      position: "bottom-right",
      bodyHTML: `<span title="Play next ${this.media.type}" class="tmg-media-next-preview-wrapper">
        <button type="button"><svg viewBox="0 0 25 25"><path d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg></button>
        <video class="tmg-media-next-preview" poster="${m.intent.poster || m.settings.metadata.artwork?.[0]?.src || ""}" src="${m.intent.src || ""}" muted playsinline webkit-playsinline preload="metadata"></video>
        <p>${this.ctlr.plug("settings.time")?.toTimeText(NaN) ?? "0:00"}</p>
      </span>
      <span class="tmg-media-next-info"><h2>Next ${capitalize(this.media.type)} in <span class="tmg-media-next-countdown">${count}</span></h2>${m.settings.metadata.title ? `<p class="tmg-media-next-title">${m.settings.metadata.title}</p>` : ""}</span>`,
      onTimeUpdate: (time: number, el = this.ctlr.queryDOM(".tmg-media-next-countdown")) => el && (el.textContent = String(Math.round((count * 1000 - time) / 1000) || 1)),
      onClose: (elapsed?: boolean) => void (removeListeners(), elapsed && this.ctlr.plug("playlist")?.next()),
      tag: "tmg-anvi",
      signal: this.signal,
    });
    const evtPaths = ["state.currentTime", "state.paused", "status.waiting"] as const,
      cleanUp = (permanent = false) => (nVTId && t007.toast?.dismiss(nVTId, "instant"), (this.nextPreview = null), (this.canAutoMovePlaylist = !permanent)),
      strictCleanUp = () => !this.media.status.ended && cleanUp(),
      autoCleanUp = () => Math.floor(safeNum((this.settings.time.end ?? this.media.status.duration) - this.media.state.currentTime)) > this.config.next.value / 1000 && cleanUp(),
      removeListeners = () => evtPaths.forEach((e, i) => this.media.off(e, !i ? autoCleanUp : strictCleanUp));
    evtPaths.forEach((e, i) => this.media.on(e, !i ? autoCleanUp : strictCleanUp, { signal: this.signal }));
    const nVP = (this.nextPreview = this.ctlr.queryDOM<HTMLVideoElement>(".tmg-media-next-preview"))!;
    if (m.intent.sources?.length) addSources(m.intent.sources, nVP);
    for (const e of ["loadedmetadata", "loaded", "durationchange"] as const) nVP?.addEventListener(e, ({ target: p }) => ((p as HTMLVideoElement).nextElementSibling!.textContent = this.ctlr.plug("settings.time")?.toTimeText((p as HTMLVideoElement).duration) ?? "-:--"), { signal: this.signal });
    this.config.next.preview = this.config.next.preview; // force update
    nVP?.previousElementSibling?.addEventListener("click", () => (cleanUp(true), this.ctlr.plug("playlist")?.next()), { capture: true, signal: this.signal });
  }

  protected override registerMenu(): void {
    this.ctlr.plug("settings.settingsView")?.menu.registerFirst(MenuRegistry.get("settings.auto")?.(this));
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.auto": typeof AutoPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    auto: AutoConfig;
  }
}
