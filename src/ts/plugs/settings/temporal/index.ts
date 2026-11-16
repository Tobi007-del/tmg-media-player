import { BasePlug } from "../../base";
import { TEMPORAL_BUILD, TEMPORAL_DOCKLIST } from "./build";
import type { TemporalConfig } from "./types";
import { createReactorSync, fanout } from "sia-reactor/utils";
import { createTxPathMerger, TemporalModule, Transaction } from "sia-reactor/modules";
import { TemporalConsole } from "sia-reactor/adapters/vanilla";
import { getCtlrIdx } from "@tools/player";
import { CtlrConfig } from "@defs/config";
import { REvent } from "sia-reactor";
import { isArr } from "@utils/obj";
import { IconRegistry } from "@core/registries";
import { limited } from "@utils/fn";
import { luid } from "@utils/str";
import { tutorialOpts } from "../toasts";
import { IS_MOBILE } from "@utils/env";

export class TemporalPlug extends BasePlug<TemporalConfig> {
  public static readonly plugName = "temporal";
  public static readonly BUILD = TEMPORAL_BUILD;
  public module!: TemporalModule<any>;
  public console?: TemporalConsole | undefined;
  public aiConsole?: TemporalConsole | undefined;
  public docklist = TEMPORAL_DOCKLIST;
  public teachBasics = limited(() => this.ctlr.toast?.(`Undo your actions ${!IS_MOBILE && this.teachBasics.left > 3 ? "with <b>Ctrl</b>+<b>Z</b>" : "in settings"}`, { ...tutorialOpts(this.teachBasics.block, { [`<span title='Open history'>${IconRegistry.get("settings")}</span>`]: (_, __, menu = this.ctlr.plug("settings.panel")?.menu) => (menu?.open(), menu?.goTo("advanced.temporal.temporalHistory")) }), tag: "tmg-untr", signal: this.signal }), { key: `${luid()}_undo_basics`, maxTimes: 8, perSession: 2 });

  public override mount(): void {
    // Variables Assignment
    this.module = new TemporalModule(this.config.module);
    // Utility Injection
    this.module.attach(this.media, "media").setup(this.ctlr.config, "config");
  }

  public override wire(): void {
    // Utility Injection
    const pmdle = this.ctlr.plug("settings.persist")?.module,
      aim = this.ctlr.plug("settings.voice")?.ai?.module;
    if (pmdle) pmdle.attach(this.module.state, "temporal.state"), !pmdle.state.hydrated && (this.module.untrack(), pmdle.state.once("hydrated", this.module.track, { signal: this.signal }));
    if (aim && pmdle) pmdle.attach(aim.state, "aiTemporal.state"), !pmdle.state.hydrated && (aim.untrack(), pmdle.state.once("hydrated", aim.track, { signal: this.signal }));
    createReactorSync(this.module.config, this.ctlr.config, "", "settings.temporal.module", this.signal);
    // State Watchers
    this.module.state.watch("currentFrame", this.syncFeatures, { signal: this.signal });
    // Ctlr Config Setters
    this.ctlr.config.set("settings.temporal.module.beforeEntry", this.beforeEntryHook, { init: true, signal: this.signal });
    // ---- Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal });
    // ----------- Listeners
    for (const p of this.docklist) this.media.on(p as any, ({ value }) => this.redock(value), { signal: this.signal }); // if dev didn't hardcode
    // ---- Config --------
    this.ctlr.config.on("settings.temporal.console.disabled", this.handleConsoleDisabled, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.temporal.persist", this.handlePersist, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.temporal.console", ({ currentTarget: { value } }) => (this.console && fanout(this.console.config, value), this.aiConsole && fanout(this.aiConsole.config, value)), { signal: this.signal });
    this.ctlr.config.on("settings.css.brandColor", ({ value }) => (this.console && (this.console.config.color = value as string), this.aiConsole && (this.aiConsole.config.color = value as string)), { signal: this.signal });
    // Post Wiring
    this.ctlr.learn("temporalUndo", { fn: this.module.undo, keyboard: { phase: "keydown" } }, this.signal), this.ctlr.learn("temporalRedo", { fn: this.module.redo, keyboard: { phase: "keydown" } }, this.signal);
    super.wire();
  }

  protected beforeEntryHook(v = createTxPathMerger()) {
    return (entry: any, history: any, e: any) => !e.ai && (v ? v(entry, history, e) : entry);
  }

  protected handleConsoleDisabled(e: REvent<CtlrConfig, "settings.temporal.console.disabled">, aim = this.ctlr.plug("settings.voice")?.ai?.module, idx = getCtlrIdx(this.ctlr) + 1, color = this.ctlr.settings.css.brandColor as string, container = this.media.state.fullscreen ? this.media.container : undefined): void {
    if (e.value) return this.console?.destroy(), this.aiConsole?.destroy(), (this.aiConsole = this.console = undefined);
    this.console ||= new TemporalConsole(this.module, { title: `Player ${idx} Tape`, color, container, ...(this.config.console as Partial<TemporalConfig["console"]>) });
    if (aim) this.aiConsole ||= new TemporalConsole(aim, { title: `Player ${idx} AI Tape`, color, container, ...(this.config.console as Partial<TemporalConfig["console"]>) });
  }

  protected handlePersist(e: REvent<CtlrConfig, "settings.temporal.persist">, pmdle = this.ctlr.plug("settings.persist")?.module): void {
    if (!pmdle) return;
    isArr(pmdle.config.whitelist) ? (pmdle.config.whitelist = { "0": pmdle.config.whitelist } as any) : (pmdle.config.whitelist ||= {} as any);
    (pmdle.config.whitelist as Record<string, string[]>)["temporal.state"] = e.value ? ["*"] : [];
  }

  public redock(scoped = false, cont = scoped ? this.media.container : undefined): void {
    if (!this.ctlr.build.settings.temporal.console.container) this.console && (this.console.config.container = cont), this.aiConsole && (this.aiConsole.config.container = cont);
  }

  protected syncFeatures(): void {
    this.media.tech.polyfill("temporalUndo", this.module.canUndo), this.media.tech.polyfill("temporalRedo", this.module.canRedo);
  }
  protected override onDestroy(): void {
    this.console?.destroy(), this.aiConsole?.destroy(), this.module.destroy(), super.onDestroy();
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.temporal": typeof TemporalPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    temporal: TemporalConfig;
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
    temporalUndo: boolean;
    temporalRedo: boolean;
  }
}
