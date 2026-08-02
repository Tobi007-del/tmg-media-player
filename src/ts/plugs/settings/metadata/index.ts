import { BasePlug } from "../../base";
import type { MetadataConfig } from "./types";
import { METADATA_BUILD } from "./build";
import type { CtlrMedia } from "@defs/contract";
import { type REvent } from "sia-reactor";
import { capitalize, isSameURL } from "@utils/str";
import { queryPictureInPicture } from "@utils/dom";

export class MetadataPlug extends BasePlug<MetadataConfig> {
  public static readonly plugName = "metadata";
  public static readonly BUILD = METADATA_BUILD;

  public override wire(): void {
    // Ctlr Media Watchers
    this.media.watch("settings.metadata.title", (v) => (this.settings.controlPanel.title = v), { init: this.ctlr.payload.wired && "auto", signal: this.signal });
    this.media.watch("settings.metadata.artist", (v) => (this.settings.controlPanel.artist = v), { init: this.ctlr.payload.wired && "auto", signal: this.signal });
    this.media.watch("settings.metadata.profile", (v) => (this.settings.controlPanel.profile = v), { init: this.ctlr.payload.wired && "auto", signal: this.signal });
    // --------- Listeners
    this.media.on("state.paused", ({ value }) => !value && this.syncSession(), { signal: this.signal });
    this.media.on("state.poster", ({ value }) => this.media.settings.metadata.allowMediaOverride && !this.media.settings.metadata.artwork.some((w) => isSameURL(w.src, value)) && (this.media.settings.metadata.artwork = value ? [{ src: value }] : []), { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("settings.metadata.links.title", this.handleMetadataLinksSetting, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("settings.metadata.links.artist", this.handleMetadataLinksSetting, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("settings.metadata.links.profile", this.handleMetadataLinksSetting, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("settings.metadata", () => !this.media.state.paused && this.syncSession(), { init: this.ctlr.payload.wired, signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected handleMetadataLinksSetting({ target: { key, value } }: REvent<CtlrMedia, "settings.metadata.links.title" | "settings.metadata.links.artist" | "settings.metadata.links.profile">): void {
    const el = key !== "profile" ? (this.ctlr.DOM[`media${capitalize(key)}`] as HTMLAnchorElement) : (this.ctlr.DOM.mediaProfile as HTMLImageElement)?.parentElement;
    if (el) for (const [attr, val] of Object.entries({ href: value, "tab-index": value ? "0" : null, target: value ? "_blank" : null, rel: value ? "noopener noreferrer" : null })) val ? el.setAttribute(attr, val) : el.removeAttribute(attr);
  }

  public syncSession(): void {
    if (!navigator.mediaSession || (queryPictureInPicture() && !this.ctlr.isUIActive("pictureInPicture"))) return;
    navigator.mediaSession.metadata = new MediaMetadata(this.media.settings.metadata as MediaMetadataInit);
    const set = (...args: Parameters<typeof navigator.mediaSession.setActionHandler>) => navigator.mediaSession.setActionHandler(...args),
      [timePlug, listPlug, content] = [this.ctlr.plug("settings.time"), this.ctlr.plug("playlist"), this.ctlr.config.playlist.content];
    set("play", () => (this.media.intent.paused = false));
    set("pause", () => (this.media.intent.paused = true));
    set("seekbackward", timePlug ? () => timePlug.skip(-this.settings.time.skip) : null);
    set("seekforward", timePlug ? () => timePlug.skip(this.settings.time.skip) : null);
    set("previoustrack", content && (listPlug?.state.currentIndex ?? 0) > 0 && listPlug ? listPlug.previous : null);
    set("nexttrack", content && (listPlug?.state.currentIndex ?? 0) < (content?.length ?? 0) - 1 && listPlug ? listPlug.next : null);
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
