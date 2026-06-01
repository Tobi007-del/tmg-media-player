import { RangeInput, type RangeState } from "@components/rangeinput";
import type { TimelineConfig } from "./types";
import type { Controller } from "@core/controller";
import type { REvent } from "sia-reactor";
import type { CtlrMedia } from "@defs/contract";
import { formatMediaTime } from "@utils/time";
import { IS_MOBILE } from "@utils/browser";
import { getRenderedBox } from "@utils/media";
import { createEl } from "@utils/dom";
import { setTimeout, requestAnimationFrame } from "@utils/fn";
import { safeNum } from "@utils/num";
import { isBool } from "@t007/utils";

export class Timeline extends RangeInput<TimelineConfig> {
  public static readonly componentName: string = "timeline";
  public static readonly isControl: boolean = true;
  public timeline!: HTMLElement;
  public bufferedBar!: HTMLElement;
  public previewContainer!: HTMLElement;
  public previewImg!: HTMLElement;
  public previewCanvas!: HTMLCanvasElement;
  public thumbnailImg!: HTMLElement;
  public thumbnailCanvas!: HTMLCanvasElement;
  public previewContext: CanvasRenderingContext2D | null = null;
  public thumbnailContext: CanvasRenderingContext2D | null = null;
  protected wasPaused = false;
  protected scrubbingId = -1;
  protected get plug() {
    return this.ctlr.plug("settings.time");
  }

  constructor(ctlr: Controller, config?: Partial<TimelineConfig>) {
    super(ctlr, { label: "Media timeline", ...config, tooltip: false });
  }

  public override create() {
    // Variables Assignments
    this.element = super.create();
    this.el.dataset.controlId = this.name;
    this.timeline = createEl("div", { className: "tmg-media-timeline" });
    this.bufferedBar = createEl("div", { className: "tmg-media-range-bar tmg-media-seek-buffered-bar tmg-media-seek-bar" });
    this.previewContainer = createEl("div", { className: "tmg-media-preview-container" });
    this.previewImg = createEl("div", { className: "tmg-media-preview" });
    this.previewCanvas = createEl("canvas", { className: "tmg-media-preview" });
    this.thumbnailImg = createEl("div", { className: "tmg-media-thumbnail" });
    this.thumbnailCanvas = createEl("canvas", { className: "tmg-media-thumbnail" });
    // DOM Injection
    this.el.classList.add("tmg-media-timeline-container"), this.barsWrapper.classList.add("tmg-media-seek-bars-wrapper"), this.baseBar.classList.add("tmg-media-seek-base-bar", "tmg-media-seek-bar"), this.valueBar.classList.add("tmg-media-seek-played-bar", "tmg-media-seek-bar"), this.previewBar.classList.add("tmg-media-seek-preview-bar", "tmg-media-seek-bar"), this.thumbEl.classList.add("tmg-media-seek-thumb");
    this.previewContainer.append(this.previewImg, this.previewCanvas);
    this.barsWrapper.insertBefore(this.bufferedBar, this.previewBar);
    this.barsWrapper.replaceWith(this.timeline);
    this.timeline.append(this.barsWrapper, this.thumbEl, this.previewContainer);
    return this.el; // parent handled element assignment
  }

  public override mount(): void {
    // Variables Assignments
    this.previewContext = this.previewCanvas.getContext("2d");
    this.thumbnailContext = this.thumbnailCanvas.getContext("2d");
    // DOM Injection
    this.ctlr.DOM.controlsContainer?.prepend(this.thumbnailImg, this.thumbnailCanvas);
  }

