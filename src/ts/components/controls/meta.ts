import { BaseComponent } from "../base";
import type { ComponentState } from "../base";
import { createEl } from "@utils/dom";
import { initScrollAssist, removeScrollAssist } from "@t007/utils/hooks/vanilla";

export type MetaConfig = undefined;

export class Meta extends BaseComponent<MetaConfig, ComponentState, HTMLDivElement> {
  public static readonly componentName: string = "meta";
  public static readonly isControl: boolean = true;
  public profile!: HTMLImageElement;
  public title!: HTMLAnchorElement;
  public artist!: HTMLAnchorElement;
  protected scrollers: HTMLElement[] = [];

  public override create(): HTMLDivElement {
    // Variables Assignment
    this.element = createEl("div", { className: "tmg-media-meta-wrapper" }, { draggableControl: "", dragId: "wrapper", controlId: this.name });
    const textsCover = createEl("div", { className: "tmg-media-meta-text-wrapper-cover" }),
      profileLink = createEl("a", { className: "tmg-media-profile-link" }),
      titleWrapper = createEl("div", { className: "tmg-media-title-wrapper" }),
      artistWrapper = createEl("div", { className: "tmg-media-artist-wrapper" });
    this.ctlr.DOM.mediaProfile = this.profile = createEl("img", { alt: "Profile", className: "tmg-media-profile" });
    this.ctlr.DOM.mediaTitle = this.title = createEl("a", { className: "tmg-media-title" });
    this.ctlr.DOM.mediaArtist = this.artist = createEl("a", { className: "tmg-media-artist" });
    // DOM Injection
    this.ctlr.setImgLoadState({ target: this.profile });
    profileLink.append(this.profile), titleWrapper.append(this.title), artistWrapper.append(this.artist), textsCover.append(titleWrapper, artistWrapper);
    return this.el.append(profileLink, textsCover), this.element;
  }

  public override wire(): void {
    // Event Listeners
    this.profile.addEventListener("load", this.ctlr.setImgLoadState, { signal: this.signal });
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.controlPanel.profile", this.syncProfile, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.controlPanel.title", this.syncTitle, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.controlPanel.artist", this.syncArtist, { init: true, signal: this.signal });
    // Post Wiring
    this.scrollers.push((initScrollAssist(this.title, { pxPerSecond: 60 }), this.title));
    this.scrollers.push((initScrollAssist(this.artist, { pxPerSecond: 30 }), this.artist));
  }

  public syncUI(): void {
    this.syncProfile(), this.syncTitle(), this.syncArtist();
  }
  public syncProfile(): void {
    const profile = this.ctlr.settings.controlPanel.profile;
    if (profile !== true) this.profile.dataset.mediaProfile = this.profile.src = profile || "";
  }
  public syncTitle(): void {
    const title = this.ctlr.settings.controlPanel.title;
    if (title !== true) this.title.dataset.mediaTitle = this.title.textContent = title || "";
  }
  public syncArtist(): void {
    const artist = this.ctlr.settings.controlPanel.artist;
    if (artist !== true) this.artist.dataset.mediaArtist = this.artist.textContent = artist || "";
  }

  protected override onDestroy(): void {
    this.scrollers.forEach(removeScrollAssist), super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface ControllerDOMMap {
    mediaProfile?: HTMLImageElement;
    mediaTitle?: HTMLAnchorElement;
    mediaArtist?: HTMLAnchorElement;
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    meta: typeof Meta;
  }
}
