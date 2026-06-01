export const expandminiplayer = `<svg class="tmg-media-miniplayer-expand-icon" viewBox="0 -960 960 960" style="scale: 0.9; rotate: 90deg;">
  <path d="M120-120v-320h80v184l504-504H520v-80h320v320h-80v-184L256-200h184v80H120Z" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    expandminiplayer: typeof expandminiplayer;
  }
}
