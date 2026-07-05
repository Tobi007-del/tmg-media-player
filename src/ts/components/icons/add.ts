export const add = `<svg viewBox="0 0 24 24" class="tmg-media-add-icon" stroke-width="1" stroke="currentColor"><path d="M20 12h-8v8h-1v-8H3v-1h8V3h1v8h8v1z"/></svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    add: typeof add;
  }
}
