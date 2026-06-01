import { BasePlug } from "../../base";
import type { Media } from "./types";
import { MEDIA_BUILD } from "./build";
import type { CtlrConfig } from "@defs/config";
import { type REvent } from "sia-reactor";
import { capitalize } from "@utils/str";

export class MediaPlug extends BasePlug<Media> {
  public static readonly plugName = "media";
  public static readonly isMain: boolean = true;
  public static readonly BUILD = MEDIA_BUILD;

  public override wire(): void {
    // Ctlr Config Watchers
    this.ctlr.config.watch("media.title", this.forwardTitle, { init: "auto", signal: this.signal });
    this.ctlr.config.watch("media.artist", this.forwardArtist, { init: "auto", signal: this.signal });
    this.ctlr.config.watch("media.profile", this.forwardProfile, { init: "auto", signal: this.signal });
    // ---- Media Listeners
    this.media.on("state.paused", ({ value }) => !value && this.syncSession(), { signal: this.signal });
    this.media.on("status.loadedMetadata", this.autoGenerate, { init: this.ctlr.payload.wired, signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("media.links.title", this.handleLink, { init: true, signal: this.signal });
    this.ctlr.config.on("media.links.artist", this.handleLink, { init: true, signal: this.signal });
    this.ctlr.config.on("media.links.profile", this.handleLink, { init: true, signal: this.signal });
    this.ctlr.config.on("media.artwork", this.handleArtwork, { init: true, signal: this.signal });
    this.ctlr.config.on("media", this.handle, { init: true, signal: this.signal });
  }

  protected forwardTitle(value: string): void {
    this.ctlr.settings.controlPanel.title = value;
  }
  protected forwardArtist(value: string): void {
    this.ctlr.settings.controlPanel.artist = value;
  }
  protected forwardProfile(value: string): void {
    this.ctlr.settings.controlPanel.profile = value;
  }

  protected handleLink({ target: { key, value } }: REvent<CtlrConfig, "media.links.title" | "media.links.artist" | "media.links.profile">): void {
    const el = key !== "profile" ? (this.ctlr.DOM[`media${capitalize(key)}`] as HTMLAnchorElement) : (this.ctlr.DOM.mediaProfile as HTMLImageElement)?.parentElement;
    el && Object.entries({ href: value, "tab-index": value ? "0" : null, target: value ? "_blank" : null, rel: value ? "noopener noreferrer" : null }).forEach(([attr, val]) => (val ? el.setAttribute(attr, val) : el.removeAttribute(attr)));
  }

  protected handleArtwork({ currentTarget: { value } }: REvent<CtlrConfig, "media.artwork">): void {
    this.media.intent.poster = value?.[0]?.src || "";
    this.ctlr.settings.css.currentPosterUrl = `url(${this.media.intent.poster})`;
  }

  protected handle(): void {
    if (!this.media.state.paused) this.syncSession();
  }

  public syncSession(): void {
    if (!navigator.mediaSession || (document.pictureInPictureElement && !this.ctlr.isUIActive("pictureInPicture"))) return;
    if (this.config) navigator.mediaSession.metadata = new MediaMetadata(this.config as MediaMetadataInit);
    const set = (...args: Parameters<typeof navigator.mediaSession.setActionHandler>) => navigator.mediaSession.setActionHandler(...args);
    set("play", () => (this.media.intent.paused = false));
    set("pause", () => (this.media.intent.paused = true));
    const timePlug = this.ctlr.plug("settings.time");
    set("seekbackward", timePlug ? () => timePlug.skip(-this.ctlr.settings.time.skip) : null);
    set("seekforward", timePlug ? () => timePlug.skip(this.ctlr.settings.time.skip) : null);
    const playlistPlug = this.ctlr.plug("playlist"),
      playlist = this.ctlr.config.playlist,
      currentIndex = this.ctlr.plug("playlist")?.state.currentIndex ?? 0;
    set("previoustrack", playlist && currentIndex > 0 && playlistPlug ? playlistPlug.previous : null);
    set("nexttrack", playlist && currentIndex < (playlist?.length ?? 0) - 1 && playlistPlug ? playlistPlug.next : null);
  }

  public async autoGenerate(): Promise<void> {
    const url = this.config.artwork?.[0]?.src;
    if (!this.config.autoGenerate || (url && !url.startsWith("blob:"))) return;
    this.config.artwork = [{ src: "" }];
    this.config.artwork = [{ src: (await this.ctlr.plug("settings.frame")?.extract("", this.ctlr.config.lightState.preview.time))?.url || "" }];
    url && URL.revokeObjectURL(url);
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    media: typeof MediaPlug;
  }
}

declare module "@defs/config" {
  interface CtlrConfig {
    media: Media;
  }
}

export type * from "./types";
export * from "./build";
