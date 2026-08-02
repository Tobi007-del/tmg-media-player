import { BasePin } from "../../base";
import { CONTROL_PANEL_DRAGGABLE_BUILD } from "./build";
import { ControlPanelPlug } from "./index";
import { getPath, setPath } from "sia-reactor/utils";
import { getElSiblingAt } from "@utils/dom";
import { limited, setTimeout, requestAnimationFrame, mockAsync } from "@utils/fn";
import { inBoolArrOpt, getPanelLocation } from "@utils/obj";
import type { ControlPanelDraggable, PanelShell, PanelSlot, AnyControl, ControlPanelShells } from "./types";
import { Paths } from "sia-reactor";
import { tutorialOpts } from "../toasts";

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
    this.ctlr.config.on("settings.controlPanel.draggable", ({ value }) => this.setEventListeners(value ? "add" : "remove"), { init: true, signal: this.signal });
  }

  public setEventListeners(action: "add" | "remove" = this.config ? "add" : "remove"): void {
    for (const c of this.ctlr.queryDOM("[data-draggable-control]", true)) {
      c.dataset.dragId = c.dataset.dragId ?? "";
      const act = !inBoolArrOpt(this.config, c.dataset.dragId) ? "remove" : action;
      c.dataset.draggableControl = String((c.draggable = act === "add"));
      c[`${act as "add"}EventListener`]("dragstart", this.handleDragStart, { signal: this.signal });
      c[`${act as "add"}EventListener`]("drag", this.handleDrag, { signal: this.signal });
      c[`${act as "add"}EventListener`]("dragend", this.handleDragEnd, { signal: this.signal });
    }
    for (const c of [...this.ctlr.queryDOM("[data-drop-zone][data-drag-id]", true), ...this.plug.zoneEls]) {
      c.dataset.dragId = c.dataset.dragId ?? "";
      const act = !inBoolArrOpt(this.config, c.dataset.dragId) ? "remove" : action;
      c.dataset.dropZone = String(act === "add");
      c[`${act as "add"}EventListener`]("dragenter", this.handleDragEnter, { signal: this.signal });
      c[`${act as "add"}EventListener`]("dragover", this.handleDragOver, { signal: this.signal });
      c[`${act as "add"}EventListener`]("drop", this.handleDragLeave, { signal: this.signal });
      c[`${act as "add"}EventListener`]("dragleave", this.handleDragLeave, { signal: this.signal });
    }
  }

  protected handleDragStart(e: DragEvent): void {
    const { target: t, dataTransfer } = e as DragEvent & { target: HTMLElement };
    if (!t?.tagName || t.dataset.draggableControl !== "true" || this.teaching) return void (this.teaching && e.preventDefault());
    if (t.matches(":has(:is(input,[role='slider']):is(:hover, :active))")) return e.preventDefault();
    dataTransfer!.effectAllowed = "move";
    this.draggingEl = t;
    requestAnimationFrame(() => (t.classList.add("tmg-media-control-dragging"), this.ctlr.media.container.classList.add("tmg-media-control-dragging")), this.signal);
    this.safeTimeoutId = setTimeout(() => (t.classList.remove("tmg-media-control-dragging"), this.ctlr.media.container.classList.remove("tmg-media-control-dragging")), 1000, this.signal);
    if (t.dataset.dragId !== "wrapper" || t.parentElement?.dataset.dragId !== "wrapper") return;
    const { path, shell } = this.getShellPath(t, true);
    setPath(this.plug.slots, path, shell);
    this.replaced = { target: t.parentElement!, child: shell.cover };
  }

  protected handleDrag(): void {
    clearTimeout(this.safeTimeoutId);
  }

  protected handleDragEnd(e: DragEvent, t = e.target as HTMLElement): void {
    if (!t?.tagName) return;
    t.classList.remove("tmg-media-control-dragging"), this.ctlr.media.container.classList.remove("tmg-media-control-dragging");
    this.replaced = this.draggingEl = null;
    if (t.dataset.dragId === "wrapper" && t.parentElement?.dataset.dragId === "wrapper") setPath(this.plug.slots, this.getShellPath(t), t);
    this.syncConfig(), this.teachBasics(t.dataset.controlId as any);
  }

  protected handleDragEnter(e: DragEvent): void {
    e.clientX && e.clientY && !this.noDropOff(e.target as HTMLElement) && this.draggingEl && (e.target as HTMLElement).classList.add("tmg-media-dragover");
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
          const atWrapper = getElSiblingAt(x, "x", t.querySelectorAll<HTMLElement>('.tmg-media-side-controls-wrapper-cover:has([data-drop-zone="true"][data-drag-id=""]:empty)'), "at");
          if (!atWrapper) return;
          this.replaced?.target.replaceChild(this.replaced.child, this.draggingEl!);
          this.replaced = { target: t, child: atWrapper };
          return t.replaceChild(this.draggingEl!, atWrapper);
        }
        const afterCtrl = getElSiblingAt(x, "x", t.querySelectorAll<HTMLElement>("[draggable=true]:not(.tmg-media-control-dragging)"));
        afterCtrl ? t.insertBefore(this.draggingEl!, afterCtrl) : t.append(this.draggingEl!);
        if (!t.dataset.dragId) for (const el of this.plug.zoneEls) this.plug.handleCompsView(el);
      },
      500,
      false
    );
  }

  protected handleDragLeave(e: DragEvent): void {
    !this.noDropOff(e.target as HTMLElement) && (e.target as HTMLElement).classList.remove("tmg-media-dragover");
  }

  protected noDropOff(t: HTMLElement, drop = this.draggingEl): boolean {
    return !drop?.tagName || t.dataset.dropZone !== "true" || (t.dataset.dragId !== drop.dataset.dragId && (t.dataset.dragId === "wrapper" || drop.dataset.dragId === "wrapper"));
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
      derive = (slot: PanelSlot, center = false) => [center ? "spacer" : "", ...(slot instanceof HTMLElement ? [id(slot)] : Array.from(slot.zone.children as HTMLCollectionOf<HTMLElement>, id)), center && (slot instanceof HTMLElement || slot.zone.children.length) ? "spacer" : ""].filter(Boolean) as AnyControl[];
    this.settings.controlPanel.top = [...derive(this.plug.slots.top.left), ...derive(this.plug.slots.top.center, true), ...derive(this.plug.slots.top.right)];
    this.settings.controlPanel.center = derive(this.plug.shells.center);
    this.settings.controlPanel.bottom = { 1: [...derive(this.plug.slots.bottom[1].left), ...derive(this.plug.slots.bottom[1].center, true), ...derive(this.plug.slots.bottom[1].right)], 2: [...derive(this.plug.slots.bottom[2].left), ...derive(this.plug.slots.bottom[2].center, true), ...derive(this.plug.slots.bottom[2].right)], 3: [...derive(this.plug.slots.bottom[3].left), ...derive(this.plug.slots.bottom[3].center, true), ...derive(this.plug.slots.bottom[3].right)] };
  }

  protected teaching = false;
  protected teachBasics = limited(
    async (id: AnyControl = "meta", toast = this.ctlr.plug("settings.toasts")?.toast) => {
      if (!toast) return;
      this.teaching = true;
      const el = this.ctlr.queryDOM(".tmg-media-meta-wrapper"),
        loc = getPanelLocation(this.settings.controlPanel, "meta"),
        pos = (p: string, z: string) => (p === "center" ? "center-center" : (`${p.startsWith("top") ? "top" : "bottom"}-${z === "left" ? "left" : z === "right" ? "right" : "center"}` as any)),
        startPos = pos(loc.path, loc.zone),
        emptyZones: { pos: string; zone: HTMLElement }[] = [],
        cleanup = () => (el?.classList.remove("tmg-media-control-dragging"), this.ctlr.media.container.classList.remove("tmg-media-control-dragging"), highlightZone(), (this.teaching = false)),
        highlightZone = (z?: HTMLElement) => (emptyZones.forEach((x) => x.zone.classList.remove("tmg-media-dragover")), z?.classList.add("tmg-media-dragover"));
      for (const r of ["top", "bottom.1", "bottom.2", "bottom.3"])
        for (const z of ["left", "center", "right"]) {
          const row = r === "top" ? this.plug.slots.top : this.plug.slots.bottom[Number(r.split(".")[1]) as 1 | 2 | 3],
            slot = row[z as "left" | "center" | "right"];
          if (!(slot instanceof HTMLElement) && slot.zone && !slot.zone.querySelector('[data-control-id]:not([data-control-id="spacer"])') && pos(r, z) !== startPos) emptyZones.push({ pos: pos(r, z), zone: slot.zone });
        }
      el?.classList.add("tmg-media-control-dragging"), this.ctlr.media.container.classList.add("tmg-media-control-dragging"), this.ctlr.plug("settings.overlay")?.show();
      const tId = toast(`Did you know you can drag the <b>Title</b> around${id !== "meta" ? " too" : ""}?`, { ...tutorialOpts(() => (this.teachBasics.block(), toast.dismiss(tId))), autoClose: false, onClose: cleanup, signal: this.signal });
      await mockAsync(3500);
      if (!toast.isActive(tId)) return;
      toast(`You can move it from here...`, { id: tId, position: startPos });
      if (emptyZones.length) {
        await mockAsync(2500);
        if (!toast.isActive(tId)) return;
        highlightZone(emptyZones[0].zone), toast(`...to an empty space like here!`, { id: tId, position: emptyZones[0].pos });
        for (let i = 1; i < emptyZones.length; i++) await mockAsync(2000), toast.isActive(tId) && (highlightZone(emptyZones[i].zone), toast(`...or here!`, { id: tId, position: emptyZones[i].pos }));
      }
      await mockAsync(emptyZones.length ? 2000 : 2500);
      if (toast.isActive(tId)) highlightZone(), toast(`Try dragging it to an empty space now!`, { id: tId, position: "center-center", autoClose: true }), cleanup();
      this.teaching = false;
    },
    { key: "tmg_cp_tut_1", maxTimes: 3 }
  );
}

declare module "@defs/registries" {
  interface PinRegistryMap {
    "controlPanel.draggable": typeof ControlPanelDraggablePin;
  }
}
