import { DeepPartial } from "sia-reactor";
import { CaptionsConfig } from "./types";
import { TIME_TRAVEL_BUILD } from "@plugs/settings/timeTravel/build";
import { CSS_CLASSLIST } from "@plugs/settings/css/build";

export const CAPTIONS_BUILD: DeepPartial<CaptionsConfig> = {
  multiple: false,
  font: {
    family: {
      value: "",
      options: [
        { value: "", display: "Default" },
        // { value: "serif", display: "Serif" },
        // { value: "sans-serif", display: "Sans Serif" },
        // { value: "system-ui", display: "System UI" },
        // { value: "fantasy", display: "Fantasy" },
        { value: "arial, sans-serif", display: "Arial" },
        { value: "cursive", display: "Cursive" },
        { value: "monospace", display: "Monospace" },
        { value: "'times new roman', serif", display: "Times New Roman" },
        { value: "georgia, serif", display: "Georgia" },
        { value: "verdana, sans-serif", display: "Verdana" },
        { value: "tahoma, sans-serif", display: "Tahoma" },
        { value: "impact, fantasy", display: "Impact" },
        // { value: "'trebuchet ms', sans-serif", display: "Trebuchet MS" },
        // { value: "'comic sans ms', cursive", display: "Comic Sans MS" },
      ],
    },
    size: {
      min: 100,
      max: 400,
      value: 100,
      skip: 100,
      options: [
        { value: 25, display: "25%" },
        { value: 50, display: "50%" },
        { value: 75, display: "75%" },
        { value: 100, display: "100%" },
        { value: 150, display: "150%" },
        { value: 200, display: "200%" },
        { value: 300, display: "300%" },
        { value: 400, display: "400%" },
      ],
    },
    color: {
      value: "#ffffff",
      options: [
        { value: "#ffffff", display: "White" },
        { value: "#ffff00", display: "Yellow" },
        { value: "#00ff00", display: "Green" },
        { value: "#00ffff", display: "Cyan" },
        { value: "#0000ff", display: "Blue" },
        { value: "#ff00ff", display: "Magenta" },
        { value: "#ff0000", display: "Red" },
        { value: "#000000", display: "Black" },
      ],
    },
    opacity: {
      value: 100,
      options: [
        { value: 25, display: "25%" },
        { value: 50, display: "50%" },
        { value: 75, display: "75%" },
        { value: 100, display: "100%" },
      ],
    },
    weight: {
      value: "400",
      options: [
        { value: "100", display: "Thin" },
        { value: "200", display: "Extra Light" },
        { value: "300", display: "Light" },
        { value: "400", display: "Normal" },
        { value: "500", display: "Medium" },
        { value: "600", display: "Semi Bold" },
        { value: "700", display: "Bold" },
        { value: "800", display: "Extra Bold" },
        { value: "900", display: "Black" },
      ],
    },
    variant: {
      value: "normal",
      options: [
        { value: "normal", display: "Normal" },
        { value: "small-caps", display: "Small Caps" },
        { value: "all-small-caps", display: "All Small Caps" },
      ],
    },
  },
  background: {
    color: {
      value: "#000000",
      options: [
        { value: "#ffffff", display: "White" },
        { value: "#ffff00", display: "Yellow" },
        { value: "#00ff00", display: "Green" },
        { value: "#00ffff", display: "Cyan" },
        { value: "#0000ff", display: "Blue" },
        { value: "#ff00ff", display: "Magenta" },
        { value: "#ff0000", display: "Red" },
        { value: "#000000", display: "Black" },
      ],
    },
    opacity: {
      value: 75,
      options: [
        { value: 0, display: "0%" },
        { value: 25, display: "25%" },
        { value: 50, display: "50%" },
        { value: 75, display: "75%" },
        { value: 100, display: "100%" },
      ],
    },
  },
  window: {
    color: {
      value: "#000000",
      options: [
        { value: "#ffffff", display: "White" },
        { value: "#ffff00", display: "Yellow" },
        { value: "#00ff00", display: "Green" },
        { value: "#00ffff", display: "Cyan" },
        { value: "#0000ff", display: "Blue" },
        { value: "#ff00ff", display: "Magenta" },
        { value: "#ff0000", display: "Red" },
        { value: "#000000", display: "Black" },
      ],
    },
    opacity: {
      value: 0,
      options: [
        { value: 0, display: "0%" },
        { value: 25, display: "25%" },
        { value: 50, display: "50%" },
        { value: 75, display: "75%" },
        { value: 100, display: "100%" },
      ],
    },
    position: {
      lockToVideo: false,
      lockToPanel: true,
    },
  },
  textAlignment: {
    value: "start",
    options: [
      { value: "start", display: "Start" },
      { value: "center", display: "Center" },
      { value: "end", display: "End" },
    ],
  },
  characterEdgeStyle: {
    value: "none",
    options: [
      { value: "none", display: "None" },
      { value: "drop-shadow", display: "Drop Shadow" },
      { value: "raised", display: "Raised" },
      { value: "depressed", display: "Depressed" },
      { value: "outline", display: "Outline" },
    ],
  },
  allowMediaOverride: true,
  previewTimeout: 2500,
};

export const STYLE_PATHS = ["font.family", "font.size", "font.color", "font.opacity", "font.weight", "font.variant", "background.color", "background.opacity", "window.color", "window.opacity", "textAlignment", "characterEdgeStyle"] as const;
export const ROTATE_PATHS = ["font.family", "font.weight", "font.variant", "font.opacity", "background.opacity", "window.opacity", "characterEdgeStyle", "textAlignment"] as const;

TIME_TRAVEL_BUILD.module.whitelist.config.push(...STYLE_PATHS.map((p) => `settings.captions.${p}.value`), "settings.css.currentCaptionsX", "settings.css.currentCaptionsY");
CSS_CLASSLIST.push("captionsCharacterEdgeStyle");
