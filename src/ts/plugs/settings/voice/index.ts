import { BasePlug } from "@plugs/base";
import type { Controller } from "@core/controller";
import { force, getPath, setPath, mirror } from "sia-reactor/utils";
import { limited, setTimeout } from "@utils/fn";
import type { VoiceStage, VoiceConfig, VoiceState } from "./types";
import { VOICE_BUILD } from "./build";
import { capitalize, camelize, uncamelize, fuzzyBlobMatch as blobMatch, fuzzyChunkMatch as chunkMatch, getLevenshteinSimilarity, luid, uncam, fpath, fvalue } from "@utils/str";
import { formatActionTooltip } from "@utils/keys";
import { type ToastOptions } from "@t007/toast";
import { REvent } from "sia-reactor";
import { CtlrConfig } from "@defs/config";
import { tutorialOpts } from "../toasts";
import { Action } from "@defs/action";
import { IconRegistry, PinRegistry } from "@core/registries";
import { type VoiceAiPin } from "./ai";
import { isArr, isDef } from "@utils/obj";
import { IS_MOBILE } from "@utils/env";
import { globalState } from "@tools/runtime";

export class VoicePlug extends BasePlug<VoiceConfig, VoiceState> {
  public static readonly plugName = "voice";
  public static readonly BUILD = VOICE_BUILD;
  public ai?: VoiceAiPin;
  public recognition?: any;
  public readonly TIDS = { QUOTER: `tmg-media-voice-quoter-for-${this.ctlr.config.id}`, ROUTER: `tmg-media-voice-router-for-${this.ctlr.config.id}`, TEACHER: `tmg-media-voice-teacher-for-${this.ctlr.config.id}` };
  protected teachBasics = limited(() => this.view?.(`Follow the guides at the ${(this.config.toasts.router.position || "bottom-left").replace("-", " ")}. Click ⚙ for settings`, { ...tutorialOpts(this.teachBasics.block), id: this.TIDS.TEACHER, signal: this.signal }), { key: `${luid()}_voice_basics`, maxTimes: 6, perSession: 2 });
  protected snublist: Array<Action["id"]> = ["voiceToggleOn", "voiceToggleOff"] as const;
  protected history: string[] = ["*"];
  protected historyIdx: number = 0;
  protected snoozedAt = 0;

  constructor(ctlr: Controller, config = ctlr.settings.voice) {
    super(ctlr, config, { ctx: "*", routing: false });
    const AiPin = PinRegistry.get("voice.ai");
    if (AiPin) this.ai = new AiPin(this.ctlr, this.config.ai);
  }

  public override mount(): void {
    // Variables Assignment
    this.ai?.mount?.();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    this.recognition = new SpeechRecognition();
    Object.assign(this.recognition, { continuous: true, interimResults: true, onresult: this.onResult, onend: this.onEnd, onerror: this.onError });
  }

