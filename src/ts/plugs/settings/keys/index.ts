import { BasePlug } from "../../base";
import type {  KeyMod, KeyPhase, KeysConfig, KeyShortcutMods } from "./types";
import { KEYS_BUILD } from "./build";
import { isArr } from "@t007/utils";
import { keyEventAllowed as allowed } from "@utils/keys";
import { getMediaTime } from "@utils/media";
import { limited } from "@utils/fn";
import { tutorialOpts } from "../toasts";

export class KeysPlug extends BasePlug<KeysConfig> {
  public static readonly plugName = "keys";
  public static readonly BUILD = KEYS_BUILD;
  public playTriggerSeq = 0;
  protected teachBasics = limited((_id?: string) => ((_id = this.ctlr.plug("settings.toasts")?.toast?.(`Press the spacebar to play/pause, or hold it to fast forward/rewind(+Shift). Click ⚙ for settings`, { ...tutorialOpts(() => (this.teachBasics.block(), t007.toast?.dismiss(_id))), signal: this.signal })), { key: "tmg_keys_tut_1", maxTimes: 5 }));

  public override wire(): void {
    // Ctlr Media Listeners
    this.ctlr.media.on("state.locked", this.syncEventListeners, { signal: this.signal });
    // ---- State --------
    this.ctlr.state.on("mediaIntersecting", this.syncEventListeners, { signal: this.signal });
    // ---- Config --------
    this.ctlr.config.on("settings.keys.disabled", this.syncEventListeners, { signal: this.signal });
    this.ctlr.config.on("disabled", this.syncEventListeners, { signal: this.signal });
    // Post Wiring
    this.ctlr.registerAction(" ", { fn: this.handlePlayTriggerDown, keyboard: { phase: "keydown" }, private: true });
    this.ctlr.registerAction("escape", { fn: this.handleEscape, keyboard: { phase: "keydown" }, private: true });
    this.ctlr.registerAction("arrowleft", { fn: this.handleArrowLeft, keyboard: { phase: "keydown" }, private: true });
    this.ctlr.registerAction("arrowright", { fn: this.handleArrowRight, keyboard: { phase: "keydown" }, private: true });
    this.ctlr.registerAction("arrowup", { fn: this.handleArrowUp, keyboard: { phase: "keydown" }, private: true });
    this.ctlr.registerAction("arrowdown", { fn: this.handleArrowDown, keyboard: { phase: "keydown" }, private: true });
    this.ctlr.registerAction("home", { fn: () => (this.media.intent.currentTime = 0), keyboard: { phase: "keyup" }, private: true });
    this.ctlr.registerAction("0", { fn: () => (this.media.intent.currentTime = 0), keyboard: { phase: "keyup" }, private: true });
    this.ctlr.registerAction("end", { fn: () => (this.media.intent.currentTime = this.media.status.duration), keyboard: { phase: "keyup" }, private: true });
    for (const n of "123456789".split("")) this.ctlr.registerAction(n, { fn: () => (this.media.intent.currentTime = getMediaTime(this.media, +n / 10)), keyboard: { phase: "keyup" }, private: true });
    this.ctlr.registerAction("playpause", { fn: this.handlePlayTriggerDown, keyboard: { phase: "keydown" }, private: true });
    this.ctlr.payload.wired ? this.syncEventListeners() : this.ctlr.state.wonce("readyState", this.syncEventListeners, { signal: this.signal }); // #HEAVY: waits for !lightState
    super.wire();
  }

