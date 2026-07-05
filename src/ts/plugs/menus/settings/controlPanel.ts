import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { ControlPanelPlug } from "@plugs/settings/controlPanel";
import { CONTROLS, BIG_CONTROLS } from "@plugs/settings/controlPanel/build";
import type { AnyControl, ControlPanelBottomTuple } from "@plugs/settings/controlPanel/types";
import { getUIOpt, getBoolOrStr, insertPanelCtrl, getPanelLocation } from "@utils/obj";
import { getPath, setPath } from "sia-reactor/utils";

const isEnabled = (plug: ControlPanelPlug, id: AnyControl) => getPanelLocation(plug.config, id).row.includes(id);
const setEnabled = (plug: ControlPanelPlug, id: AnyControl, enabled: boolean, b = plug.ctlr._build.settings.controlPanel) => {
  const cLoc = getPanelLocation(plug.config, id);
  // prettier-ignore
  if (!enabled) return void (cLoc.row.includes(id) && setPath(plug.config as any, cLoc.path, cLoc.row.filter((c: any) => c !== id)));
  if (cLoc.row.includes(id)) return;
  const bLoc = getPanelLocation(b, id),
    cfgRow = getPath(plug.config as any, bLoc.path) as any[];
  Array.isArray(cfgRow) && bLoc.row.length ? insertPanelCtrl(cfgRow, bLoc.row, id) : (plug.config.bottom as ControlPanelBottomTuple)[1].push(id);
};