  public override wire(): void {
    const autoClose = () => (this.config.toasts.quoter.autoClose = this.state.routing || this.config.toasts.behavior.value === "persistent" ? false : true);
    // Event Listeners
    ["click", "click", "keydown", "input", "mousemove", "touchmove", "wheel"].forEach((ev, i) => this.container?.addEventListener(ev, !i ? this.handleClick : i < 4 ? this.handleInput : this.stayWoke, { passive: i > 4, signal: this.signal }));
    // State Watchers
    this.state.watch("ctx", this.onCtx, { signal: this.signal }), autoClose();
    // ----- Listeners
    this.state.on("ctx", this.predict, { signal: this.signal }); // The single source of truth for rendering the UI
    this.state.on("routing", ({ value }) => (autoClose(), this.media.container.classList.toggle("tmg-media-path-routing", value)), { signal: this.signal });
    // Ctlr Config Setters
    this.ctlr.config.set("settings.voice.active.value", (v) => (v === "passive" && !this.config.commands.voiceWake.length ? false : v), { init: true, signal: this.signal });
    // ---- Media Watchers
    this.media.watch("tech", () => (this.media.tech.polyfill("voice", true), this.syncFeatures()), { init: true, signal: this.signal }); // falls back to tap routing
    // ---- State Listeners
    this.ctlr.state.on("mediaIntersecting", () => this.ctlr.debounce("listenerSyncing", this.syncListener, 500, false, this.signal), { signal: this.signal });
    globalState.on("isVisible", () => this.ctlr.debounce("listenerSyncing", this.syncListener, 500, false, this.signal), { signal: this.signal });
    // ---- Config -------
    this.ctlr.config.on("settings.voice.active.value", this.handleActive, { signal: this.signal });
    this.ctlr.config.on("settings.voice.muted", ({ value }) => (value && this.recognition?.abort(), this.start(), this.media.container.classList.toggle("tmg-media-voice-muted", value)), { init: true, signal: this.signal });
    this.ctlr.config.on("settings.voice.ai.feedback.volume", ({ value, oldValue }) => (!value || !oldValue) && this.config.ai.active && this.start(), { signal: this.signal });
    for (const p of ["settings.voice.routing.strict.value", "devMode"] as const) this.ctlr.config.on(p, this.predict, { signal: this.signal });
    this.ctlr.config.on("settings.voice.commands.voiceWake", ({ value }) => !this.state.routing && (value.length ? this.start() : (this.config.active.value = false)), { signal: this.signal });
    this.ctlr.config.on("settings.voice.toasts.behavior.value", () => (autoClose(), this.start()), { signal: this.signal });
    this.ctlr.config.on("settings.voice.toasts.quoter", ({ type, value, target: { key } }) => this.view?.update(this.TIDS.QUOTER, type !== "update" ? value : ({ [key]: value } as any)), { signal: this.signal });
    this.ctlr.config.on("settings.voice.toasts.router", ({ type, value, target: { key } }) => this.view?.update(this.TIDS.ROUTER, type !== "update" ? value : ({ [key]: value } as any)), { signal: this.signal });
    this.ctlr.config.on("disabled", this.syncListener, { signal: this.signal });
    // Post Wiring
    this.ctlr.learn("voiceWake", { voice: { stage: "anytime", match: "chunk" } }, this.signal);
    this.ctlr.learn("voiceQuit", { voice: { stage: "anytime" } }, this.signal);
    this.ctlr.learn("voiceMute", { voice: { stage: "anytime" } }, this.signal);
    this.ctlr.learn("voiceSubmit", { fn: () => this.submit(), voice: { stage: "pre-route" } }, this.signal);
    this.ctlr.learn("voicePrevious", { fn: this.previous, keyboard: { phase: "keydown" }, voice: { stage: "pre-route" } }, this.signal);
    this.ctlr.learn("voiceNext", { fn: this.next, keyboard: { phase: "keydown" }, voice: { stage: "pre-route" } }, this.signal);
    this.ctlr.learn("voiceClear", { fn: this.reset, voice: { stage: "pre-route" } }, this.signal);
    this.ctlr.flags.wired ? this.syncListener() : this.ctlr.state.wonce("readyState", this.syncListener, { signal: this.signal }); // #HEAVY: waits for !light. If wake word is enabled, start the engine immediately in "sleep" mode
    this.ai?.wire?.(), super.wire();
  }

  protected onResult(e: any, transcript = ""): void {
    this.snooze();
    if (this.ai?.state.speaking) return;
    if (!this.config.muted) for (let i = e.resultIndex, len = e.results.length; i < len; ++i) transcript += e.results[i][0].transcript;
    transcript = transcript.trim().toLowerCase();
    !this.config.muted && (this.state.routing || this.config.toasts.behavior.value !== "strict") && this.view?.(transcript ? `${transcript}${!this.state.routing ? `... Say ${this.linked(isArr(this.config.commands.voiceWake) ? this.config.commands.voiceWake[0] : this.config.commands.voiceWake)}!` : ""}` : this.getRouterSpeech(this.state.routing && !IS_MOBILE ? "Didn't catch that..." : undefined, this.state.routing ? "" : undefined), this.getRouterOptions());
    this.input(transcript, '[name="voice_path"]'), transcript && this.ctlr.debounce("voiceProcessing", () => `${e.resultIndex}-${transcript}` !== this.prevRes && ((this.prevRes = `${e.resultIndex}-${transcript}`), this.process(transcript)), 500, false, this.signal); // Process after delay
  }
  private prevRes: string | false = false;
  protected onEnd(): void {
    (this.prevRes = false), this.config?.active.value && this.shouldListen() && this.start();
  }
  protected onError(e: any): void {
    if (e.error?.endsWith?.("not-allowed")) this.config.muted ? this.start() : ((this.config.active.value = false), this.view?.error("Microphone access revoked. Please check your settings.", { tag: "tmg-mard" }));
  }

