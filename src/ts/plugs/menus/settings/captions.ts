import type { SettingsMenuItem } from "@plugs/settings/settingsView/types";
import type { CaptionsPlug } from "@plugs/settings/captions";
import { CAPTIONS_BUILD, STYLE_PATHS } from "@plugs/settings/captions/build";
import { setPath, getPath, fanout } from "sia-reactor/utils";
import { parseUIObj, getUIOpt, isStr, isBool } from "@utils/obj";
import type { UISettings, UIOption } from "@defs/UIOptions";
import { camelize, capitalize, uncamelize } from "@utils/str";

export const getSettingsCaptionsMenu = (plug: CaptionsPlug): SettingsMenuItem[] => [
  {
    id: "captions",
    label: "Captions",
    icon: "captions",
    widget: "group",
    mediaPaths: ["state.currentTextTrack", "status.textTracks"],
    configPaths: ["settings.captions.multiple"],
    onWire: (syncUI, signal) => plug.state.watch("secondaryTracks", syncUI, { signal }),
    getValue() {
      const isMulti = plug.config.multiple,
        list = plug.media.status.textTracks;
      if (!isMulti) return plug.media.state.currentTextTrack === -1 ? "Off" : list[plug.media.state.currentTextTrack]?.label || list[plug.media.state.currentTextTrack]?.language || `Track ${plug.media.state.currentTextTrack + 1}`;
      
      if (plug.media.state.currentTextTrack === -1) return plug.state.secondaryTracks.length ? `Off +${plug.state.secondaryTracks.length}` : "Off";
      const track = list[plug.media.state.currentTextTrack],
        primLabel = track?.label || track?.language || `Track ${plug.media.state.currentTextTrack + 1}`;
      return plug.state.secondaryTracks.length ? `${primLabel} +${plug.state.secondaryTracks.length}` : primLabel;
    },
    actions: [
      {
        id: "goToStyles",
        getLabel: () => "Styles",
        onClick: () => plug.ctlr.plug("settings.settingsView")?.menu.goTo("subtitleStyle"),
      },
    ],
    items: [
      {
        id: "captionsList",
        label: "Tracks",
        widget: "select",
        inline: true,
        getMultiple: () => plug.config.multiple,
        getValue() {
          const isMulti = plug.config.multiple,
            list = plug.media.status.textTracks;
          if (!isMulti) return plug.media.state.currentTextTrack === -1 ? "Off" : list[plug.media.state.currentTextTrack]?.label || list[plug.media.state.currentTextTrack]?.language || `Track ${plug.media.state.currentTextTrack + 1}`;
          
          if (plug.media.state.currentTextTrack === -1 && !plug.state.secondaryTracks.length) return ["Off"];

          const vals: string[] = [];
          if (plug.media.state.currentTextTrack > -1) vals.push(list[plug.media.state.currentTextTrack]?.label || list[plug.media.state.currentTextTrack]?.language || `Track ${plug.media.state.currentTextTrack + 1}`);
          plug.state.secondaryTracks.forEach((idx: number) => {
            const tr = list[idx];
            if (tr) vals.push(tr.label || tr.language || `Track ${idx + 1}`);
          });
          return vals.length ? vals : ["Off"];
        },
        getOptions() {
          const list = plug.media.status.textTracks;
          const opts = !list || !list.length ? [] : Array.from(list).map((t, i) => ({ value: i, display: t.label || t.language || `Track ${i + 1}` }));
          if (opts.length) opts.unshift({ value: -1, display: "Off" });
          return opts.length ? opts : [{ value: -1, display: "Off" }];
        },
        onChange: (val: number) => {
          if (val === -1) {
             plug.media.intent.textVisible = false;
             plug.media.intent.currentTextTrack = -1;
             plug.state.secondaryTracks = [];
          } else {
             plug.media.intent.textVisible = true;
             if (plug.config.multiple) {
                const idx = plug.state.secondaryTracks.indexOf(val);
                if (idx > -1) {
                  const arr = [...plug.state.secondaryTracks];
                  arr.splice(idx, 1);
                  plug.state.secondaryTracks = arr;
                }
                else if (val !== plug.media.state.currentTextTrack) plug.state.secondaryTracks = [...plug.state.secondaryTracks, val];
             } else {
                plug.media.intent.currentTextTrack = val;
                plug.state.secondaryTracks = [];
             }
          }
        },
        mediaPaths: ["status.textTracks", "state.currentTextTrack"],
      },
      {
        id: "captionsMulti",
        label: "Multiple Captions",
        widget: "toggle",
        inline: true,
        feature: "multipleCaptions",
        getValue: () => plug.config.multiple ? "On" : "Off",
        onChange: (val: boolean) => {
           plug.config.multiple = val;
           if (!val) plug.state.secondaryTracks = [];
           plug.ctlr.plug("settings.settingsView")?.menu.syncUI();
        },
      },
      {
        id: "subtitleStyle",
        label: "Styles",
        widget: "group",
        hidden: true, // Hide from rows list but still accessible via actions
        getValue: () => "",
        configPaths: STYLE_PATHS.map((p) => `settings.${p}` as const),
        items: [
          ...STYLE_PATHS.map((p) => {
            const id = camelize(p.replace(".value", ""), /\./),
              pathParts = p.replace("captions.", "").replace(".value", ""),
              getCurr = () => getPath(plug.config as any, pathParts) as UISettings<number | string>,
              parsed = getPath(parseUIObj(plug.config as any), pathParts as any) as { values: any[]; displays: string[] },
              hasNum = !!parsed?.values?.length && parsed.values.every((v) => !isBool(v) && !isNaN(Number(v))),
              isColor = !hasNum && parsed?.values?.some((v) => String(v).startsWith("#")),
              actMin = hasNum ? Math.min(...parsed.values.map(Number)) : 0,
              actMax = hasNum ? Math.max(...parsed.values.map(Number)) : 100,
              configPaths = ["settings." + p];
            return {
              id,
              label: uncamelize(pathParts.replace(/\./g, " ")).split(" ").map(capitalize).join(" "),
              widget: hasNum ? "group" : isColor ? "color" : "select",
              getValue: (curr = getCurr()) => getUIOpt(curr.options, curr.value),
              getOptions: (curr = getCurr()) => curr.options,
              onChange: (val: number | string, curr = getCurr()) => (curr.value = val),
              tipHTML: () => {
                if (p.includes("font.variant")) return "Apply variants like small capitals to the text";
                if (p.includes("window.color")) return "Change the background color of the entire caption bounding box (differs from text background)";
                if (p.includes("window.opacity")) return "Adjust how transparent the entire caption bounding box is";
                if (p.includes("characterEdgeStyle")) return "Add borders or shadows to the text to make it more readable";
                return undefined;
              },
              items: hasNum
                ? [
                    {
                      id: `${id}Slider`,
                      label: "Custom",
                      widget: "range",
                      inline: true,
                      getValue: (curr = getCurr()) => `${Math.round(Number(curr.value))}%`,
                      onChange: (val: number | string, curr = getCurr()) => (curr.value = isStr(curr.value) ? String(val) : Number(val)),
                      getRange: (curr = getCurr()) => ({ min: Math.min((curr.min as number) ?? actMin, actMin), max: Math.max((curr.max as number) ?? actMax, actMax), formatTooltip: (v: number) => Math.round(v) + "%", options: curr.options as UIOption<number>[] }),
                      configPaths,
                    },
                    {
                      id: `${id}Select`,
                      label: "Presets",
                      widget: "select",
                      inline: true,
                      getOptions: (curr = getCurr()) => curr.options,
                      getValue: (curr = getCurr()) => String(curr.value),
                      onChange: (val: number | string, curr = getCurr()) => (curr.value = isStr(curr.value) ? String(val) : Number(val)),
                      configPaths,
                    },
                  ]
                : undefined,
              configPaths,
            } as SettingsMenuItem;
          }),
          {
            id: "resetCaptions",
            label: "Reset",
            widget: "button",
            getValue: () => "",
            onChange: () => {
              plug.config.allowOverride = CAPTIONS_BUILD.allowOverride!;
              const cssCache = plug.media.tech.ctlr?.plug("settings.css")?._cache;
              STYLE_PATHS.forEach((p, _, __, val = cssCache?.[camelize(p.replace(".value", ""), /\./)]) => ((val = p.includes("opacity") && val !== undefined ? Number(val) * 100 : val), setPath(plug.config as any, p.replace("captions.", ""), val ?? getPath(CAPTIONS_BUILD as any, p.replace("captions.", "")))));
            },
          },
          {
            id: "allowOverride",
            label: "Allow media override",
            widget: "toggle",
            getValue: () => (plug.config.allowOverride ? "On" : "Off"),
            onChange: (val: boolean) => (plug.config.allowOverride = val),
            configPaths: ["settings.captions.allowOverride"],
            title: "Allow media content to override your custom caption styling with its own styling (if available)",
          },
        ],
      },
    ],
  },
  {
    id: "limits",
    label: "Limits",
    icon: "configure",
    widget: "group",
    getValue: () => "",
    items: [
      {
        id: "captionSizeLimits",
        label: "Caption size",
        widget: "limits",
        configPaths: ["settings.captions.font.size.min", "settings.captions.font.size.max", "settings.captions.font.size.skip"],
        getValue: () => "",
        getLimits: () => [{ name: "captionSize", label: "Clamp bounds", min: plug.config.font.size.min, max: plug.config.font.size.max, step: plug.config.font.size.skip }],
        onChange: (val: Record<string, number>) => fanout(plug.config.font.size, { min: val.captionSize_min, max: val.captionSize_max, skip: val.captionSize_step }, { skipUndefined: true }),
      },
    ],
  },
];

declare module "@defs/registries" {
  interface MenuRegistryMap {
    "settings.captions": typeof getSettingsCaptionsMenu;
  }
}