  protected getHook(phase: KeyPhase, action: string): string | undefined {
    const entry = this.ctlr.actions[action];
    if (!entry || !entry.keyboard) return;
    const matches = isArr(entry.keyboard.phase) ? entry.keyboard.phase.includes(phase) : entry.keyboard.phase === phase;
    return matches ? action : undefined;
  }
  protected handleKeyDown(e: KeyboardEvent, action = allowed(e, this.settings.keys), mod = this.getMod(e)): void {
    if (action === false) return;
    action && this.ctlr.plug("settings.overlay")?.show();
    const hook = this.getHook("keydown", action as string);
    hook && this.ctlr.throttle("keyDown", () => this.ctlr.runAction(hook, e, mod), 30);
  }
  protected handleKeyUp(e: KeyboardEvent, action = allowed(e, this.settings.keys), mod = this.getMod(e)): void {
    if (action === false) return;
    action ? this.ctlr.plug("settings.overlay")?.show() : this.teachBasics();
    const hook = this.getHook("keyup", action as string);
    hook && this.ctlr.runAction(hook, e, mod);
  }

  protected handlePlayTriggerDown(e: KeyboardEvent): void {
    this.playTriggerSeq++;
    this.playTriggerSeq === 1 && (e.currentTarget as Window | null)?.addEventListener("keyup", this.handlePlayTriggerUp, { signal: this.signal });
    this.playTriggerSeq === 2 && this.settings.fastPlay.key && this.ctlr.plug("settings.fastPlay")?.fastPlay(e.shiftKey ? "backwards" : "forwards");
  }

  protected handlePlayTriggerUp(e: KeyboardEvent, action = allowed(e, this.settings.keys)): void {
    action && this.ctlr.plug("settings.overlay")?.show();
    if (action !== false && [" ", "playpause"].includes(action as string)) {
      e.stopImmediatePropagation();
      if (this.playTriggerSeq === 1) this.media.intent.paused = !this.media.state.paused;
      this.ctlr.plug("settings.notifiers")?.notify(this.media.intent.paused ? "mediapause" : "mediaplay");
    }
    const fastPlug = this.ctlr.plug("settings.fastPlay");
    if (fastPlug?.speedCheck && this.playTriggerSeq > 1 && !fastPlug?.speedPtrCheck) fastPlug.slowDown();
    this.playTriggerSeq = 0;
    (e.currentTarget as Window | null)?.removeEventListener("keyup", this.handlePlayTriggerUp);
  }

  protected handleEscape(): void {
    this.ctlr.isUIActive("miniplayer") && (this.media.intent.miniplayer = false);
    (this.ctlr.isUIActive("pictureInPicture") || this.ctlr.isUIActive("floatingPlayer")) && (this.media.intent.pictureInPicture = false);
  }

  protected handleArrowLeft(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.gesture")?.stopSkipPersist();
    this.ctlr.plug("settings.time")?.skip(-this.getModded("skip", mod, 5));
    this.ctlr.plug("settings.notifiers")?.notify("bwd");
  }
  protected handleArrowRight(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.gesture")?.stopSkipPersist();
    this.ctlr.plug("settings.time")?.skip(this.getModded("skip", mod, 5));
    this.ctlr.plug("settings.notifiers")?.notify("fwd");
  }
  protected handleArrowUp(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.volume")?.changeAptValue(this.getModded("volume", mod, 5));
    this.media.features.volume && this.ctlr.plug("settings.notifiers")?.notify("volumeup");
  }
  protected handleArrowDown(_: KeyboardEvent, mod: KeyMod): void {
    this.ctlr.plug("settings.volume")?.changeAptValue(-this.getModded("volume", mod, 5));
    this.media.features.volume && this.ctlr.plug("settings.notifiers")?.notify(!this.media.state.volume ? "volumemuted" : "volumedown");
  }

  public setEventListeners(action: "add" | "remove" = "add"): void {
    const ws = this.getWindows();
    for (const w of ws) w.removeEventListener("keydown", this.handleKeyDown), w.removeEventListener("keyup", this.handleKeyUp);
    if (action === "remove" || !this.shouldListen()) return;
    for (const w of ws) w.addEventListener("keydown", this.handleKeyDown, { signal: this.signal });
    for (const w of ws) w.addEventListener("keyup", this.handleKeyUp, { signal: this.signal });
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
