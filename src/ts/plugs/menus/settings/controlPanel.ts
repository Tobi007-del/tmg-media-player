import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { ControlPanelPlug } from "@plugs/settings/controlPanel";
import { CONTROLS } from "@plugs/settings/controlPanel/build";
import type { AnyControl, ControlPanelBottomTuple } from "@plugs/settings/controlPanel/types";
import { getUIOpt, insertPanelCtrl, getPanelLocation, inPanel } from "@utils/obj";
import { capitalize, uncamelize, formatMenuPx } from "@utils/str";
import { getPath, setPath } from "sia-reactor/utils";
import { formatUITime, getMediaProgress } from "@utils/time";
import { safeNum } from "@utils/num";

const setEnabled = (plug: ControlPanelPlug, id: AnyControl, enabled: boolean, b = plug.ctlr._build.settings.controlPanel) => {
  const cLoc = getPanelLocation(plug.config, id);
  // prettier-ignore
  if (!enabled) return void (cLoc.row.includes(id) && setPath(plug.config as any, cLoc.path, cLoc.row.filter((c: any) => c !== id)));
  if (cLoc.row.includes(id)) return;
  const bLoc = getPanelLocation(b, id),
    cfgRow = getPath(plug.config as any, bLoc.path) as any[];
  Array.isArray(cfgRow) && bLoc.row.length ? insertPanelCtrl(cfgRow, bLoc.row, id) : (plug.config.bottom as ControlPanelBottomTuple)[1].push(id);
};

