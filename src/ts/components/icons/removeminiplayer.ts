export const removeMiniplayer = `<svg class="tmg-media-miniplayer-remove-icon" viewBox="0 -960 960 960">
  <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    removeMiniplayer: typeof removeMiniplayer;
  }
}
