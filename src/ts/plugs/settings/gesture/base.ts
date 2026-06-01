import { clamp } from "sia-reactor/utils";
import { GesturePlug } from ".";
import { safeNum } from "@utils/num";
import { BasePin } from "../../base";

export class GestureBasePin<Config> extends BasePin<GesturePlug, Config> {
  public static readonly plugName = "gesture";
  protected nextTime = 0;

  protected applyTimeline({ percent, sign, multiplier }: { percent: number; sign: string; multiplier: number }): void {
    multiplier = +multiplier.toFixed(1);
    percent = percent * multiplier;
    const curr = safeNum(this.media.state.currentTime),
      change = percent * safeNum(this.media.status.duration) * multiplier,
      next = curr + (sign === "+" ? change : -change),
      textEl = this.ctlr.plug("settings.notifiers")?.compEl("touchtimelinenotifier"),
      toText = this.ctlr.plug("settings.time")?.toTimeText;
    this.nextTime = clamp(0, next, this.media.status.duration);
    if (textEl) textEl.textContent = `${sign}${toText?.(Math.abs(this.nextTime - curr))} (${toText?.(this.nextTime, true)}) ${multiplier < 1 ? `x${multiplier}` : ""}`;
  }

  protected applyRange(key: "volume" | "brightness", percent: number, sign: string): void {
    const range = this.ctlr.settings[key],
      value = sign === "+" ? this.media.state[key] + percent * range.max : this.media.state[key] - percent * range.max;
    this.ctlr.plug("settings." + key)?.handleSliderInput(clamp(0, Math.round(value), range.max));
  }
}
