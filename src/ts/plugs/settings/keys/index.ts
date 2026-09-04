import { BasePlug } from "../../base";
import type { KeyMod, KeyPhase, KeysConfig, KeyShortcutMods } from "./types";
import { KEYS_BUILD } from "./build";
import { getActiveEl, isArr } from "@t007/utils";
import { keyEventAllowed as allowed } from "@utils/keys";
import { limited } from "@utils/fn";
import { tutorialOpts } from "../toasts";
import { luid } from "@utils/str";

export class KeysPlug extends BasePlug<KeysConfig> {
  public static readonly plugName = "keys";
  public static readonly BUILD = KEYS_BUILD;
  public playTriggerSeq = 0;
  protected teachBasics = limited((_id?: string) => (_id = this.ctlr.plug("settings.toasts")?.toast?.(`Press space to play/pause${this.ctlr.plug("settings.fastPlay") ? ", hold to fast play/rewind(+Shift)" : ""}. Click ⚙ for settings`, { ...tutorialOpts(() => (this.teachBasics.block(), t007.toast?.dismiss(_id))), signal: this.signal })), { key: `${luid()}_keys_basics`, maxTimes: 3 });

  public override wire(): void {
    // Ctlr Media Listeners
    this.ctlr.media.on("state.locked", this.syncEventListeners, { signal: this.signal });
    // ---- State --------
    this.ctlr.state.on("mediaIntersecting", this.syncEventListeners, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.keys.disabled", this.syncEventListeners, { signal: this.signal });
    this.ctlr.config.on("disabled", this.syncEventListeners, { signal: this.signal });
    // Post Wiring
    this.ctlr.payload.wired ? this.syncEventListeners() : this.ctlr.state.wonce("readyState", this.syncEventListeners, { signal: this.signal }); // #HEAVY: waits for !lightState
    this.ctlr.learn("playPause", { fn: this.handlePlayTriggerDown, keyboard: { phase: "keydown" } }, this.signal);
    this.ctlr.learn(" ", { fn: this.handlePlayTriggerDown, keyboard: { phase: "keydown" }, system: true, label: "Playback: Play or Pause" }, this.signal);
    this.ctlr.learn("arrowleft", { fn: this.handleArrowLeft, keyboard: { phase: "keydown" }, notify: "bwd", system: true, label: "Time: Skip backward" }, this.signal);
    this.ctlr.learn("arrowright", { fn: this.handleArrowRight, keyboard: { phase: "keydown" }, notify: "fwd", system: true, label: "Time: Skip forward" }, this.signal);
    super.wire();
  }

  protected getHook(phase: KeyPhase, action: string, entry = this.ctlr.actions.entries[action]): string | undefined {
    return !entry || !entry.keyboard ? undefined : entry.keyboard.phase === phase || (isArr(entry.keyboard.phase) && entry.keyboard.phase.includes(phase)) ? action : undefined;
  }
  protected handleKeyDown(e: KeyboardEvent, action = allowed(e, this.settings.keys), mod = this.getMod(e)): void {
    if (action === false) return;
    action && this.ctlr.plug("settings.overlay")?.show();
    this.ctlr.throttle("keyDown", () => this.ctlr.perform(this.getHook("keydown", action as string), e, mod), 30);
  }
  protected handleKeyUp(e: KeyboardEvent, action = allowed(e, this.settings.keys), mod = this.getMod(e)): void {
    if (action === false) return void (!getActiveEl(this.media.container.ownerDocument) && this.teachBasics());
    this.ctlr.plug("settings.overlay")?.show();
    this.ctlr.perform(this.getHook("keyup", action as string), e, mod);
  }

  protected handlePlayTriggerDown(e?: KeyboardEvent): void {
    if (!e) return (this.media.intent.paused = !this.media.state.paused), this.ctlr.plug("settings.notifiers")?.notify(this.media.intent.paused ? "mediaPause" : "mediaPlay");
    this.playTriggerSeq++;
    this.playTriggerSeq === 1 && (e.currentTarget as Window | null)?.addEventListener("keyup", this.handlePlayTriggerUp, { signal: this.signal });
    this.playTriggerSeq === 2 && this.settings.fastPlay.key && this.ctlr.plug("settings.fastPlay")?.speedUp(e.shiftKey ? "backwards" : "forwards");
  }

  protected handlePlayTriggerUp(e: KeyboardEvent, action = allowed(e, this.settings.keys)): void {
    action && this.ctlr.plug("settings.overlay")?.show();
    if (action !== false && /^( |playPause)$/.test(action as string)) {
      e.stopImmediatePropagation();
      if (this.playTriggerSeq === 1) this.media.intent.paused = !this.media.state.paused;
      this.ctlr.plug("settings.notifiers")?.notify(this.media.intent.paused ? "mediaPause" : "mediaPlay");
    }
    const fastPlug = this.ctlr.plug("settings.fastPlay");
    if (fastPlug?.state.active && this.playTriggerSeq > 1 && !fastPlug?.state.ptrActive) fastPlug.slowDown();
    this.playTriggerSeq = 0;
    (e.currentTarget as Window | null)?.removeEventListener("keyup", this.handlePlayTriggerUp);
  }

  protected handleArrowLeft(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.gesture")?.stopSkipPersist();
    this.ctlr.plug("settings.time")?.skip(-this.getModded("timeSkip", mod, 5));
  }
  protected handleArrowRight(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.gesture")?.stopSkipPersist();
    this.ctlr.plug("settings.time")?.skip(this.getModded("timeSkip", mod, 5));
  }

  public setEventListeners(action: "add" | "remove" = "add"): void {
    const ws = this.getWindows();
    for (const w of ws) w.removeEventListener("keydown", this.handleKeyDown), w.removeEventListener("keyup", this.handleKeyUp);
    if (action === "remove" || !this.shouldListen()) return;
    for (const w of ws) w.addEventListener("keydown", this.handleKeyDown, { signal: this.signal }), w.addEventListener("keyup", this.handleKeyUp, { signal: this.signal });
  }
  public syncEventListeners(): void {
    this.setEventListeners(this.shouldListen() ? "add" : "remove");
  }
  protected shouldListen(): boolean {
    return this.ctlr.payload.wired && this.ctlr.state.mediaIntersecting && !this.ctlr.config.disabled && !this.config.disabled && !this.media.state.locked;
  }

  protected getWindows(): Window[] {
    const floating = this.ctlr.plug("settings.modes")?.pictureInPicture?.floatingWindow;
    return floating ? [floating, window] : [window];
  }
  protected getMod(e: KeyboardEvent): KeyMod {
    return this.config.mods.disabled ? "" : e.ctrlKey ? "ctrl" : e.altKey ? "alt" : e.shiftKey ? "shift" : "";
  }
  public getModded(action: keyof KeyShortcutMods, mod: KeyMod, base: number): number {
    return mod ? this.config.mods[action]?.[mod] ?? base : base;
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
