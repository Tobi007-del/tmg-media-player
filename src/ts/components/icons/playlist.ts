export const playlist = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 10h11v2H3v-2zm0-4h11v2H3V6zm0 8h7v2H3v-2zm13-1v8h2v-6h4v-2h-6z"/></svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    playlist: typeof playlist;
  }
}