export const getSettingsControlPanelMenu = (plug: ControlPanelPlug, ctx = { markerEditIdx: -1 }): SettingsMenuItem => ({
  id: "advanced",
  label: "Advanced",
  icon: "settings",
  widget: "group",
  getValue: () => "",
  items: [
    {
      id: "interface",
      label: "Interface",
      widget: "group",
      getValue: () => "On",
      items: [
        {
          id: "layoutControlPanel",
          label: "Control panel",
          widget: "group",
          getValue: () => String(CONTROLS.filter((c) => c !== "spacer").length),
          getBadge: (off = CONTROLS.filter((id) => id !== "spacer" && !inPanel(plug.config, id)).length) => (off > 0 ? { value: `-${off}` } : undefined),
          getTipHTML: () => "Configure player controls, layout, and visual feedback",
          configPaths: ["settings.controlPanel.top", "settings.controlPanel.center", "settings.controlPanel.bottom"],
          items: [
            {
              id: "layoutAllControls",
              label: "All controls",
              widget: "group",
              getValue: () => "",
              configPaths: ["settings.controlPanel.top", "settings.controlPanel.center", "settings.controlPanel.bottom"],
              items: CONTROLS.filter((id) => id !== "spacer")
                .sort((a, b) => a.localeCompare(b))
                .map((id) => ({ id: `toggle-cp-${id}`, label: capitalize(uncamelize(id)), widget: "toggle" as const, getValue: () => (inPanel(plug.config, id) ? "On" : "Off"), onChange: (val: boolean) => setEnabled(plug, id, val), configPaths: ["settings.controlPanel.top", "settings.controlPanel.center", "settings.controlPanel.bottom"] })),
            },
            { id: "layoutBigVisible", label: "Big controls", widget: "toggle", getValue: () => (plug.config.bigVisible ? "On" : "Off"), onChange: (val: boolean) => (plug.config.bigVisible = val), configPaths: ["settings.controlPanel.bigVisible"], title: "Force display the big center playback controls overlay regardless of screen size" },
            {
              id: "layoutTimeline",
              label: "Timeline",
              widget: "group",
              getValue: () => (plug.config.timeline.disabled || plug.config.timeline.readonly || !inPanel(plug.config, "timeline") ? "Off" : "On"),
              configPaths: ["settings.controlPanel.timeline.disabled", "settings.controlPanel.timeline.readonly"],
              items: [
                { id: "timelineDisabled", label: "Disabled", widget: "toggle", getValue: () => (plug.config.timeline.disabled ? "On" : "Off"), onChange: (val: boolean) => (plug.config.timeline.disabled = val), configPaths: ["settings.controlPanel.timeline.disabled"], title: "Completely disables the timeline" },
                { id: "timelineReadonly", label: "Read only", widget: "toggle", getValue: () => (plug.config.timeline.readonly ? "On" : "Off"), onChange: (val: boolean) => (plug.config.timeline.readonly = val), configPaths: ["settings.controlPanel.timeline.readonly"], title: "Prevents interacting with the timeline to seek" },
                { id: "timelineProgressBar", label: "Progress bar", widget: "toggle", getValue: () => (plug.config.progressBar ? "On" : "Off"), onChange: (val: boolean) => (plug.config.progressBar = val), configPaths: ["settings.controlPanel.progressBar"] },
                {
                  id: "timelinePreviewsGroup",
                  label: "Hover previews",
                  widget: "group",
                  getValue: () => (plug.config.timeline.previews || plug.config.timeline.tooltip ? "On" : "Off"),
                  configPaths: ["settings.controlPanel.timeline.previews", "settings.controlPanel.timeline.tooltip"],
                  items: [
                    { id: "timelinePreviews", label: "Images", widget: "toggle", getValue: () => (plug.config.timeline.previews ? "On" : "Off"), onChange: (val: boolean) => (plug.config.timeline.previews = val), configPaths: ["settings.controlPanel.timeline.previews"], title: "Displays a thumbnail of the video frame when hovering over the timeline. Note: If sprite/image was set by the dev, it will be reset to 'auto'." },
                    { id: "timelineTooltip", label: "Percentages", widget: "toggle", getValue: () => (plug.config.timeline.tooltip ? "On" : "Off"), onChange: (val: boolean) => (plug.config.timeline.tooltip = val), configPaths: ["settings.controlPanel.timeline.tooltip"], title: "Shows the current time percentage when hovering over the timeline" },
                  ],
                },
                {
                  id: "timelineMarksGroup",
                  label: "Media markers",
                  widget: "group",
                  getValue: () => (plug.config.timeline.playedMarks || plug.config.timeline.bufferMarks || plug.config.timeline.marks.length ? "On" : "Off"),
                  configPaths: ["settings.controlPanel.timeline.playedMarks", "settings.controlPanel.timeline.bufferMarks", "settings.controlPanel.timeline.marks"],
                  items: [
                    {
                      id: "timelineMarkers",
                      label: "Bookmarks",
                      widget: "drag-select",
                      getValue: () => `${plug.config.timeline.marks.length}`,
                      getTipHTML: () => "Create custom points of interest on the timeline to easily jump to later",
                      getOptions: () => plug.config.timeline.marks.map((m, i) => ({ value: String(i), display: m.label || `Marker ${i + 1}`, infoText: `${m.start}%` + (m.end ? ` - ${m.end}%` : "") })),
                      getDisabled: () => false,
                      onDelete: (idx: number) => plug.config.timeline.marks.splice(idx, 1),
                      onEdit: (idx: number) => ((ctx.markerEditIdx = idx), plug.ctlr.plug("settings.settingsView")?.menu.goTo("timeline-marker-edit")),
                      actions: [{ id: "add", getLabel: () => "Add", icon: "add", onClick: () => plug.ctlr.plug("settings.settingsView")?.menu.goTo("timeline-marker-add") }],
                      configPaths: ["settings.controlPanel.timeline.marks"],
                      items: [
                        {
                          id: "timeline-marker-add",
                          label: "Add marker",
                          widget: "input",
                          inputs: [
                            { name: "label", label: "Label", placeholder: "Bookmark 2", helperText: { info: "e.g. The Plight of Kosi's Lover" }, required: true },
                            { name: "pos", label: "Position (%)", placeholder: "50", helperText: { info: "0 – 100" }, type: "number", step: "any", required: true, value: () => String(safeNum(getMediaProgress(plug.media)) * 100) },
                            { name: "end", label: "End (%)", helperText: { info: "0 – 100 (Optional)" }, type: "number" },
                          ],
                          getValue: () => "",
                          onChange: (val: Record<string, string>) => plug.config.timeline.marks.push({ label: val.label, start: Number(val.pos) || 0, end: val.end ? Number(val.end) : undefined }),
                        },
                        {
                          id: "timeline-marker-edit",
                          label: "Edit marker",
                          widget: "input",
                          inputs: [
                            { name: "label", label: "Label", placeholder: "Bookmark 2", helperText: { info: "e.g. The Plight of Kosi's Lover" }, required: true, value: () => plug.config.timeline.marks[ctx.markerEditIdx]?.label || "" },
                            { name: "pos", label: "Position (%)", placeholder: "50", helperText: { info: "0 – 100" }, type: "number", step: "any", required: true, value: () => plug.config.timeline.marks[ctx.markerEditIdx]?.start || "" },
                            { name: "end", label: "End (%)", helperText: { info: "0 – 100 (Optional)" }, type: "number", value: () => plug.config.timeline.marks[ctx.markerEditIdx]?.end || "" },
                          ],
                          getValue: () => "",
                          onChange: (val: Record<string, string>) => {
                            const m = plug.config.timeline.marks[ctx.markerEditIdx];
                            if (m) (m.label = val.label || undefined), (m.start = Number(val.pos) || 0), (m.end = val.end ? Number(val.end) : undefined);
                          },
                        },
                      ],
                    },
                    {
                      id: "timelinePlayedMarks",
                      label: "Played marks",
                      widget: "toggle",
                      getValue: () => (plug.config.timeline.playedMarks ? "On" : "Off"),
                      onChange: (val: boolean) => (plug.config.timeline.playedMarks = val),
                      configPaths: ["settings.controlPanel.timeline.playedMarks"],
                      title: "Displays colored indicators on the timeline for sections you've already watched",
                    },
                    {
                      id: "timelineBufferMarks",
                      label: "Buffer marks",
                      widget: "toggle",
                      getValue: () => (plug.config.timeline.bufferMarks ? "On" : "Off"),
                      onChange: (val: boolean) => (plug.config.timeline.bufferMarks = val),
                      configPaths: ["settings.controlPanel.timeline.bufferMarks"],
                      title: "Shows a progress bar indicating how much of the video has been pre-loaded",
                    },
                  ],
                },
                {
                  id: "timelineSeekGroup",
                  label: "Seeking",
                  widget: "group",
                  getValue: () => "",
                  items: [
                    {
                      id: "timelineScrub",
                      label: "Behavior",
                      widget: "group",
                      getValue: () => "",
                      items: [
                        {
                          id: "timelineScrubSync",
                          label: "Synchronize time",
                          widget: "toggle",
                          getValue: () => (plug.config.timeline.scrub.sync ? "On" : "Off"),
                          onChange: (val: boolean) => (plug.config.timeline.scrub.sync = val),
                          configPaths: ["settings.controlPanel.timeline.scrub.sync"],
                          title: "Updates the video frame in real-time as you drag the timeline cursor",
                        },
                        {
                          id: "timelineScrubRelative",
                          label: "Relative dragging",
                          widget: "toggle",
                          getValue: () => (plug.config.timeline.scrub.relative ? "On" : "Off"),
                          onChange: (val: boolean) => (plug.config.timeline.scrub.relative = val),
                          configPaths: ["settings.controlPanel.timeline.scrub.relative"],
                          title: "Whether the seeking pointer should follow your finger exactly or move relative to your initial point of touch",
                        },
                        {
                          id: "timelineScrubCancel",
                          label: "Cancellation",
                          widget: "group",
                          getValue: () => (plug.config.timeline.scrub.cancel.delta && plug.config.timeline.scrub.cancel.timeout ? "On" : "Off"),
                          configPaths: ["settings.controlPanel.timeline.scrub.cancel.delta", "settings.controlPanel.timeline.scrub.cancel.timeout"],
                          items: [
                            {
                              id: "timelineScrubCancelDelta",
                              label: "Cancel distance",
                              widget: "range",
                              getValue: () => formatMenuPx(plug.config.timeline.scrub.cancel.delta!, true),
                              getRange: () => ({ min: 0, max: 100, step: 5, formatTooltip: formatMenuPx }),
                              onChange: (val: number) => (plug.config.timeline.scrub.cancel.delta = val),
                              configPaths: ["settings.controlPanel.timeline.scrub.cancel.delta"],
                              getTipHTML: () => "Horizontal distance from your initial drag position before a seek is considered cancelled",
                            },
                            {
                              id: "timelineScrubCancelTimeout",
                              label: "Cancel timeout",
                              widget: "input",
                              inputs: [{ name: "time", label: "ms", placeholder: "2500", type: "number", min: "0", required: true, helperText: { info: "How long to wait before allowing you to resume seeking after a cancellation" }, value: () => plug.config.timeline.scrub.cancel.timeout }],
                              getValue: () => formatUITime(plug.config.timeline.scrub.cancel.timeout),
                              onChange: (val: Record<string, any>) => (plug.config.timeline.scrub.cancel.timeout = val.time),
                              configPaths: ["settings.controlPanel.timeline.scrub.cancel.timeout"],
                              getTipHTML: () => "How long to wait before allowing you to resume seeking after a cancellation attempt",
                            },
                          ],
                        },
                      ],
                    },
                    { id: "timelineThumb", label: "Thumb", widget: "select", getValue: () => getUIOpt(plug.config.timeline.thumb.options, plug.config.timeline.thumb.value), getOptions: () => plug.config.timeline.thumb.options!, onChange: (val: any) => (plug.config.timeline.thumb.value = val), configPaths: ["settings.controlPanel.timeline.thumb.value"] },
                    {
                      id: "timelineWheelGroup",
                      label: "Wheel",
                      widget: "group",
                      getValue: () => (plug.config.timeline.wheel.disabled ? "Off" : "On"),
                      items: [
                        {
                          id: "timelineWheelDisabled",
                          label: "Disable",
                          widget: "toggle",
                          getValue: () => (plug.config.timeline.wheel.disabled ? "On" : "Off"),
                          onChange: (val: boolean) => (plug.config.timeline.wheel.disabled = val),
                          configPaths: ["settings.controlPanel.timeline.wheel"],
                          title: "Enables seeking through the video by scrolling the mouse wheel over the timeline",
                        },
                        {
                          id: "timelineWheelAxisRatio",
                          label: "Sensitivity",
                          widget: "range",
                          getValue: () => String(plug.config.timeline.wheel.axisRatio),
                          getRange: () => ({ min: 1, max: 50, step: 1 }),
                          onChange: (val: number) => (plug.config.timeline.wheel.axisRatio = val),
                          configPaths: ["settings.controlPanel.timeline.wheel"],
                          getTipHTML: () => "Adjusts how much the video seeks per scroll wheel notch",
                        },
                      ],
                    },
                    {
                      id: "timelineAutopause",
                      label: "Auto-pause",
                      widget: "toggle",
                      getValue: () => (plug.config.timeline.autopause ? "On" : "Off"),
                      onChange: (val: boolean) => (plug.config.timeline.autopause = val),
                      configPaths: ["settings.controlPanel.timeline.autopause"],
                      title: "Automatically pauses the video while you are dragging the timeline to seek",
                    },
                    {
                      id: "timelineCompact",
                      label: "Compact view",
                      widget: "toggle",
                      getValue: () => (plug.config.timeline.compact ? "On" : "Off"),
                      onChange: (val: boolean) => (plug.config.timeline.compact = val),
                      configPaths: ["settings.controlPanel.timeline.compact"],
                      title: "Make the timeline thinner and more minimalist to conserve space",
                    },
                  ],
                },
              ],
            },
            { id: "layoutBuffer", label: "Loading spinner", widget: "select", getValue: () => getUIOpt(plug.config.buffer.options, plug.config.buffer.value), getOptions: () => plug.config.buffer.options!, onChange: (val: any) => (plug.config.buffer.value = val), configPaths: ["settings.controlPanel.buffer.value"] },
            { id: "layoutDraggable", label: "Drag and drop", widget: "toggle", getValue: () => (plug.config.draggable ? "On" : "Off"), onChange: (val: boolean) => (plug.config.draggable = val), configPaths: ["settings.controlPanel.draggable"] },
          ],
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
