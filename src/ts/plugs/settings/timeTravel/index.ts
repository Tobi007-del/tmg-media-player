import { BasePlug } from "../../base";
import { TIME_TRAVEL_BUILD, TIME_TRAVEL_DOCKLIST } from "./build";
import type { TimeTravelConfig } from "./types";
import { createReactorSync, fanout } from "sia-reactor/utils";
import { createTxPathMerger, TimeTravelModule, Transaction } from "sia-reactor/modules";
import { TimeTravelConsole } from "sia-reactor/adapters/vanilla";
import { getCtlrIdx } from "@tools/player";
import { CtlrConfig } from "@defs/config";
import { REvent } from "sia-reactor";
import { isArr } from "@utils/obj";
import { IconRegistry } from "@core/registries";
import { limited } from "@utils/fn";
import { luid } from "@utils/str";
import { tutorialOpts } from "../toasts";
import { IS_MOBILE } from "@utils/env";

export class TimeTravelPlug extends BasePlug<TimeTravelConfig> {
  public static readonly plugName = "timeTravel";
  public static readonly BUILD = TIME_TRAVEL_BUILD;
  public module!: TimeTravelModule<any>;
  public console?: TimeTravelConsole | undefined;
  public aiConsole?: TimeTravelConsole | undefined;
  public docklist = TIME_TRAVEL_DOCKLIST;
  public teachBasics = limited(() => this.ctlr.toast?.(`Undo your actions ${!IS_MOBILE && this.teachBasics.left > 3 ? "with <b>Ctrl</b>+<b>Z</b>" : "in settings"}`, { ...tutorialOpts(this.teachBasics.block, { [`<span title='Open history'>${IconRegistry.get("settings")}</span>`]: (_, __, menu = this.ctlr.plug("settings.panel")?.menu) => (menu?.open(), menu?.goTo("timeTravelHistory")) }), tag: "tmg-untr", signal: this.signal }), { key: `${luid()}_undo_basics`, maxTimes: 8, perSession: 2 });

  public override mount(): void {
    // Variables Assignment
    this.module = new TimeTravelModule(this.config.module);
    // Utility Injection
    this.module.attach(this.media, "media").setup(this.ctlr.config, "config");
  }

  public override wire(): void {
    // Variables Assignment
    const pmdle = this.ctlr.plug("settings.persist")?.module,
      aim = this.ctlr.plug("settings.voice")?.ai?.module;
    // Utility Injection
    if (pmdle) pmdle?.attach(this.module.state, "timeTravel.state"), !pmdle.state.hydrated && (this.module.untrack(), pmdle.state.once("hydrated", this.module.track, { signal: this.signal }));
    if (aim && pmdle) pmdle.attach(aim.state, "voiceAiTimeTravel.state"), !pmdle.state.hydrated && (aim.untrack(), pmdle.state.once("hydrated", aim.track, { signal: this.signal }));
    createReactorSync(this.module.config, this.ctlr.config, "", "settings.timeTravel.module", this.signal);
    // State Watchers
    this.module.state.watch("currentFrame", this.syncFeatures, { signal: this.signal });
    // Ctlr Config Setters
    this.ctlr.config.set("settings.timeTravel.module.beforeEntry", this.beforeEntryHook, { init: true, signal: this.signal });
    // ---- Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal });
    // ----------- Listeners
    for (const p of this.docklist) this.media.on(p as any, ({ value }) => this.redock(value), { signal: this.signal }); // if dev didn't hardcode
    // ---- Config --------
    this.ctlr.config.on("settings.timeTravel.console.disabled", this.handleConsoleDisabled, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.timeTravel.persist", this.handlePersist, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.timeTravel.console", ({ currentTarget: { value } }) => (this.console && fanout(this.console.config, value), this.aiConsole && fanout(this.aiConsole.config, value)), { signal: this.signal });
    this.ctlr.config.on("settings.css.brandColor", ({ value }) => (this.console && (this.console.config.color = value as string), this.aiConsole && (this.aiConsole.config.color = value as string)), { signal: this.signal });
    // Post Wiring
    this.ctlr.learn("timeTravelUndo", { fn: this.module.undo }, this.signal), this.ctlr.learn("timeTravelRedo", { fn: this.module.redo }, this.signal);
    super.wire();
  }

  protected beforeEntryHook(v = createTxPathMerger()) {
    return (entry: any, history: any, e: any) => !e.ai && (v ? v(entry, history, e) : entry);
  }

  protected handleConsoleDisabled(e: REvent<CtlrConfig, "settings.timeTravel.console.disabled">, aim = this.ctlr.plug("settings.voice")?.ai?.module, idx = getCtlrIdx(this.ctlr) + 1, col = this.ctlr.settings.css.brandColor as string, cont = this.media.state.fullscreen ? this.media.container : undefined): void {
    if (e.value) (this.console?.destroy(), (this.console = undefined)), (this.aiConsole?.destroy(), (this.aiConsole = undefined));
    else {
      this.console ||= new TimeTravelConsole(this.module, { title: `Controller ${idx} Tape`, color: col, container: cont, ...(this.config.console as Partial<TimeTravelConfig["console"]>) });
      if (aim) this.aiConsole ||= new TimeTravelConsole(aim, { title: `Controller ${idx} AI Tape`, color: col, container: cont, ...(this.config.console as Partial<TimeTravelConfig["console"]>) });
    }
  }

  protected handlePersist(e: REvent<CtlrConfig, "settings.timeTravel.persist">, pmdle = this.ctlr.plug("settings.persist")?.module): void {
    if (!pmdle) return;
    isArr(pmdle.config.whitelist) ? (pmdle.config.whitelist = { "0": pmdle.config.whitelist } as any) : (pmdle.config.whitelist ||= {} as any);
    (pmdle.config.whitelist as Record<string, string[]>)["timeTravel.state"] = e.value ? ["*"] : [];
    (pmdle.config.whitelist as Record<string, string[]>)["voiceAiTimeTravel.state"] = e.value ? ["*"] : [];
  }

  public redock(scoped = false, cont = scoped ? this.media.container : undefined): void {
    if (!this.ctlr.build.settings.timeTravel.console.container) this.console && (this.console.config.container = cont), this.aiConsole && (this.aiConsole.config.container = cont);
  }

  protected syncFeatures(): void {
    this.media.tech.polyfill("timeTravelUndo", this.module.canUndo), this.media.tech.polyfill("timeTravelRedo", this.module.canRedo);
  }
  protected override onDestroy(): void {
    this.console?.destroy(), this.aiConsole?.destroy(), this.module.destroy(), super.onDestroy();
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

declare module "sia-reactor" {
  interface ReactorMeta {
    ai?: boolean;
    tx?: Transaction | null;
  }
}

declare module "@defs/contract" {
  interface MediaFeaturesExt {
    timeTravelUndo: boolean;
    timeTravelRedo: boolean;
  }
}