  protected handleActive({ value }: REvent<CtlrConfig, "settings.voice.active.value">): void {
    value === false ? this.stop() : this.shouldListen() && (value === "passive" ? this.sleep() : this.wakeUp(), this.start());
  }
  public syncListener(): void {
    !this.shouldListen() ? this.stop(true) : (this.config.active.value === true && this.wakeUp(), this.start());
  }
  public shouldListen(): boolean {
    return this.ctlr.flags.wired && ((globalState.isVisible && this.ctlr.state.mediaIntersecting) || this.config.muted) && !this.ctlr.config.disabled;
  }

  protected async request(): Promise<"granted" | "denied" | "cancelled" | "nuked"> {
    const state = (await navigator.permissions?.query({ name: "microphone" }).catch(() => null))?.state ?? "prompt";
    if (state === "granted" || state === "denied") return state;
    // prettier-ignore
    return t007.toast?.dismiss(this.TIDS.ROUTER), new Promise((res, _, req?: () => void, i = 0) => ((req = () => this.view?.("Voice control requires mic access", { id: this.TIDS.QUOTER, signal: this.signal, ...this.config.toasts.quoter, type: "info", autoClose: false, actions: { OK: () => navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => (s.getTracks().forEach((t) => t.stop()), res("granted"))).catch(async (e) => (await navigator.permissions?.query({ name: "microphone" as any }).then(p => p?.state === "denied", () => e.message === "Permission denied")) || ++i > 3 ? res("cancelled") : this.view?.warn("Grant permission to use microphone", { id: this.TIDS.QUOTER, autoClose: false, actions: { Retry: req! } })), ...this.getRouterActions(false) }, onClose: (_, user) => res(user ? "cancelled" : "nuked") }) || res("nuked"))())); // #EXTRA-MILE: doing the most with the least
  }
  public async start(): Promise<void> {
    if (!this.config.active.value) return;
    let state = this.config.muted ? "granted" : await this.request();
    if (state === "nuked" || !this.config) return; // only death i know hence abort over config check
    state === "granted" && (this.config.toasts.behavior.value === "persistent" || t007.toast.isActive(this.TIDS.QUOTER)) && this.view?.(this.getRouterSpeech(), this.getRouterOptions());
    if (this.state.routing) this.goTo(), !this.config.ai.active && t007.toast.isActive(this.TIDS.ROUTER) && this.teachBasics();
    try {
      state === "granted" ? !this.config.muted && this.recognition?.start() : this.onError({ error: "not-allowed" });
    } catch (e) {} // Silence the InvalidStateError since we might call when already on due to wake word
  }
  public stop(light = false): void {
    this.state.routing = this.prevRes = false;
    this.recognition?.abort(), !light && this.ai?.stop(), this.ai?.texter?.render(null);
    for (const k in this.TIDS) t007.toast?.dismiss(this.TIDS[k as keyof typeof this.TIDS]);
    this.ctlr.cancelTimeout("debounce", "voiceProcessing"), this.ctlr.cancelRAFLoop("voiceSnoozing");
  }
  protected wakeUp(): void {
    if (this.state.routing) return;
    (this.state.routing = true), this.ai?.text(), this.clearCtx();
    this.view?.(this.getRouterSpeech(), this.getRouterOptions()), this.snooze();
  } // #STANDALONE: needs scoped behavior
  protected sleep(): void {
    if (!this.state.routing) return;
    (this.state.routing = this.prevRes = false), this.ctlr.cancelRAFLoop("voiceSnoozing");
    this.ai?.stop(), this.ai?.texter?.render(null), t007.toast?.dismiss(this.TIDS.ROUTER), !this.config.active.value || this.config.toasts.behavior.value !== "persistent" ? t007.toast?.dismiss(this.TIDS.QUOTER) : this.view?.(this.getRouterSpeech(), this.getRouterOptions());
  } // #STANDALONE: needs scoped behavior

  public trigger(transcript: string, stage: VoiceStage = this.config.process.stage.value): boolean {
    for (const act of Object.values(this.ctlr.actions.entries)) {
      const cmd = this.config.commands[act.id];
      if (!cmd?.length || (act.id !== "voiceWake" && !this.config.process.allowCommands) || this.snublist.includes(act.id) || (act.voice?.stage || this.config.process.stage.value) !== stage || (act.id === "voiceWake" && this.state.routing) || act.gates?.some((g) => !this.media.features[g])) continue;
      if (((act.voice?.match || this.config.process.match.value) === "chunk" ? chunkMatch : blobMatch)(cmd, transcript, this.config.process.accuracy)) return this.ctlr.perform(act.id) && (act.id === "voiceSubmit" || this.view?.success(`Triggered <b>${act.label ?? capitalize(uncamelize(act.id))}</b>`, { id: this.TIDS.QUOTER, icon: true, autoClose: this.config.toasts.quoter.autoClose })), true;
    }
    return false;
  }
  public process(transcript: string, cleaned = transcript.replace(/[-\s]/g, ""), isSubmit = false, dormant = !this.state.routing): boolean {
    if (this.trigger(transcript, "anytime") || dormant) return !dormant;
    // --- 1. PRE-ROUTE STAGE ---
    if (this.trigger(transcript, "pre-route")) return true;
    if (this.ai?.config.active) return this.ai.process(transcript, isSubmit);
    // --- 2. PATH|LEAF EXECUTION (PRIORITY) ---
    if (!this.ctlr.isLogical(this.state.ctx, true)) {
      const paths = this.ctlr.getLogicPaths(this.state.ctx);
      // prettier-ignore
      let match: string | null = null, highest = 0, len = paths.length;
      if (len)
        for (let i = 0; i < len; i++) {
          const leaf = paths[i].split(".").pop()!.toLowerCase();
          // prettier-ignore
          if (cleaned === leaf) { match = paths[i]; break; }
          const score = getLevenshteinSimilarity(leaf, transcript);
          if (score > this.config.process.accuracy && score > highest) (highest = score), (match = paths[i]);
        } // Fuzzy Match: Check if the user said the last word of any valid path
      if (match) {
        if (this.ctlr.isLogical(this.goTo(match), true)) return this.execute(transcript, match, true), true; // If a S.I.A path strongly matches what they said, TAKE IT. Bypasses commands completely.
      } else if (isSubmit) {
        const path = this.state.ctx === "*" ? transcript : `${this.state.ctx}.${camelize(transcript)}`,
          val = this.ctlr.isLogical(path) ? getPath(this.ctlr.logicRoot as any, mirror(path, this.ctlr.logicRoot)) : undefined;
        if (val !== undefined && this.ctlr.isLogical(this.goTo(path), true, val)) return this.execute(transcript, path, true), true; // Hey dev or explorer, here u go!
      }
    } else if (this.execute(transcript, undefined, false)) return true;
    // --- 4. POST-ROUTE STAGE ---
    return this.trigger(transcript, "post-route"); // ? true : this.ai ? this.ai.process(transcript, isSubmit) : false;
  }
  public parse(transcript: string, path = this.state.ctx, isNav = false, value = getPath(this.ctlr.logicRoot as any, mirror(path, this.ctlr.logicRoot)), type = isArr(value) ? "array" : typeof value): any {
    if (type === "boolean") return isNav && this.config.routing.autoToggles ? !value : chunkMatch(this.config.commands.voiceToggleOn, transcript, this.config.process.accuracy) ? true : chunkMatch(this.config.commands.voiceToggleOff, transcript, this.config.process.accuracy) ? false : null;
    if (isNav) return null;
    if (type === "number") {
      const match = transcript.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
      return match ? Number(match[0]) : null;
    } else if (type === "string" || type === "array") return transcript ? (type === "string" ? transcript : transcript.split(/\s*(?:,|and)\s*/i).filter(Boolean)) : null;
    return null;
  }
  public execute(transcript: string, path = this.state.ctx, isNav = false, isSubmit = false, value = this.parse(transcript, path, isNav), type = isArr(value) ? "array" : typeof value): boolean {
    if (value === null) return false;
    if ((this.config.routing.strict.value === true || (this.config.routing.strict.value === "auto" && type === "string")) && !isSubmit) return this.input(type === "array" ? value.join(", ") : String(value)), this.view?.update(this.TIDS.QUOTER, { render: transcript || fvalue(value), ...this.getRouterOptions(false) }), true; // auto|strict: Blocks execution for strings only (or everything if true)
    return setPath(this.ctlr.logicRoot as any, path as any, value), this.previous(), setTimeout(() => (this.view?.success(`${fpath(path)} -> <code>${fvalue(value)}</code>`, { id: this.TIDS.QUOTER, icon: true, autoClose: this.config.toasts.quoter.autoClose }), this.ctlr.plug("settings.temporal")?.teachBasics()), 200, this.signal), true; // last to render
  }
  public input<I extends HTMLInputElement = HTMLInputElement>(value?: string, selector = clame("input"), input = this.container?.querySelector<I>(selector) ?? null): I | null {
    return input && isDef(value) && (input.value = value!), input;
  }
  public submit(render = this.input()?.value.trim() || this.ai?.state.prompt.trim(), process = false): void {
    if (render) this.view?.update(this.TIDS.QUOTER, { render, ...this.getRouterOptions(false) }), this.ai?.config.active ? this.ai.submit(render) : !process ? this.execute(render, undefined, false, true) : this.process(render, undefined, true); // Execute with isSubmit = true
  }
  public predict(): void {
    if (!this.state.routing) return;
    const isBusy = !!this.ai?.state.status,
      actions: ToastOptions["actions"] = {},
      crumbHtml = this.config.ai.active ? "" : `<div class="tmg-media-voice-crumb-wrap">` + (this.history.length < 2 ? `<small><b>Path Router</b></small>` : this.history.map((p, idx, _, active = idx === this.historyIdx) => `<small style="${active ? "font-weight: 500;" : "opacity: 0.8;"}">${this.linked(p === "*" ? "Root" : uncam(p.split(".").pop()!), p, "goto")}</small>`).join(" <span style='opacity: 0.4;'><small>></small></span> ")) + `</div>`;
    if (this.media.features.ai) actions[`<span title='Toggle AI Copilot${formatActionTooltip(this.settings, "ai")}' ${this.config.ai.active ? "data-auto" : ""}>✨</span>`] = () => this.ctlr.perform("ai");
    if (!isBusy && (this.media.features.voiceNext || this.media.features.voicePrevious)) {
      actions[`<span title='${this.config.ai.active ? "Undo AI changes" : "Go back"}${formatActionTooltip(this.settings, "voicePrevious")}' ${this.media.features.voicePrevious ? "" : "disabled"}>‹</span>`] = this.previous;
      actions[`<span title='${this.config.ai.active ? "Redo AI changes" : "Go forward"}${formatActionTooltip(this.settings, "voiceNext")}' ${this.media.features.voiceNext ? "" : "disabled"}>›</span>`] = this.next;
    } // actions[`<span title='${this.config.ai.active ? "Reset" : "Clear"} context${formatActionTooltip(this.settings, "voiceClear")}'>×</span>`] = this.reset;
    if (this.ai?.config.active) {
      const showSubmit = this.media.tech.polyfill("aiStop", isBusy) || this.media.tech.polyfill("voiceSubmit", this.config.routing.strict.value === true || this.config.routing.strict.value === "auto"),
        submitHtml = isBusy || showSubmit ? `<button type="button" class="tmg-media-voice-input-btn" title='${isBusy ? `Stop ${formatActionTooltip(this.settings, "aiStop")}` : `Submit ${formatActionTooltip(this.settings, "voiceSubmit")}`}' data-action="${isBusy ? "stop" : "submit"}">${isBusy ? "■" : "↳"}</button>` : "",
        inputHtml = `<div class="tmg-media-voice-input-wrap"><textarea rows="${isBusy ? 1 : 2}" name="voice_prompt" class="tmg-media-voice-input" placeholder="${isBusy ? "Working, Click ■ to stop" : "Ask anything or tell the player what to do"}" ${isBusy ? "disabled" : ""}></textarea>${submitHtml}</div>`;
      return this.view?.(`${crumbHtml}<div class="tmg-media-voice-content">${isBusy ? `<div class="tmg-media-voice-ai-bubble"><small>${this.ai.state.status}</small></div>` : ""}${inputHtml}</div>`, this.getHelperOptions(actions)), this.input(this.ai.state.prompt || "")?.[this.config.muted ? "focus" : "blur"]();
    } else if (this.ctlr.isLogical(this.state.ctx, true)) {
      const value = getPath(this.ctlr.logicRoot, mirror<any>(this.state.ctx, this.ctlr.logicRoot)),
        type = isArr(value) ? "array" : typeof value,
        showInput = this.config.routing.strict.value === true || type !== "boolean", // (this.config.routing.strict.value === "auto" && type !== "boolean")
        showSubmit = this.media.tech.polyfill("voiceSubmit", this.config.routing.strict.value === true || (this.config.routing.strict.value === "auto" && type === "string")),
        display = type === "array" ? value.join(", ") : value ?? "",
        inputHtml = showInput ? `<div class="tmg-media-voice-input-wrap"><input name="voice_value" type="${type === "number" ? "number" : "text"}" class="tmg-media-voice-input" placeholder="${display || (type === "boolean" ? "true" : type === "number" ? "0" : type === "array" ? "value 1, value 2, value 3, ..." : "...text")}"/>${showSubmit ? `<button type="button" title='Submit ${formatActionTooltip(this.settings, "voiceSubmit")}' class="tmg-media-voice-input-btn" data-action="submit">↳</button>` : ""}</div>` : "",
        hints = type === "boolean" ? `${(isArr(this.config.commands.voiceToggleOn) ? this.config.commands.voiceToggleOn.slice(0, 2) : [this.config.commands.voiceToggleOn]).map((v) => this.linked(v)).join(", ")} or ${(isArr(this.config.commands.voiceToggleOff) ? this.config.commands.voiceToggleOff.slice(0, 2) : [this.config.commands.voiceToggleOff]).map((v) => this.linked(v)).join(", ")} ${inputHtml}` : type === "number" ? `a number (like ${this.linked("0")}, ${this.linked("50")}):</small> ${inputHtml}` : type === "array" ? `comma-separated values:</small> ${inputHtml}` : `the exact text:</small> ${inputHtml}`;
      return this.view?.(`${crumbHtml}<div class="tmg-media-voice-content">${showInput ? '<small style="font-weight: 500;">' : ""}Try ${this.config.muted ? (showInput ? "typing" : IS_MOBILE ? "tapping" : "clicking") : "saying"} ${hints}</div>`, this.getHelperOptions(actions)), this.input(display)?.[this.config.muted ? "focus" : "blur"]();
    }
    const paths = this.ctlr.getLogicPaths(this.state.ctx),
      inputHtml = `<input name="voice_path" type="text" class="tmg-media-voice-input" placeholder="...text"/>`;
    paths.length && this.view?.(`${crumbHtml}<div class="tmg-media-voice-content"><small style="font-weight: 500;">Try ${this.config.muted ? (IS_MOBILE ? "tapping" : "clicking") : "saying"} any of these:</small><br>${inputHtml} <span style='opacity: 0.4;'><small>•</small></span> ${paths.map((p) => this.linked(uncam(p.split(".").pop()!))).join(" <span style='opacity: 0.4;'><small>•</small></span> ")}</div>`, this.getHelperOptions(actions));
  }

  public previous(): void {
    if (this.media.features.voicePrevious) this.config.ai.active ? this.ai?.module.undo() : this.goTo(this.history[--this.historyIdx]);
  }
  public next(): void {
    if (this.media.features.voiceNext) this.config.ai.active ? this.ai?.module.redo() : this.goTo(this.history[++this.historyIdx]);
  }
  public reset(): void {
    if (this.media.features.voiceClear) this.config.ai.active ? this.ai?.module.reset() : this.clearCtx(false);
  }
  public goTo(path = this.state.ctx, useForce = path === this.state.ctx, rebuild = false): string {
    if (rebuild) this.history = ["*", ...path.split(".").reduce<string[]>((a, p) => (a.push(a.length ? `${a[a.length - 1]}.${p}` : p), a), [])];
    return force(() => (this.state.ctx = path), useForce);
  }
  public clearCtx(direct = this.config.routing.direct): void {
    (this.history = direct ? ["*", "media", "media.intent"] : ["*"]), this.goTo(direct ? "media.intent" : "*", true);
  }
  protected onCtx(value: string): void {
    if (this.history[this.historyIdx] !== this.state.ctx) {
      const idx = this.history.indexOf(this.state.ctx);
      idx === -1 && this.history.splice(this.historyIdx + 1, this.history.length, value), (this.historyIdx = idx !== -1 ? idx : this.history.length - 1);
    }
    this.media.tech.polyfill(["voiceSubmit", "aiStop"], false), this.syncFeatures();
  }

  public linked(text: string, value = text.toLowerCase(), type?: "menu" | "goto", rebuild = false, punc = type || this.config.muted ? "" : '"'): string {
    return `${punc}<u class="tmg-media-voice-link" title='${type ? "Go to" : "Say"} "${value}"' ${type ? `data-${type}` : "data-cmd"}="${value}" ${rebuild ? 'data-rebuild="true"' : ""} tabindex="0" style="cursor:pointer; text-decoration-color: rgb(from var(--tmg-media-brand-${type ? "accent-" : ""}color) r g b / 0.75);">${type || this.config.muted ? text : value}</u>${punc}`;
  } // `""` is my lil UI Experiment, crafting a standard here :)
  public stayWoke(e: Event): void {
    this.state.routing && this.ctlr.throttle("voiceWaking", () => e.composedPath().some((el) => (el as HTMLElement)?.matches?.(`:is([id="${this.TIDS.ROUTER}"],[id="${this.TIDS.QUOTER}"],[class="tmg-media-captions-container"])`)) && this.snooze(), 500);
  }
  public snooze(): void {
    if (!this.state.routing) return this.ctlr.cancelRAFLoop("voiceSnoozing");
    this.snoozedAt = performance.now();
    !this.ai?.state.status && !this.ai?.state.speaking ? this.ctlr.RAFLoop("voiceSnoozing", this.snoozeCb, this.signal) : this.ctlr.cancelRAFLoop("voiceSnoozing");
  }
  protected snoozeCb(): void {
    const toast = t007.toasts.get(this.TIDS.ROUTER),
      progress = Math.max(0, 1 - (performance.now() - this.snoozedAt) / this.config.routing.timeout);
    if (toast) toast.toastElement.classList.add("progress"), (toast.nprogress = progress);
    if (progress <= 0) this.ctlr.cancelRAFLoop("voiceSnoozing"), (this.config.active.value = "passive");
  }
  protected handleClick(e: Event, t = e.target as HTMLElement, menu = this.ctlr.plug("settings.panel")?.menu): string | void {
    if (!t?.matches?.(clame("link"))) return;
    e.preventDefault(), e.stopPropagation();
    if (t.dataset.goto) return this.config.ai.active && (this.config.ai.active = false), this.goTo(t.dataset.goto, undefined, !!t.dataset.rebuild);
    if (t.dataset.menu) return menu?.open(), menu?.goTo(t.dataset.menu);
    this.view?.update(this.TIDS.QUOTER, { render: t.dataset.cmd, ...this.getRouterOptions(false) }); // Instantly update the quoter toast to show they "clicked/said" it
    this.process(t.dataset.cmd || ""); // Pipe it straight into the processor as if they spoke it!
  }
  protected handleInput(e: Event, t = e.target as HTMLInputElement, isClick = e.type === "click", isEnter = e.type === "keydown" && (e as KeyboardEvent).key === "Enter" && !(e as KeyboardEvent).shiftKey): string | void {
    this.stayWoke(e);
    if (e.type === "input" && t.name === "voice_prompt") return this.ai?.draft(t.value);
    if (!t?.tagName || !((isEnter && t.matches(clame("input"))) || (isClick && t.matches(clame("input-btn"))))) return;
    e.preventDefault(), e.stopPropagation(), !this.ai?.config.active ? this.submit(t.value ?? this.input()?.value, !t.closest(clame("input-wrap"))) : t.dataset.action === "stop" ? this.ai?.stop() : this.ai.submit(this.input()?.value);
  }

  protected getHelperOptions(actions?: ToastOptions["actions"]): ToastOptions {
    return { id: this.TIDS.ROUTER, actions, onClose: (_, user) => user && (this.config.active.value = "passive"), signal: this.signal, ...this.config.toasts.router, icon: !this.config.ai.active && this.config.toasts.router.icon };
  }
  protected getRouterOptions(full = true): ToastOptions {
    return full ? { id: this.TIDS.QUOTER, actions: this.getRouterActions(), onClose: (_, user) => user && (this.config.active.value = false), signal: this.signal, ...this.config.toasts.quoter, ...this.getRouterOptions(false) } : { icon: this.config.toasts.quoter.icon, type: this.config.muted ? "warning" : this.config.toasts.quoter.type };
  }
  protected getRouterActions(full = true): ToastOptions["actions"] {
    return {
      ...(full && this.state.routing && { [`<span title='Open ${this.config.ai.active ? "settings" : "actions"}'>${IconRegistry.get("settings")}</span>`]: (_, __, menu = this.ctlr.plug("settings.panel")?.menu) => (menu?.open(null), menu?.goTo(this.config.ai.active ? "advanced.interaction.voice.voiceAi" : "advanced.actions")) }),
      [`<span title='${this.config.muted ? "Unmute" : "Mute"} mic${formatActionTooltip(this.settings, "voiceMute")}'>${IconRegistry.get(this.config.muted ? "micOff" : "mic", true)}</span>`]: () => (this.config.muted = !this.config.muted),
      ...(full && this.state.routing && this.config.ai.active && { [`<span title='${this.config.ai.feedback.volume ? "Mute" : "Unmute"} copilot'>${IconRegistry.get(this.config.ai.feedback.volume ? "volumeHigh" : "volumeMuted", true)}</span>`]: () => (this.config.ai.feedback.volume = this.config.ai.feedback.volume ? 0 : 1) }),
    };
  }
  protected getRouterSpeech(firstHalf = this.config.muted ? "Snubbing..." : "Listening...", secondHalf = `${this.config.muted ? (this.config.ai.active ? "Type" : IS_MOBILE ? "Tap" : "Click") : "Say"} ${!this.state.routing ? `${isArr(this.config.commands.voiceWake) ? this.config.commands.voiceWake.map((c = "") => this.linked(c)).join(" or ") : this.linked(this.config.commands.voiceWake)} to wake me up` : this.config.muted ? `${this.config.ai.active ? "" : "or type "}instead` : this.config.ai.active ? "anything!" : "a path or command!"}`): string {
    return `${firstHalf} ${secondHalf}`;
  }
  public get container() {
    return this.ctlr.plug("settings.toasts")?.container;
  }
  public get view() {
    return this.ctlr.toast;
  }

  public syncFeatures(): void {
    const { canUndo: u, canRedo: r } = this.ai?.module ?? { canUndo: false, canRedo: false };
    this.media.tech.polyfill("voicePrevious", this.config.ai.active ? u : this.historyIdx > 0);
    this.media.tech.polyfill("voiceNext", this.config.ai.active ? r : this.historyIdx < this.history.length - 1);
    this.media.tech.polyfill("voiceClear", this.config.ai.active ? u || r : this.history.length > 1);
  }
  public override onDestroy(): void {
    this.stop(), this.ai?.destroy(), super.onDestroy();
  }
}
export const clame = (sfx: string) => `.tmg-media-voice-${sfx}`;

export type * from "./types";
export * from "./build";
export * from "./ai";

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.voice": typeof VoicePlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    voice: VoiceConfig;
  }
}

declare module "@defs/contract" {
  interface MediaFeaturesExt {
    voice: boolean;
    voicePrevious: boolean;
    voiceNext: boolean;
    voiceClear: boolean;
    voiceSubmit: boolean;
  }
}