  public override wire(): void {
    super.wire();
    // State Listeners
    this.state.on("scrubbing", this.handleScrubbing, { signal: this.signal });
    this.state.on("shouldCancelScrub", ({ value: v }) => this.ctlr.plug("settings.notifiers")?.comp("cancelscrubnotifier")?.el.classList.toggle("tmg-media-control-active", v), { signal: this.signal });
    // Config --------
    this.config.on("previewValue", this.syncPreviewTime, { signal: this.signal });
    this.config.on("previews", this.handlePreviews, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.paused", this.handlePausedState, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("state.currentTime", this.handleCurrentTime, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("intent.currentTime", this.handleCurrentTime, { signal: this.signal }); // #APPRENTICE: folklore embodiment
    this.media.on("status.loadedMetadata", this.handleLoadedMetadataStatus, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.buffered", this.handleBufferedStatus, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.duration", this.handleDurationStatus, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.error", this.handleErrorStatus, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- State ---------
    this.ctlr.state.on("dimensions.container", this.syncThumbnailSize, { init: true, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.time.format", this.syncPreviewTime, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.time.mode", this.syncPreviewTime, { signal: this.signal });
    this.ctlr.config.on("settings.css.currentThumbnailWidth", ({ value }) => (this.thumbnailCanvas.width = Number(value)), { init: true, signal: this.signal });
    this.ctlr.config.on("settings.css.currentThumbnailHeight", ({ value }) => (this.thumbnailCanvas.height = Number(value)), { init: true, signal: this.signal });
  }
  protected override seek(value: number): void {
    super.seek(value);
    this.media.intent.currentTime = safeNum((value / 100) * this.media.status.duration);
  }

  protected handlePausedState({ value }: REvent<CtlrMedia, "state.paused">): void {
    !value ? this.ctlr.RAFLoop("timelineUpdating", this.syncValue) : this.ctlr.cancelRAFLoop("timelineUpdating");
  }

  protected handleCurrentTime({ target, resolved }: REvent<CtlrMedia, "state.currentTime" | "intent.currentTime">): void {
    if (this.state.scrubbing || !resolved) return;
    if (this.media.state.paused) this.syncValue(false);
    this.el.ariaValueText = `${formatMediaTime({ time: target.value, format: "human-long" })} out of ${formatMediaTime({ time: this.media.status.duration, format: "human-long" })}`;
  }

  protected handleLoadedMetadataStatus(): void {
    this.media.pseudoElement.addEventListener("timeupdate", (e) => ((e.target as any).ontimeupdate = this.syncCanvasPreviews), { signal: this.signal, once: true }); // anonymous low cost
  }
  protected handleBufferedStatus(): void {
    const buffered = this.media.status.buffered;
    for (let i = 0; i < buffered.length; i++) if (buffered.start(buffered.length - 1 - i) < this.media.state.currentTime) return void this.syncElPos(this.bufferedBar, safeNum(buffered.end(buffered.length - 1 - i) / this.media.status.duration), true);
  }
  protected handleDurationStatus({ value }: REvent<CtlrMedia, "status.duration">): void {
    this.el.ariaValueMax = String(Math.floor(value));
  }
  protected handleErrorStatus({ value }: REvent<CtlrMedia, "status.error">): void {
    if (value) this.syncElPos(this.bufferedBar, 0, true);
  }

  public syncValue(auto = true): void {
    if (auto && !this.ctlr.state.mediaIntersecting) return;
    if (!this.state.scrubbing) this.config.value = safeNum(this.media.state.currentTime / safeNum(this.media.status.duration, 60)) * 100;
  }

  protected handleScrubbing({ value }: REvent<RangeState, "scrubbing">): void {
    if (!value) {
      this.media.intent.paused = this.wasPaused;
      cancelAnimationFrame(this.scrubbingId);
      this.media.container.classList.remove("tmg-media-scrubbing");
      this.ctlr.plug("settings.notifiers")?.comp("scrubnotifier")?.inactive();
    } else {
      this.wasPaused = this.media.state.paused;
      this.scrubbingId = requestAnimationFrame(() => {
        this.media.intent.paused = true;
        this.media.container.classList.add("tmg-media-scrubbing");
        IS_MOBILE && this.ctlr.plug("settings.notifiers")?.comp("scrubnotifier")?.active();
      }, this.signal);
    }
    this.media.container.classList.toggle("tmg-media-scrubbing", value);
    if (!value) this.stopPreview();
  }
  protected handlePreviews({ target }: REvent<TimelineConfig, "previews">): void {
    const value = target.value === true ? {} : target.value;
    if (!value || this.media.type !== "video") return void (this.media.container.dataset.previewType = "none");
    const manual = value.address && (value.spf || (value.cols && value.rows)),
      type = manual ? (value.cols && value.rows ? "sprite" : "image") : "canvas";
    this.media.container.dataset.previewType = type;
    if (type === "sprite" && value.address) this.ctlr.settings.css.currentPreviewUrl = this.ctlr.settings.css.currentThumbnailUrl = `url(${value.address})`;
    else this.ctlr.settings.css.currentPreviewPosition = this.ctlr.settings.css.currentThumbnailPosition = "center";
    if (this.media.status.loadedMetadata) return;
    this.ctlr.setCanvasFallback(this.previewCanvas, this.previewContext!), this.ctlr.setCanvasFallback(this.thumbnailCanvas, this.thumbnailContext!);
    this.media.pseudoElement.ontimeupdate = null;
  }

  public override stopScrubbing(): void {
    if (!this.state.scrubbing) return;
    if (!this.state.shouldCancelScrub) this.media.intent.currentTime = (this.config.value / 100) * this.media.status.duration;
    super.stopScrubbing();
  }
  protected stopPreview(): void {
    setTimeout(() => this.media.container.classList.remove("tmg-media-previewing"), 0, this.signal);
  }

  protected onInput(_e: MouseEvent | PointerEvent, pos: number): void {
    this.ctlr.throttle(
      `${this.config.label}Previewing`,
      () => {
        this.media.container.classList.add("tmg-media-previewing");
        this.syncElPos(this.previewContainer, !IS_MOBILE ? pos : 0.5, false, true);
        const previewConfig = this.config.previews,
          type = this.media.container.dataset.previewType;
        if (type === "sprite" && previewConfig && !isBool(previewConfig) && previewConfig.cols && previewConfig.rows) {
          const duration = this.media.status.duration,
            spf = previewConfig.spf || 1,
            frameIndex = Math.floor((pos * (duration || 0)) / spf) || 1,
            { cols, rows } = previewConfig,
            clampedI = Math.min(frameIndex, cols * rows - 1),
            xPercent = ((clampedI % cols) * 100) / (cols - 1 || 1),
            yPercent = (Math.floor(clampedI / cols) * 100) / (rows - 1 || 1);
          if (!IS_MOBILE) this.ctlr.settings.css.currentPreviewPosition = `${xPercent}% ${yPercent}%`;
          if (this.state.scrubbing) this.ctlr.settings.css.currentThumbnailPosition = `${xPercent}% ${yPercent}%`;
        } else if (type === "image" && previewConfig && !isBool(previewConfig) && previewConfig.address) {
          const duration = this.media.status.duration,
            spf = previewConfig.spf || 1,
            frameIndex = Math.floor((pos * (duration || 0)) / spf) || 1,
            url = `url(${previewConfig.address.replace("$", String(frameIndex))})`;
          if (!IS_MOBILE) this.ctlr.settings.css.currentPreviewUrl = url;
          if (this.state.scrubbing) this.ctlr.settings.css.currentThumbnailUrl = url;
        } else if (previewConfig && !this.ctlr.state.frameReadyPromise && this.media.pseudoElement) {
          const duration = this.media.status.duration;
          this.media.pseudoElement.currentTime = pos * (duration || 0);
        }
      },
      30
    );
  }

  public syncPreviewTime(): void {
    if (this.plug) this.previewContainer.dataset.previewTime = this.plug.toTimeText((this.config.previewValue / 100) * this.media.status.duration, true);
  }
  public syncCanvasPreviews(): void {
    if (!this.media.status.loadedData || this.ctlr.state.frameReadyPromise || !this.media.pseudoElement) return;
    this.ctlr.throttle(
      "canvasPreviewSync",
      () => {
        if (!this.media.pseudoElement || !this.previewContext || !this.thumbnailContext) return;
        this.previewCanvas.width = this.previewCanvas.offsetWidth || this.previewCanvas.width;
        this.previewCanvas.height = this.previewCanvas.offsetHeight || this.previewCanvas.height;
        this.previewContext.drawImage(this.media.pseudoElement as HTMLVideoElement, 0, 0, this.previewCanvas.width, this.previewCanvas.height);
        if (this.state.scrubbing) this.thumbnailContext.drawImage(this.media.pseudoElement as HTMLVideoElement, 0, 0, this.thumbnailCanvas.width, this.thumbnailCanvas.height);
      },
      33
    );
  }
  public syncThumbnailSize(): void {
    if (!this.thumbnailCanvas || !this.thumbnailImg) return;
    const { width = this.media.container.offsetWidth, height = this.media.container.offsetHeight } = getRenderedBox(this.media.element);
    (this.ctlr.settings.css.currentThumbnailHeight = height + 1 + "px"), (this.ctlr.settings.css.currentThumbnailWidth = width + 1 + "px");
  }
}

export type * from "./types";
