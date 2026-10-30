import { BasePin } from "../../base";
import { VoicePlug } from "./index";
import type { AiResponse, VoiceAiConfig, VoiceAiState } from "./types";
import { responseConstraint, VOICE_AI_BUILD, AI_INITIAL_PROMPTS } from "./build";
import type { Controller } from "@core/controller";
import { setPath, deletePath, getPath, getPaths, withMeta } from "sia-reactor/utils";
import { createTxPathMerger, TimeTravelModule, Transaction } from "sia-reactor/modules";
import { isArr, isObj, isStr } from "@utils/obj";
import { ComponentRegistry } from "@core/registries";
import type { CaptionsView } from "@components/captionsView";
import { capitalize, formatAiText, fpath, readSSEStream, uncamelize } from "@utils/str";
import { CtlrConfig } from "@defs/config";
import { NOOP, REvent } from "sia-reactor";

// --- The Autonomous ReAct System ---
export class VoiceAiPin extends BasePin<VoicePlug, VoiceAiConfig, VoiceAiState> {
  public static readonly pinName = "ai";
  public static get Plug() {
    return VoicePlug;
  }
  public static readonly BUILD = VOICE_AI_BUILD;
  public qac: AbortController | null = null;
  public LLM: any = null; // Local Language Model, not Large
  public module!: TimeTravelModule<any>;
  public talker = globalThis.speechSynthesis;
  public texter: CaptionsView | null = null;
  public spokenAt = 0;
  protected history: Array<{ role: "user" | "assistant"; content: string }> = [];
  protected readonly TIDS = { DOWNLOAD: `tmg-media-voice-ai-downloader-for-${this.ctlr.config.id}` };

  constructor(ctlr: Controller, config = ctlr.settings.voice.ai) {
    super(ctlr, config, { status: "", prompt: "", speech: JSON.parse(AI_INITIAL_PROMPTS.at(-1)!.content).speech });
  }

  public override mount(): void {
    // Variables Assignment
    const merger = createTxPathMerger();
    this.module = new TimeTravelModule({ whitelist: { media: ["intent", "settings"] }, beforeEntry: (entry, history, e) => !!e.ai && merger(entry, history, e) }); // , blacklist: this.settings.timeTravel.module.blacklist
    // Utility Injection
    this.module.attach(this.media, "media").setup(this.ctlr.config, "config");
  }

  public override wire(): void {
    // State Watchers
    this.module.state.watch("currentFrame", this.syncFeatures, { signal: this.signal });
    // ----- Listeners
    this.state.on("speech", this.text, { signal: this.signal });
    for (const k of ["status", "prompt"] as const) this.state.on(k, this.plug.predict, { signal: this.signal });
    this.module.state.on("currentFrame", this.plug.predict, { signal: this.signal });
    // Ctlr Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal });
    // ---- Config Listeners
    this.ctlr.config.on("settings.voice.muted", ({ value }) => value && this.talker?.cancel(), { signal: this.signal });
    this.ctlr.config.on("settings.voice.ai.active", this.handleActive, { init: true, signal: this.signal });
    this.ctlr.config.on("settings.voice.feedback.copilot.captions", this.text, { signal: this.signal });
    this.ctlr.config.on("settings.voice.feedback.copilot.speech", ({ value }) => !value && this.talker?.cancel(), { signal: this.signal });
    for (const k of ["systemPrompt", "preference"] as const) this.ctlr.config.on(`settings.voice.ai.${k}`, this.reset, { signal: this.signal });
    // Post Wiring
    this.ctlr.learn("voiceAi", { voice: { stage: "anytime", match: "chunk" } }, this.signal);
    this.ctlr.learn("voiceAiStop", { fn: this.stop, voice: { stage: "pre-route" } }, this.signal);
    this.ctlr.learn("voiceAiTimeTravelUndo", { fn: this.module.undo, keyboard: { phase: "keydown" }, voice: { stage: "pre-route" } }, this.signal);
    this.ctlr.learn("voiceAiTimeTravelRedo", { fn: this.module.redo, keyboard: { phase: "keydown" }, voice: { stage: "pre-route" } }, this.signal);
    if (this.config.active) this.ctlr.flags.wired ? this.prewarm() : this.ctlr.state.once("readyState", this.prewarm, { signal: this.signal }); // #HEAVYY: waits for !light
  }

