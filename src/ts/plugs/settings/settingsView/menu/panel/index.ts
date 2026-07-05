import { createEl } from "@utils/dom";
import { Controllable } from "@core/controllable";
import type { Controller } from "@core/controller";

export type PanelDir = "forward" | "backward" | "none";

export abstract class BaseMenuPanel extends Controllable {
  public readonly element: HTMLElement;
  protected readonly content: HTMLElement;

  constructor(ctlr: Controller, config: any, className: string) {
    super(ctlr, config);
    this.element = createEl("div", { className: `tmg-media-smenu-panel ${className}` });
    this.element.append((this.content = createEl("div", { className: "tmg-media-smenu-panel-content" })));
  }

  public enter(dir: PanelDir = "forward"): void {
    this.element.classList.remove("tmg-media-smenu-panel-exit", "tmg-media-smenu-panel-active");
    (this.element.dataset.dir = dir), this.element.style.removeProperty("display"), this.element.removeAttribute("inert");
    void this.element.offsetWidth, this.element.classList.add("tmg-media-smenu-panel-active");
  }
  public exit(dir: PanelDir = "backward"): void {
    (this.element.dataset.dir = dir), this.element.setAttribute("inert", "");
    this.element.classList.remove("tmg-media-smenu-panel-active", "tmg-media-smenu-panel-exit");
    this.element.style.display = "none";
  }

  public get isActive(): boolean {
    return this.element.classList.contains("tmg-media-smenu-panel-active");
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
