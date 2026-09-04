import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { CaptionsPlug } from "@plugs/settings/captions";
import { getTrackLabel } from "@utils/media";
import { STYLE_PATHS } from "@plugs/settings/captions/build";
import { setPath, getPath, fanout } from "sia-reactor/utils";
import { parseUIObj, getUIOpt, isStr, isBool, parseUIOpt, getUniqueOpts } from "@utils/obj";
import type { UIOption, UITuple } from "@defs/UIOptions";
import { camelize, capitalize, uncamelize } from "@utils/str";
import { safeNum } from "@utils/num";
import { formatUITime } from "@utils/time";

const getPreviewStyle = (plug: CaptionsPlug, id: string, u: any): { className?: string; style?: string } => {
  const cssPlug = plug.ctlr.plug("settings.css");
  if (!cssPlug) return {};
  const { isClass, id: cssId } = cssPlug.getCSSKey(id);
  return isClass ? { className: `${cssId}-${u.value}` } : { style: `--${cssId}: ${id.toLowerCase().includes("opacity") ? Number(u.value) / 100 : u.value};` };
};

export const getSettingsCaptionsMenu = (plug: CaptionsPlug): SettingsMenuItem[] => {
  const mapStyle = (p: string) => {
    const id = camelize(p.replace(".value", ""), /\./),
      pathParts = p.replace("captions.", "").replace(".value", ""),
      getCurr = () => getPath(plug.config as any, pathParts) as any,
      isBoolean = isBool(getCurr()),
      parsed = isBoolean ? undefined : (getPath(parseUIObj(plug.config as any), pathParts as any) as { values: any[]; displays: string[] }),
      hasNum = !!parsed?.values?.length && parsed.values.every((v) => !isBool(v) && !isNaN(Number(v))),
      isColor = !hasNum && parsed?.values?.some((v) => String(v).startsWith("#")),
      actMin = hasNum ? Math.min(...parsed.values.map(Number)) : 0,
      actMax = hasNum ? Math.max(...parsed.values.map(Number)) : 100,
      configPaths = ["settings." + p];
    return {
      id,
      label: capitalize(uncamelize(pathParts.split(".").pop()!)),
      widget: isBoolean ? "toggle" : hasNum || (isColor && !pathParts.includes("window")) || pathParts === "characterEdgeStyle" ? "group" : isColor && pathParts.includes("window") ? "color" : "select",
      getValue: (curr = getCurr()) => (isBoolean ? (curr ? "On" : "Off") : capitalize(getUIOpt(curr.options.map(parseUIOpt), hasNum ? Number(curr.value) : isStr(curr.value) ? curr.value.trim() : curr.value))),
      getOptions: () =>
        isBoolean
          ? undefined
          : getCurr().options.map((opt: any) => {
              const u = parseUIOpt(opt),
                preview = getPreviewStyle(plug, id, u);
              return { ...u, className: pathParts.includes("window") ? undefined : `tmg-media-captions-text ${u.className || ""} ${preview.className || ""}`.trim(), style: preview.style };
            }),
      onChange: (val: any) => (isBoolean ? setPath(plug.config as any, pathParts, val) : (getCurr().value = val)),
      getRange: (curr = getCurr()) => ({ min: Math.min((curr.min as number) ?? actMin, actMin), max: Math.max((curr.max as number) ?? actMax, actMax), formatTooltip: (v: number) => `${Math.round(v)}%`, options: curr.options as UIOption<number>[] }),
      getTipHTML: () => (p.includes("font.variant") ? "Apply variants like small capitals to the text" : p.includes("window.color") ? "Change the background color of the entire caption bounding box (differs from text background)" : p.includes("window.opacity") ? "Adjust how transparent the entire caption bounding box is" : p.includes("characterEdgeStyle") ? "Add borders or shadows to the text to make it more readable" : p.includes("lockToVideo") ? "Constrain captions to the actual letterboxed video boundaries rather than the player container boundaries." : p.includes("lockToPanel") ? "Push captions up when the bottom control panel is active so they don't overlap." : ""),
      items:
        hasNum || (isColor && !pathParts.includes("window")) || pathParts === "characterEdgeStyle"
          ? [
              ...(hasNum ? [{ id: `${id}Slider`, label: "Custom", widget: "range", inline: true, getValue: () => `${Number(getCurr().value)}%`, onChange: (val: number | string, curr = getCurr()) => (curr.value = isStr(curr.value) ? String(val) : Number(val)), getRange: (curr = getCurr()) => ({ min: Math.min((curr.min as number) ?? actMin, actMin), max: Math.max((curr.max as number) ?? actMax, actMax), formatTooltip: (v: number) => `${Math.round(v)}%`, options: curr.options as UIOption<number>[] }), configPaths } as any] : []),
              {
                id: `${id}Select`,
                label: "Presets",
                widget: "select",
                inline: true,
                getOptions: () =>
                  getCurr().options.map((opt: any) => {
                    const u = parseUIOpt(opt),
                      preview = getPreviewStyle(plug, id, u);
                    return { ...u, className: pathParts.includes("window") ? undefined : `tmg-media-captions-text ${u.className || ""} ${preview.className || ""}`.trim(), style: preview.style };
                  }),
                getValue: () => String(getCurr().value),
                onChange: (val: number | string, curr = getCurr()) => (curr.value = isStr(curr.value) ? String(val) : Number(val)),
                configPaths,
              },
              ...(!hasNum && pathParts !== "characterEdgeStyle" ? [{ id: `${id}Picker`, label: "Custom", widget: "color", inline: true, getValue: () => getCurr().value, onChange: (val: string) => (getCurr().value = val), configPaths } as any] : []),
              ...(pathParts === "characterEdgeStyle" ? [{ id: "characterEdgeStyleShadowColor", label: "Shadow color", widget: "color", inline: true, getValue: () => plug.settings.css.captionsBaseShadow as string, onChange: (val: string) => (plug.settings.css.captionsBaseShadow = val), configPaths: ["settings.css.captionsBaseShadow"] } as any] : []),
            ]
          : undefined,
      configPaths,
    } as SettingsMenuItem;
  };
  return [
    {
      id: "captions",
      label: "Captions",
      icon: "captions",
      widget: "group",
      feature: "textTracks",
      mediaPaths: ["state.currentTextTrack", "status.textTracks"],
      configPaths: ["settings.captions.multiple"],
      onWire: (syncUI, signal) => plug.state.on("secondaryTracks", syncUI, { signal }),
      getBadge: () => (plug.config.multiple && plug.state.secondaryTracks.length ? { value: `+${plug.state.secondaryTracks.length}` } : undefined),
      getValue() {
        if (plug.media.state.currentTextTrack === -1 || !plug.media.status.textTracks.length) return "Off";
        return (this.items![0].getOptions!() as UITuple<number>[]).find((o) => o.value === plug.media.state.currentTextTrack)?.display || "Off";
      }, // this = !()=>{}
      actions: [{ id: "goToStyles", getLabel: () => "Styles", onClick: () => plug.ctlr.plug("settings.settingsView")?.menu.goTo("subtitleStyle") }],
      items: [
        {
          id: "captionsList",
          label: "Tracks",
          widget: "select",
          inline: true,
          onWire: (syncUI, signal) => plug.state.on("secondaryTracks", syncUI, { signal }),
          getMultiple: () => plug.config.multiple,
          getValue: (curr = plug.media.state.currentTextTrack) => (!plug.config.multiple ? String(curr) : curr === -1 ? ["-1"] : [String(curr), ...plug.state.secondaryTracks.map(String)]),
          getOptions: () => (plug.media.status.textTracks.length ? [{ value: -1, display: "Off" }, ...getUniqueOpts(Array.from(plug.media.status.textTracks, (_t, i) => ({ value: i, display: getTrackLabel(plug.media.status.textTracks, i), badge: plug.state.secondaryTracks.length && i === plug.media.state.currentTextTrack ? "Main" : "" })))] : []),
          onChange: (val: number) => {
            if (val === -1) (plug.media.intent.currentTextTrack = -1), (plug.state.secondaryTracks = []);
            else if (!plug.config.multiple) (plug.media.intent.currentTextTrack = val), (plug.state.secondaryTracks = []);
            else if (plug.media.state.currentTextTrack === -1) plug.media.intent.currentTextTrack = val;
            else if (val === plug.media.state.currentTextTrack) return;
            const idx = plug.state.secondaryTracks.indexOf(val);
            idx > -1 ? plug.state.secondaryTracks.splice(idx, 1) : plug.state.secondaryTracks.push(val);
          },
          mediaPaths: ["status.textTracks", "state.currentTextTrack"],
          configPaths: ["settings.captions.multiple"],
        },
        {
          id: "captionsMulti",
          label: "Multiple captions",
          widget: "toggle",
          inline: true,
          feature: "multipleCaptions",
          hidden: () => plug.media.status.textTracks.length < 2,
          getValue: () => (plug.config.multiple ? "On" : "Off"),
          onChange: (val: boolean) => !(plug.config.multiple = val) && (plug.state.secondaryTracks = []),
          mediaPaths: ["status.textTracks"],
          configPaths: ["settings.captions.multiple"],
        },
        {
          id: "subtitleStyle",
          label: "Styles",
          widget: "group",
          hidden: true, // Hide from rows list but still accessible via actions
          getValue: () => "",
          items: [
            { id: "fontGroup", label: "Font", widget: "group", getTipHTML: () => "Customize the appearance of the caption text itself", getValue: () => "", items: STYLE_PATHS.filter((p) => p.includes("font.")).map(mapStyle) },
            { id: "backgroundGroup", label: "Background", widget: "group", getTipHTML: () => "Customize the background highlight that wraps immediately around each line of text", getValue: () => "", items: STYLE_PATHS.filter((p) => p.includes("background.")).map(mapStyle) },
            {
              id: "windowGroup",
              label: "Window",
              widget: "group",
              getTipHTML: () => "Customize the entire bounding box that holds all the caption lines (differs from text background)",
              getValue: () => "",
              items: [
                ...STYLE_PATHS.filter((p) => p.includes("window.") && !p.includes("position.")).map(mapStyle),
                {
                  id: "position",
                  label: "Position",
                  widget: "group",
                  getValue: () => "",
                  items: [
                    ...["captions.window.position.lockToPanel", "captions.window.position.lockToVideo"].map(mapStyle),
                    {
                      id: "captionsPosX",
                      label: "X position",
                      widget: "range",
                      getValue: () => `${safeNum(Math.round(parseFloat(plug.settings.css.currentCaptionsX as string)), 50)}%`,
                      getRange: () => ({ min: 0, max: 100, divs: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], formatTooltip: (v: number) => `${Math.round(v)}%` }),
                      onChange: (val: number | string) => (plug.settings.css.currentCaptionsX = `${val}%`),
                      configPaths: ["settings.css.currentCaptionsX"],
                    },
                    {
                      id: "captionsPosY",
                      label: "Y position",
                      widget: "range",
                      getValue: () => `${safeNum(Math.round(parseFloat(plug.settings.css.currentCaptionsY as string)), 100)}%`,
                      getRange: () => ({ min: 0, max: 100, divs: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], formatTooltip: (v: number) => `${Math.round(v)}%` }),
                      onChange: (val: number | string) => (plug.settings.css.currentCaptionsY = `${val}%`),
                      configPaths: ["settings.css.currentCaptionsY"],
                    },
                  ],
                },
              ],
            },
            {
              id: "textGroup",
              label: "Text",
              widget: "group",
              getTipHTML: () => "Customize text layout and edge effects",
              getValue: () => "",
              items: [
                ...STYLE_PATHS.filter((p) => !p.includes("font.") && !p.includes("background.") && !p.includes("window.")).map(mapStyle),
                {
                  id: "previewTimeout",
                  label: "Preview timeout",
                  widget: "input",
                  inputs: [{ name: "time", label: "ms", placeholder: "1500", helperText: { info: "How long the caption stays on screen when previewing: during style changes" }, type: "number", min: "500", required: true, value: () => plug.config.previewTimeout }],
                  getValue: () => formatUITime(plug.config.previewTimeout),
                  onChange: (val: Record<string, any>) => (plug.config.previewTimeout = val.time),
                  configPaths: ["settings.captions.previewTimeout"],
                },
              ],
            },
            { id: "allowMediaOverride", label: "Allow media override", widget: "toggle", getValue: () => (plug.config.allowMediaOverride ? "On" : "Off"), onChange: (val: boolean) => (plug.config.allowMediaOverride = val), configPaths: ["settings.captions.allowMediaOverride"], title: "Allow media content to override your custom caption styling with its own styling (if available)" },
            {
              id: "resetCaptions",
              label: "Reset",
              widget: "button",
              getValue: () => "",
              onChange: () => {
                const build = plug.ctlr._build.settings.captions,
                  sache = plug.ctlr?.plug("settings.css")?._cache;
                if (sache) (plug.settings.css.currentCaptionsX = sache.currentCaptionsX!), (plug.settings.css.currentCaptionsY = sache.currentCaptionsY!), (plug.settings.css.captionsBaseShadow = sache.captionsBaseShadow!);
                (plug.config.allowMediaOverride = build.allowMediaOverride!), (plug.config.previewTimeout = build.previewTimeout!);
                STYLE_PATHS.forEach((p, _, __, _p = p.replace("captions.", "")) => setPath(plug.config as any, _p, getPath(build as any, _p)));
              },
            },
          ],
        },
      ],
    },
    {
      id: "advanced",
      label: "Advanced",
      icon: "settings",
      widget: "group",
      getValue: () => "",
      items: [
        {
          id: "limits",
          label: "Limits",
          widget: "group",
          getValue: () => "On",
          items: [{ id: "captionSizeLimits", label: "Caption size", widget: "limits", configPaths: ["settings.captions.font.size.min", "settings.captions.font.size.max", "settings.captions.font.size.skip"], getValue: () => "", getLimits: () => [{ name: "captionSize", label: "Clamp bounds", min: plug.config.font.size.min, max: plug.config.font.size.max, step: plug.config.font.size.skip }], onChange: (val: Record<string, number>) => fanout(plug.config.font.size, { min: val.captionSize_min, max: val.captionSize_max, skip: val.captionSize_step }, { skipUndef: true }) }],
        },
      ],
    },
  ];
};

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.captions": typeof getSettingsCaptionsMenu;
  }
}
