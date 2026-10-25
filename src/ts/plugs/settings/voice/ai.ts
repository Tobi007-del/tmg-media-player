import { BasePin } from "../../base";
import type { Controller } from "@core/controller";
import { VoicePlug } from "./index";
import type { AiResponse, VoiceAiConfig, VoiceAiState } from "./types";
import { responseConstraint, VOICE_AI_BUILD, VOICE_AI_INITIAL_PROMPTS } from "./build";
import { setPath, getPath, getPaths, withMeta } from "sia-reactor/utils";
import { createTxPathMerger, TimeTravelModule, Transaction } from "sia-reactor/modules";
import { isArr, isObj, isStr } from "@utils/obj";
import { ComponentRegistry } from "@core/registries";
import type { CaptionsView } from "@components/captionsView";
import { capitalize, fpath, uncamelize } from "@utils/str";
import { CtlrConfig } from "@defs/config";
import { REvent } from "sia-reactor";

export class VoiceAiPin extends BasePin<VoicePlug, VoiceAiConfig, VoiceAiState> {
  public static readonly pinName = "ai";
  public static get Plug() {
    return VoicePlug;
  }
  public static readonly BUILD = VOICE_AI_BUILD;
  public view: CaptionsView | null = null;
  public synth = globalThis.speechSynthesis;
  public module!: TimeTravelModule<any>;
  protected qac: AbortController | null = null;
  protected session: any = null;
  protected readonly TIDS = { DOWNLOAD: `tmg-media-voice-ai-downloader-for-${this.ctlr.config.id}` };

  constructor(ctlr: Controller, config = ctlr.settings.voice.ai) {
    super(ctlr, config, { status: "", prompt: "", speech: JSON.parse(VOICE_AI_INITIAL_PROMPTS.at(-1)!.content).speech });
  }

  public override mount(): void {
    // Variables Assignment
    const merger = createTxPathMerger();
    this.module = new TimeTravelModule({ whitelist: { media: ["intent", "settings"] }, beforeEntry: (entry, history, e) => !!e.ai && merger(entry, history, e) });
    // Utility Injection
    this.module.attach(this.media, "media").setup(this.ctlr.config, "config");
  }

  public override wire(): void {
    // State Watchers
    for (const p of ["status", "prompt"] as const) this.state.watch(p, this.plug.predict, { signal: this.signal });
    this.state.watch("speech", this.chat, { signal: this.signal });
    this.module.state.watch("currentFrame", this.syncFeatures, { signal: this.signal });
    // State Listeners
    this.module.state.on("currentFrame", this.plug.predict, { signal: this.signal });
    // Ctlr Media Watchers
    this.media.watch("tech", this.syncFeatures, { init: true, signal: this.signal });
    // ---- Config Listeners
    this.ctlr.config.on("settings.voice.ai.active", this.handleActive, { signal: this.signal });
    this.ctlr.config.on("settings.voice.feedback.copilot.captions", this.chat, { signal: this.signal });
    this.ctlr.config.on("settings.voice.feedback.copilot.speech", ({ value }) => !value && this.quiet(), { signal: this.signal });
    for (const k of ["systemPrompt", "preference"] as const) this.ctlr.config.on(`settings.voice.ai.${k}`, this.reset, { signal: this.signal });
    // Post Wiring
    this.ctlr.learn("voiceAi", { voice: { stage: "anytime", match: "chunk" } }, this.signal);
    this.ctlr.learn("voiceAiStop", { fn: this.stop, voice: { stage: "pre-route" } }, this.signal);
    this.ctlr.learn("voiceAiTimeTravelUndo", { fn: this.module.undo, keyboard: { phase: "keydown" }, voice: { stage: "pre-route" } }, this.signal);
    this.ctlr.learn("voiceAiTimeTravelRedo", { fn: this.module.redo, keyboard: { phase: "keydown" }, voice: { stage: "pre-route" } }, this.signal);
    if (this.plug.config.active) this.ctlr.flags.wired ? this.prewarm() : this.ctlr.state.wonce("readyState", this.prewarm, { signal: this.signal }); // #HEAVY: waits for !light
  }

  protected handleActive({ value }: REvent<CtlrConfig, "settings.voice.ai.active">): void {
    value && this.prewarm(), (this.plug.config.active.value = true), this.chat(), this.media.container.classList.toggle("tmg-media-ai", value);
  }

