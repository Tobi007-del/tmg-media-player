import { setTimeout, getActiveEl } from "@t007/utils";
import { createEl } from "@utils/dom";
import { Controllable } from "@core/controllable";
import type { Controller } from "@core/controller";
import { MENU_FOCUS_SELECTOR } from "../../build";

export type PanelDir = "forward" | "backward" | "none";

export abstract class BaseMenuPanel extends Controllable {
  public readonly element: HTMLElement;
  protected readonly content: HTMLElement;
  protected savedScroll = 0;
  protected lastFocused: HTMLElement | null = null;

  constructor(ctlr: Controller, config: any, className: string) {
    super(ctlr, config);
    this.element = createEl("div", { className: `tmg-media-smenu-panel tmg-media-cover tmg-media-no-pointer ${className}` });
    this.element.append((this.content = createEl("div", { className: "tmg-media-smenu-panel-content" })));
    this.content.addEventListener("scroll", () => this.isActive && (this.savedScroll = this.content.scrollTop), { passive: true, signal: this.signal });
  }

  public enter(dir: PanelDir = "forward", restore = false): void {
    !restore && ((this.lastFocused = null), (this.savedScroll = 0));
    this.element.classList.remove("tmg-media-smenu-panel-exit", "tmg-media-smenu-panel-active");
    (this.element.dataset.dir = dir), this.element.style.removeProperty("display"), this.element.removeAttribute("inert");
    void this.element.offsetWidth, this.element.classList.add("tmg-media-smenu-panel-active");
    restore && setTimeout(() => this.isActive && (this.lastFocused?.focus({ preventScroll: true }), (this.content.scrollTop = this.savedScroll)), 50, this.signal);
  }
  public exit(dir: PanelDir = "backward"): void {
    const active = getActiveEl(this.element.ownerDocument) as HTMLElement;
    this.lastFocused = this.element.contains(active) ? active : this.lastFocused;
    (this.element.dataset.dir = dir), this.element.setAttribute("inert", "");
    this.element.classList.remove("tmg-media-smenu-panel-active", "tmg-media-smenu-panel-exit");
    this.element.style.display = "none";
  }

  public get isActive(): boolean {
    return this.element.classList.contains("tmg-media-smenu-panel-active");
  }

  protected focusFirst(selector = MENU_FOCUS_SELECTOR): void {
    setTimeout(
      () => {
        if (!this.isActive) return;
        const active = this.element.querySelector<HTMLElement>(".tmg-media-smenu-option-active");
        (active || this.element.querySelector<HTMLElement>(selector))?.focus({ preventScroll: true }), !active && (this.content.scrollTop = 0);
      },
      50,
      this.signal
    );
  }

  public get contentHeight(): number {
    // prettier-ignore
    return Array.prototype.reduce.call(this.element.children, ((acc: number, el: HTMLElement) => {
      const oldHeight = el.style.height;
      el.style.height = "auto";
      const h = el.scrollHeight;
      return (oldHeight ? (el.style.height = oldHeight) : el.style.removeProperty("height"), acc + h);
    }) as any, 0) as number;
  }
}
