import { BasePlug } from "../../base";
import type { Auto } from "./types";
import { AUTO_BUILD } from "./build";
import { type REvent } from "sia-reactor";
import { CtlrConfig } from "@defs/config";
import { CtlrMedia } from "@defs/contract";
import type { AptAutoplayOption } from "@defs/generics";
import { isStr } from "@utils/obj";
import { clamp, safeNum } from "@utils/num";
import { addSources } from "@utils/media";
import { capitalize } from "@utils/str";

export class AutoPlug extends BasePlug<Auto> {
  public static readonly plugName = "auto";
  public static readonly BUILD = AUTO_BUILD;
  protected nextPreview: HTMLVideoElement | null = null;
  protected canAutoMovePlaylist = true;

  public override wire(): void {
    // Plug Listeners
    this.ctlr.plug("playlist")?.state.watch("currentIndex", () => (this.canAutoMovePlaylist = true), { signal: this.signal });
    // Ctlr Config Watchers
    this.ctlr.config.watch("settings.auto.play", this.forwardAutoPlay, { signal: this.signal, init: "auto" });
    // ---- Media Listeners
    this.media.on("state.currentTime", this.handleCurrentTimeState, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- State ---------
    this.ctlr.state.on("mediaParentIntersecting", this.handleMediaParentIntersecting, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.auto.next.preview.usePoster", this.handleNextPreviewUsePoster, { signal: this.signal });
    this.ctlr.config.on("settings.auto.next.preview.tease", this.handleNextPreviewTease, { signal: this.signal });
    this.ctlr.config.on("settings.auto.next.preview.time", this.handleNextPreviewTime, { signal: this.signal });
  }

  protected forwardAutoPlay(value?: boolean | AptAutoplayOption): void {
    this.media.intent.autoplay = isStr(value) ? false : !!value;
  }

  protected handleCurrentTimeState({ value: curr }: REvent<CtlrMedia, "state.currentTime">): void {
    if (this.media.status.readyState && curr && this.ctlr.payload.wired && Math.floor((this.ctlr.settings.time.end ?? this.media.status.duration) - curr) <= this.config.next.value) this.autonextMedia();
  }

  protected handleMediaParentIntersecting(): void {
    this.mediaAptAutoplay(this.config.pause, false), this.mediaAptAutoplay();
  }

  protected handleNextPreviewUsePoster({ target: { value, object } }: REvent<CtlrConfig, "settings.auto.next.preview.usePoster">): void {
    if (!this.nextPreview || (value && this.nextPreview.poster)) return;
    if (object.tease) this.ctlr.settings.auto.next.preview.tease = true;
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

  protected mediaAptAutoplay(auto = this.config.play, bool = true, p = this.ctlr.state.mediaParentIntersecting ? "in" : "out"): void {
    if (auto === `${p}-view-always`) this.media.intent.paused = !bool;
    else if (auto === `${p}-view` && this.ctlr.state.readyState < 3) this.media.intent.paused = !bool;
  }

  protected autonextMedia = (): void => {
    if (!this.media.status.loadedMetadata || !this.ctlr.config.playlist || this.config.next.value < 0 || !this.canAutoMovePlaylist || this.ctlr.plug("playlist")!.state.currentIndex >= this.ctlr.config.playlist.length - 1 || this.media.state.paused || this.media.status.waiting) return;
    this.canAutoMovePlaylist = false;
    const count = clamp(1, Math.round(safeNum(this.ctlr.settings.time.end ?? this.media.status.duration) - safeNum(this.media.state.currentTime)), this.config.next.value),
      v = this.ctlr.config.playlist[this.ctlr.plug("playlist")!.state.currentIndex + 1],
      toastsPlug = this.ctlr.plug("settings.toasts"),
      timePlug = this.ctlr.plug("settings.time");
    const nVTId = toastsPlug?.toast?.("", {
      autoClose: count * 1000,
      hideProgressBar: false,
      position: "bottom-right",
      bodyHTML: `<span title="Play next ${this.media.type}" class="tmg-media-next-preview-wrapper">
        <button type="button"><svg viewBox="0 0 25 25"><path d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg></button>
        <video class="tmg-media-next-preview" poster="${v.media?.artwork?.[0]?.src}" src="${v.startup.intent.src || ""}" muted playsinline webkit-playsinline preload="metadata"></video>
        <p>${timePlug?.toTimeText(NaN) ?? "0:00"}</p>
      </span>
      <span class="tmg-media-next-info">
        <h2>Next ${capitalize(this.media.type)} in <span class="tmg-media-next-countdown">${count}</span></h2>
        ${v.media.title ? `<p class="tmg-media-next-title">${v.media.title}</p>` : ""}
      </span>`,
      onTimeUpdate: (time: number) => {
        const el = this.ctlr.queryDOM(".tmg-media-next-countdown");
        if (el) el.textContent = String(Math.round((count * 1000 - time) / 1000) || 1);
      },
      onClose: (timeElapsed) => (removeListeners(), timeElapsed && this.ctlr.plug("playlist")?.next()),
      tag: "tmg-anvi",
    });
    const evtPaths = ["state.currentTime", "state.paused", "status.waiting"] as const,
      cleanUp = (permanent = false) => (nVTId && window.t007?.toast.dismiss(nVTId, "instant"), (this.nextPreview = null), (this.canAutoMovePlaylist = !permanent)),
      cleanUpWhenNeeded = () => !this.media.element.ended && cleanUp(),
      autoCleanUpToast = () => Math.floor(safeNum((this.ctlr.settings.time.end ?? this.media.status.duration) - this.media.state.currentTime)) > this.config.next.value && cleanUp(),
      removeListeners = () => evtPaths.forEach((e, i) => this.media.off(e, !i ? autoCleanUpToast : cleanUpWhenNeeded));
    evtPaths.forEach((e, i) => this.media.on(e, !i ? autoCleanUpToast : cleanUpWhenNeeded, { signal: this.signal }));
    const nVP = (this.nextPreview = this.ctlr.queryDOM<HTMLVideoElement>(".tmg-media-next-preview"))!;
    if (v.startup.intent.sources?.length) addSources(v.startup.intent.sources, nVP);
    (["loadedmetadata", "loaded", "durationchange"] as const).forEach((e) => nVP?.addEventListener(e, ({ target: p }) => ((p as HTMLVideoElement).nextElementSibling!.textContent = timePlug?.toTimeText((p as HTMLVideoElement).duration) ?? "0:00")));
    this.ctlr.settings.auto.next.preview = this.config.next.preview; // force update
    nVP?.previousElementSibling?.addEventListener("click", () => (cleanUp(true), this.ctlr.plug("playlist")?.next()), { capture: true });
  };
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
    auto: Auto;
  }
}
