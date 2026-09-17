import { BaseComponent, ComponentState } from "@components/base";
import { IconRegistry } from "@core/registries";
import { addSafeClicks, createEl } from "@utils/dom";
import { formatActionForDisplay } from "@utils/keys";

export type VoiceConfig = undefined;

export class VoiceButton extends BaseComponent<VoiceConfig, ComponentState, HTMLButtonElement> {
  public static readonly componentName: string = "voice";
  public static readonly isControl = true;
  public override create(): HTMLButtonElement {
    return (this.element = createEl("button", { className: "tmg-media-voice-btn", type: "button", innerHTML: IconRegistry.get("mic") }, { draggableControl: "", controlId: this.name }));
  }

  public override wire(): void {
    // Features Gating
    this.media.on("features.voice", this.gate, { init: this.ctlr.flags.wired, signal: this.signal });
    // Event Listeners
    addSafeClicks(this.el, this.handleClick, this.handleDblClick, { signal: this.signal });
    // Ctlr Config Listeners
    this.ctlr.config.on("settings.voice.active.value", () => (this.syncUI(), this.syncARIA()), { init: true, signal: this.signal });
    this.ctlr.config.on("settings.voice.muted", this.syncUI, { signal: this.signal });
    for (const k of ["voiceWake", "voiceSleep", "voiceQuit"] as const) for (const p of ["keys.shortcuts", "voice.commands"] as const) this.ctlr.config.on(`settings.${p}.${k}`, this.syncARIA, { signal: this.signal });
  }

  protected handleClick(): void {
    this.settings.voice.active.value = !this.settings.voice.active.value;
  }
  protected handleDblClick(): void {
    this.settings.voice.active.value = "passive";
  }

  public syncUI(): void {
    this.setBadge(this.settings.voice.active.value === "passive" ? "ZZ" : "");
    this[this.settings.voice.active.value && !this.settings.voice.muted ? "active" : "inactive"]();
  }

  public syncARIA(): void {
    this.state.label = this.settings.voice.active.value ? "Quit" : "Wake up";
    this.state.cmd = formatActionForDisplay((this.state.keyShortcut = this.settings.keys.shortcuts[this.settings.voice.active.value ? "voiceQuit" : "voiceWake"]), (this.state.voiceCommand = this.settings.voice.commands[this.settings.voice.active.value ? "voiceQuit" : "voiceWake"]));
    this.el.title = this.state.label + this.state.cmd + ` / DblClick→ Sleep${formatActionForDisplay(this.settings.keys.shortcuts.voiceSleep, this.settings.voice.commands.voiceSleep)}`;
    this.setBtnARIA("sleep (stop routing)");
  }
}

declare module "@defs/registries" {
  interface ComponentRegistryMap {
    voice: typeof VoiceButton;
  }
}
