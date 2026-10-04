import { BasePlug } from "../../base";
import type { AutoConfig } from "./types";
import { AUTO_BUILD } from "./build";
import { type REvent } from "sia-reactor";
import { CtlrConfig } from "@defs/config";
import { safeNum } from "@utils/num";
import { addSources } from "@utils/media";
import { silence } from "sia-reactor/modules";
import { IconRegistry, MenuRegistry } from "@core/registries";
import { globalState, type GlobalState } from "@tools/runtime";
import { AUDIO_EXTENSIONS } from "@utils/match";
import { capitalize, isArr, isSameURL } from "@t007/utils";

export class AutoPlug extends BasePlug<AutoConfig> {
  public static readonly plugName = "auto";
  public static readonly BUILD = AUTO_BUILD;
  public autoClupPaths = ["state.currentTime", "state.paused", "state.playbackRate", "status.waiting"] as const;
  protected nextPreview: HTMLVideoElement | null = null;
  protected canMovePlaylist = true;

  public override wire(): void {
    // Ctlr Config Getters
    for (const k of ["min", "max"] as const) this.ctlr.config.get(`settings.auto.next.preview.${k}`, (v) => this.ctlr.plug("settings.time")?.toTime(v, this.nextPreview?.duration) ?? v, { signal: this.signal });
    // ---- Media Watchers
    this.media.watch("state.currentItem", () => ((this.canMovePlaylist = true), this.nextClup?.()), { signal: this.signal });
    // // ---- Config -------
    this.ctlr.config.watch("settings.auto.play.value", (value) => silence(() => (this.media.intent.autoplay = value === true)), { signal: this.signal });
    // ---- Media Listeners
    this.media.on("state.currentTime", ({ value }, st = this.media.status) => value && this.ctlr.flags.wired && st.readyState && (st.isLive ? st.ended : this.toNextTime() <= this.config.next.countdown) && this.autonextMedia(), { init: this.ctlr.flags.wired, signal: this.signal });
    // ---- State ---------
    this.ctlr.state.on("parentIntersecting", () => (this.aptAutoplay(this.config.pause.value, false), this.aptAutoplay()), { signal: this.signal });
    globalState.on("isVisible", this.handleGlobalIsVisible, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.auto.next.preview", this.handleNextPreview, { signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected handleGlobalIsVisible({ value }: REvent<GlobalState, "isVisible">, p = value ? ("in" as const) : ("out" as const)): void {
    if (isArr(this.config.pause.value) && this.config.pause.value.includes(`${p}-window-always`)) silence(() => (this.media.intent.paused = true));
    if (isArr(this.config.play.value) && this.config.play.value.includes(`${p}-window-always`) && this.ctlr.state.mediaIntersecting) silence(() => (this.media.intent.paused = false));
  }

  protected handleNextPreview({ currentTarget: { value: p } }: REvent<CtlrConfig, "settings.auto.next.preview">): void {
    if (!this.nextPreview || (p.usePoster && this.usingPreviewPoster)) return;
    this.nextPreview.ontimeupdate = () => (this.nextPreview?.currentTime ?? -1) >= p.max && (p.loop ? (this.nextPreview!.currentTime = p.min) : this.nextPreview!.pause());
    (this.nextPreview.currentTime = p[p.loop ? "min" : "max"]), this.nextPreview[p.tease ? "play" : "pause"]();
  }

  protected aptAutoplay(auto = this.config.play.value, bool = true, p = this.ctlr.state.parentIntersecting ? ("in" as const) : ("out" as const)): void {
    if (isArr(auto)) if (auto.includes(`${p}-view-always`) || (auto.includes(`${p}-view`) && !this.ctlr.flags.played)) silence(() => (this.media.intent.paused = !bool)); // #PATIENT: only before first play
  }

  protected autonextMedia(): void {
    if (!this.canMovePlaylist || this.media.state.loop || !this.media.status.loadedMetadata || !this.ctlr.config.playlist.content || this.config.next.countdown < 0 || !this.media.features.nextItem || this.media.state.paused || this.media.status.waiting) return;
    this.canMovePlaylist = false;
    const count = Math.max(1, this.toNextTime("round")),
      m = this.ctlr.config.playlist.content[this.media.state.currentItem + 1].media,
      type = m.intent.src && AUDIO_EXTENSIONS.test(m.intent.src) ? "audio" : "video";
    const nVTId = this.ctlr.toast?.("", {
      autoClose: count * 1000,
      bodyHTML: `<span title="Play next ${type}" class="tmg-media-next-preview-wrapper tmg-media-flex-center">
        <button type="button" class="tmg-media-cover">${IconRegistry.get("play", true)?.replace('class="', 'class="tmg-media-no-pointer ') || ""}</button>
        <video class="tmg-media-next-preview tmg-media-no-pointer" poster="${m.intent.poster || m.settings.metadata.artwork?.[0]?.src || window.TMG_MEDIA_ALT_IMG_SRC || ""}" src="${m.intent.src || ""}" muted playsinline webkit-playsinline preload="metadata"></video>
        <span>${this.ctlr.plug("settings.time")?.toTimeText(NaN)}</span>
      </span>
      <span class="tmg-media-next-info">
        <p class="tmg-media-next-meta">Next ${capitalize(type)} in <span class="tmg-media-next-countdown">${count}</span></p>${m.settings.metadata.title ? `<p class="tmg-media-next-title">${m.settings.metadata.title}</p>` : ""}${m.settings.metadata.artist ? `<p class="tmg-media-next-artist">${m.settings.metadata.artist}</p>` : ""}
      </span>`,
      onTimeUpdate: (time: number, el = this.ctlr.queryDOM(".tmg-media-next-countdown")) => el && (el.textContent = String(Math.round((count * 1000 - time) / 1000) || 1)),
      onClose: (elapsed?: boolean) => void (removeListeners(), elapsed && this.ctlr.plug("playlist")?.next()),
      signal: this.signal,
      ...this.config.next.toast,
    });
    const clup = (permanent = false) => (nVTId && t007.toast?.dismiss(nVTId, "instant"), (this.nextClup = this.nextPreview = null), (this.canMovePlaylist = !permanent)),
      autoClup = () => this.toNextTime() > this.config.next.countdown && clup();
    this.nextClup = () => !this.media.status.ended && clup();
    const removeListeners = () => this.autoClupPaths.forEach((p) => this.media.off(p, p === "state.currentTime" ? autoClup : this.nextClup!));
    for (const p of this.autoClupPaths) this.media.on(p, p === "state.currentTime" ? autoClup : this.nextClup, { signal: this.signal });
    const nVP = type === "video" ? (this.nextPreview = this.ctlr.queryDOM<HTMLVideoElement>(".tmg-media-next-preview"))! : null;
    if (nVP && m.intent.sources?.length) addSources(m.intent.sources, nVP);
    if (nVP && m.status.duration) nVP.nextElementSibling!.textContent = this.ctlr.plug("settings.time")?.toTimeText(m.status.duration) || "";
    else for (const e of ["loadedmetadata", "durationchange"] as const) nVP?.addEventListener(e, ({ target: p }) => ((p as HTMLElement).nextElementSibling!.textContent = this.ctlr.plug("settings.time")?.toTimeText((p as HTMLVideoElement).duration) || ""), { signal: this.signal });
    (nVP ? nVP.previousElementSibling : this.ctlr.queryDOM(".tmg-media-next-preview-wrapper>button"))?.addEventListener("click", () => (clup(true), this.ctlr.plug("playlist")?.next()), { capture: true, signal: this.signal });
    this.config.next.preview.tease = this.config.next.preview.tease; // force trigger
  }
  private nextClup?: (() => void) | null;

  public toNextTime(method: "ceil" | "floor" | "round" = "round", time = this.media.state.currentTime): number {
    return Math[method](safeNum((this.ctlr.plug("settings.time")?.actualEnd ?? this.media.status.duration) - time)) / this.media.state.playbackRate;
  } // u can't have missed anything in the last second
  private get usingPreviewPoster(): boolean {
    return !!this.nextPreview?.poster && !isSameURL(this.nextPreview.poster, window.TMG_MEDIA_ALT_IMG_SRC);
  }

  protected override registerMenu(): void {
    this.ctlr.plug("settings.panel")?.menu.registerFirst(MenuRegistry.get("settings.auto")?.(this));
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
