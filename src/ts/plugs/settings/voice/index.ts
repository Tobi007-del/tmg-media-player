import { BasePlug } from "@plugs/base";
import type { Controller } from "@core/controller";
import { force, getPath, setPath, mirror } from "sia-reactor/utils";
import { limited, setTimeout } from "@utils/fn";
import type { VoiceStage, VoiceConfig, VoiceState } from "./types";
import { VOICE_BUILD } from "./build";
import { capitalize, camelize, uncamelize, fuzzyBlobMatch, fuzzyChunkMatch, getLevenshteinSimilarity, luid, uncam, fpath, fvalue } from "@utils/str";
import { formatActionTooltip } from "@utils/keys";
import { type ToastOptions } from "@t007/toast";
import { REvent } from "sia-reactor";
import { CtlrConfig } from "@defs/config";
import { tutorialOpts } from "../toasts";
import { Action } from "@defs/action";
import { IconRegistry, PinRegistry } from "@core/registries";
import { type VoiceAiPin } from "./ai";
import { isArr } from "@utils/obj";
import { IS_MOBILE } from "@utils/env";
import { globalState } from "@tools/runtime";

export class VoicePlug extends BasePlug<VoiceConfig, VoiceState> {
  public static readonly plugName = "voice";
  public static readonly BUILD = VOICE_BUILD;
  public ai?: VoiceAiPin;
  protected recognition?: any;
  protected teachBasics = limited(() => this.view?.(`Follow the guides at the ${(this.config.feedback.helper.position || "bottom-left").replace("-", " ")}. Click ⚙ for settings`, { ...tutorialOpts(this.teachBasics.block), id: this.TIDS.TEACHER, signal: this.signal }), { key: `${luid()}_voice_basics`, maxTimes: 6, perSession: 2 });
  protected snublist: Array<Action["id"]> = ["voiceToggleOn", "voiceToggleOff"] as const;
  protected readonly TIDS = { ROUTER: `tmg-media-voice-router-for-${this.ctlr.config.id}`, HELPER: `tmg-media-voice-helper-for-${this.ctlr.config.id}`, TEACHER: `tmg-media-voice-teacher-for-${this.ctlr.config.id}` };
  protected history: string[] = ["*"];
  protected historyIdx: number = 0;

