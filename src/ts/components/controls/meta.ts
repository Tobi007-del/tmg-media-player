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
    this.ctlr.DOM.metaProfile = this.profile = this.ctlr.syncImgLoadState(createEl("img", { alt: "Profile", className: "tmg-media-profile" }));
    this.ctlr.DOM.metaTitle = this.title = createEl("a", { className: "tmg-media-title tmg-media-meta-text" });
    this.ctlr.DOM.metaArtist = this.artist = createEl("a", { className: "tmg-media-artist tmg-media-meta-text" });
    // DOM Injection
    profileLink.append(this.profile), titleWrapper.append(this.title), artistWrapper.append(this.artist), textsCover.append(titleWrapper, artistWrapper);
    return this.el.append(profileLink, textsCover), this.element;
  }

  public override wire(): void {
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
    const profile = this.settings.controlPanel.profile;
    if (profile !== true) this.profile.dataset.metaProfile = this.profile.src = profile || "";
  }
  public syncTitle(): void {
    const title = this.settings.controlPanel.title;
    if (title !== true) this.title.dataset.metaTitle = this.title.textContent = title || "";
  }
  public syncArtist(): void {
    const artist = this.settings.controlPanel.artist;
    if (artist !== true) this.artist.dataset.metaArtist = this.artist.textContent = artist || "";
  }

  protected override onDestroy(): void {
    for (const el of this.scrollers) removeScrollAssist(el);
    super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    meta: typeof Meta;
  }
  interface ControllerDOMMap {
    metaProfile?: HTMLImageElement | null;
    metaTitle?: HTMLAnchorElement | null;
    metaArtist?: HTMLAnchorElement | null;
  }
}
