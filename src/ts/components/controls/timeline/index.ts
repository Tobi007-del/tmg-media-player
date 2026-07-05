import { RangeInput, RangeInputDiv, type RangeState } from "@components/rangeinput";
import type { TimelineConfig } from "./types";
import type { Controller } from "@core/controller";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import { formatMediaTime } from "@utils/time";
import { IS_MOBILE } from "@utils/env";
import { getMediaMax, getMediaProgress, getMediaTime } from "@utils/media";
import { createEl } from "@utils/dom";
import { setTimeout, requestAnimationFrame } from "@utils/fn";
import { safeNum } from "@utils/num";
import { isBool } from "@t007/utils";
import { silence } from "sia-reactor/modules";

export class Timeline extends RangeInput<TimelineConfig> {
  public static readonly componentName = "timeline"; // enforced name
  public static readonly isControl: boolean = true;
  public chaptersWrapper!: HTMLDivElement;
  public previewContainer!: HTMLDivElement;
  public previewImg!: HTMLDivElement;
  public previewCanvas!: HTMLCanvasElement;
  public thumbnailImg!: HTMLDivElement;
  public thumbnailCanvas!: HTMLCanvasElement;
  public previewContext: CanvasRenderingContext2D | null = null;
  public thumbnailContext: CanvasRenderingContext2D | null = null;
  protected wasPaused = false;
  protected scrubbingId = -1;
  protected get plug() {
    return this.ctlr.plug("settings.time");
  }
  protected getProgress(time: number) {
    return getMediaProgress(this.media, time);
  }
  protected getTime(percent: number) {
    return getMediaTime(this.media, percent);
  }

  constructor(ctlr: Controller, config?: Partial<TimelineConfig>) {
    super(ctlr, config);
  }

  public override create() {
    // Variables Assignments
    this.element = super.create();
    this.el.dataset.controlId = this.name;
    this.previewContainer = createEl("div", { className: "tmg-media-preview-container" });
    this.previewImg = createEl("div", { className: "tmg-media-preview" });
    this.previewCanvas = createEl("canvas", { className: "tmg-media-preview" });
    this.previewContext = this.previewCanvas.getContext("2d", { alpha: false });
    this.thumbnailImg = createEl("div", { className: "tmg-media-thumbnail tmg-media-filtered tmg-media-object" });
    this.thumbnailCanvas = createEl("canvas", { className: "tmg-media-thumbnail tmg-media-filtered tmg-media-object" });
    this.thumbnailContext = this.thumbnailCanvas.getContext("2d", { alpha: false });
    // DOM Injection
    this.el.classList.add("tmg-media-timeline-container"), this.barsWrapper.classList.add("tmg-media-timeline-bars-wrapper", "tmg-media-timeline"), this.thumbEl.classList.add("tmg-media-timeline-thumb");
    this.previewContainer.append(this.previewImg, this.previewCanvas);
    return this.el.append(this.previewContainer), this.el; // parent handled element assignment
  }

  public override mount(): void {
    // DOM Injection
    this.ctlr.DOM.controlsContainer?.prepend(this.thumbnailImg, this.thumbnailCanvas);
  }

