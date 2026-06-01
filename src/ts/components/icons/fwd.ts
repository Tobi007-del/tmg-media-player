export const fwd = `
<svg viewBox="0 0 25 25" class="tmg-media-fwd-icon"><path d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg>
<svg viewBox="0 0 25 25" class="tmg-media-fwd-icon"><path d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg>
<svg viewBox="0 0 25 25" class="tmg-media-fwd-icon"><path d="M8,5.14V19.14L19,12.14L8,5.14Z" /></svg>
`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    fwd: typeof fwd;
  }
}
