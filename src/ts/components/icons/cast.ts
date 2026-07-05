export const cast = `<svg class="tmg-media-cast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="scale: 0.9;">
  <path fill="none" d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6M2 20h.01"/>
</svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    cast: typeof cast;
  }
}
