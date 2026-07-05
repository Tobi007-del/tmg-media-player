export const forward10 = `
<svg viewBox="0 0 24 24" class="tmg-media-forward10-icon"><path fill="currentColor" d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z"/><text x="12" y="16.5" font-family="sans-serif" font-size="7" font-weight="bold" text-anchor="middle" fill="currentColor">10</text></svg>
`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    forward10: typeof forward10;
  }
}
