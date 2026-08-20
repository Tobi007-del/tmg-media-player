export const dragIndicator = `<svg fill="currentColor" viewBox="0 0 24 24" style="scale: 0.65"><path d="M10,6H6V2h4V6z M18,2h-4v4h4V2z M10,10H6v4h4V10z M18,10h-4v4h4V10z M10,18H6v4h4V18z M18,18h-4v4h4V18z"/></svg>`;

declare module "@defs/registries" {
  interface IconRegistryMap {
    dragIndicator: typeof dragIndicator;
  }
}
