import { BasePlug } from "../../base";
import { SETTINGS_BUILD } from "./build";
import type { SettingsView } from "./types";
import { createEl } from "@utils/dom";
import { mockAsync } from "@utils/fn";
import { parseCSSTime } from "@utils/str";

export class SettingsViewPlug extends BasePlug<SettingsView> {
  public static readonly plugName = "settingsView";
  public static readonly BUILD = SETTINGS_BUILD;
  public closeBtn!: HTMLButtonElement | null;
  protected wasPaused = false;

  public override wire(): void {
    // Variables Assignment
    this.closeBtn = this.ctlr.queryDOM(".tmg-media-settings-close-btn")!;
    // Event Listeners
    this.closeBtn.addEventListener("click", this.leaveView, { signal: this.signal });
    // Ctlr Media Listeners
    this.media.on("state.paused", ({ value }) => !value && this.leaveView(), { signal: this.signal });
    // Post Wiring
    this.ctlr.plug("settings.keys")?.register("settings", this.toggleView, { phase: "keyup", zen: true });
    // #BETA: clean swap-in with beta for now
    this.closeBtn.insertAdjacentHTML("afterend", `<button type="button" class="tmg-media-settings-tips-btn"><span>💡 Did You Know?</span></button>`);
    this.ctlr.queryDOM(".tmg-media-settings-tips-btn")!.addEventListener("click", this.showTipsDialog, { signal: this.signal });
    setTimeout(this.initSettingsUIManager);
  }

  public async enterView(): Promise<void> {
    if (this.ctlr.isUIActive("settings")) return;
    this.wasPaused = this.media.state.paused;
    this.media.intent.paused = true;
    this.media.container.classList.add("tmg-media-settings-view");
    await mockAsync(parseCSSTime(this.ctlr.settings.css.settingsViewTransitionTime));
    this.ctlr.plug("settings.overlay")?.show();
    this.ctlr.DOM.settings?.removeAttribute("inert"), this.ctlr.DOM.containerContent?.setAttribute("inert", "");
    this.closeBtn?.focus();
    this.ctlr.plug("settings.keys")?.setEventListeners();
  } // #STANDALONE: needs scoped behavior

  public async leaveView(): Promise<void> {
    if (!this.ctlr.isUIActive("settings")) return;
    this.media.container.classList.remove("tmg-media-settings-view");
    await mockAsync(parseCSSTime(this.ctlr.settings.css.settingsViewTransitionTime));
    this.media.intent.paused = this.wasPaused;
    this.ctlr.DOM.settings?.setAttribute("inert", ""), this.ctlr.DOM.containerContent?.removeAttribute("inert");
    this.ctlr.plug("settings.keys")?.setEventListeners();
  } // #STANDALONE: needs scoped behavior

  public async toggleView(): Promise<void> {
    this.ctlr.isUIActive("settings") ? await this.leaveView() : await this.enterView();
  }