  public async prewarm(): Promise<void> {
    const LM = (window as any).LanguageModel ?? (window as any).ai?.languageModel;
    if (LM && !this.session)
      try {
        this.session = await LM.create({ systemPrompt: this.systemPrompt, initialPrompts: [{ role: "system", content: this.systemPrompt }, ...VOICE_AI_INITIAL_PROMPTS], outputLanguage: "en", expectedOutputs: [{ type: "text", languages: ["en"] }], temperature: 0.1, topK: 1, monitor: (m: any) => m.addEventListener("downloadprogress", (e: any, pct = Math.round((e.loaded / e.total) * 100)) => (pct && pct < 100 ? this.ctlr.toast?.info(`Downloading built-in AI: ${pct}%`, { id: this.TIDS.DOWNLOAD, autoClose: false, signal: this.signal }) : t007.toast?.dismiss(this.TIDS.DOWNLOAD))) });
      } catch (_) {}
  }
  protected async query(text: string, tx: Transaction, signal = this.signal): Promise<void> {
    if ((window as any).LanguageModel ?? (window as any).ai?.languageModel)
      try {
        await this.prewarm(), this.ctlr.log(`[VoiceAI] Query: ${text}`);
        let res = await this.prompt(text, signal),
          next: string | false | null,
          data: any;
        while (!signal.aborted) {
          this.ctlr.log(`[VoiceAI] Step: ${JSON.stringify(res)}`);
          next = res.query ? ((this.state.status = `Reading ${this.getLink(res.query)}...`), this.ctlr.log(`[VoiceAI] Reading: ${res.query}`), (data = this.inspect(res.query)), `[State: ${JSON.stringify({ [res.query]: data })}]`) : this.apply(res, tx) && !res.speech ? (res.action ? `[Executed: ${res.action}]` : `[Applied: ${JSON.stringify({ [res.path!]: res.value })}]`) : null;
          if (!next) return this.ctlr.log(`[VoiceAI] Done: ${res.speech}`), void (this.state.speech = res.speech || "");
          this.ctlr.log(`[VoiceAI] Next: ${JSON.stringify(next)}`);
          res = await this.prompt(next, signal);
        }
        return;
      } catch (_) {
        this.reset();
      }
    if (!signal.aborted && this.config.endpoint)
      try {
        const r = await fetch(this.config.endpoint, { method: "POST", headers: { "Content-Type": "application/json", ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}) }, body: JSON.stringify({ prompt: text, systemPrompt: this.systemPrompt, model: this.config.model }), signal });
        if (r.ok) {
          let res = await r.json();
          return this.apply((res = isStr(res) ? parseAiResponse(res) : res), tx), res.speech && this.speak((this.state.speech = res.speech)), void 0;
        }
      } catch (_) {}
    !signal.aborted && this.ctlr.toast?.error(`AI endpoint not configured. Visit ${this.plug.linked("settings", "voiceAi", "menu")} or enable Built-in AI.`, { signal: this.signal });
  }
  protected apply(res: AiResponse, tx: Transaction): boolean {
    return !res.action && !res.path ? false : (this.ctlr.log(`[VoiceAI] Apply: ${res.action ? `Action "${res.action}"` : `${res.path} = ${res.value}`}`), (this.state.status = res.action ? `Executing ${this.getLink(res.action, false)}...` : `Setting ${this.getLink(res.path!)}...`), withMeta({ ai: true, tx }, () => (res.action ? this.ctlr.perform(res.action) : setPath(this.systemRoot, res.path!, res.value))), true);
  }
  protected reset(): void {
    this.session?.destroy?.(), (this.session = null);
  }

  public process(transcript: string, isSubmit = false, strict = this.plug.config.routing.strict.value): boolean {
    if (!transcript || (this.state.status && strict !== false)) return false;
    this.state.prompt = transcript;
    const input = this.plug.container?.querySelector<HTMLTextAreaElement>(clame("input"));
    if (input) input.value = transcript;
    return (strict === true || (strict === "auto" && !isSubmit)) && !isSubmit ? true : (this.submit(transcript), true);
  }
  public async submit(prompt = this.state.prompt, text = (prompt || "").trim()): Promise<boolean> {
    if (!text) return false;
    this.state.status && this.stop();
    const signal = AbortSignal.any([this.signal, (this.qac = new AbortController()).signal]),
      tx: Transaction = { id: ++txId, label: text, parent: null };
    (this.state.prompt = text), (this.state.status = "Thinking..."), this.quiet(), this.plug.snooze();
    try {
      await this.query(text, tx, signal);
      return (this.state.status = this.state.prompt = ""), this.plug.snooze(), !signal.aborted;
    } catch (_) {
      return (this.state.status = this.state.prompt = ""), !signal.aborted && this.ctlr.toast?.error("AI query failed", { signal: this.signal }), this.plug.snooze(), false;
    }
  }
  public stop(): void {
    this.qac?.abort("Copilot execution cancellation"), (this.qac = null), (this.state.status = this.state.prompt = ""), this.quiet();
  }

  public chat(): void {
    if (!this.plug.config.feedback.copilot.captions) return void (this.view?.destroy(), (this.view = null));
    if (!this.view) this.plug.container?.prepend((this.view = ComponentRegistry.init("captionsView", this.ctlr, { isSolo: true, initialX: "80%", initialY: "20%" }))?.element || "");
    this.view?.render(!this.config.active || !this.state.speech ? null : [{ text: `<v AI>${formatAiText(this.state.speech)}</v>`, size: 50, scroll: "up", fluid: true }]);
  }
  public speak(text = this.state.speech, u?: SpeechSynthesisUtterance): void {
    if (!this.synth || this.plug.config.muted || !this.plug.config.feedback.copilot.speech) return;
    const s = cleanSpeech(text);
    if (s) this.synth.speak((u ??= new SpeechSynthesisUtterance(s))), (u.onend = u.onerror = this.plug.snooze);
  }
  public quiet(): void {
    this.synth?.cancel();
  }

  protected async prompt(text: string, signal = this.signal, raw = "", s = "", si = 0): Promise<AiResponse> {
    if (!this.session.promptStreaming) {
      const res = parseAiResponse(await this.session.prompt(text, { responseConstraint, signal }).catch(() => ""));
      return res.speech && this.speak((this.state.speech = res.speech)), res;
    }
    try {
      for await (const c of this.session.promptStreaming(text, { responseConstraint, signal })) if ((s = extractSpeech((raw = c.startsWith(raw) ? c : raw + c)))) for (const m of (this.state.speech = s).slice(si).matchAll(sepRgx)) this.speak(m[0]), (si += m[0].length);
      !signal.aborted && s.slice(si).trim() && this.speak(s.slice(si));
    } catch (_) {}
    return parseAiResponse(raw);
  }
  protected inspect(path: string, root = this.systemRoot): any {
    const val: any = path && path !== "root" ? getPath(root, path as any) : root;
    if (isArr(val) || !isObj(val)) return val ?? null;
    const paths = getPaths(root as any, (!path || path === "root" ? "*" : path) as any, { depth: 1 }),
      entries = paths.map((p) => [p, getPath(root, p as any)]);
    return entries.some(([, v]) => isObj(v)) ? paths : Object.fromEntries(entries);
  }
  public isLogical(path: string): boolean {
    return (!path || path === "root" || path === "*" || path.split(".")[0] in this.ctlr.logicRoot) && this.ctlr.isLogical(path);
  }
  protected getLink(key: string, isPath = true): string {
    return isPath ? (this.isLogical(key) ? this.plug.linked(fpath(key), key === "root" ? "*" : key, "goto") : fpath(key)) : this.plug.linked(this.ctlr.actions.entries[key].label || capitalize(uncamelize(key)), `actions-detail-${key}`, "menu");
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
    this.stop(), this.view?.destroy(), this.session?.destroy?.(), this.module.destroy(), super.onDestroy();
  }
}
const sepRgx = /.*?(?:(?<!\b[a-z]|\b(?:etc|vs|dr|mr|mrs|ms)|\d)[.!?]+[)"'\]]*\s+|\n+)/gis,
  clame = (sfx: string) => `.tmg-media-voice-${sfx}`;
// prettier-ignore
export const cleanSpeech = (t: string) => t.replace(/<[^>]*>/g, "").replace(/[*_#`~]/g, "").replace(/\s+/g, " ").trim();
// prettier-ignore
export const extractSpeech = (raw: string, m = raw.match(/"speech"\s*:\s*"((?:[^"\\]|\\.)*)/)) => (m ? m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\") : "");
// prettier-ignore
export const formatAiText = (t: string) => t.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/(?:^|\n)\s*[*•-]\s+/g, "<br>• ").replace(/\*(.*?)\*/g, "<i>$1</i>").replace(/\n+/g, "<br>").replace(/^(?:<br\s*\/?>)+/i, "").trim();
export const parseAiResponse = (raw: string, json = raw.match(/\{[\s\S]*\}/)): AiResponse => {
  try {
    if (json) return JSON.parse(json[0]);
  } catch (_) {}
  return { speech: raw };
};
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
