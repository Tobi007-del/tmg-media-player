import { silence } from "sia-reactor/modules";
import { BasePlug } from "../../base";
import { SETTINGS_BUILD } from "./build";
import type { PanelConfig, PanelState } from "./types";
import { SettingsMenu } from "./menu";
import { createEl } from "@utils/dom";
import { mockAsync } from "@utils/fn";
import { parseCSSTime } from "@utils/str";
import type { Controller } from "@core/controller";

export class PanelPlug extends BasePlug<PanelConfig, PanelState> {
  public static readonly plugName = "panel";
  public static readonly BUILD = SETTINGS_BUILD;
  public closeBtn!: HTMLButtonElement | null;
  public menu!: SettingsMenu;
  protected wasPaused = false;

  constructor(ctlr: Controller, config = ctlr.settings.panel) {
    super(ctlr, config, { moreOpen: false });
    this.menu = new SettingsMenu(this.ctlr, this.config.menu);
  }

  public override mount(): void {
    this.closeBtn = this.ctlr.queryDOM(".tmg-media-settings-close-btn")!;
    this.menu.onMoreClick = this.toggleMore;
  }
  public override unmount(): void {
    this.media.container.classList.remove("tmg-media-more-settings");
    this.ctlr.queryDOM(".tmg-media-settings-tips-btn")?.remove(), this.ctlr.queryDOM(".tmg-media-settings-brand-wrapper")?.remove(), this.ctlr.queryDOM(".tmg-media-settings-theme-wrapper")?.remove();
  }