  constructor(ctlr: Controller, config = ctlr.settings.voice) {
    super(ctlr, config, { ctx: "*", routing: false });
    const AiPin = PinRegistry.get("voice.ai");
    AiPin && this.config.ai && (this.ai = new AiPin(this.ctlr, this.config.ai));
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
    // Event Listeners
    ["click", "click", "keydown", "mousemove", "touchmove", "scroll"].forEach((ev, i) => this.container?.addEventListener(ev, !i ? this.handleClick : i < 3 ? this.handleInput : this.stayWoke, { passive: i > 3, signal: this.signal }));
    // State Watchers
    this.state.watch("ctx", this.onCtx, { signal: this.signal });
    // ----- Listeners
    this.state.on("routing", ({ value }) => (this.media.container.classList.toggle("tmg-media-path-routing", value), (this.config.feedback.router.autoClose = value || this.config.feedback.behavior.value === "persistent" ? false : true)), { signal: this.signal });
    // Ctlr Config Setters
    this.ctlr.config.set("settings.voice.active.value", (v) => (v === "passive" && !this.config.commands.voiceWake.length ? false : v), { init: true, signal: this.signal });
    // ---- Media Watchers
    this.media.watch("tech", () => this.media.tech.polyfill("voice", true), { init: true, signal: this.signal }); // falls back to tap routing
    // ---- State Listeners
    this.ctlr.state.on("mediaIntersecting", () => this.ctlr.debounce("syncingListener", this.syncListener, 500, false, this.signal), { signal: this.signal });
    globalState.on("isVisible", () => this.ctlr.debounce("syncingListener", this.syncListener, 500, false, this.signal), { signal: this.signal });
    // ---- Config -------
    this.ctlr.config.on("settings.voice.active.value", this.handleActive, { signal: this.signal });
    this.ctlr.config.on("settings.voice.muted", ({ value }) => this.config.active.value && (value && this.recognition?.abort(), this.start()), { signal: this.signal });
    this.ctlr.config.on("settings.voice.feedback.behavior.value", ({ value }) => (this.config.feedback.router.autoClose = this.state.routing || value === "persistent" ? false : true), { init: true, signal: this.signal });
    this.ctlr.config.on("settings.voice.feedback.router", ({ type, value, target: { key } }) => this.view?.update(this.TIDS.ROUTER, type !== "update" ? value : ({ [key]: value } as any)), { signal: this.signal });
    this.ctlr.config.on("settings.voice.feedback.helper", ({ type, value, target: { key } }) => this.view?.update(this.TIDS.HELPER, type !== "update" ? value : ({ [key]: value } as any)), { signal: this.signal });
    this.ctlr.config.on("settings.voice.commands.voiceWake", ({ value }) => !this.state.routing && (value.length ? this.config.active.value && this.start() : (this.config.active.value = false)), { signal: this.signal });
    this.ctlr.config.on("disabled", this.syncListener, { signal: this.signal });
    this.ctlr.config.on("devMode", () => this.state.routing && this.predict(), { signal: this.signal });
    this.ctlr.learn("voiceWake", { voice: { stage: "anytime", match: "chunk" } }, this.signal);
    this.ctlr.learn("voiceQuit", { voice: { stage: "anytime" } }, this.signal);
    this.ctlr.learn("voiceMute", { voice: { stage: "anytime" } }, this.signal);
    this.ctlr.learn("voiceSubmit", { fn: () => this.submit(), voice: { stage: "pre-route" } }, this.signal);
    this.ctlr.learn("voiceCtxPrevious", { fn: this.goBack, keyboard: { phase: "keydown" } }, this.signal);
    this.ctlr.learn("voiceCtxNext", { fn: this.goForward, keyboard: { phase: "keydown" } }, this.signal);
    this.ctlr.learn("voiceCtxClear", { fn: () => this.clearCtx(false) }, this.signal);
    this.ctlr.flags.wired ? this.syncListener() : this.ctlr.state.wonce("readyState", this.syncListener, { signal: this.signal }); // #HEAVY: waits for !light. If wake word is enabled, start the engine immediately in "sleep" mode
    this.ai?.wire?.(), super.wire();
  }

  protected onResult(e: any): void {
    if (this.ai?.synth?.speaking) return;
    this.snooze();
    let transcript = "";
    if (!this.config.muted) for (let i = e.resultIndex, len = e.results.length; i < len; ++i) transcript += e.results[i][0].transcript;
    transcript = transcript.trim().toLowerCase();
    !this.config.muted && (this.state.routing || this.config.feedback.behavior.value !== "strict") && this.view?.(transcript ? `${transcript}${!this.state.routing ? `... Say ${this.linked(isArr(this.config.commands.voiceWake) ? this.config.commands.voiceWake[0] : this.config.commands.voiceWake)}!` : ""}` : this.getRouterSpeech(this.state.routing && !IS_MOBILE ? "Didn't catch that..." : undefined, this.state.routing ? "" : undefined), this.getRouterOptions());
    const input = this.container?.querySelector<HTMLInputElement>('input[name="voice_path"]');
    if (input) input.value = transcript;
    transcript && this.ctlr.debounce("voiceProcessing", () => `${e.resultIndex}-${transcript}` !== this.prevRes && ((this.prevRes = `${e.resultIndex}-${transcript}`), this.process(transcript)), 500, false, this.signal); // Process after delay
  }
  private prevRes: string | false = false;
  protected onEnd(): void {
    this.prevRes = false;
    this.config?.active.value && this.shouldListen() && this.start();
  }
  protected onError(e: any): void {
    if (e.error.endsWith("not-allowed")) this.config.muted ? this.start() : (this.config.active.value = false), this.view?.error("Microphone access revoked. Please check your settings.", { tag: "tmg-mard" });
  }

  protected handleActive({ value }: REvent<CtlrConfig, "settings.voice.active.value">): void {
    value === false ? this.stop() : this.shouldListen() && (value === "passive" ? this.sleep() : this.wakeUp(), this.start());
  }
  public syncListener(): void {
    !this.shouldListen() ? this.stop() : this.config.active.value && (this.config.active.value === true && this.wakeUp(), this.start());
  }
  protected shouldListen(): boolean {
    return this.ctlr.flags.wired && ((globalState.isVisible && this.ctlr.state.mediaIntersecting) || this.config.muted) && !this.ctlr.config.disabled;
  }

