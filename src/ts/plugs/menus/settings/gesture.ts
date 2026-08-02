import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { GesturePlug } from "@plugs/settings/gesture";
import { capitalize, uncamelize } from "@utils/str";
import { getBooleanMediaProps } from "@utils/media";
import { formatMenuPx } from "@utils/str";
import { UITuple } from "@defs/UIOptions";
import { formatMenuMs } from "@utils/time";

const getClickOptions = (plug: GesturePlug) => [{ value: false, display: "None" }, ...getBooleanMediaProps(plug.media).map((k) => ({ value: k, display: capitalize(uncamelize(k)) }))];

export const getSettingsGestureMenu = (plug: GesturePlug): SettingsMenuItem => ({
  id: "advanced",
  label: "Advanced",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "gestures",
      label: "Gestures",
      widget: "group",
      getValue: () => (plug.config.click === false && plug.config.dblClick === false && !plug.config.touch.volume && !plug.config.touch.brightness && !plug.config.touch.timeline && !plug.config.wheel.volume && !plug.config.wheel.brightness && !plug.config.wheel.timeline ? "Off" : "On"),
      getTipHTML: () => "Configure touch, swipe, and click interactions",
      configPaths: ["settings.gesture.click", "settings.gesture.dblClick", "settings.gesture.touch.volume", "settings.gesture.touch.brightness", "settings.gesture.touch.timeline", "settings.gesture.wheel.volume", "settings.gesture.wheel.brightness", "settings.gesture.wheel.timeline"],
      items: [
        { id: "gestureClick", label: "Single click", widget: "select", getValue: () => (plug.config.click === false ? "None" : capitalize(uncamelize(plug.config.click))), getOptions: () => getClickOptions(plug) as UITuple<string>[], onChange: (val: any) => (plug.config.click = val), configPaths: ["settings.gesture.click"], getTipHTML: () => "Action to perform when tapping once on the video player" },
        { id: "gestureDblClick", label: "Double click", widget: "select", getValue: () => (plug.config.dblClick === false ? "None" : capitalize(uncamelize(plug.config.dblClick))), getOptions: () => getClickOptions(plug) as UITuple<string>[], onChange: (val: any) => (plug.config.dblClick = val), configPaths: ["settings.gesture.dblClick"], getTipHTML: () => "Action to perform when double tapping on the video player" },
        {
          id: "gestureTouchGroup",
          label: "Touch gestures",
          widget: "group",
          getValue: () => (plug.config.touch.volume || plug.config.touch.brightness || plug.config.touch.timeline ? "On" : "Off"),
          items: [
            { id: "gestureTouchVolume", label: "Volume swipe", widget: "toggle", getValue: () => (plug.config.touch.volume ? "On" : "Off"), onChange: (val: boolean) => (plug.config.touch.volume = val), configPaths: ["settings.gesture.touch.volume"], title: "Swipe up or down on the right side of the screen to adjust volume" },
            { id: "gestureTouchBrightness", label: "Brightness swipe", widget: "toggle", getValue: () => (plug.config.touch.brightness ? "On" : "Off"), onChange: (val: boolean) => (plug.config.touch.brightness = val), configPaths: ["settings.gesture.touch.brightness"], title: "Swipe up or down on the left side of the screen to adjust brightness" },
            { id: "gestureTouchTimeline", label: "Seek swipe", widget: "toggle", getValue: () => (plug.config.touch.timeline ? "On" : "Off"), onChange: (val: boolean) => (plug.config.touch.timeline = val), configPaths: ["settings.gesture.touch.timeline"], title: "Swipe left or right anywhere on the screen to seek." },
            { id: "gestureTouchThreshold", label: "Swipe threshold", widget: "input", inputs: [{ label: "ms", placeholder: "200", helperText: { info: "Time in ms before a touch is acknowledged to start a swipe gesture, provided it did not move during the hold duration." }, type: "number", min: "0", value: () => plug.config.touch.threshold }], getValue: () => formatMenuMs(plug.config.touch.threshold), onChange: (val: Record<string, any>) => (plug.config.touch.threshold = val["ms"]), configPaths: ["settings.gesture.touch.threshold"] },
            { id: "gestureTouchSliderTimeout", label: "Slider timeout", widget: "input", inputs: [{ label: "ms", placeholder: "2500", helperText: { info: "How long the gesture indicator stays on screen after swiping." }, type: "number", min: "0", value: () => plug.config.touch.sliderTimeout }], getValue: () => formatMenuMs(plug.config.touch.sliderTimeout), onChange: (val: Record<string, any>) => (plug.config.touch.sliderTimeout = val["ms"]), configPaths: ["settings.gesture.touch.sliderTimeout"] },
            { id: "gestureTouchAxesRatio", label: "Axes ratio", widget: "range", getValue: () => String(plug.config.touch.axesRatio), getRange: () => ({ min: 0.1, max: 10, step: 0.25, formatTooltip: (v: number) => v.toFixed(1) }), onChange: (val: number) => (plug.config.touch.axesRatio = val), configPaths: ["settings.gesture.touch.axesRatio"], getTipHTML: () => "Multiplier for vertical vs horizontal swipe dominance" },
            { id: "gestureTouchInset", label: "Edge inset", widget: "range", getValue: () => formatMenuPx(plug.config.touch.inset, true), getRange: () => ({ min: 0, max: 100, step: 5, formatTooltip: formatMenuPx }), onChange: (val: number) => (plug.config.touch.inset = val), configPaths: ["settings.gesture.touch.inset"], getTipHTML: () => "Distance from the screen edges to ignore swipes (prevents accidental gestures)" },
          ],
        },
        {
          id: "gestureWheelGroup",
          label: "Scroll wheel",
          widget: "group",
          getValue: () => (plug.config.wheel.volume || plug.config.wheel.brightness || plug.config.wheel.timeline ? "On" : "Off"),
          items: [
            { id: "gestureWheelVolume", label: "Volume scroll", widget: "toggle", getValue: () => (plug.config.wheel.volume ? "On" : "Off"), onChange: (val: boolean) => (plug.config.wheel.volume = val), configPaths: ["settings.gesture.wheel.volume"] },
            { id: "gestureWheelBrightness", label: "Brightness scroll", widget: "toggle", getValue: () => (plug.config.wheel.brightness ? "On" : "Off"), onChange: (val: boolean) => (plug.config.wheel.brightness = val), configPaths: ["settings.gesture.wheel.brightness"] },
            { id: "gestureWheelTimeline", label: "Seek scroll", widget: "toggle", getValue: () => (plug.config.wheel.timeline ? "On" : "Off"), onChange: (val: boolean) => (plug.config.wheel.timeline = val), configPaths: ["settings.gesture.wheel.timeline"] },
            { id: "gestureWheelTimeout", label: "Wheel timeout", widget: "input", inputs: [{ label: "ms", placeholder: "2500", type: "number", min: "0", required: true, value: () => plug.config.wheel.timeout }], getValue: () => formatMenuMs(plug.config.wheel.timeout), onChange: (val: Record<string, any>) => (plug.config.wheel.timeout = val["ms"]), configPaths: ["settings.gesture.wheel.timeout"] },
            { id: "gestureWheelXRatio", label: "Horizontal sensitivity", widget: "range", getValue: () => String(plug.config.wheel.xRatio), getRange: () => ({ min: 1, max: 50, step: 1 }), onChange: (val: number) => (plug.config.wheel.xRatio = val), configPaths: ["settings.gesture.wheel.xRatio"] },
            { id: "gestureWheelYRatio", label: "Vertical sensitivity", widget: "range", getValue: () => String(plug.config.wheel.yRatio), getRange: () => ({ min: 1, max: 50, step: 1 }), onChange: (val: number) => (plug.config.wheel.yRatio = val), configPaths: ["settings.gesture.wheel.yRatio"] },
          ],
        },
      ],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.gesture": typeof getSettingsGestureMenu;
  }
}
