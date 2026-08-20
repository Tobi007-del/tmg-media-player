import { BaseWidget, WidgetRegistry } from ".";
import { createEl } from "@utils/dom";
import { ComponentRegistry } from "@core/registries";
import type { RangeInput } from "@components/rangeInput";
import { parseUIOpts } from "@utils/obj";
import { SettingsMenuRangeConfig } from "../../types";
import { fanout } from "sia-reactor/utils";

export class RangeWidget extends BaseWidget {
  private valueLabel!: HTMLElement;
  private comp?: RangeInput;
  private lastRange!: SettingsMenuRangeConfig;

  public override render(): HTMLElement {
    const comp = ComponentRegistry.init("rangeInput", this.ctlr, this.getConfig());
    this.element = createEl("div", { className: "tmg-media-smenu-range-wrapper" });
    this.valueLabel = createEl("span", { className: "tmg-media-smenu-range-value" });
    if (comp) {
      comp.config.on("value", ({ value }) => (this.item.onChange?.(value!), (this.valueLabel.textContent = this.item.getValue() || "")));
      this.element.append(this.valueLabel, (this.comp = comp).element);
    }
    return this.syncUI(), this.element;
  }

  public override syncUI(): void {
    this.valueLabel.textContent = this.item.getValue() || "";
    if (!this.comp) return;
    const cfg = this.item.getRange!()!;
    if (this.lastRange.min !== cfg.min || this.lastRange.max !== cfg.max) fanout(this.comp.config, this.getConfig(cfg));
    else this.comp.config.value = this.getRangeValue();
  }

  private getRangeValue(): number {
    const v = parseFloat(this.item.getValue() || "");
    return isNaN(v) ? this.item.getRange!()!.min : v;
  }

  private getConfig(range = this.item.getRange!()!) {
    const cfg = (this.lastRange = range),
      divs = (cfg.divs?.map((value: any) => ({ value })) ?? (cfg.options ? parseUIOpts(cfg.options).map((value) => ({ value })) : [])) || [],
      marks: any[] = [];
    if (cfg.step && cfg.step > cfg.max * 0.01) for (let v = cfg.min; v <= cfg.max; v = parseFloat((v + cfg.step).toFixed(5))) marks.push({ start: v, type: "step" });
    return { ...cfg, value: this.getRangeValue(), divs, marks };
  }
}

WidgetRegistry.register("range", RangeWidget);
