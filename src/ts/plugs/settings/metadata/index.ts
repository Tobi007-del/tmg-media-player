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
    this.media.watch("settings.metadata.title", (v) => (this.settings.controlPanel.title = v), { init: this.ctlr.flags.wired && "auto", signal: this.signal });
    this.media.watch("settings.metadata.artist", (v) => (this.settings.controlPanel.artist = v), { init: this.ctlr.flags.wired && "auto", signal: this.signal });
    this.media.watch("settings.metadata.profile", (v) => (this.settings.controlPanel.profile = v), { init: this.ctlr.flags.wired && "auto", signal: this.signal });
    // --------- Listeners
    this.media.on("state.paused", ({ value }) => !value && this.syncSession(), { signal: this.signal });
    this.media.on("state.poster", ({ value }) => this.media.settings.metadata.allowMediaOverride && !this.media.settings.metadata.artwork.some((w) => isSameURL(w.src, value)) && (this.media.settings.metadata.artwork = value ? [{ src: value }] : []), { init: this.ctlr.flags.wired, signal: this.signal });
    this.media.on("settings.metadata.links.title", this.handleMetadataLinksSetting, { init: this.ctlr.flags.wired, signal: this.signal });
    this.media.on("settings.metadata.links.artist", this.handleMetadataLinksSetting, { init: this.ctlr.flags.wired, signal: this.signal });
    this.media.on("settings.metadata.links.profile", this.handleMetadataLinksSetting, { init: this.ctlr.flags.wired, signal: this.signal });
    this.media.on("settings.metadata", () => !this.media.state.paused && this.syncSession(), { init: this.ctlr.flags.wired, signal: this.signal });
    // Post Wiring
    super.wire();
  }

  protected handleMetadataLinksSetting({ target: { key, value } }: REvent<CtlrMedia, "settings.metadata.links.title" | "settings.metadata.links.artist" | "settings.metadata.links.profile">): void {
    const el = key !== "profile" ? (this.ctlr.DOM[`meta${capitalize(key)}`] as HTMLAnchorElement) : (this.ctlr.DOM.metaProfile as HTMLImageElement)?.parentElement;
    if (el) for (const [attr, val] of Object.entries({ href: value, "tab-index": value ? "0" : null, target: value ? "_blank" : null, rel: value ? "noopener noreferrer" : null })) val ? el.setAttribute(attr, val) : el.removeAttribute(attr);
  }

  public syncSession(): void {
    if (!navigator.mediaSession || (queryPictureInPicture() && !this.media.state.pictureInPicture)) return;
    navigator.mediaSession.metadata = new MediaMetadata(this.media.settings.metadata as MediaMetadataInit);
    const set = (...args: Parameters<typeof navigator.mediaSession.setActionHandler>) => navigator.mediaSession.setActionHandler(...args);
    set("play", () => this.ctlr.perform("playPause")), set("pause", () => this.ctlr.perform("playPause"));
    set("seekto", (d) => (this.media.intent.currentTime = d.seekTime ?? 0));
    set("seekbackward", (d) => this.ctlr.perform("timeSkipBwd", undefined, undefined, d.seekOffset));
    set("seekforward", (d) => this.ctlr.perform("timeSkipFwd", undefined, undefined, d.seekOffset));
    set("previoustrack", this.media.features.previousItem ? () => this.ctlr.perform("previous") : null);
    set("nexttrack", this.media.features.nextItem ? () => this.ctlr.perform("next") : null);
    set("skipad", this.media.features.adSkip ? () => this.ctlr.perform("adSkip") : null);
    set("enterpictureinpicture" as any, this.media.features.pictureInPicture ? () => (this.media.intent.pictureInPicture = true) : null);
    set("togglemicrophone" as any, this.media.features.voice ? () => (this.settings.voice.active.value = !this.settings.voice.active.value) : null);
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