  protected async request(): Promise<"granted" | "denied" | "cancelled" | "nuked"> {
    const state = (await navigator.permissions?.query({ name: "microphone" }).catch(() => null))?.state ?? "prompt";
    if (state === "granted" || state === "denied") return state;
    // prettier-ignore
    return t007.toast?.dismiss(this.TIDS.HELPER), new Promise((res, _, req?: () => void, i = 0) => ((req = () => this.view?.info("Voice control requires mic access", { id: this.TIDS.ROUTER, signal: this.signal, ...this.config.feedback.router, autoClose: false, actions: { OK: () => navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => (s.getTracks().forEach((t) => t.stop()), res("granted"))).catch(async (e) => (await navigator.permissions?.query({ name: "microphone" as any }).then(p => p?.state === "denied", () => e.message === "Permission denied")) || ++i > 3 ? res("cancelled") : this.view?.warn("Grant permission to use microphone", { id: this.TIDS.ROUTER, autoClose: false, actions: { Retry: req! } })), ...this.getRouterActions(false) }, onClose: (_, user) => res(user ? "cancelled" : "nuked") }) || res("nuked"))())); // #EXTRA-MILE: doing the most with the least
  }
  public async start(): Promise<void> {
    let state = this.config.muted ? "granted" : await this.request();
    if (state === "nuked" || !this.config) return; // only death i know hence abort over config check
    state === "granted" && (this.config.feedback.behavior.value === "persistent" || t007.toast.isActive(this.TIDS.ROUTER)) && this.view?.(this.getRouterSpeech(), this.getRouterOptions());
    if (this.state.routing) this.goTo(), t007.toast.isActive(this.TIDS.HELPER) && this.teachBasics();
    try {
      state === "granted" ? !this.config.muted && this.recognition?.start() : this.onError({ error: "not-allowed" });
    } catch (e) {} // Silence the InvalidStateError since we might call when already on due to wake word
  }
  protected stop(): void {
    (this.state.routing = this.prevRes = false), this.recognition?.abort();
    for (const k in this.TIDS) t007.toast?.dismiss(this.TIDS[k as keyof typeof this.TIDS]);
    for (const k of ["voiceSleeping", "voiceProcessing"]) this.ctlr.cancelTimeout("debounce", k);
  }

  protected wakeUp(): void {
    if (this.state.routing) return;
    (this.state.routing = true), this.ai?.chat();
    this.clearCtx(), this.view?.(this.getRouterSpeech(), this.getRouterOptions()), this.snooze();
  } // #STANDALONE: needs scoped behavior
  protected sleep(): void {
    if (!this.state.routing) return;
    (this.state.routing = this.prevRes = false), this.ai?.stop(), this.ai?.view?.render(null);
    this.clearCtx(), t007.toast?.dismiss(this.TIDS.HELPER), !this.config.active.value || this.config.feedback.behavior.value !== "persistent" ? t007.toast?.dismiss(this.TIDS.ROUTER) : this.view?.(this.getRouterSpeech(), this.getRouterOptions());
  } // #STANDALONE: needs scoped behavior

  protected trigger(transcript: string, stage: VoiceStage = this.config.process.stage.value): boolean {
    for (const act of Object.values(this.ctlr.actions.entries)) {
      const cmd = this.config.commands[act.id];
      if (!cmd?.length || (act.id !== "voiceWake" && !this.config.process.allowCommands) || this.snublist.includes(act.id) || (act.voice?.stage || this.config.process.stage.value) !== stage || (act.id === "voiceWake" && this.state.routing) || act.gates?.some((g) => !this.media.features[g])) continue;
      if (((act.voice?.match || this.config.process.match.value) === "chunk" ? fuzzyChunkMatch : fuzzyBlobMatch)(cmd, transcript, this.config.process.accuracy)) return this.ctlr.perform(act.id) && (act.id === "voiceSubmit" || this.view?.success(`Triggered <b>${act.label ?? capitalize(uncamelize(act.id))}</b>`, { id: this.TIDS.ROUTER, icon: true, autoClose: this.config.feedback.router.autoClose })), true;
    }
    return false;
  }
  protected process(transcript: string, cleaned = transcript.replace(/[-\s]/g, ""), isSubmit = false, dormant = !this.state.routing): boolean {
    if (this.trigger(transcript, "anytime") || dormant) return !dormant;
    // --- 1. PRE-ROUTE STAGE ---
    if (this.trigger(transcript, "pre-route")) return true;
    if (this.ai?.config.active) return this.ai.process(transcript, isSubmit), true;
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
    return this.trigger(transcript, "post-route") ? true : this.ai ? (this.ai.process(transcript, isSubmit), true) : false;
  }
  protected parse(transcript: string, path = this.state.ctx, isNav = false, value = getPath(this.ctlr.logicRoot as any, mirror(path, this.ctlr.logicRoot)), type = isArr(value) ? "array" : typeof value): any {
    if (type === "boolean") return isNav && this.config.routing.autoToggles ? !value : fuzzyChunkMatch(this.config.commands.voiceToggleOn, transcript, this.config.process.accuracy) ? true : fuzzyChunkMatch(this.config.commands.voiceToggleOff, transcript, this.config.process.accuracy) ? false : null;
    if (isNav) return null;
    if (type === "number") {
      const match = transcript.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
      return match ? Number(match[0]) : null;
    } else if (type === "string" || type === "array") return transcript ? (type === "string" ? transcript : transcript.split(/\s*(?:,|and)\s*/i).filter(Boolean)) : null;
    return null;
  }
  protected execute(transcript: string, path = this.state.ctx, isNav = false, isSubmit = false, value = this.parse(transcript, path, isNav), type = isArr(value) ? "array" : typeof value): boolean {
    if (value === null) return false;
    if ((this.config.routing.strict.value === true || (this.config.routing.strict.value === "auto" && type === "string")) && !isSubmit) {
      const input = this.container?.querySelector<HTMLInputElement>(clame("input"));
      if (input) input.value = type === "array" ? value.join(", ") : String(value);
      return this.view?.update(this.TIDS.ROUTER, { render: transcript || fvalue(value), ...this.getRouterOptions(false) }), true;
    } // Auto-Strict: Blocks execution for strings only (or everything if true)
    return setPath(this.ctlr.logicRoot as any, path as any, value), this.goBack(), setTimeout(() => (this.view?.success(`${fpath(path)} -> <code>${fvalue(value)}</code>`, { id: this.TIDS.ROUTER, icon: true, autoClose: this.config.feedback.router.autoClose }), this.ctlr.plug("settings.timeTravel")?.teachBasics()), 200, this.signal), true; // last to render
  }
  protected submit(render = this.container?.querySelector<HTMLInputElement>(clame("input"))?.value.trim() || this.ai?.state.prompt.trim(), process = false): void {
    if (render) this.view?.update(this.TIDS.ROUTER, { render, ...this.getRouterOptions(false) }), this.ai?.config.active ? this.ai.submit(render) : !process ? this.execute(render, undefined, false, true) : this.process(render, undefined, true); // Execute with isSubmit = true
  }
  public predict(): void {
    const isAi = !!this.ai?.config.active,
      crumbHtml = this.history.length < 2 && !isAi ? "" : `<div class="tmg-media-voice-crumb-wrap">` + (isAi ? `<small style="font-weight: 600;">AI Copilot</small>` : this.history.map((p, idx, _, active = idx === this.historyIdx) => `<small style="${active ? "font-weight: 500;" : "opacity: 0.8;"}">${this.linked(p === "*" ? "Root" : uncam(p.split(".").pop()!), p, "goto")}</small>`).join(" <span style='opacity: 0.4;'><small>></small></span> ")) + `</div>`,
      actions: ToastOptions["actions"] = {};
    if (this.media.features.voiceItems && !isAi) {
      actions[`<span title='Clear context${formatActionTooltip(this.settings, "voiceCtxClear")}'>×</span>`] = () => this.clearCtx(false);
      actions[`<span title='Go back${formatActionTooltip(this.settings, "voiceCtxPrevious")}' ${this.media.features.previousVoiceItem ? "" : "disabled"}>‹</span>`] = this.goBack;
      actions[`<span title='Go forward${formatActionTooltip(this.settings, "voiceCtxNext")}'${this.media.features.nextVoiceItem ? "" : " disabled"}>›</span>`] = this.goForward;
    }
    if (this.media.features.voiceAi) actions[`<span title='Toggle AI Copilot${formatActionTooltip(this.settings, "voiceAi")}' ${isAi ? "data-auto" : ""}>✨</span>`] = () => this.ctlr.perform("voiceAi");
    if (isAi && this.ai) {
      const isBusy = !!this.ai.state.status,
        showSubmit = this.media.tech.polyfill("voiceAiStop", isBusy) || this.media.tech.polyfill("voiceSubmit", this.config.routing.strict.value === true || this.config.routing.strict.value === "auto"),
        feedback = isBusy ? `<div class="tmg-media-voice-ai-bubble"><small>${this.ai.state.status}</small></div>` : "",
        undoHtml = !isBusy && this.ai.module.canUndo ? `<button type="button" class="tmg-media-voice-undo" title='Undo changes${formatActionTooltip(this.settings, "voiceAiTimeTravelUndo")}' data-action="undo">↺</button>` : "",
        redoHtml = !isBusy && this.ai.module.canRedo ? `<button type="button" class="tmg-media-voice-redo" title='Redo changes${formatActionTooltip(this.settings, "voiceAiTimeTravelRedo")}' data-action="redo">↻</button>` : "",
        submitHtml = isBusy || showSubmit ? `<button type="button" class="tmg-media-voice-submit${isBusy ? " stop" : ""}" title='${isBusy ? `Stop ${formatActionTooltip(this.settings, "voiceAiStop")}` : `Submit ${formatActionTooltip(this.settings, "voiceSubmit")}`}' data-action="${isBusy ? "stop" : "submit"}">${isBusy ? "■" : "↳"}</button>` : "",
        inputHtml = `<div class="tmg-media-voice-input-wrap"><textarea rows="${isBusy ? 1 : 2}" name="voice_prompt" class="tmg-media-voice-input" placeholder="${isBusy ? "AI is working" : "Ask AI or tell it to control playback..."}" ${isBusy ? "disabled" : ""}>${this.ai.state.prompt || ""}</textarea>${undoHtml}${submitHtml}${redoHtml}</div>`;
      this.view?.(`${crumbHtml}<div class="tmg-media-voice-content">${feedback}${inputHtml}</div>`, this.getHelperOptions(actions));
      const input = this.container?.querySelector<HTMLTextAreaElement>(clame("input"));
      return void (input && (input.value = this.ai.state.prompt || ""));
    }
    if (this.ctlr.isLogical(this.state.ctx, true)) {
      const value = getPath(this.ctlr.logicRoot, mirror<any>(this.state.ctx, this.ctlr.logicRoot)),
        type = isArr(value) ? "array" : typeof value,
        showInput = this.config.routing.strict.value === true || (this.config.routing.strict.value === "auto" && type !== "boolean"),
        showSubmit = this.media.tech.polyfill("voiceSubmit", this.config.routing.strict.value === true || (this.config.routing.strict.value === "auto" && type === "string")),
        display = type === "array" ? value.join(", ") : value ?? "",
        inputHtml = showInput ? `<div class="tmg-media-voice-input-wrap"><input name="voice_value" type="${type === "number" ? "number" : "text"}" class="tmg-media-voice-input" placeholder="${display || (type === "boolean" ? "true" : type === "number" ? "0" : type === "array" ? "value 1, value 2, value 3, ..." : "...text")}" value="${display}"/>${showSubmit ? `<button type="button" title='Submit ${formatActionTooltip(this.settings, "voiceSubmit")}' class="tmg-media-voice-submit">↳</button>` : ""}</div>` : "",
        // prettier-ignore
        hints = type === "boolean" ? `${(isArr(this.config.commands.voiceToggleOn) ? this.config.commands.voiceToggleOn.slice(0, 2) : [this.config.commands.voiceToggleOn]).map((v) => this.linked(v)).join(", ")} or ${(isArr(this.config.commands.voiceToggleOff) ? this.config.commands.voiceToggleOff.slice(0, 2) : [this.config.commands.voiceToggleOff]).map((v) => this.linked(v)).join(", ")} ${inputHtml}` : type === "number" ? `a number (like ${this.linked("0")}, ${this.linked("50")}):</small> ${inputHtml}` : type === "array" ? `comma-separated values:</small> ${inputHtml}` : `the exact text:</small> ${inputHtml}`;
      return void this.view?.(`${crumbHtml}<div class="tmg-media-voice-content">${showInput ? '<small style="font-weight: 500;">' : ""}Try ${this.config.muted ? (showInput ? "typing" : IS_MOBILE ? "tapping" : "clicking") : "saying"} ${hints}</div>`, this.getHelperOptions(actions));
    }
    const paths = this.ctlr.getLogicPaths(this.state.ctx);
    if (!paths.length) return;
    const inputHtml = `<input name="voice_path" type="text" class="tmg-media-voice-input" placeholder="...text"/>`;
    this.view?.(`${crumbHtml}<div class="tmg-media-voice-content"><small style="font-weight: 500;">Try ${this.config.muted ? (IS_MOBILE ? "tapping" : "clicking") : "saying"} any of these:</small><br>${inputHtml} • ${paths.map((p) => this.linked(uncam(p.split(".").pop()!))).join(" • ")}</div>`, this.getHelperOptions(actions));
  }
  public linked(text: string, value = text.toLowerCase(), type?: "menu" | "goto", punc = type || this.config.muted ? "" : '"'): string {
    return `${punc}<u class="tmg-media-voice-link" ${type ? `data-${type}` : "data-cmd"}="${value}" title='${type ? "Go to" : "Say"} "${value}"' tabindex="0" style="cursor:pointer; text-decoration-color: rgb(from var(--tmg-media-brand-${type ? "accent-" : ""}color) r g b / 0.75);">${type || this.config.muted ? text : value}</u>${punc}`;
  } // `""` is my lil UI Experiment, crafting a standard here :)
  protected stayWoke(e: Event): void {
    this.state.routing && this.ctlr.throttle("voiceWaking", () => e.composedPath().some((el) => (el as HTMLElement)?.matches?.(`:is([id="${this.TIDS.HELPER}"],[id="${this.TIDS.ROUTER}"],[class="tmg-media-captions-container"])`)) && this.snooze(), 500);
  }
  protected handleClick(e: Event, t = e.target as HTMLElement, menu = this.ctlr.plug("settings.panel")?.menu): void {
    if (!t?.matches?.(clame("link"))) return;
    e.preventDefault(), e.stopPropagation();
    if (t.dataset.goto) return void (this.ai?.config.active && (this.ai.config.active = false), this.goTo(t.dataset.goto));
    if (t.dataset.menu) return void (menu?.open(), menu?.goTo(t.dataset.menu));
    this.view?.update(this.TIDS.ROUTER, { render: t.dataset.cmd, ...this.getRouterOptions(false) }); // Instantly update the router toast to show they "clicked/said" it
    this.process(t.dataset.cmd || ""); // Pipe it straight into the processor as if they spoke it!
  }
  protected handleInput(e: Event, t = e.target as HTMLInputElement, isEnter = e.type === "keydown" && (e as KeyboardEvent).key === "Enter" && !(e as KeyboardEvent).shiftKey, isClick = e.type === "click", isSubmit = isClick && t.matches(clame("submit")), isUndo = isClick && t.matches(clame("undo")), isRedo = isClick && t.matches(clame("redo"))): void {
    this.stayWoke(e);
    if (!t?.tagName || !(isEnter || isSubmit || isUndo || isRedo)) return;
    if (!this.ai?.config.active) e.preventDefault(), e.stopPropagation(), this.submit(t.closest(clame("input-wrap"))?.querySelector<HTMLInputElement>(clame("input"))?.value ?? t.value, !t.closest(clame("input-wrap")));
    else e.preventDefault(), e.stopPropagation(), isUndo ? this.ai.module.undo() : isRedo ? this.ai.module.redo() : t.dataset.action === "stop" ? this.ai?.stop() : this.ai.submit(t.closest(clame("input-wrap"))?.querySelector<HTMLInputElement>(clame("input"))?.value);
  }
  public snooze(): void {
    !this.ai?.state.status && !this.ai?.synth?.speaking ? this.ctlr.debounce("voiceSleeping", this.snoozeCb, this.config.routing.timeout, false, this.signal) : this.ctlr.cancelTimeout("debounce", "voiceSleeping");
  }
  private snoozeCb = () => (this.config.active.value = "passive");

  protected onCtx(value: string): void {
    if (this.history[this.historyIdx] !== this.state.ctx) {
      const idx = this.history.indexOf(this.state.ctx);
      idx === -1 && this.history.splice(this.historyIdx + 1, this.history.length, value), (this.historyIdx = idx !== -1 ? idx : this.history.length - 1);
    }
    this.media.tech.polyfill(["voiceSubmit", "voiceAiStop"], false), this.media.tech.polyfill("voiceItems", this.history.length > 1);
    this.media.tech.polyfill("previousVoiceItem", this.historyIdx > 0), this.media.tech.polyfill("nextVoiceItem", this.historyIdx < this.history.length - 1);
    this.state.routing && this.predict(); // The single source of truth for rendering the UI
  }
  protected goTo(path = this.state.ctx, useForce = path === this.state.ctx): string {
    return force(() => (this.state.ctx = path), useForce);
  }
  protected goBack(): void {
    this.media.features.previousVoiceItem && this.goTo(this.history[--this.historyIdx]);
  }
  protected goForward(): void {
    this.media.features.nextVoiceItem && this.goTo(this.history[++this.historyIdx]);
  }
  protected clearCtx(direct = this.config.routing.direct): void {
    (this.history = direct ? ["*", "media", "media.intent"] : ["*"]), this.goTo(direct ? "media.intent" : "*", true);
  }

  protected getHelperOptions(actions?: ToastOptions["actions"]): ToastOptions {
    return { id: this.TIDS.HELPER, actions, onClose: (_, user) => user && (this.config.active.value = "passive"), signal: this.signal, ...this.config.feedback.helper, icon: !this.ai?.config.active && this.config.feedback.helper.icon };
  }
  protected getRouterOptions(full = true): ToastOptions {
    return full ? { id: this.TIDS.ROUTER, actions: this.getRouterActions(), onClose: (_, user) => user && (this.config.active.value = false), signal: this.signal, ...this.config.feedback.router, ...this.getRouterOptions(false) } : { icon: this.config.feedback.router.icon, type: this.config.muted ? "warning" : this.config.feedback.router.type };
  }
  protected getRouterActions(full = true): ToastOptions["actions"] {
    return { ...(full && this.state.routing && { [`<span title='Open actions'>${IconRegistry.get("settings")}</span>`]: (_, __, menu = this.ctlr.plug("settings.panel")?.menu) => (menu?.open(null), menu?.goTo("actions")) }), [`<span title='${this.config.muted ? "Unmute" : "Mute"} voices${formatActionTooltip(this.settings, "voiceMute")}'>${IconRegistry.get(this.config.muted ? "volumeMuted" : "volumeHigh", true)}</span>`]: () => (this.config.muted = !this.config.muted) };
  }
  protected getRouterSpeech(firstHalf = this.config.muted ? "Snubbing..." : "Listening...", secondHalf = `${this.config.muted ? (IS_MOBILE ? "Tap" : "Click") : "Say"} ${!this.state.routing ? `${isArr(this.config.commands.voiceWake) ? this.config.commands.voiceWake.map((c = "") => this.linked(c)).join(" or ") : this.linked(this.config.commands.voiceWake)} to wake me up` : this.config.muted ? "or type instead" : "a path or command!"}`): string {
    return `${firstHalf} ${secondHalf}`;
  }
  public get container() {
    return this.ctlr.plug("settings.toasts")?.container;
  }
  protected get view() {
    return this.ctlr.toast;
  }

  public override onDestroy(): void {
    this.ai?.destroy(), this.stop(), super.onDestroy();
  }
}
const clame = (sfx: string) => `.tmg-media-voice-${sfx}`;

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
    voiceItems: boolean;
    voiceSubmit: boolean;
    nextVoiceItem: boolean;
    previousVoiceItem: boolean;
  }
}