  protected handleActive({ type, value }: REvent<CtlrConfig, "settings.voice.ai.active">): void {
    type !== "init" && (value && this.prewarm(), (this.plug.config.active.value = true), this.text()), this.media.container.classList.toggle("tmg-media-ai", value);
  }

  public async prewarm(init?: unknown, bypass = !navigator.onLine, LM = LLM()): Promise<void> {
    if (LM && (!this.config.endpoint || bypass)) init === true && (this.state.status = "Initializing..."), (this.LLM ??= await LM.create({ initialPrompts: [{ role: "system", content: this.systemPrompt }, ...AI_INITIAL_PROMPTS], outputLanguage: "en", expectedOutputs: [{ type: "text", languages: ["en"] }], temperature: 0.1, topK: 1, monitor: (m: any) => m.addEventListener("downloadprogress", (e: any, pct = Math.round((e.loaded / e.total) * 100)) => (pct && pct < 100 ? this.ctlr.toast?.info(`Downloading Built-in AI: ${pct}%`, { id: this.TIDS.DOWNLOAD, autoClose: false, signal: this.signal }) : t007.toast?.dismiss(this.TIDS.DOWNLOAD))) }).catch(NOOP)), init === true && (this.state.status = "Thinking...");
  }
  protected async query(text: string, tx: Transaction, signal: AbortSignal, next?: string | false | null): Promise<void> {
    try {
      let res = await this.prompt(this.record("user", text), signal);
      while (!signal.aborted && res) {
        next = this.record("assistant", res).query ? ((this.state.status = `Reading ${this.getLink(res.query)}...`), `[State: ${JSON.stringify({ [res.query!]: this.inspect(res.query) })}]`) : this.apply(res, tx);
        if (!next) return (this.state.speech = res.speech || ""), this.prune();
        res = await this.prompt(this.record("user", next), signal);
      }
    } catch (err: any) {
      this.reset(), !signal.aborted && this.ctlr.notice(`AI error: ${err?.message}`, "error", `Configure ${this.plug.linked("AI settings", "voiceAi", "menu")} or enable Built-in AI.`);
    }
  }
  protected apply({ action, path, value, type, speech }: AiResponse, tx: Transaction, isDel = type === "delete"): string | null {
    const fail = (s: string, t = "path", e = "404") => ((this.state.status = `<span style="color: var(--tmg-media-danger-color);">Failed to ${t === "path" ? "mutate path:" : "trigger action:"} ${this.getLink(s, t === "path")}</span>`), `[Error: ${t === "path" ? `Path (${s}) not found in player tree` : e ? `Action ("${s}") not found in actions.entries` : `Action ("${s}") failed to trigger`}]`);
    return action ? (!this.ctlr.actions.entries[action] ? fail(action, "action") : ((this.state.status = `Triggering ${this.getLink(action, false)}...`), withMeta({ ai: true, tx }, () => this.ctlr.perform(action)) ? (speech ? null : `[Triggered: ${action}]`) : fail(action, "action", ""))) : path ? (getPath(this.systemRoot, path as any) === undefined ? fail(path) : ((this.state.status = `${isDel ? "Deleting" : "Setting"} ${this.getLink(path)}...`), withMeta({ ai: true, tx }, () => (isDel ? deletePath(this.systemRoot, path) : setPath(this.systemRoot, path, value))), speech ? null : isDel ? `[Deleted: ${path}]` : `[Applied: ${JSON.stringify({ [path]: value })}]`)) : null;
  }
  protected reset(): void {
    this.LLM?.destroy?.(), (this.LLM = null), (this.history = []);
  }

