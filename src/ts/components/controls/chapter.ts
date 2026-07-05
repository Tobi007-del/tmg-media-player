import { silence } from "sia-reactor/modules";
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
    this.media.on("features.currentChapter", this.gate, { init: this.ctlr.payload.wired, signal: this.signal });
    // Event Listeners
    this.el.addEventListener("click", this.handleClick, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.currentChapter", this.syncUI, { init: this.ctlr.payload.wired, signal: this.signal });
    this.media.on("settings.metadata.chapterInfo", this.syncUI, { init: this.ctlr.payload.wired, signal: this.signal });
    // Post Wiring
    this.syncARIA();
  }

  protected async handleClick(): Promise<void> {
    const view = this.ctlr.plug("settings.settingsView");
    if (view) {
      view.menu.open(this.el);
      view.menu.goTo("chapters");
    }
  }

  protected syncUI(): void {
    const idx = this.media.state.currentChapter,
      chapters = this.media.settings.metadata.chapterInfo;
    if (idx === -1 || !chapters || !chapters[idx]) return void ((this.textEl.textContent = ""), this.hide());
    (this.textEl.textContent = chapters[idx].title || `Chapter ${idx + 1}`), this.show();
  }

  protected syncARIA(): void {
    this.el.title = this.state.label = "View Chapter";
    this.setBtnARIA();
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    chapter: typeof ChapterButton;
  }
}