  public override wire(): void {
    // Event Listeners
    this.closeBtn?.addEventListener("click", this.exitMore, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.paused", ({ value }) => !value && this.exitMore(), { signal: this.signal });
    // Post Wiring
    this.ctlr.learn("settings", { fn: () => this.menu.toggle(undefined, true) }, this.signal);
    !this.config.menu.disabled && this.menu.wire(), super.wire();
  }

  public async enterMore(): Promise<void> {
    if (this.ctlr.isUIActive("moreSettings")) return;
    if (!this.viewReady) this.initMore(), (this.viewReady = true);
    (this.wasPaused = this.media.state.paused), this.config.autoPause && silence(() => (this.media.intent.paused = true));
    this.menu.anchored && this.menu.close(), this.media.container.classList.add("tmg-media-more-settings"), (this.state.moreOpen = true);
    await mockAsync(parseCSSTime(this.settings.css.panelTransitionTime));
    this.ctlr.plug("settings.overlay")?.show();
    this.ctlr.DOM.settings?.removeAttribute("inert"), this.ctlr.DOM.content?.setAttribute("inert", "");
    this.menu.anchored && this.closeBtn?.focus();
  } // #STANDALONE: needs scoped behavior
  private viewReady = false;

  public async exitMore(): Promise<void> {
    if (!this.ctlr.isUIActive("moreSettings")) return;
    this.menu.anchored && this.menu.close(), this.media.container.classList.remove("tmg-media-more-settings"), (this.state.moreOpen = false);
    await mockAsync(parseCSSTime(this.settings.css.panelTransitionTime));
    this.config.autoPause && silence(() => (this.media.intent.paused = this.wasPaused));
    this.ctlr.DOM.settings?.setAttribute("inert", ""), this.ctlr.DOM.content?.removeAttribute("inert");
  } // #STANDALONE: needs scoped behavior

  public async toggleMore(): Promise<void> {
    this.ctlr.isUIActive("moreSettings") ? await this.exitMore() : await this.enterMore();
  }

  private initMore() {
    // Theming
    // prettier-ignore
    const options = [{ option: "Light blue", value: "#3198f5" }, { option: "Hot pink", value: "#ff69b4" }, { option: "Fiery red", value: "#ff0033" }, { option: "Dark turquoise", value: "#00ced1" }, { option: "Custom hue", value: "custom" }, { option: "Video derived", value: "auto" }],
      gcolors = options.slice(0, -2).map((opt) => opt.value),
      defs = { brand: this.settings.css.brandColor as string ?? "#e26e02", theme: this.settings.css.themeColor as string ?? "#ffffff", bcolors: ["#e26e02", ...gcolors], tcolors: ["#ffffff", ...gcolors] },
      bField = t007.field({ type: "select", label: "Brand color", helperText: { info: "Sets the primary color for the interface" }, options: [{ option: "Tastey orange", value: "#e26e02" }, ...options], value: !defs.bcolors.includes(defs.brand as string) ? (!this.settings.css.syncWithMedia.brandColor ? "custom" : "auto") : defs.brand }),
      cBField = t007.field({ type: "color" }),
      tField = t007.field({ type: "select", label: "Theme color", helperText: { info: "Sets the base color for text and controls" }, options: [{ option: "Pure white", value: "#ffffff" }, ...options], value: !defs.tcolors.includes(defs.theme as string) ? (!this.settings.css.syncWithMedia.themeColor ? "custom" : "auto") : defs.theme }),
      cTField = t007.field({ type: "color" }),
      bWrapper = createEl("div", { className: "tmg-media-settings-brand-wrapper" }),
      tWrapper = createEl("div", { className: "tmg-media-settings-theme-wrapper" });
    this.ctlr.config.watch("settings.css.brandColor", (v = defs.brand) => ((v = (v as string).toLowerCase()), (cBField.inputEl.value = v), (bField.inputEl.value = !defs.bcolors.includes(v) ? (!this.settings.css.syncWithMedia.brandColor ? "custom" : "auto") : v)), { init: true, signal: this.signal });
    this.ctlr.config.watch("settings.css.themeColor", (v = defs.theme) => ((v = (v as string).toLowerCase()), (cTField.inputEl.value = v), (tField.inputEl.value = !defs.tcolors.includes(v) ? (!this.settings.css.syncWithMedia.themeColor ? "custom" : "auto") : v)), { init: true, signal: this.signal });
    this.ctlr.DOM.settingsBottomPanel?.append((bWrapper.append(bField, cBField), bWrapper), (tWrapper.append(tField, cTField), tWrapper));
    const id = { theme: "", brand: "" },
      sync = (cb: any, req = true, type = "brand") => ((this.settings.css.syncWithMedia[`${type}Color`] = req), cb(req)),
      assert = (opts: any, type: "brand" | "theme" = "brand") => this.ctlr.toast?.update(id[type], opts),
      onBColorChange = ({ target: { value: val } }: any) =>
        this.ctlr.throttle(
          "brandColorPicking",
          async () => {
            id.brand && t007.toast?.dismiss(id.brand);
            let col;
            if (val === "custom") return cBField.inputEl.click();
            if (val !== "auto") col = this.settings.css.brandColor = val;
            else col = this.settings.css.brandColor = (this.media.status.loadedData ? await this.ctlr.plug("settings.frame")?.getMainColor(this.media.state.currentTime) : null) ?? this.ctlr.plug("settings.css")?.build.brandColor!; // said 'video' not 'poster' derived
            const cb = (s: any) => (bField.inputEl.value = defs.bcolors.includes(col as string) ? (col as string) : s ? "auto" : "custom"),
              No = () => (sync(cb, false), assert({ actions: { Yes } })),
              Yes = () => (sync(cb, true), assert({ actions: { No } }));
            sync(cb, val === "auto");
            val === "auto" && (id.brand = this.ctlr.toast?.("The brand color will change anytime a video loads", { icon: "🎨", autoClose: 15000, hideProgressBar: false, actions: { No }, onClose: () => (id.brand = ""), signal: this.signal }) || "");
          },
          150
        ),
      onTColorChange = ({ target: { value: val } }: any) =>
        this.ctlr.throttle(
          "themeColorPicking",
          async () => {
            id.theme && t007.toast?.dismiss(id.theme);
            let col;
            if (val === "custom") return cTField.inputEl.click();
            if (val !== "auto") col = this.settings.css.themeColor = val;
            else col = this.settings.css.themeColor = (this.media.status.loadedData ? await this.ctlr.plug("settings.frame")?.getMainColor(this.media.state.currentTime) : null) ?? this.ctlr.plug("settings.css")?.build.themeColor!;
            const cb = (s: any) => (tField.inputEl.value = defs.tcolors.includes(col as string) ? (col as string) : s ? "auto" : "custom"),
              No = () => (sync(cb, false, "theme"), assert({ actions: { Yes } }, "theme")),
              Yes = () => (sync(cb, true, "theme"), assert({ actions: { No } }, "theme"));
            sync(cb, val === "auto", "theme");
            val === "auto" && (id.theme = this.ctlr.toast?.("The theme color will change anytime a video loads", { icon: "🎨", autoClose: 15000, hideProgressBar: false, actions: { No }, onClose: () => (id.theme = ""), signal: this.signal }) || "");
          },
          150
        );
    bField.inputEl.addEventListener("input", onBColorChange, { signal: this.signal }), cBField.inputEl.addEventListener("input", onBColorChange, { signal: this.signal });
    tField.inputEl.addEventListener("input", onTColorChange, { signal: this.signal }), cTField.inputEl.addEventListener("input", onTColorChange, { signal: this.signal });
    // Helpful Tips
    const tipsBtn = createEl("button", { className: "tmg-media-settings-tips-btn", innerHTML: `<span>💡 Did You Know?</span>` });
    this.closeBtn?.insertAdjacentElement("afterend", tipsBtn);
    tipsBtn.addEventListener("click", this.showTipsDialog, { signal: this.signal });
  }

  private getTipsHTML() {
    return `
      <div style="font-family: inherit; color: inherit;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="margin: 0 0 10px 0; letter-spacing: -0.5px;">🎬 Welcome to TVP</h2>
          <p style="margin: 0; opacity: 0.9; line-height: 1.5;">
            You aren't just watching a video; you're sitting in the cockpit of the most advanced, performance-first media engine on the web. We are thrilled to have you here. 
            <br><b>Here is your official flight manual to unlock its full power:</b>
          </p>
        </div>
        <h3 style="margin-top: 0; margin-bottom: 10px; border-bottom: 1px solid currentColor; padding-bottom: 5px; opacity: 0.85;">🎛️ The Smart Canvas (Mouse & Touch)</h3>
        <ul style="padding-left: 20px; line-height: 1.6; margin-bottom: 25px;">
          <li><p><b>Hyper-speed on demand:</b> Click and hold the right side of the video screen or the play key (<b>Spacebar</b>) to fast-forward, left side or <b>Shift</b> + play key rewinds.</p></li>
          <li><p><b>Smart scrubbing:</b> Don't hunt for the tiny progress bar. Just scroll horizontally across the middle of the screen to scrub smoothly through time.</p></li>
          <li><p><b>Invisible sliders:</b> Scroll vertically on the <em>right edge</em> for Volume, and the <em>left edge</em> for Brightness.</p></li>
          <li><p><b>Precision taps:</b> Double-tap the edges to skip forward or backward. Double tap the center to toggle Fullscreen (or Play/Pause on mobile).</p></li>
        </ul>
        <h3 style="margin-top: 0; margin-bottom: 10px; border-bottom: 1px solid currentColor; padding-bottom: 5px; opacity: 0.85;">🏗️ Total UI Control</h3>
        <ul style="padding-left: 20px; line-height: 1.6; margin-bottom: 25px;">
          <li><p><b>Build your own player:</b> Don't like our layout? <b>Click and drag</b> almost "any" button on the control bars to physically rearrange the interface exactly how you want it.</p></li>
          <li><p><b>Draggable subtitles:</b> Subtitles blocking a crucial part of the scene? Just grab the text box and drag it anywhere else on the screen.</p></li>
          <li><p><b>The chameleon engine:</b> Head to settings and set your Brand/Theme colors to "Video Derived". TVP will actively analyze the video frames and extract dominant colors to paint the UI dynamically.</p></li>
          <li><p><b>Descriptive hints:</b> Hover over the controls to expose their tooltips and get more information about how to trigger each function.</p></li>
        </ul>
        <h3 style="margin-top: 0; margin-bottom: 10px; border-bottom: 1px solid currentColor; padding-bottom: 5px; opacity: 0.85;">⌨️ Keyboard Ninja Status</h3>
        <ul style="padding-left: 20px; line-height: 1.6; margin-bottom: 25px;">
          <li><p><b>The playback trinity (J, K, L):</b> Skip backward, Play/Pause, and Skip forward like a pro editor. Do the same with arrow keys, hold <b>Ctrl</b>, <b>Shift</b> or <b>Alt</b> to spice things up.</p></li>
          <li><p><b>Time travel:</b> Hit any number key to jump to that percentage of the video (e.g., hitting '5' jumps to the exact middle). <em>(Easter Egg: Undo or Redo with <b>Ctrl + Z</b> and <b>Ctrl + Y</b>)</em></p></li>
          <li><p><b>Frame-by-frame:</b> Paused the video? Use <b>,</b> (comma) and <b>.</b> (period) to step backward or forward one single frame at a time.</p></li>
          <li><p><b>Warp speed:</b> Use <b>&gt;</b> and <b>&lt;</b> to crank the playback speed up or down.</p></li>
        </ul>
        <h3 style="margin-top: 0; margin-bottom: 10px; border-bottom: 1px solid currentColor; padding-bottom: 5px; opacity: 0.85;">🔬 Advanced Window Tech</h3>
        <ul style="padding-left: 20px; line-height: 1.6; margin-bottom: 20px;">
          <li><p><b>The snapshot engine:</b> Click the Camera icon or press <b>s</b> to screenshot a high-res image of the exact frame. <em>(Easter Egg: Double-Click or press <b>Alt + s</b> to capture in pure Black &amp; White!)</em></p></li>
          <li><p><b>Ultra-readable time:</b> Click the time display or press <b>q</b> to toggle between elapsed time and remaining time. <em>(Easter Egg: Double-Click or press <b>z</b> to display the time in different formats!)</em></p></li>
          <li><p><b>Floating miniplayer:</b> Start playing a video and just scroll down the page. TVP will automatically detach into a draggable miniplayer so you never miss a second.</p></li>
          <li><p><b>Custom picture-in-picture:</b> We bypassed standard browser limits to give you a floating player that actually keeps all your custom UI controls intact.</p></li>
        </ul>
        <div style="text-align: center; margin-top: 30px; padding: 15px; border-radius: 8px; background: rgba(128, 128, 128, 0.1);">
          <p style="margin: 0 0 10px 0;"><b>Enjoy the player.</b> We're still in active development, but already miles ahead. Welcome to the bleeding edge.</p>
          <p style="margin: 0; opacity: 0.8;">🧪 <b>beta tester?</b> Find the Settings advanced menu to travel through linear time, or <a href="mailto:tobioketade007@gmail.com" style="color: inherit;">drop me an email</a> to collaborate!</p>
          </div>
        </div>
      `;
  }

  private async showTipsDialog() {
    await this.exitMore();
    t007.alert(this.getTipsHTML(), { id: `${this.ctlr.config.id}-tips-dialog`, rootElement: this.ctlr.DOM.content, confirmText: "Got it!" });
  }

  protected override onDestroy(): void {
    this.menu.destroy(), super.onDestroy();
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.panel": typeof PanelPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    panel: PanelConfig;
  }
}

export type * from "./types";
export * from "./build";
