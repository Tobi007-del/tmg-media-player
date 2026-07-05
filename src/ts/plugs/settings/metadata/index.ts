import { BasePlug } from "../../base";
import type { MetadataConfig } from "./types";
import { METADATA_BUILD } from "./build";
import type { CtlrMedia } from "@defs/contract";
import { type REvent } from "sia-reactor";
import { silence } from "sia-reactor/modules";
import { capitalize } from "@utils/str";
import { queryPictureInPicture } from "@utils/dom";

export class MetadataPlug extends BasePlug<MetadataConfig> {
  public static readonly plugName = "metadata";
  public static readonly BUILD = METADATA_BUILD;

  public override wire(): void {
    // Ctlr Media Watchers
    this.media.watch("settings.metadata.title", this.forwardTitle, { init: this.ctlr.payload.wired && "auto", signal: this.signal });
    this.media.watch("settings.metadata.artist", this.forwardArtist, { init: this.ctlr.payload.wired && "auto", signal: this.signal });
    this.media.watch("settings.metadata.profile", this.forwardProfile, { init: this.ctlr.payload.wired && "auto", signal: this.signal });
    // --------- Listeners
    this.media.on("state.paused", ({ value }) => !value && this.syncSession(), { signal: this.signal });
    this.media.on("state.poster", this.handlePoster, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("status.loadedMetadata", this.autoGenerate, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("settings.metadata.links.title", this.handleMetadataLinksSetting, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("settings.metadata.links.artist", this.handleMetadataLinksSetting, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("settings.metadata.links.profile", this.handleMetadataLinksSetting, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("settings.metadata", () => !this.media.state.paused && this.syncSession(), { init: this.ctlr.payload.wired, signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected forwardTitle(value: string): void {
    this.settings.controlPanel.title = value;
  }
  protected forwardArtist(value: string): void {
    this.settings.controlPanel.artist = value;
  }
  protected forwardProfile(value: string): void {
    this.settings.controlPanel.profile = value;
  }

  protected handleMetadataLinksSetting({ target: { key, value } }: REvent<CtlrMedia, "settings.metadata.links.title" | "settings.metadata.links.artist" | "settings.metadata.links.profile">): void {
    const el = key !== "profile" ? (this.ctlr.DOM[`media${capitalize(key)}`] as HTMLAnchorElement) : (this.ctlr.DOM.mediaProfile as HTMLImageElement)?.parentElement;
    if (el) for (const [attr, val] of Object.entries({ href: value, "tab-index": value ? "0" : null, target: value ? "_blank" : null, rel: value ? "noopener noreferrer" : null })) val ? el.setAttribute(attr, val) : el.removeAttribute(attr);
  }

  protected handlePoster({ value }: REvent<CtlrMedia, "state.poster">): void {
    if (this.media.settings.metadata.allowOverride) this.media.settings.metadata.artwork = value ? [{ src: value }] : [];
  }

  public syncSession(): void {
    if (!navigator.mediaSession || (queryPictureInPicture() && !this.ctlr.isUIActive("pictureInPicture"))) return;
    navigator.mediaSession.metadata = new MediaMetadata(this.media.settings.metadata as MediaMetadataInit);
    const set = (...args: Parameters<typeof navigator.mediaSession.setActionHandler>) => navigator.mediaSession.setActionHandler(...args),
      [timePlug, listPlug, playlist] = [this.ctlr.plug("settings.time"), this.ctlr.plug("playlist"), this.ctlr.config.playlist.content];
    set("play", () => (this.media.intent.paused = false));
    set("pause", () => (this.media.intent.paused = true));
    set("seekbackward", timePlug ? () => timePlug.skip(-this.settings.time.skip) : null);
    set("seekforward", timePlug ? () => timePlug.skip(this.settings.time.skip) : null);
    set("previoustrack", playlist && (listPlug?.state.currIdx ?? 0) > 0 && listPlug ? listPlug.previous : null);
    set("nexttrack", playlist && (listPlug?.state.currIdx ?? 0) < (playlist.length ?? 0) - 1 && listPlug ? listPlug.next : null);
  }

  public async autoGenerate(): Promise<void> {
    const url = this.media.state.poster;
    if (!this.config.autoGenerate || (url && !url.startsWith("blob:"))) return;
    const frame = await this.ctlr.plug("settings.frame")?.extract("", this.ctlr.config.lightState.preview.time);
    silence(() => (this.media.intent.poster = frame?.url || "")), url && URL.revokeObjectURL(url);
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.metadata": typeof MetadataPlug;
  }
}

declare module "@defs/config" {
  interface CtlrConfig {
    metadata: MetadataConfig;
  }
}

export type * from "./types";
export * from "./build";
