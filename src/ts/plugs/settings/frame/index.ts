import { BasePlug } from "../../base";
import type { FrameConfig } from "./types";
import { FRAME_BUILD } from "./build";
import { getDominantColor, getRGBBri, getRGBSat } from "@utils/color";
import { createEl } from "@utils/dom";
import { clamp, safeNum } from "@utils/num";
import { parseCSSTime } from "@utils/str";
import { formatMediaTime } from "@utils/time";
import { silence } from "sia-reactor/modules";
import { getMediaMin, getMediaMax } from "@utils/time";

export class FramePlug extends BasePlug<FrameConfig> {
  public static readonly plugName = "frame";
  public static readonly BUILD = FRAME_BUILD;
  public exportCanvas: HTMLCanvasElement = createEl("canvas");
  public exportContext: CanvasRenderingContext2D = this.exportCanvas.getContext("2d", { alpha: false })!;

  public override wire(): void {
    // Ctlr Media Watchers
    this.media.watch("tech", () => (this.media.features.frameCapture ||= this.ctlr.isNativeEl && this.media.type === "video" && !this.config.disabled), { init: true, signal: this.signal });
    // ---- Config Listeners
    this.ctlr.config.on("settings.frame.disabled", ({ value }) => (this.media.features.frameCapture = !value), { init: true, signal: this.signal });
    // Post Wiring
    this.ctlr.addAction("capture", { fn: () => this.capture(""), keyboard: { phase: "keyup" } }, this.signal);
    this.ctlr.addAction("timeStepFwd", { fn: () => this.moveFrame("forwards"), keyboard: { phase: "keydown" } }, this.signal);
    this.ctlr.addAction("timeStepBwd", { fn: () => this.moveFrame("backwards"), keyboard: { phase: "keydown" } }, this.signal);
    super.wire();
  }

  public async extract(display: "" | "monochrome", time?: number, raw?: false, min?: number, video?: HTMLVideoElement): Promise<{ blob: Blob | null; url: string }>;
  public async extract(display: "" | "monochrome", time?: number, raw?: true, min?: number, video?: HTMLVideoElement): Promise<{ canvas: HTMLCanvasElement; context: CanvasRenderingContext2D }>;
  public async extract(display: string = "", time = safeNum(this.media.state.currentTime), raw = false, min = 0, video = this.media.pseudoElement as HTMLVideoElement): Promise<any> {
    if (!this.media.features.frameCapture) return raw ? { canvas: this.exportCanvas, context: this.exportContext } : { blob: null, url: "" };
    if (video !== this.media.element) {
      if (this.ctlr.state.frameReadyPromise) await this.ctlr.state.frameReadyPromise; // wait for it to get set by last getter 5 lines below
      if (Math.abs(video.currentTime - time) > 0.01 || !video.readyState) {
        this.ctlr.state.frameReadyPromise ??= new Promise<null>((res) => video.addEventListener(video.readyState ? "timeupdate" : "loadeddata", () => res(null), { once: true, signal: this.signal })); // me sef no small, been burned before this
        video.currentTime = time; // small epsilon tolerance for video time comparison - 0.01(10ms)
      }
      this.ctlr.state.frameReadyPromise = await this.ctlr.state.frameReadyPromise;
    }
    (this.exportCanvas.width = video.videoWidth || min), (this.exportCanvas.height = video.videoHeight || min);
    this.exportContext.filter = `${this.settings.css.filter as string}${display === "monochrome" ? " grayscale(100%)" : ""}`;
    this.exportContext.drawImage(video, 0, 0, this.exportCanvas.width, this.exportCanvas.height);
    this.exportContext.filter = "none";
    if (raw === true) return { canvas: this.exportCanvas, context: this.exportContext };
    let blob: Blob | null | false | 0 = null;
    try {
      blob = (this.exportCanvas.width || this.exportCanvas.height) && (await new Promise<Blob | null>((res) => this.exportCanvas.toBlob(res)));
    } catch (e) {
      this.ctlr.log(e, "error", true);
    }
    return { blob: blob || null, url: blob ? URL.createObjectURL(blob) : "" };
  }

