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
    const val = this.settings.controlPanel.profile;
    if (val !== true) val ? (this.profile.src = val) : this.profile.removeAttribute("src");
  }
  public syncTitle(): void {
    if (this.settings.controlPanel.title !== true) this.title.textContent = this.settings.controlPanel.title || "";
  }
  public syncArtist(): void {
    if (this.settings.controlPanel.artist !== true) this.artist.textContent = this.settings.controlPanel.artist || "";
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