  public process(transcript: string, isSubmit = false, strict = this.plug.config.routing.strict.value): boolean {
    if (!transcript || (this.state.status && strict !== false)) return false;
    this.state.prompt = transcript;
    const input = this.plug.container?.querySelector<HTMLTextAreaElement>(clame("input"));
    if (input) input.value = transcript;
    return (strict === true || (strict === "auto" && !isSubmit)) && !isSubmit ? true : (this.submit(transcript), true);
  }
  public async submit(prompt = this.state.prompt, text = prompt.trim()): Promise<void> {
    if (!text) return;
    this.stop(), (this.qac = new AbortController()), (this.state.prompt = text), (this.state.status = "Thinking..."), this.plug.snooze();
    await this.query(text, { id: ++txId, label: text, parent: null }, this.qac.signal), (this.state.status = this.state.prompt = ""), this.plug.snooze();
  }
  public stop(): void {
    if (this.qac) this.talker?.cancel(), this.qac.abort(), (this.qac = null), (this.state.status = this.state.prompt = "");
  }

  protected async prompt(text: string, signal: AbortSignal, bypass = !navigator.onLine, raw = "", s = "", si = 0): Promise<AiResponse> {
    const stream = (!bypass && this.config.endpoint ? this.cloudStreaming(signal) : null) ?? (await this.prewarm(true, bypass), this.LLM?.promptStreaming?.(text, { responseConstraint, signal }));
    try {
      if (stream) for await (const c of stream) if ((s = extractSpeech((raw = c.startsWith(raw) ? c : raw + c)))) for (const m of (this.state.speech = s).slice(si).matchAll(sepRgx)) this.talk(m[0]), (si += m[0].length);
    } catch (e: any) {
      if (!bypass && !raw && !signal.aborted && LLM()) return this.ctlr.toast?.info("Cloud offline. Falling back to Built-in AI.", { position: this.plug.config.feedback.quoter.position, compact: this.plug.config.feedback.quoter.compact, signal }), this.prompt(text, signal, true);
      throw e;
    }
    const res = parseRes(raw || (await this.LLM?.prompt?.(text, { responseConstraint, signal })));
    return !signal.aborted && (s ? (s = s.slice(si).trim()) && this.talk(s) : res.speech && this.talk((this.state.speech = res.speech))), res;
  }
  public text(): void {
    if (!this.plug.config.feedback.copilot.captions) return void (this.texter?.destroy(), (this.texter = null));
    if (!this.texter) this.plug.container?.prepend((this.texter = ComponentRegistry.init("captionsView", this.ctlr, { isSolo: true, initialX: "12.5%", initialY: "30%" }))?.element || "");
    this.texter?.render(!this.config.active || !this.state.speech ? null : [{ text: `<v AI>${formatAiText(this.state.speech)}</v>`, size: 50, scroll: "up", fluid: true }]);
  }
  public talk(text = this.state.speech, s = cleanSpeech(text), u?: SpeechSynthesisUtterance): void {
    if (!s || !this.talker || this.plug.config.muted || !this.plug.config.feedback.copilot.speech) return;
    this.talker.speak((u ??= new SpeechSynthesisUtterance(s))), (this.spokenAt = Date.now() + 1000), (u.onend = u.onerror = () => ((this.spokenAt = Date.now() + 1000), this.plug.snooze()));
  }

