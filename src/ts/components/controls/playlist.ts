import { BaseComponent, ComponentState } from "../base";
import { IconRegistry } from "@core/registries";
import { createEl } from "@utils/dom";

export type PlaylistConfig = undefined;

export class PlaylistButton extends BaseComponent<PlaylistConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName = "playlist";
  public static readonly isControl: boolean = true;

  public override create() {
    this.element = createEl("button", { className: "tmg-media-playlist-btn tmg-media-show-in-micro", type: "button", innerHTML: IconRegistry.get("playlist") || "" }, { draggableControl: "", controlId: this.name });
    return this.hide(), this.element;
  }

  public override wire(): void {
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.currentItem", this.syncUI, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("playlist.content", this.syncUI, { init: true, signal: this.signal, depth: 1 });
    // Post Wiring
    this.syncARIA();
  }

  protected handleClick(): void {
    const menu = this.ctlr.plug("settings.panel")?.menu;
    if (menu) menu.isOpen && menu.anchor === this.el ? menu.close() : (menu.open(this.el), menu.goTo("playlist"));
  }

  protected syncUI(): void {
    this[this.ctlr.config.playlist.content ? "show" : "hide"]();
    this.setBadge(`${this.media.state.currentItem + 1}/${this.ctlr.config.playlist.content?.length ?? 1}`);
  }

  public syncARIA(): void {
    this.el.title = this.state.label = "Playlist";
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    playlist: typeof PlaylistButton;
  }
}