  // #BETA: clean swap-in with beta for now
  private initSettingsUIManager() {
    // prettier-ignore
    const options = [{ option: "Light Blue", value: "#3198f5" },{ option: "Hot Pink", value: "#ff69b4" },{ option: "Fiery Red", value: "#ff0033" },{ option: "Dark Turquoise", value: "#00ced1" },{ option: "Custom Hue", value: "custom" },{ option: "Video Derived", value: "auto" }],
      gcolors = options.slice(0, -2).map((opt) => opt.value),
      defs = { brand: this.ctlr.settings.css.brandColor ?? "#e26e02", theme: this.ctlr.settings.css.themeColor ?? "#ffffff", bcolors: ["#e26e02", ...gcolors], tcolors: ["#ffffff", ...gcolors] },
      bField = t007.field({ type: "select", label: "Brand Color", helperText: { info: "You should just try changing your brand color for now" }, options: [{ option: "Tastey Orange", value: "#e26e02" }, ...options], value: !defs.bcolors.includes(defs.brand as string) ? (!this.ctlr.settings.css.syncWithMedia.brandColor ? "custom" : "auto") : defs.brand }),
      cBField = t007.field({ type: "color" }),
      tField = t007.field({ type: "select", label: "Theme Color", helperText: { info: "You should also try changing your theme color for now" }, options: [{ option: "Pure White", value: "#ffffff" }, ...options], value: !defs.tcolors.includes(defs.theme as string) ? (!this.ctlr.settings.css.syncWithMedia.themeColor ? "custom" : "auto") : defs.theme }),
      cTField = t007.field({ type: "color" }),
      bWrapper = createEl("div"),
      tWrapper = createEl("div");
    this.ctlr.config.watch("settings.css.brandColor", (v = defs.brand) => ((v = (v as string).toLowerCase()), (cBField.inputEl.value = v), cBField.style.setProperty("--input-color", v), (bField.inputEl.value = !defs.bcolors.includes(v) ? (!this.ctlr.settings.css.syncWithMedia.brandColor ? "custom" : "auto") : v)), { init: true, signal: this.signal });
    this.ctlr.config.watch("settings.css.themeColor", (v = defs.theme) => ((v = (v as string).toLowerCase()), (cTField.inputEl.value = v), cTField.style.setProperty("--input-color", v), (tField.inputEl.value = !defs.tcolors.includes(v) ? (!this.ctlr.settings.css.syncWithMedia.themeColor ? "custom" : "auto") : v)), { init: true, signal: this.signal });
    this.ctlr.DOM.settingsBottomPanel?.append((bWrapper.append(bField, cBField), bWrapper), (tWrapper.append(tField, cTField), tWrapper));
    const id = { theme: "", brand: "" },
      sync = (cb: any, req = true, type = "brand") => ((this.ctlr.settings.css.syncWithMedia[`${type}Color`] = req), cb(req)),
      assert = (opts: any, type: "brand" | "theme" = "brand") => this.ctlr.plug("settings.toasts")?.toast?.update(id[type], { render: `Still here in case you change your choice about the ${type}`, ...opts }),
      onBColorChange = ({ target: { value: val } }: any) => {
        this.ctlr.throttle(
          "brandColorPicking",
          async () => {
            id.brand && this.ctlr.plug("settings.toasts")?.toast?.dismiss(id.brand);
            let col;
            if (val === "custom") return cBField.inputEl.click();
            if (val !== "auto") col = this.ctlr.settings.css.brandColor = val;
            else col = this.ctlr.settings.css.brandColor = (this.media.status.loadedData ? await this.ctlr.plug("settings.frame")?.getMainColor(this.media.state.currentTime) : null) ?? this.ctlr.plug("settings.css")?._cache.brandColor!;
            const cb = (s: any) => (bField.inputEl.value = defs.bcolors.includes(col) ? col : s ? "auto" : "custom"),
              No = () => (sync(cb, false), assert({ actions: { Yes } })),
              Yes = () => (sync(cb, true), assert({ actions: { No } }));
            sync(cb, val === "auto");
            val === "auto" && (id.brand = this.ctlr.plug("settings.toasts")?.toast?.("Should the brand color change anytime a video loads?", { icon: "🎨", autoClose: 15000, hideProgressBar: false, actions: { Yes, No }, onClose: () => (id.brand = "") }) || "");
          },
          150
        );
      },
      onTColorChange = ({ target: { value: val } }: any) => {
        this.ctlr.throttle(
          "themeColorPicking",
          async () => {
            id.theme && this.ctlr.plug("settings.toasts")?.toast?.dismiss(id.theme);
            let col;
            if (val === "custom") return cTField.inputEl.click();
            if (val !== "auto") col = this.ctlr.settings.css.themeColor = val;
            else col = this.ctlr.settings.css.themeColor = (this.media.status.loadedData ? await this.ctlr.plug("settings.frame")?.getMainColor(this.media.state.currentTime) : null) ?? this.ctlr.plug("settings.css")?._cache.themeColor!;
            const cb = (s: any) => (tField.inputEl.value = defs.tcolors.includes(col) ? col : s ? "auto" : "custom"),
              No = () => (sync(cb, false, "theme"), assert({ actions: { Yes } }, "theme")),
              Yes = () => (sync(cb, true, "theme"), assert({ actions: { No } }, "theme"));
            sync(cb, val === "auto", "theme");
            val === "auto" && (id.theme = this.ctlr.plug("settings.toasts")?.toast?.("Should the theme color change anytime a video loads?", { icon: "🎨", autoClose: 15000, hideProgressBar: false, actions: { Yes, No }, onClose: () => (id.theme = "") }) || "");
          },
          150
        );
      };
    bField.inputEl.addEventListener("input", onBColorChange);
    cBField.inputEl.addEventListener("input", onBColorChange);
    tField.inputEl.addEventListener("input", onTColorChange);
    cTField.inputEl.addEventListener("input", onTColorChange);
  }
  private getTipsHTML() {
    return `
      <div style="text-align: left; font-family: inherit; color: inherit;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="margin: 0 0 10px 0; letter-spacing: -0.5px;">🎬 Welcome to TVP</h2>
          <p style="margin: 0; opacity: 0.9; line-height: 1.5;">
            You aren't just watching a video; you're sitting in the cockpit of the most advanced, performance-first media engine on the web. We are thrilled to have you here. 
            <br><strong>Here is your official flight manual to unlock its full power:</strong>
          </p>
        </div>
        <h3 style="margin-top: 0; margin-bottom: 10px; border-bottom: 1px solid currentColor; padding-bottom: 5px; opacity: 0.85;">🎛️ The Smart Canvas (Touch & Mouse)</h3>
        <ul style="padding-left: 20px; line-height: 1.6; margin-bottom: 25px;">
          <li><strong>Hyper-Speed on Demand:</strong> Click and hold the right side of the video screen or the play key (<strong>Spacebar</strong>) to fast-forward, left side or <strong>Shift</strong> + play key rewinds.</li>
          <li><strong>Smart Scrubbing:</strong> Don't hunt for the tiny progress bar. Just scroll horizontally across the middle of the screen to scrub smoothly through time.</li>
          <li><strong>Invisible Sliders:</strong> Scroll vertically on the <em>right edge</em> for Volume, and the <em>left edge</em> for Brightness.</li>
          <li><strong>Precision Taps:</strong> Double-tap the edges to skip forward or backward. Double tap the center to toggle Fullscreen (or Play/Pause on mobile).</li>
        </ul>
        <h3 style="margin-top: 0; margin-bottom: 10px; border-bottom: 1px solid currentColor; padding-bottom: 5px; opacity: 0.85;">🏗️ Total UI Control</h3>
        <ul style="padding-left: 20px; line-height: 1.6; margin-bottom: 25px;">
          <li><strong>Build Your Own Player:</strong> Don't like our layout? <strong>Click and drag</strong> almost any button on the bottom control bar to physically rearrange the interface exactly how you want it.</li>
          <li><strong>Draggable Subtitles:</strong> Subtitles blocking a crucial part of the scene? Just grab the text box and drag it anywhere else on the screen.</li>
          <li><strong>The Chameleon Engine:</strong> Head to settings and set your Brand/Theme colors to "Video Derived". TVP will actively analyze the video frames and extract dominant colors to paint the UI dynamically.</li>
          <li><strong>Descriptive Hints:</strong> Hover over the controls to expose their tooltips and get more information about how to trigger each function.</li>
        </ul>
        <h3 style="margin-top: 0; margin-bottom: 10px; border-bottom: 1px solid currentColor; padding-bottom: 5px; opacity: 0.85;">⌨️ Keyboard Ninja Status</h3>
        <ul style="padding-left: 20px; line-height: 1.6; margin-bottom: 25px;">
          <li><strong>The Playback Trinity (J, K, L):</strong> Skip backward, Play/Pause, and Skip forward like a pro editor. Do the same with arrow keys, hold <strong>Ctrl</strong>, <strong>Shift</strong> or <strong>Alt</strong> to spice things up.</li>
          <li><strong>Time Travel (0 - 9):</strong> Hit any number key to instantly jump to that percentage of the video (e.g., hitting '5' jumps to the exact middle).</li>
          <li><strong>Frame-by-Frame:</strong> Paused the video? Use <strong>,</strong> (comma) and <strong>.</strong> (period) to step backward or forward one single frame at a time.</li>
          <li><strong>Warp Speed:</strong> Use <strong>&gt;</strong> and <strong>&lt;</strong> to crank the playback speed up or down.</li>
        </ul>
        <h3 style="margin-top: 0; margin-bottom: 10px; border-bottom: 1px solid currentColor; padding-bottom: 5px; opacity: 0.85;">🔬 Advanced Window Tech</h3>
        <ul style="padding-left: 20px; line-height: 1.6; margin-bottom: 20px;">
          <li><strong>The Snapshot Engine:</strong> Click the Camera icon or press <strong>s</strong> to screenshot a high-res image of the exact frame. <em>(Easter Egg: Double-Click or press <strong>Alt + s</strong> to capture in pure Black & White!)</em></li>
          <li><strong>Ultra-readable Time:</strong> Click the time display or press <strong>q</strong> to toggle between elapsed time and remaining time. <em>(Easter Egg: Double-Click or press <strong>z</strong> to display the time in different formats!)</em></li>
          <li><strong>Floating Miniplayer:</strong> Start playing a video and just scroll down the page. TVP will automatically detach into a draggable miniplayer so you never miss a second.</li>
          <li><strong>Custom Picture-in-Picture:</strong> We bypassed standard browser limits to give you a floating player that actually keeps all your custom UI controls intact.</li>
        </ul>
        <div style="text-align: center; margin-top: 30px; padding: 15px; border-radius: 8px; background: rgba(128, 128, 128, 0.1);">
          <p style="margin: 0 0 10px 0;"><strong>Enjoy the engine.</strong> We're still in active development, but we're already miles ahead. Welcome to the bleeding edge.</p>
          <p style="margin: 0; opacity: 0.8;">🧪 <strong>Beta Tester?</strong> Check the bottom of the page to find the hidden button to travel through linear time, or <a href="mailto:tobioketade007@gmail.com" style="color: inherit; text-decoration: underline;">drop me an email</a> to collaborate!</p>
          </div>
        </div>
      `;
  }
  private async showTipsDialog() {
    await this.leaveView();
    t007.alert(this.getTipsHTML(), { id: `${this.ctlr.config.id}-tips-dialog`, rootElement: this.ctlr.DOM.containerContent, confirmText: "Got it!" });
  }
}

declare module "@defs/registries" {
  interface PlugRegistryMap {
    "settings.settingsView": typeof SettingsViewPlug;
  }
}

declare module "@defs/config" {
  interface Settings {
    settingsView: SettingsView;
  }
}

export type * from "./types";
export * from "./build";
