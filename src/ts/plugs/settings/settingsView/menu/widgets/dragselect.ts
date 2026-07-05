import { BaseWidget, WidgetRegistry } from ".";
import { createEl, createListRenderer, getElSiblingAt } from "@utils/dom";
import { parseUIOpt } from "@utils/obj";
import { clamp } from "@utils/num";
import { initVScrollerator } from "@t007/utils/hooks/vanilla";
import { IconRegistry } from "@core/registries";
import { UITuple } from "@defs/UIOptions";

export class DragSelectWidget<T = unknown> extends BaseWidget<T> {
  private renderRows!: ReturnType<typeof createListRenderer<UITuple<T>>>;
  private currentValue = "";

  public override render(): HTMLElement {
    const ctlr = this.ctlr,
      el = (this.element = createEl("ul", { className: "tmg-media-smenu-select-list tmg-media-smenu-drag-list", role: "listbox" })),
      item = this.item;
    this.renderRows = createListRenderer<UITuple<T>>({
      container: el,
      getKey: (opt) => opt.value as string,
      createNode: (opt) => {
        const li = createEl("li", { className: "tmg-media-smenu-select-option", role: "option", tabIndex: 0, title: opt.title }, { optVal: opt.value as string }),
          dragHandle = this.item.onReorder ? createEl("span", { className: "tmg-media-smenu-playlist-drag", innerHTML: IconRegistry.get("dragindicator", true) || "☰" }) : null,
          label = createEl("span", { className: "tmg-media-smenu-select-label", textContent: opt.display }),
          editBtn = this.item.onEdit ? createEl("button", { className: "tmg-media-smenu-sub-action-btn", innerHTML: IconRegistry.get("edit", true) || "✎", type: "button", title: "Edit" }, {}, { flexShrink: "0" }) : null,
          deleteBtn = this.item.onDelete ? createEl("button", { className: "tmg-media-smenu-delete-btn", innerHTML: IconRegistry.get("delete", true) || "✕", type: "button", title: "Delete" }, {}, { flexShrink: "0" }) : null;
        dragHandle ? li.append(dragHandle, label) : li.append(label), opt.infoText && li.append(createEl("span", { className: "tmg-media-smenu-select-info", textContent: opt.infoText }));
        if (editBtn) {
          editBtn.onclick = (e) => {
            e.stopPropagation();
            const i = (this.item.getOptions?.() ?? []).findIndex((o) => parseUIOpt(o).value === opt.value);
            if (i !== -1) this.item.onEdit?.(i);
          };
          li.append(editBtn);
        }
        if (deleteBtn) {
          deleteBtn.onclick = (e) => {
            e.stopPropagation();
            const i = (this.item.getOptions?.() ?? []).findIndex((o) => parseUIOpt(o).value === opt.value);
            if (i !== -1) this.item.onDelete?.(i);
          };
          li.append(deleteBtn);
        }
        if (dragHandle) {
          dragHandle.onpointerdown = (e) => {
            if (e.button !== 0 || li.classList.contains("tmg-media-smenu-dragging")) return;
            e.preventDefault(), navigator.vibrate?.([50]);
            const scrollEl = (el.closest(".tmg-media-smenu-panel-content") || el.parentElement) as HTMLElement,
              initialOffsetY = el.getBoundingClientRect().top,
              initialScrollY = scrollEl.scrollTop,
              placeholder = createEl("li", { className: "tmg-media-smenu-drag-placeholder" }, {}, { cssText: `height:${li.offsetHeight}px;width:${li.offsetWidth}px;` }),
              scrollerator = initVScrollerator({ margin: 60, car: scrollEl });
            li.parentElement!.insertBefore(placeholder, li.nextElementSibling), li.classList.add("tmg-media-smenu-dragging"), (li.style.top = `${clamp(0, e.clientY - initialOffsetY - li.offsetHeight / 2, el.offsetHeight - li.offsetHeight)}px`);
            ["pointermove", "pointerup", "pointercancel"].forEach((evt, i) => el.ownerDocument.addEventListener(evt, !i ? onPointerMove : onPointerUp, { passive: false }));
            function onPointerMove(evt: Event) {
              const ev = evt as PointerEvent;
              ev.preventDefault();
              ctlr.RAFLoop("listItemDragging", () => {
                const liTop = clamp(0, scrollEl.scrollTop - initialScrollY + ev.clientY - initialOffsetY - li.offsetHeight / 2, el.offsetHeight - li.offsetHeight),
                  afterLine = getElSiblingAt(ev.clientY, "y", Array.from(el.querySelectorAll<HTMLElement>(".tmg-media-smenu-select-option:not(.tmg-media-smenu-dragging)")));
                (li.style.top = `${liTop}px`), scrollerator.drive(ev.clientY, !(liTop > 0 && liTop < el.offsetHeight - li.offsetHeight), scrollEl.getBoundingClientRect().top);
                afterLine ? el.insertBefore(placeholder, afterLine) : el.append(placeholder);
              }, this.signal);
            }
            function onPointerUp() {
              navigator.vibrate?.([50]), ctlr.cancelRAFLoop("listItemDragging"), scrollerator.reset();
              const newIdx = Array.from(el.querySelectorAll(".tmg-media-smenu-select-option")).indexOf(li),
                oldIdx = (item.getOptions?.() ?? []).findIndex((o) => parseUIOpt(o).value === opt.value);
              li.classList.remove("tmg-media-smenu-dragging"), (li.style.top = ""), placeholder.parentElement?.replaceChild(li, placeholder);
              newIdx !== -1 && oldIdx !== -1 && newIdx !== oldIdx && item.onReorder?.(oldIdx, newIdx);
              ["pointermove", "pointerup", "pointercancel"].forEach((evt, i) => el.ownerDocument.removeEventListener(evt, !i ? onPointerMove : onPointerUp));
            }
          };
        }
        li.onclick = (e) => {
          if (!this.item.onChange) return;
          if (!li.classList.contains("tmg-media-smenu-dragging") && (!dragHandle || !dragHandle.contains(e.target as Node)) && label.textContent !== this.currentValue && li.dataset.optVal !== this.currentValue) {
            this.item.onChange?.(opt.value);
            this.currentValue = label.textContent!;
            this.syncActive();
          }
        };
        return li;
      },
      updateNode: (node, opt) => {
        if (node.classList.contains("tmg-media-smenu-dragging")) return;
        node.querySelector<HTMLElement>(".tmg-media-smenu-select-label")!.textContent = opt.display;
        opt.title ? (node.title = opt.title) : node.removeAttribute("title");
        const infoNode = node.querySelector<HTMLElement>(".tmg-media-smenu-select-info");
        opt.infoText ? (infoNode ? (infoNode.textContent = opt.infoText) : node.append(createEl("span", { className: "tmg-media-smenu-select-info", textContent: opt.infoText }))) : infoNode?.remove();
        node.dataset.optVal = opt.value as string;
        node.ariaSelected = String(opt.display === this.currentValue || node.dataset.optVal === this.currentValue);
      },
    });
    return this.syncUI(), this.element;
  }

  public override syncUI(): void {
    this.currentValue = this.item.getValue() || "";
    this.renderRows((this.item.getOptions?.() ?? []).map(parseUIOpt));
    this.syncActive();
  }

  private syncActive(): void {
    if (!this.item.onChange) return;
    for (const li of this.element.querySelectorAll<HTMLElement>("[data-opt-val]")) {
      const active = li.querySelector(".tmg-media-smenu-select-label")!.textContent === this.currentValue || li.dataset.optVal === this.currentValue;
      li.classList.toggle("tmg-media-smenu-option-active", active);
      li.ariaSelected = String(active);
    }
  }
}

WidgetRegistry.register("drag-select", DragSelectWidget);