  public async capture(display: "" | "monochrome" = "", time = safeNum(this.media.state.currentTime)): Promise<void> {
    if (!this.media.features.frameCapture) return;
    this.ctlr.plug("settings.notifiers")?.notify("capture"); // #STALLING: necessary optimistic distraction
    const toast = this.ctlr.plug("settings.toasts")?.toast,
      tTxt = formatMediaTime({ time, format: "human", showMs: true }),
      fTxt = `video frame ${display === "monochrome" ? "in b&w " : ""}at ${tTxt}`,
      toastId = toast?.loading(`Capturing ${fTxt}...`, { delay: parseCSSTime(this.settings.css.notifiersAnimationTime), image: window.TMG_MEDIA_ALT_IMG_SRC, tag: `tmg-${this.media.settings.metadata.title ?? "Video"}fcpa${tTxt}${display}` }) as string,
      frame = await this.extract(display, time, false, 0, this.media.element as HTMLVideoElement),
      filename = `${this.media.settings.metadata.title ?? "Video"}_${display === "monochrome" ? `black&white_` : ""}at_${tTxt}.png`.replace(/[\/:*?"<>|\s]+/g, "_"); // system filename safe
    const Save = () => {
      toast?.loading(toastId, { render: `Saving ${fTxt}`, actions: {} });
      createEl("a", { href: frame.url as string, download: filename })?.click?.();
      toast?.success(toastId, { delay: 1000, render: `Saved ${fTxt}`, actions: {} });
    };
    const Share = () => {
      toast?.loading(toastId, { render: `Sharing ${fTxt}`, actions: {} });
      navigator.share?.({ title: this.media.settings.metadata.title ?? "Video", text: `Captured ${fTxt}`, files: [new File([frame.blob!], filename, { type: frame.blob!.type })] }).then(
        () => toast?.success(toastId, { render: `Shared ${fTxt}`, actions: {} }),
        () => toast?.error(toastId, { render: `Failed sharing ${fTxt}`, actions: { Save } })
      ) || toast?.warn(toastId, { delay: 1000, render: `Couldn't share ${fTxt}`, actions: { Save } });
    };
    frame?.url ? toast?.success(toastId, { render: `Captured ${fTxt}`, image: frame.url, autoClose: this.config.captureAutoClose, actions: { Save, Share }, onClose: () => URL.revokeObjectURL(frame.url) }) : toast?.error(toastId, { render: `Failed capturing ${fTxt}` });
  }

  public async findGoodTime({ time: t = safeNum(this.media.state.currentTime), secondsLimit: s = 25, saturation: sat = 12, brightness: bri = 40 } = {}): Promise<number | null> {
    const end = clamp(getMediaMin(this.media), t + s, getMediaMax(this.media)),
      seq = ++this.findSeq;
    for (; t <= end; t += 0.333) {
      if (seq !== this.findSeq) return null;
      const rgb = await getDominantColor((await this.extract("", t, true, 1)).canvas, "rgb", true);
      if (rgb && getRGBBri(rgb) > bri && getRGBSat(rgb) > sat) return t; // <= FIRST legit content frame
    }
    return null;
  }
  private findSeq = 0;

  public async getMainColor(time?: number, poster = (this.media.element as HTMLVideoElement).poster, config = {}): Promise<string | null> {
    return getDominantColor(poster ? poster : (await this.extract("", time ? time : (await this.findGoodTime(config)) ?? undefined, true, 1)).canvas);
  }

  public moveFrame(dir: "forwards" | "backwards" = "forwards"): void {
    this.media.state.paused && this.ctlr.throttle("frameStepping", () => silence(() => (this.media.intent.currentTime = clamp(getMediaMin(this.media), Math.round(this.media.state.currentTime * this.config.fps) + (dir === "backwards" ? -1 : 1), Math.floor(getMediaMax(this.media) * this.config.fps)) / this.config.fps)), Math.round(1000 / this.config.fps));
  }
} // Video only

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.frame": typeof FramePlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    frame: FrameConfig;
  }
}

declare module "@defs/contract" {
  interface MediaExtraFeatures {
    frameCapture: boolean;
  }
}
