import { BasePin } from "../../base";
import { CONTROL_PANEL_DRAGGABLE_BUILD } from "./build";
import { ControlPanelPlug } from "./index";
import { getPath, setPath } from "sia-reactor/utils";
import { getElSiblingAt } from "@utils/dom";
import { setTimeout, requestAnimationFrame } from "@utils/fn";
import { inBoolArrOpt } from "@utils/obj";
import type { ControlPanelDraggable, PanelShell, PanelSlot, AnyControl, ControlPanelShells } from "./types";
import { Paths } from "sia-reactor";

export class ControlPanelDraggablePin extends BasePin<ControlPanelPlug, ControlPanelDraggable> {
  public static readonly pinName = "draggable";
  public static get Plug() {
    return ControlPanelPlug;
  }
  public static readonly BUILD = CONTROL_PANEL_DRAGGABLE_BUILD;
  protected draggingEl: HTMLElement | null = null;
  protected replaced: { target: HTMLElement; child: HTMLElement } | null = null;
  protected safeTimeoutId = -1;

  public override wire(): void {
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.controlPanel.draggable", ({ value }) => this.setDragEventListeners(value ? "add" : "remove"), { init: true, signal: this.signal });
  }

  public setDragEventListeners(action: "add" | "remove"): void {
    this.ctlr.queryDOM("[data-draggable-control]", true).forEach((c) => {
      c.dataset.dragId = c.dataset.dragId ?? "";
      const act = !inBoolArrOpt(this.config, c.dataset.dragId) ? "remove" : action;
      c.dataset.draggableControl = String((c.draggable = act === "add"));
      c[`${act as "add"}EventListener`]("dragstart", this.handleDragStart, { signal: this.signal });
      c[`${act as "add"}EventListener`]("drag", this.handleDrag, { signal: this.signal });
      c[`${act as "add"}EventListener`]("dragend", this.handleDragEnd, { signal: this.signal });
    });
    [...this.ctlr.queryDOM("[data-drop-zone][data-drag-id]", true), ...this.plug.zoneEls].forEach((c) => {
      c.dataset.dragId = c.dataset.dragId ?? "";
      const act = !inBoolArrOpt(this.config, c.dataset.dragId) ? "remove" : action;
      c.dataset.dropZone = String(act === "add");
      c[`${act as "add"}EventListener`]("dragenter", this.handleDragEnter, { signal: this.signal });
      c[`${act as "add"}EventListener`]("dragover", this.handleDragOver, { signal: this.signal });
      c[`${act as "add"}EventListener`]("drop", this.handleDragLeave, { signal: this.signal });
      c[`${act as "add"}EventListener`]("dragleave", this.handleDragLeave, { signal: this.signal });
    });
  }

  protected handleDragStart(e: DragEvent): void {
    const { target: t, dataTransfer } = e as DragEvent & { target: HTMLElement };
    if (t.dataset.draggableControl !== "true" || !t?.tagName) return;
    if (t.matches(":has(:is(input,[role='slider']):is(:hover, :active))")) return e.preventDefault();
    dataTransfer!.effectAllowed = "move";
    this.draggingEl = t;
    requestAnimationFrame(() => t.classList.add("tmg-media-control-dragging"), this.signal);
    this.safeTimeoutId = setTimeout(() => t.classList.remove("tmg-media-control-dragging"), 1000, this.signal); // for mobile browsers supporting the API but not living up
    if (t.dataset.dragId !== "wrapper" || t.parentElement?.dataset.dragId !== "wrapper") return;
    const { path, shell } = this.getShellPath(t, true);
    setPath(this.plug.slots, path, shell);
    this.replaced = { target: t.parentElement!, child: shell.cover };
  }

  protected handleDrag(): void {
    this.ctlr.plug("settings.overlay")?.delay();
    clearTimeout(this.safeTimeoutId);
  }

  protected handleDragEnd(e: DragEvent): void {
    const t = e.target as HTMLElement;
    t.classList.remove("tmg-media-control-dragging");
    this.replaced = this.draggingEl = null;
    if (t.dataset.dragId === "wrapper" && t.parentElement?.dataset.dragId === "wrapper") setPath(this.plug.slots, this.getShellPath(t), t);
    this.syncConfig();
  }

  protected handleDragEnter(e: DragEvent): void {
    !this.noDropOff(e.target as HTMLElement) && this.draggingEl && (e.target as HTMLElement).classList.add("tmg-media-dragover");
  }