  protected async *cloudStreaming(signal: AbortSignal): AsyncGenerator<string> {
    // prettier-ignore
    const r = await fetch(this.config.endpoint!, { method: "POST", headers: { "Content-Type": "application/json", ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}) }, body: JSON.stringify({ model: this.config.model, stream: true, messages: [{ role: "system", content: this.systemPrompt }, ...AI_INITIAL_PROMPTS, ...this.history] }), signal }),
      d: any = !r.ok && (await r.json().catch(NOOP));
    if (!r.ok || !r.body) throw new Error((isArr(d) ? d[0] : d)?.error?.message || `HTTP ${r.status}`);
    yield* readSSEStream(r.body);
  }
  protected record<T extends any>(role: "user" | "assistant", raw: T, content = isStr(raw) ? raw : JSON.stringify(raw)): T {
    return this.ctlr.log(`[VoiceAI] ${role}: ${content}`), this.history.at(-1)?.role === role ? (this.history.at(-1)!.content = content) : this.history.push({ role, content }), raw;
  }
  protected prune(max = 100): void {
    this.history = this.history.filter((m) => !(m.role === "user" ? m.content.startsWith("[State: ") : m.content.includes('"query":')));
    while (this.history.length > max || this.history[0]?.role === "assistant") this.history.shift();
  }
  protected inspect(path = "root", root = this.systemRoot): any {
    const val: any = path && path !== "root" ? getPath(root, path as any) : root;
    if (isArr(val) || !isObj(val)) return val ?? null;
    const paths = getPaths(root as any, (!path || path === "root" ? "*" : path) as any, { depth: 1 }),
      entries = paths.map((p) => [p, getPath(root, p as any)]);
    return entries.some(([, v]) => isObj(v)) ? paths : Object.fromEntries(entries);
  }
  public isLogical(path = "root"): boolean {
    return (!path || path === "root" || path === "*" || path.split(".")[0] in this.ctlr.logicRoot) && this.ctlr.isLogical(path);
  }
  protected getLink(path = "root", isPath = true): string {
    return isPath ? (this.isLogical(path) ? this.plug.linked(fpath(path), path === "root" ? "*" : path, "goto", true) : fpath(path)) : this.plug.linked(this.ctlr.actions.entries[path]?.label || capitalize(uncamelize(path)), `actions-detail-${path}`, "menu");
  }
  protected get systemRoot(): any {
    return { media: this.media, state: this.ctlr.state, ...this.ctlr.config };
  }
  protected get systemPrompt(): string {
    return `${this.config.systemPrompt}${this.config.preference ? `\nUser Preference: ${this.config.preference}` : ""}`;
  }

  protected syncFeatures(): void {
    this.media.tech.polyfill("voiceAi", true), this.media.tech.polyfill("voiceAiTimeTravelUndo", this.module.canUndo), this.media.tech.polyfill("voiceAiTimeTravelRedo", this.module.canRedo);
  }
  public override onDestroy(): void {
    this.stop(), this.reset(), this.texter?.destroy(), this.module.destroy(), super.onDestroy();
  }
}
const clame = (sfx: string) => `.tmg-media-voice-${sfx}`,
  LLM = () => (window as any).LanguageModel || (window as any).ai?.languageModel,
  sepRgx = /.*?(?:(?<!\b[a-z]|\b(?:etc|vs|dr|mr|mrs|ms)|\d)[.!?]+[)"'\]]*\s+|\n+)/gis,
  extractSpeech = (raw: string, m = raw.match(/"speech"\s*:\s*"((?:[^"\\]|\\.)*)/)) => (m ? m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\") : ""),
  // prettier-ignore
  cleanSpeech = (t: string) => t.replace(/<[^>]*>/g, "").replace(/[*_#`~]/g, "").replace(/\s+/g, " ").trim(),
  // prettier-ignore
  parseRes = (raw='', json = raw.match(/\{[\s\S]*\}/)): AiResponse => { try { if (json) return JSON.parse(json[0]); } catch (_) {} return { speech: raw }; };
let txId = 0;

declare module "@defs/registries" {
  interface PinRegistryMap {
    "voice.ai": typeof VoiceAiPin;
  }
}

declare module "@defs/contract" {
  interface MediaFeaturesExt {
    voiceAi: boolean;
    voiceAiStop: boolean;
    voiceAiTimeTravelUndo: boolean;
    voiceAiTimeTravelRedo: boolean;
  }
}
