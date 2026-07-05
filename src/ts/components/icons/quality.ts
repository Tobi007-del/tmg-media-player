export const quality = `<svg viewBox="0 0 24 24" class="tmg-media-quality-icon" stroke-width="1" stroke="currentColor"><path d="M15 17h6v1h-6v-1zm-2 0H3v1h10v-1zm1-2h1v3h-1v-3zm3-4h4v1h-4v-1zm-5 0H3v1h9v-1zm1-2h1v3h-1V9zm-5-4h11v1H8V5zM3 5h3v1H3V5zm2-2h1v3H5V3z"/></svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    quality: typeof quality;
  }
}
