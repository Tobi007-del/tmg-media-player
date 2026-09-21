import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { GesturePlug } from "@plugs/settings/gesture";
import { capitalize, uncamelize } from "@utils/str";
import { getMediaProps } from "@utils/media";
import { formatMenuPx } from "@utils/str";
import { UITuple } from "@defs/UIOptions";
import { formatUITime } from "@utils/time";

export const getMediaBools = (plug: GesturePlug) => [
  { value: false, display: "None" },
  ...getMediaProps(plug.media)
    .sort()
    .map((k) => ({ value: k, display: capitalize(uncamelize(k)) })),
];

export const getSettingsGestureMenu = (plug: GesturePlug): SettingsMenuItem => ({
  id: "advanced",
  label: "Advanced",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "interaction",
      label: "Interaction",
      widget: "group",
      getValue: () => "On",
      items: [
        {
          id: "gestures",
          label: "Gesture",
          widget: "group",
          getValue: () => (plug.config.click === false && plug.config.dblClick === false && !plug.config.touch.volume && !plug.config.touch.brightness && !plug.config.touch.timeline && !plug.config.wheel.volume && !plug.config.wheel.brightness && !plug.config.wheel.timeline ? "Off" : "On"),
          configPaths: ["settings.gesture.click", "settings.gesture.dblClick", "settings.gesture.touch.volume", "settings.gesture.touch.brightness", "settings.gesture.touch.timeline", "settings.gesture.wheel.volume", "settings.gesture.wheel.brightness", "settings.gesture.wheel.timeline"],
          items: [
            { id: "gestureClick", label: "Single click", widget: "select", getValue: () => (plug.config.click === false ? "None" : capitalize(uncamelize(plug.config.click))), getOptions: () => getMediaBools(plug) as UITuple<string>[], onChange: (val: any) => (plug.config.click = val), configPaths: ["settings.gesture.click"] },
            { id: "gestureDblClick", label: "Double click", widget: "select", getValue: () => (plug.config.dblClick === false ? "None" : capitalize(uncamelize(plug.config.dblClick))), getOptions: () => getMediaBools(plug) as UITuple<string>[], onChange: (val: any) => (plug.config.dblClick = val), configPaths: ["settings.gesture.dblClick"] },
            {
              id: "gestureTouchGroup",
              label: "Screen touch",
              widget: "group",
              getValue: () => (plug.config.touch.volume || plug.config.touch.brightness || plug.config.touch.timeline ? "On" : "Off"),
              items: [
                { id: "gestureTouchVolume", label: "Volume swipe", widget: "toggle", getValue: () => (plug.config.touch.volume ? "On" : "Off"), onChange: (val: boolean) => (plug.config.touch.volume = val), configPaths: ["settings.gesture.touch.volume"], title: "Swipe up or down on the right side of the screen to adjust volume" },
                { id: "gestureTouchBrightness", label: "Brightness swipe", widget: "toggle", getValue: () => (plug.config.touch.brightness ? "On" : "Off"), onChange: (val: boolean) => (plug.config.touch.brightness = val), configPaths: ["settings.gesture.touch.brightness"], title: "Swipe up or down on the left side of the screen to adjust brightness" },
                { id: "gestureTouchTimeline", label: "Seek swipe", widget: "toggle", getValue: () => (plug.config.touch.timeline ? "On" : "Off"), onChange: (val: boolean) => (plug.config.touch.timeline = val), configPaths: ["settings.gesture.touch.timeline"], title: "Swipe left or right anywhere on the screen to seek" },
                {
                  id: "gestureTouchSensitivityGroup",
                  label: "Sensitivity",
                  widget: "group",
                  getValue: () => (plug.config.touch.xRatio && plug.config.touch.yRatio ? "On" : "Off"),
                  items: [
                    {
                      id: "gestureTouchRatio",
                      label: "Swipe ratio (X, Y)",
                      widget: "input",
                      inputs: [
                        { name: "x", label: "Horizontal", type: "number", min: "0", max: "10", step: "0.25", value: () => plug.config.touch.xRatio },
                        { name: "y", label: "Vertical", type: "number", min: "0", max: "10", step: "0.25", value: () => plug.config.touch.yRatio }
                      ],
                      getValue: () => `${plug.config.touch.xRatio}, ${plug.config.touch.yRatio}`,
                      onChange: (val: any) => (val.x && (plug.config.touch.xRatio = Number(val.x)), val.y && (plug.config.touch.yRatio = Number(val.y))),
                      configPaths: ["settings.gesture.touch.xRatio", "settings.gesture.touch.yRatio"]
                    },
                    { id: "gestureTouchAxesRatio", label: "Axis dominance", widget: "range", getValue: () => String(plug.config.touch.axesRatio), getRange: () => ({ min: 0, max: 10, step: 0.25, formatTooltip: (v: number) => v.toFixed(1) }), onChange: (val: number) => (plug.config.touch.axesRatio = val), configPaths: ["settings.gesture.touch.axesRatio"], getTipHTML: () => "Minimum ratio of vertical to horizontal movement. Higher values require straighter swipes." },
                    { id: "gestureTouchThreshold", label: "Hold duration", widget: "input", inputs: [{ label: "ms", placeholder: "200", helperText: { info: "How long before a touch starts a swipe gesture, provided it did not move during the hold" }, type: "number", min: "0", max: "10000", value: () => plug.config.touch.threshold }], getValue: () => formatUITime(plug.config.touch.threshold), onChange: (val: Record<string, any>) => (plug.config.touch.threshold = val["ms"]), configPaths: ["settings.gesture.touch.threshold"] },
                    { id: "gestureTouchInset", label: "Edge inset", widget: "range", getValue: () => formatMenuPx(plug.config.touch.inset, true), getRange: () => ({ min: 0, max: 100, step: 5, formatTooltip: formatMenuPx }), onChange: (val: number) => (plug.config.touch.inset = val), configPaths: ["settings.gesture.touch.inset"], getTipHTML: () => "Distance from the screen edges to ignore swipes (prevents accidental gestures)" },
                  ]
                },
                { id: "gestureTouchSliderTimeout", label: "Slider timeout", widget: "input", inputs: [{ label: "ms", placeholder: "2500", helperText: { info: "How long the gesture indicator stays on screen after swiping" }, type: "number", min: "0", value: () => plug.config.touch.sliderTimeout }], getValue: () => formatUITime(plug.config.touch.sliderTimeout), onChange: (val: Record<string, any>) => (plug.config.touch.sliderTimeout = val["ms"]), configPaths: ["settings.gesture.touch.sliderTimeout"] },
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
                {
                  id: "gestureWheelRatio",
                  label: "Scroll ratio (X, Y)",
                  widget: "input",
                  inputs: [
                    { name: "x", label: "Horizontal", type: "number", min: "1", max: "50", value: () => plug.config.wheel.xRatio },
                    { name: "y", label: "Vertical", type: "number", min: "1", max: "50", value: () => plug.config.wheel.yRatio }
                  ],
                  getValue: () => `${plug.config.wheel.xRatio}, ${plug.config.wheel.yRatio}`,
                  onChange: (val: any) => (val.x && (plug.config.wheel.xRatio = Number(val.x)), val.y && (plug.config.wheel.yRatio = Number(val.y))),
                  configPaths: ["settings.gesture.wheel.xRatio", "settings.gesture.wheel.yRatio"]
                },
                { id: "gestureWheelTimeout", label: "Scroll timeout", widget: "input", inputs: [{ label: "ms", placeholder: "2500", type: "number", min: "0", required: true, value: () => plug.config.wheel.timeout }], getValue: () => formatUITime(plug.config.wheel.timeout), onChange: (val: Record<string, any>) => (plug.config.wheel.timeout = val["ms"]), configPaths: ["settings.gesture.wheel.timeout"] },
              ],
            },
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
