export const backward10 = `
<svg viewBox="0 0 24 24" class="tmg-media-backward10-icon"><path fill="currentColor" d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/><text x="12" y="16.5" font-family="sans-serif" font-size="7" font-weight="bold" text-anchor="middle" fill="currentColor">10</text></svg>
`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    backward10: typeof backward10;
  }
}