  protected handleDragOver(e: DragEvent): void {
    const { target: t, clientX: x, dataTransfer } = e as DragEvent & { target: HTMLElement };
    if (this.noDropOff(t)) return;
    e.preventDefault();
    if (dataTransfer) dataTransfer.dropEffect = "move";
    this.ctlr.throttle(
      "dragOver",
      () => {
        if (t.dataset.dragId === "wrapper") {
          const atWrapper = getElSiblingAt(x, "x", t.querySelectorAll<HTMLElement>('.tmg-media-side-controls-wrapper-cover:has([data-drop-zone="true"][data-drag-id=""]:empty)'), "at") as HTMLElement | undefined;
          if (!atWrapper) return;
          this.replaced?.target.replaceChild(this.replaced.child, this.draggingEl!);
          this.replaced = { target: t, child: atWrapper };
          return t.replaceChild(this.draggingEl!, atWrapper);
        }
        const afterControl = getElSiblingAt(x, "x", t.querySelectorAll<HTMLElement>("[draggable=true]:not(.tmg-media-control-dragging)"));
        afterControl ? t.insertBefore(this.draggingEl!, afterControl) : t.append(this.draggingEl!);
        !t.dataset.dragId && this.plug.zoneEls.forEach(this.plug.handleCtrlsView);
      },
      500,
      false
    );
  }

  protected handleDragLeave(e: DragEvent): void {
    !this.noDropOff(e.target as HTMLElement) && (e.target as HTMLElement).classList.remove("tmg-media-dragover");
  }

  protected noDropOff(t: HTMLElement, drop = this.draggingEl): boolean {
    return t.dataset.dropZone !== "true" || !drop?.tagName || (t.dataset.dragId !== drop.dataset.dragId && (t.dataset.dragId === "wrapper" || drop.dataset.dragId === "wrapper"));
  }

  protected getShellPath(target: HTMLElement, both?: false): Paths<ControlPanelShells>;
  protected getShellPath(target: HTMLElement, both?: true): { path: Paths<ControlPanelShells>; shell: PanelShell };
  protected getShellPath(target: HTMLElement, both = false): string | { path: string; shell: PanelShell } {
    let key = "";
    const pos = ({ 0: "left", 1: "center", 2: "right" } as const)[[...target.parentElement!.children].indexOf(target) as 0 | 1 | 2],
      cws = this.ctlr.queryDOM(".tmg-media-top-controls-wrapper, .tmg-media-bottom-sub-controls-wrapper", true);
    cws.forEach((w, i) => w.contains(target) && (key = ({ 0: "top.", 1: "bottom.1.", 2: "bottom.2.", 3: "bottom.3." } as const)[i as 0 | 1 | 2 | 3]));
    return both ? { path: key + pos, shell: getPath(this.plug.shells as any, key + pos) } : key + pos;
  }

  public syncConfig(): void {
    const id = (el: HTMLElement) => el.dataset.controlId,
      derive = (slot: PanelSlot, center = false) => [center ? "spacer" : "", ...(slot instanceof HTMLElement ? [id(slot)] : Array.from(slot.zone.children as HTMLCollectionOf<HTMLElement>, id)), center && (slot instanceof HTMLElement ? true : slot.zone.children.length) ? "spacer" : ""].filter(Boolean) as AnyControl[]; // at least one spacer
    this.ctlr.settings.controlPanel.top = [...derive(this.plug.slots.top.left), ...derive(this.plug.slots.top.center, true), ...derive(this.plug.slots.top.right)];
    this.ctlr.settings.controlPanel.center = derive(this.plug.shells.center);
    this.ctlr.settings.controlPanel.bottom = { 1: [...derive(this.plug.slots.bottom[1].left), ...derive(this.plug.slots.bottom[1].center, true), ...derive(this.plug.slots.bottom[1].right)], 2: [...derive(this.plug.slots.bottom[2].left), ...derive(this.plug.slots.bottom[2].center, true), ...derive(this.plug.slots.bottom[2].right)], 3: [...derive(this.plug.slots.bottom[3].left), ...derive(this.plug.slots.bottom[3].center, true), ...derive(this.plug.slots.bottom[3].right)] };
  }
}

declare module "@defs/registries" {
  interface PinRegistryMap {
    "controlPanel.draggable": typeof ControlPanelDraggablePin;
  }
}
