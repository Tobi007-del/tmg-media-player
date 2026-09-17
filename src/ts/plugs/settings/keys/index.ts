import { BasePlug } from "../../base";
import type { KeyMod, KeyPhase, KeysConfig, KeyShortcutMods } from "./types";
import { KEYS_BUILD } from "./build";
import { getActiveEl } from "@t007/utils";
import { keyEventAllowed as allowed } from "@utils/keys";
import { limited } from "@utils/fn";
import { tutorialOpts } from "../toasts";
import { luid } from "@utils/str";

export class KeysPlug extends BasePlug<KeysConfig> {
  public static readonly plugName = "keys";
  public static readonly BUILD = KEYS_BUILD;
  public playKeySeq = 0;
  protected teachBasics = limited((_id?: string) => (_id = this.ctlr.toast?.(`Press space to play${this.ctlr.plug("settings.fastPlay") ? ", hold to fast play/rewind(+Shift)" : ""}. Click ⚙ for settings`, { ...tutorialOpts(() => (this.teachBasics.block(), t007.toast?.dismiss(_id))), signal: this.signal })), { key: `${luid()}_keys_basics`, maxTimes: 3 });

  public override wire(): void {
    // Ctlr Media Listeners
    this.ctlr.media.on("state.locked", this.syncListeners, { signal: this.signal });
    // ---- State --------
    this.ctlr.state.on("mediaIntersecting", this.syncListeners, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.keys.disabled", this.syncListeners, { signal: this.signal });
    this.ctlr.config.on("disabled", this.syncListeners, { signal: this.signal });
    // Post Wiring
    this.ctlr.flags.wired ? this.syncListeners() : this.ctlr.state.wonce("readyState", this.syncListeners, { signal: this.signal }); // #HEAVY: waits for !lightState
    this.ctlr.learn("playPause", { fn: this.handlePlayKeyDown, keyboard: { phase: "keydown" } }, this.signal);
    this.ctlr.learn(" ", { fn: this.handlePlayKeyDown, keyboard: { phase: "keydown" }, system: true, label: "Playback: Play or Pause" }, this.signal);
    this.ctlr.learn("arrowleft", { fn: this.handleArrowLeft, keyboard: { phase: "keydown" }, notify: "bwd", system: true, label: "Time: Skip backward" }, this.signal);
    this.ctlr.learn("arrowright", { fn: this.handleArrowRight, keyboard: { phase: "keydown" }, notify: "fwd", system: true, label: "Time: Skip forward" }, this.signal);
    super.wire();
  }

  protected handleKeyDown(e: KeyboardEvent, action = allowed(e, this.config)): void {
    action !== false && this.ctlr.throttle("keyDown", () => (this.ctlr.plug("settings.overlay")?.show(), this.ctlr.perform(this.getHook("keydown", action), e, this.getMod(e))), 30);
  }
  protected handleKeyUp(e: KeyboardEvent, action = allowed(e, this.config)): void {
    if (action === false) !getActiveEl(this.media.container.ownerDocument) && this.teachBasics();
    else this.ctlr.plug("settings.overlay")?.show(), this.ctlr.perform(this.getHook("keyup", action), e, this.getMod(e));
  }

  protected handlePlayKeyDown(e?: KeyboardEvent): void {
    if (!e) return (this.media.intent.paused = !this.media.state.paused), this.ctlr.plug("settings.notifiers")?.notify(this.media.intent.paused ? "mediaPause" : "mediaPlay");
    this.playKeySeq++;
    this.playKeySeq === 1 && (e.currentTarget as Window | null)?.addEventListener("keyup", this.handlePlayKeyUp, { signal: this.signal });
    this.playKeySeq === 2 && this.settings.fastPlay.key && this.ctlr.plug("settings.fastPlay")?.speedUp(e.shiftKey ? "backwards" : "forwards");
  }

  protected handlePlayKeyUp(e: KeyboardEvent, action = allowed(e, this.config)): void {
    action && this.ctlr.plug("settings.overlay")?.show();
    if (action !== false && /^( |playPause)$/.test(action)) {
      e.stopImmediatePropagation();
      if (this.playKeySeq === 1) this.media.intent.paused = !this.media.state.paused;
      this.ctlr.plug("settings.notifiers")?.notify(this.media.intent.paused ? "mediaPause" : "mediaPlay");
    }
    const fastPlug = this.ctlr.plug("settings.fastPlay");
    if (fastPlug?.state.active && this.playKeySeq > 1 && !fastPlug?.state.ptrActive) fastPlug.slowDown();
    this.playKeySeq = 0;
    (e.currentTarget as Window | null)?.removeEventListener("keyup", this.handlePlayKeyUp);
  }

  protected handleArrowLeft(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.gesture")?.ceaseSkip();
    this.ctlr.plug("settings.time")?.skip(-this.getModded("timeSkip", mod, 5));
  }
  protected handleArrowRight(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.gesture")?.ceaseSkip();
    this.ctlr.plug("settings.time")?.skip(this.getModded("timeSkip", mod, 5));
  }

  public setListeners(action: "add" | "remove" = "add"): void {
    const ws = this.getWindows();
    for (const w of ws) w.removeEventListener("keydown", this.handleKeyDown), w.removeEventListener("keyup", this.handleKeyUp);
    if (action === "remove" || !this.shouldListen()) return;
    for (const w of ws) w.addEventListener("keydown", this.handleKeyDown, { signal: this.signal }), w.addEventListener("keyup", this.handleKeyUp, { signal: this.signal });
  }
  public syncListeners(): void {
    this.setListeners(this.shouldListen() ? "add" : "remove");
  }
  protected shouldListen(): boolean {
    return this.ctlr.flags.wired && this.ctlr.state.mediaIntersecting && !this.ctlr.config.disabled && !this.config.disabled && !this.media.state.locked;
  }

  protected getHook(phase: KeyPhase = this.config.phase.value, action: string, entry = this.ctlr.actions.entries[action]): string | undefined {
    return (entry?.keyboard?.phase || this.config.phase.value) === phase ? action : undefined;
  }
  public getMod(e: KeyboardEvent): KeyMod {
    return this.config.mods.disabled ? "" : e.ctrlKey ? "ctrl" : e.altKey ? "alt" : e.shiftKey ? "shift" : "";
  }
  public getModded(action: keyof KeyShortcutMods, mod: KeyMod, base: number): number {
    return mod ? this.config.mods[action]?.[mod] ?? base : base;
  }
  protected getWindows(): Window[] {
    const floating = this.ctlr.plug("settings.modes")?.pictureInPicture?.floatingWindow;
    return floating ? [floating, window] : [window];
  }
}

export type * from "./types";
export * from "./build";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.keys": typeof KeysPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    keys: KeysConfig;
  }
}
