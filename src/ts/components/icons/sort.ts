export const sort = `<svg viewBox="0 0 24 24" class="tmg-media-sort-icon"><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/></svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    sort: typeof sort;
  }
}
