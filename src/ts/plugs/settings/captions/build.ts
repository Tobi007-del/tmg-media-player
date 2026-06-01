import { DeepPartial } from "sia-reactor";
import { Captions } from "./types";

export const STYLE_PATHS = ["captions.font.family.value", "captions.font.size.value", "captions.font.color.value", "captions.font.opacity.value", "captions.font.weight.value", "captions.font.variant.value", "captions.background.color.value", "captions.background.opacity.value", "captions.window.color.value", "captions.window.opacity.value", "captions.characterEdgeStyle.value", "captions.textAlignment.value"] as const;
export const ROTATE_PATHS = ["captions.font.family.value", "captions.font.weight.value", "captions.font.variant.value", "captions.font.opacity.value", "captions.background.opacity.value", "captions.window.opacity.value", "captions.characterEdgeStyle.value", "captions.textAlignment.value"] as const;

export const CAPTIONS_BUILD: DeepPartial<Captions> = {
  visible: true,
  allowMediaOverride: true,
  font: {
    family: {
      value: "inherit",
      options: [
        { value: "inherit", display: "Default" },
        { value: "monospace", display: "Monospace" },
        { value: "sans-serif", display: "Sans Serif" },
        { value: "serif", display: "Serif" },
        { value: "cursive", display: "Cursive" },
        { value: "fantasy", display: "Fantasy" },
        { value: "system-ui", display: "System UI" },
        { value: "arial", display: "Arial" },
        { value: "verdana", display: "Verdana" },
        { value: "tahoma", display: "Tahoma" },
        { value: "times new roman", display: "Times New Roman" },
        { value: "georgia", display: "Georgia" },
        { value: "impact", display: "Impact" },
        { value: "comic sans ms", display: "Comic Sans MS" },
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
        { value: 100, display: "100%" },
        { value: 150, display: "150%" },
        { value: 200, display: "200%" },
        { value: 300, display: "300%" },
        { value: 400, display: "400%" },
      ],
    },
    color: {
      value: "white",
      options: [
        { value: "white", display: "White" },
        { value: "yellow", display: "Yellow" },
        { value: "green", display: "Green" },
        { value: "cyan", display: "Cyan" },
        { value: "blue", display: "Blue" },
        { value: "magenta", display: "Magenta" },
        { value: "red", display: "Red" },
        { value: "black", display: "Black" },
      ],
    },
    opacity: {
      value: 1,
      options: [
        { value: 0.25, display: "25%" },
        { value: 0.5, display: "50%" },
        { value: 0.75, display: "75%" },
        { value: 1, display: "100%" },
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
      value: "black",
      options: [
        { value: "white", display: "White" },
        { value: "yellow", display: "Yellow" },
        { value: "green", display: "Green" },
        { value: "cyan", display: "Cyan" },
        { value: "blue", display: "Blue" },
        { value: "magenta", display: "Magenta" },
        { value: "red", display: "Red" },
        { value: "black", display: "Black" },
      ],
    },
    opacity: {
      value: 0.75,
      options: [
        { value: 0, display: "0%" },
        { value: 0.25, display: "25%" },
        { value: 0.5, display: "50%" },
        { value: 0.75, display: "75%" },
        { value: 1, display: "100%" },
      ],
    },
  },
  window: {
    color: {
      value: "black",
      options: [
        { value: "white", display: "White" },
        { value: "yellow", display: "Yellow" },
        { value: "green", display: "Green" },
        { value: "cyan", display: "Cyan" },
        { value: "blue", display: "Blue" },
        { value: "magenta", display: "Magenta" },
        { value: "red", display: "Red" },
        { value: "black", display: "Black" },
      ],
    },
    opacity: {
      value: 0,
      options: [
        { value: 0, display: "0%" },
        { value: 0.25, display: "25%" },
        { value: 0.5, display: "50%" },
        { value: 0.75, display: "75%" },
        { value: 1, display: "100%" },
      ],
    },
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
  textAlignment: {
    value: "left",
    options: [
      { value: "left", display: "Left" },
      { value: "center", display: "Center" },
      { value: "right", display: "Right" },
    ],
  },
  previewTimeout: 1500,
};