export const getSettingsControlPanelMenu = (plug: ControlPanelPlug): SettingsMenuItem => ({
  id: "general",
  label: "General",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "layoutControlPanel",
      label: "Control panel",
      widget: "group",
      getValue: () => "",
      tipHTML: "Configure player controls, layout, and visual feedback",
      items: [
        {
          id: "layoutToggleControls",
          label: "Toggle controls",
          widget: "group",
          getValue: () => "",
          configPaths: ["settings.controlPanel.top", "settings.controlPanel.center", "settings.controlPanel.bottom"],
          items: [...CONTROLS, ...BIG_CONTROLS]
            .filter((id) => id !== "spacer")
            .map((id) => ({
              id: `toggle-cp-${id}`,
              label: id
                .replace(/([A-Z])/g, " $1")
                .toLowerCase()
                .replace(/^./, (s) => s.toUpperCase()),
              widget: "toggle" as const,
              getValue: () => (isEnabled(plug, id) ? "On" : "Off"),
              onChange: (val: boolean) => setEnabled(plug, id, val),
              configPaths: ["settings.controlPanel.top", "settings.controlPanel.center", "settings.controlPanel.bottom"],
            })),
        },
        {
          id: "layoutTimeline",
          label: "Timeline",
          widget: "group",
          getValue: () => "",
          items: [
            {
              id: "timelineThumb",
              label: "Show thumb",
              widget: "select",
              getValue: () => getUIOpt(plug.config.timeline.thumb.options, plug.config.timeline.thumb.value),
              getOptions: () => plug.config.timeline.thumb.options!,
              onChange: (val: string) => (plug.config.timeline.thumb.value = val === "auto" ? "auto" : val === "true"),
              configPaths: ["settings.controlPanel.timeline.thumb.value"],
            },
            {
              id: "timelineCompact",
              label: "Compact mode",
              widget: "toggle",
              getValue: () => (plug.comp("timeline")?.config.compact ? "On" : "Off"),
              onChange: (val: boolean) => (plug.config.timeline.compact = val),
              configPaths: ["settings.controlPanel.timeline.compact"],
              title: "Make the timeline thinner and more minimalist to conserve space",
            },

            {
              id: "timelineAutopause",
              label: "Pause-to-preview",
              widget: "toggle",
              getValue: () => (plug.comp("timeline")?.config.autopause ? "On" : "Off"),
              onChange: (val: boolean) => (plug.config.timeline.autopause = val),
              configPaths: ["settings.controlPanel.timeline.autopause"],
              title: "Automatically pauses the video while you are dragging the timeline to seek",
            },
            {
              id: "timelinePlayedMarks",
              label: "Played marks",
              widget: "toggle",
              getValue: () => (plug.comp("timeline")?.config.playedMarks ? "On" : "Off"),
              onChange: (val: boolean) => (plug.config.timeline.playedMarks = val),
              configPaths: ["settings.controlPanel.timeline.playedMarks"],
              title: "Displays colored indicators on the timeline for sections you've already watched",
            },
            {
              id: "timelineBufferMarks",
              label: "Buffer marks",
              widget: "toggle",
              getValue: () => (plug.comp("timeline")?.config.bufferMarks ? "On" : "Off"),
              onChange: (val: boolean) => (plug.config.timeline.bufferMarks = val),
              configPaths: ["settings.controlPanel.timeline.bufferMarks"],
              title: "Shows a progress bar indicating how much of the video has been pre-loaded",
            },
            {
              id: "timelinePreviews",
              label: "Seek previews",
              widget: "toggle",
              getValue: () => (plug.comp("timeline")?.config.previews ? "On" : "Off"),
              onChange: (val: boolean) => (plug.config.timeline.previews = val),
              configPaths: ["settings.controlPanel.timeline.previews"],
              title: "Displays a thumbnail preview of the video frame when hovering over the timeline. Note: If a specific preview type (e.g. sprite/image src) was set by the developer, toggling this will reset it to 'auto'.",
            },
            {
              id: "timelineScrub",
              label: "Scrub behaviour",
              widget: "group",
              getValue: () => "",
              items: [
                {
                  id: "timelineScrubSync",
                  label: "Sync scrubbing",
                  widget: "toggle",
                  getValue: () => (plug.comp("timeline")?.config.scrub.sync ? "On" : "Off"),
                  onChange: (val: boolean) => (plug.config.timeline.scrub.sync = val),
                  configPaths: ["settings.controlPanel.timeline.scrub.sync"],
                  title: "Updates the video frame in real-time as you drag the timeline cursor",
                },
                {
                  id: "timelineScrubRelative",
                  label: "Relative scrubbing",
                  widget: "toggle",
                  getValue: () => (plug.comp("timeline")?.config.scrub.relative ? "On" : "Off"),
                  onChange: (val: boolean) => (plug.config.timeline.scrub.relative = val),
                  configPaths: ["settings.controlPanel.timeline.scrub.relative"],
                  title: "Whether the scrubbing pointer should follow your finger exactly or move relative to your initial point of touch",
                },
                {
                  id: "timelineScrubCancel",
                  label: "Scrub cancellation",
                  widget: "group",
                  getValue: () => (plug.comp("timeline")?.config.scrub.cancel.delta && plug.comp("timeline")?.config.scrub.cancel.timeout ? "On" : "Off"),
                  configPaths: ["settings.controlPanel.timeline.scrub.cancel.delta", "settings.controlPanel.timeline.scrub.cancel.timeout"],
                  items: [
                    {
                      id: "timelineScrubCancelDelta",
                      label: "Cancel distance",
                      widget: "range",
                      getValue: () => `${Math.round(plug.comp("timeline")?.config.scrub.cancel.delta!)}px`,
                      getRange: () => ({ min: 0, max: 100, step: 5 }),
                      onChange: (val: number) => (plug.config.timeline.scrub.cancel.delta = val),
                      configPaths: ["settings.controlPanel.timeline.scrub.cancel.delta"],
                      tipHTML: "Horizontal distance from your initial drag position before a scrub is considered cancelled.",
                    },
                    {
                      id: "timelineScrubCancelTimeout",
                      label: "Cancel timeout",
                      widget: "input",
                      inputs: [{ label: "ms", placeholder: "2500", type: "number", min: "0", helperText: { info: "How long to wait before allowing you to resume scrubbing after a cancellation." }, value: () => plug.comp("timeline")?.config.scrub.cancel.timeout }],
                      getValue: () => `${plug.comp("timeline")?.config.scrub.cancel.timeout}ms`,
                      onChange: (val: Record<string, any>) => (plug.config.timeline.scrub.cancel.timeout = val["ms"]),
                      configPaths: ["settings.controlPanel.timeline.scrub.cancel.timeout"],
                      tipHTML: "How long to wait before allowing you to resume scrubbing after a cancellation attempt.",
                    },
                  ],
                },
              ],
            },
            {
              id: "timelineWheelGroup",
              label: "Wheel seek",
              widget: "group",
              getValue: () => (plug.comp("timeline")?.config.wheel.disabled ? "Off" : "On"),
              items: [
                {
                  id: "timelineWheelDisabled",
                  label: "Disable",
                  widget: "toggle",
                  getValue: () => (plug.comp("timeline")?.config.wheel.disabled ? "On" : "Off"),
                  onChange: (val: boolean) => (plug.config.timeline.wheel.disabled = val),
                  configPaths: ["settings.controlPanel.timeline.wheel"],
                  title: "Enables seeking through the video by scrolling the mouse wheel over the timeline",
                },
                {
                  id: "timelineWheelAxisRatio",
                  label: "Sensitivity",
                  widget: "range",
                  getValue: () => String(plug.comp("timeline")?.config.wheel.axisRatio),
                  getRange: () => ({ min: 1, max: 50, step: 1 }),
                  onChange: (val: number) => (plug.config.timeline.wheel.axisRatio = val),
                  configPaths: ["settings.controlPanel.timeline.wheel"],
                  tipHTML: "Adjusts how much the video seeks per scroll wheel notch",
                },
              ],
            },
            {
              id: "timelineMarkers",
              label: "Add marker",
              widget: "input",
              inputs: [
                { label: "Label", placeholder: "Chapter 2", helperText: { info: "e.g. Chapter 2" }, required: true },
                { label: "Position (%)", placeholder: "50", helperText: { info: "0 – 100" }, type: "number", required: true },
                { label: "End (%)", helperText: { info: "Optional" }, type: "number" },
              ],
              getValue: () => `${plug.comp("timeline")?.config.marks.length || 0} marker${(plug.comp("timeline")?.config.marks.length || 0) !== 1 ? "s" : ""}`,
              onChange: (val: Record<string, string>) => (plug.config.timeline.marks = [...(plug.config.timeline.marks || []), { label: val["Label"] || undefined, start: Number(val["Position (%)"]) || 0, end: val["End (%)"] ? Number(val["End (%)"]) : undefined }]),
              configPaths: ["settings.controlPanel.timeline.marks"],
            },
          ],
        },
        {
          id: "layoutBuffer",
          label: "Loading spinner",
          widget: "select",
          getValue: () => getUIOpt(plug.config.buffer.options, plug.config.buffer.value),
          getOptions: () => plug.config.buffer.options!,
          onChange: (val: string) => (plug.config.buffer.value = getBoolOrStr(val) as typeof plug.config.buffer.value),
          configPaths: ["settings.controlPanel.buffer.value"],
        },
        {
          id: "layoutProgressBar",
          label: "Progress bar",
          widget: "toggle",
          getValue: () => (plug.config.progressBar ? "On" : "Off"),
          onChange: (val: boolean) => (plug.config.progressBar = val),
          configPaths: ["settings.controlPanel.progressBar"],
        },
        {
          id: "layoutDraggable",
          label: "Drag & drop layout",
          widget: "toggle",
          getValue: () => (plug.config.draggable ? "On" : "Off"),
          onChange: (val: boolean) => (plug.config.draggable = val),
          configPaths: ["settings.controlPanel.draggable"],
        },
      ],
    },
  ],
});

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.controlPanel": typeof getSettingsControlPanelMenu;
  }
}
