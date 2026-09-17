import { BaseComponent, ComponentState } from "../base";
import { createEl } from "@utils/dom";
// import { IconRegistry } from "@core/registries";

export type ChapterConfig = undefined;

export class ChapterButton extends BaseComponent<ChapterConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName = "chapter";
  public static readonly isControl: boolean = true;
  public textEl!: HTMLSpanElement;
  public iconEl!: HTMLSpanElement;

  public override create() {
    this.element = createEl("button", { className: "tmg-media-chapter-btn tmg-media-control-text-btn", type: "button" }, { draggableControl: "", controlId: this.name });
    this.iconEl = createEl("span", { className: "tmg-media-chapter-icon" }); // innerHTML: IconRegistry.get("chevronright") || ">"
    this.textEl = createEl("span", { className: "tmg-media-chapter-text" });
    return this.element.append(this.textEl, this.iconEl), this.el;
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.currentChapter", this.gate, { init: this.ctlr.flags.wired, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.currentChapter", this.syncUI, { init: this.ctlr.flags.wired, signal: this.signal });
    this.media.on("settings.metadata.chapterInfo", this.syncUI, { init: this.ctlr.flags.wired, signal: this.signal });
    // Post Wiring
    this.syncARIA();
  }

  protected async handleClick(): Promise<void> {
    const view = this.ctlr.plug("settings.settingsView");
    if (view) view.menu.open(this.el), view.menu.goTo("chapters");
  }

  protected syncUI(): void {
    const chapter = this.media.settings.metadata.chapterInfo[this.media.state.currentChapter];
    this.textEl.textContent = !chapter ? "" : chapter.title || `Chapter ${this.media.state.currentChapter + 1}`;
    this[chapter ? "show" : "hide"]();
  }

  protected syncARIA(): void {
    this.el.title = this.state.label = "View Chapters";
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    chapter: typeof ChapterButton;
  }
}