  public override wire(): void {
    super.wire();
    // Event Listeners
    this.media.pseudoElement.addEventListener("timeupdate", this.syncCanvasPreviews, { signal: this.signal });
    // State Listeners
    this.state.on("scrubbing", this.handleScrubbing, { signal: this.signal });
    this.state.on("previewing", ({ value }) => (value ? (this.media.container.classList.add("tmg-media-previewing"), this.clearCanvasPreviews()) : setTimeout(() => this.media.container.classList.remove("tmg-media-previewing"), 0, this.signal)), { signal: this.signal });
    this.state.on("cancelScrub", ({ value }) => this.ctlr.plug("settings.notifiers")?.comp("cancelscrubnotifier")?.el.classList.toggle("tmg-media-control-active", value), { signal: this.signal });
    // Config --------
    this.config.on("previewValue", this.syncPreviewText, { init: true, signal: this.signal });
    this.config.on("previews", this.handlePreviews, { init: true, signal: this.signal });
    this.config.on("autopause", ({ value }) => [this.thumbnailCanvas, this.thumbnailImg].forEach((el) => el.classList.toggle("tmg-media-control-hidden", !value)), { init: true, signal: this.signal });
    this.config.on("compact", ({ value }) => this.el.classList.toggle("tmg-media-control-compact", value), { init: true, signal: this.signal });
    this.config.on("bufferMarks", () => this.syncMarks(this.config.marks, true), { init: true, signal: this.signal });
    this.config.on("playedMarks", () => this.syncMarks(this.config.marks, true), { init: true, signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.paused", ({ value }) => (!value ? this.ctlr.RAFLoop(`${this.config.label}Updating`, this.syncValue, this.signal) : this.ctlr.cancelRAFLoop(`${this.config.label}Updating`)), { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("state.currentTime", this.handleCurrentTime, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("intent.currentTime", this.handleCurrentTime, { signal: this.signal }); // #APPRENTICE: folklore embodiment
    this.media.on("status.buffered", this.handleBufferedStatus, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.played", () => this.config.playedMarks && this.syncMarks(this.config.marks, true), { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.duration", ({ value }) => (this.el.ariaValueMax = String(Math.floor(value))), { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.error", ({ value }) => value && this.syncChunks("buffer", 0), { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.isLive", ({ value }) => (this.config.readonly = value && !this.media.status.canSeekLive), { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.canSeekLive", ({ value }) => (this.config.readonly = !value && !!this.media.status.isLive), { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("settings.metadata.chapterInfo", this.handleMetadataChapterInfoSetting, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.time.format", this.syncPreviewText, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.time.mode", this.syncPreviewText, { signal: this.signal });
    this.ctlr.config.on("settings.css.currentObjectWidth", ({ value }) => (this.thumbnailCanvas.width = parseInt(value as string)), { init: true, signal: this.signal });
    this.ctlr.config.on("settings.css.currentObjectHeight", ({ value }) => (this.thumbnailCanvas.height = parseInt(value as string)), { init: true, signal: this.signal });
  }
  protected override scrub(value: number, bypass?: boolean): boolean {
    return super.scrub(value, bypass) ? (!bypass && (this.media.intent.currentTime = safeNum(this.getTime(value / 100))), true) : false;
  }

  protected handleCurrentTime({ target, rejectable, resolved }: REvent<CtlrMedia, "state.currentTime" | "intent.currentTime">): void {
    if (this.state.scrubbing || (rejectable && !resolved)) return; // shouldn't mind `.scrubbing`; it's binded to `intent.currentTime` but base class `.value` just renders faster
    if (this.media.state.paused) this.syncValue(false, target.value);
    this.el.ariaValueText = `${formatMediaTime({ time: target.value, format: "human-long" })} of ${formatMediaTime({ time: this.media.status.duration, format: "human-long" })}`;
  } // !a full embodiment for near native range perf but close enough

  protected handleBufferedStatus({ value }: REvent<CtlrMedia, "status.buffered">): void {
    this.config.bufferMarks && this.syncMarks(this.config.marks, true);
    for (let i = 0; i < value.length; i++) if (value.start(value.length - 1 - i) < this.media.state.currentTime) return void this.syncChunks("buffer", this.getPosValue(safeNum(value.end(value.length - 1 - i) / getMediaMax(this.media))));
  }

  public syncValue(auto = true, value = this.media.state.currentTime): void {
    if (auto && !this.ctlr.state.mediaIntersecting) return;
    if (!this.state.scrubbing) this.config.value = safeNum(this.getProgress(value)) * 100; // (value / safeNum(this.media.status.duration, 60))
  }

  protected handleScrubbing({ value }: REvent<RangeState, "scrubbing">): void {
    this.media.container.classList.toggle("tmg-media-scrubbing", value);
    if (!value) {
      this.config.autopause && silence(() => (this.media.intent.paused = this.wasPaused));
      cancelAnimationFrame(this.scrubbingId);
      this.ctlr.plug("settings.notifiers")?.comp("scrubnotifier")?.inactive();
    } else {
      this.wasPaused = this.media.state.paused;
      this.scrubbingId = requestAnimationFrame(() => {
        this.config.autopause && silence(() => (this.media.intent.paused = true));
        IS_MOBILE && this.ctlr.plug("settings.notifiers")?.comp("scrubnotifier")?.active();
      }, this.signal);
      this.clearCanvasPreviews();
    }
  }
  protected handlePreviews({ target }: REvent<TimelineConfig, "previews">): void {
    const value = target.value === true ? {} : target.value;
    this.media.container.classList.toggle("tmg-media-no-previews", !value || this.media.type !== "video");
    if (!value || this.media.type !== "video") return void (this.media.container.dataset.previewType = "none");
    const manual = value.address && (value.spf || (value.cols && value.rows)),
      type = manual ? (value.cols && value.rows ? "sprite" : "image") : "canvas";
    this.media.container.dataset.previewType = type;
    if (type === "sprite" && value.address) this.settings.css.currentPreviewUrl = this.settings.css.currentThumbnailUrl = `url(${value.address})`;
    else this.settings.css.currentPreviewPosition = this.settings.css.currentThumbnailPosition = "center";
  }

  protected handleMetadataChapterInfoSetting({ value }: REvent<CtlrMedia, "settings.metadata.chapterInfo">): void {
    if (!value || value.length < 2) return void (this.config.divs = []);
    const divs: RangeInputDiv[] = [];
    for (let i = 0, len = value.length; i < len; i++) divs.push({ value: (value[i].startTime / getMediaMax(this.media)) * 100, label: value[i].title });
    this.config.divs = divs;
  }

  public override stopScrubbing(): void {
    if (!this.state.scrubbing) return;
    if (!this.state.cancelScrub) this.media.intent.currentTime = this.getTime(this.config.value / 100);
    super.stopScrubbing();
  }

  protected onInput(_e: MouseEvent | PointerEvent, pos: number): void {
    this.ctlr.throttle(
      `${this.config.label}Previewing`,
      () => {
        this.syncElPos(this.previewContainer, !this.config.compact ? pos : 0.5, false, true);
        const previews = this.config.previews,
          type = this.media.container.dataset.previewType;
        if (type === "sprite" && previews && !isBool(previews) && previews.cols && previews.rows) {
          const frameIndex = Math.floor((pos * getMediaMax(this.media)) / (previews.spf || 1)) || 1,
            { cols, rows } = previews,
            clampedI = Math.min(frameIndex, cols * rows - 1),
            xPercent = ((clampedI % cols) * 100) / (cols - 1 || 1),
            yPercent = (Math.floor(clampedI / cols) * 100) / (rows - 1 || 1);
          if (!this.config.compact) this.settings.css.currentPreviewPosition = `${xPercent}% ${yPercent}%`;
          if (this.state.scrubbing && this.config.autopause) this.settings.css.currentThumbnailPosition = `${xPercent}% ${yPercent}%`;
        } else if (type === "image" && previews && !isBool(previews) && previews.address) {
          const frameIndex = Math.floor((pos * getMediaMax(this.media)) / (previews.spf || 1)) || 1,
            url = `url(${previews.address.replace("$", String(frameIndex))})`;
          if (!this.config.compact) this.settings.css.currentPreviewUrl = url;
          if (this.state.scrubbing && this.config.autopause) this.settings.css.currentThumbnailUrl = url;
        } else if (previews && !this.ctlr.state.frameReadyPromise) this.media.pseudoElement.currentTime = safeNum(this.getTime(pos));
      },
      30
    );
  }

  public syncPreviewText(): void {
    if (this.plug) this.previewContainer.dataset.previewText = `${this.plug.toTimeText(this.getTime(this.config.previewValue / 100), true)}  ${this.getValueChunk(this.config.previewValue)?.label || ""}`.trim();
  }
  public syncCanvasPreviews(): void {
    if (!this.previewContext || !this.thumbnailContext || !this.media.status.loadedData || this.ctlr.state.frameReadyPromise || this.media.pseudoElement.readyState < 2) return;
    this.ctlr.throttle(
      "canvasPreviewSync",
      () => {
        this.previewCanvas.width = this.previewCanvas.clientWidth || this.previewCanvas.width;
        this.previewCanvas.height = this.previewCanvas.clientHeight || this.previewCanvas.height;
        if (!this.config.compact) this.previewContext!.drawImage(this.media.pseudoElement as HTMLVideoElement, 0, 0, this.previewCanvas.width, this.previewCanvas.height);
        if (this.state.scrubbing && this.config.autopause) this.thumbnailContext!.drawImage(this.media.pseudoElement as HTMLVideoElement, 0, 0, this.thumbnailCanvas.width, this.thumbnailCanvas.height);
      },
      33
    );
  }
  public clearCanvasPreviews(bool = this.media.container.dataset.previewType === "canvas" && this.media.pseudoElement.readyState < 2): void {
    bool && (this.ctlr.setCanvasFallback(this.previewCanvas, this.previewContext), this.ctlr.setCanvasFallback(this.thumbnailCanvas, this.thumbnailContext));
  }

  protected override syncDivs(divs = this.config.divs): void {
    super.syncDivs(divs);
    for (let i = 0, len = this.chunks.length; i < len; i++) {
      const c = this.chunks[i];
      c.el.classList.add("tmg-media-timeline-chapter"), c.base.classList.add("tmg-media-timeline-base-bar", "tmg-media-timeline-bar"), c.preview.classList.add("tmg-media-timeline-preview-bar", "tmg-media-timeline-bar"), c.value.classList.add("tmg-media-timeline-played-bar", "tmg-media-timeline-bar");
      c.el.insertBefore((c.buffer = createEl("div", { className: "tmg-media-range-bar tmg-media-buffered-bar tmg-media-timeline-buffered-bar tmg-media-timeline-bar" })), c.value);
    }
    this.handleBufferedStatus({ value: this.media.status.buffered } as REvent<CtlrMedia, "status.buffered">);
  }
  protected override syncMarks(marks = this.config.marks, extras = false): void {
    if (extras && !this.ctlr.payload.wired) return;
    const agg = [...marks],
      buf = this.media.status.buffered,
      ply = this.media.status.played,
      max = getMediaMax(this.media) || 1;
    if (this.config.bufferMarks)
      for (let i = 0, len = buf.length; i < len; i++) {
        const start = buf.start(i),
          end = buf.end(i);
        agg.push({ start: (start / max) * 100, end: (end / max) * 100, label: `${formatMediaTime({ time: start })}${end > start + 1 ? ` - ${formatMediaTime({ time: end })}` : ""}  Loaded`, type: "buffered" });
      }
    if (this.config.playedMarks)
      for (let i = 0, len = ply.length; i < len; i++) {
        const start = ply.start(i),
          end = ply.end(i);
        agg.push({ start: (start / max) * 100, end: (end / max) * 100, label: `${formatMediaTime({ time: start })}${end > start + 1 ? ` - ${formatMediaTime({ time: end })}` : ""}  Played`, type: "played" });
      }
    super.syncMarks(agg); // all weightless logic
  }
}

export type * from "./types";

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    timeline: typeof Timeline;
  }
}
