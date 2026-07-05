import { BasePlug } from "../../base";
import { TIME_TRAVEL_BUILD } from "./build";
import type { TimeTravelConfig } from "./types";
import { fanout } from "sia-reactor/utils";
import { createTxPathMerger, TimeTravelModule } from "sia-reactor/modules";
import { TimeTravelConsole } from "sia-reactor/adapters/vanilla";
import { getCtlrIdx } from "@tools/player";

export class TimeTravelPlug extends BasePlug<TimeTravelConfig> {
  public static readonly plugName = "timeTravel";
  public static readonly BUILD = TIME_TRAVEL_BUILD;
  public module!: TimeTravelModule<any>;
  public overlay!: TimeTravelConsole;

  public override mount(): void {
    // Variables Assignment
    this.module = new TimeTravelModule({ beforeEntry: createTxPathMerger(), ...this.config.module });
    const pmdle = this.ctlr.plug("settings.persist")?.module;
    // Utility Injection
    pmdle?.attach(this.module.state, "timeTravel.state");
    this.media.use(this.module), pmdle && !pmdle.state.hydrated && (this.module.untrack(), pmdle.state.once("hydrated", this.module.track, { signal: this.signal }));
  }

  public override wire(): void {
    // Variables Assignment
    this.overlay = new TimeTravelConsole(this.module, { title: `TMG Controller ${getCtlrIdx(this.ctlr) + 1} Tape`, ...(this.config.overlay as Partial<TimeTravelConfig["overlay"]>) });
    // Ctlr Config Watchers
    this.ctlr.config.watch("settings.css.brandColor", (v) => (this.overlay.config.color = v as string), { init: true, signal: this.signal });
    // ----------- Listeners
    this.ctlr.config.on(
      "settings.timeTravel.persist",
      (e) => {
        const pmdle = this.ctlr.plug("settings.persist")?.module;
        if (!pmdle) return;
        Array.isArray(pmdle.config.whitelist) ? (pmdle.config.whitelist = { "0": pmdle.config.whitelist } as any) : !pmdle.config.whitelist && (pmdle.config.whitelist = {} as any);
        (pmdle.config.whitelist as Record<string, string[]>)["timeTravel.state"] = e.value ? ["*"] : [];
      },
      { signal: this.signal, init: true }
    );
    this.ctlr.config.on("settings.timeTravel.module", (e) => fanout(this.module.config, e.currentTarget.value), { signal: this.signal, init: false }); // #STABLE: snubs unchanged writes
    this.ctlr.config.on("settings.timeTravel.overlay", (e) => fanout(this.overlay.config, e.currentTarget.value), { signal: this.signal, init: false }); // #STABLE: snubs unchanged writes
    // Post Wiring
    this.ctlr.registerAction("timeTravelUndo", { fn: this.module.undo, zen: true });
    this.ctlr.registerAction("timeTravelRedo", { fn: this.module.redo, zen: true });
    super.wire();
  }

  protected override onDestroy(): void {
    this.overlay.destroy(), this.module.destroy(), super.onDestroy();
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.timeTravel": typeof TimeTravelPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    timeTravel: TimeTravelConfig;
  }
}
